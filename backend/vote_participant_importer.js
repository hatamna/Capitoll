const VOTE_PARTICIPANTS_URL = 'https://www.ourcommons.ca/Members/en/votes';

const VOTE_PARTICIPANTS_XML_QUERY = `
    SELECT
        (xpath('string(/VoteParticipant/ParliamentNumber)', participant_xml))[1]::text
            AS parliament_number,

        (xpath('string(/VoteParticipant/SessionNumber)', participant_xml))[1]::text
            AS session_number,

        (xpath('string(/VoteParticipant/DecisionDivisionNumber)', participant_xml))[1]::text
            AS decision_division_number,

        (xpath('string(/VoteParticipant/PersonId)', participant_xml))[1]::text
            AS person_id,

        (xpath('string(/VoteParticipant/IsVoteYea)', participant_xml))[1]::text
            AS is_vote_yea,

        (xpath('string(/VoteParticipant/IsVotePaired)', participant_xml))[1]::text
            AS is_vote_paired

    FROM unnest(
        xpath(
            '/ArrayOfVoteParticipant/VoteParticipant',
            XMLPARSE(DOCUMENT $1)
        )
    ) AS participants(participant_xml)
`;

function parseBoolean(value) {
    return ['true', '1'].includes(String(value).trim().toLowerCase());
}

function mapVoteParticipants(rows, decision) {
    const participantsByPerson = new Map();

    for (const row of rows) {
        const personId = row.person_id?.trim();
        const parliamentNumber = Number(row.parliament_number);
        const sessionNumber = Number(row.session_number);
        const decisionDivisionNumber = Number(row.decision_division_number);

        if (!/^\d+$/.test(personId || '') || /^0+$/.test(personId) ||
            parliamentNumber !== decision.parliamentNumber ||
            sessionNumber !== decision.sessionNumber ||
            decisionDivisionNumber !== decision.decisionDivisionNumber) {
            continue;
        }

        const choice = parseBoolean(row.is_vote_paired)
            ? 'A'
            : parseBoolean(row.is_vote_yea) ? 'Y' : 'N';

        participantsByPerson.set(personId, { personId, choice });
    }

    return [...participantsByPerson.values()];
}

function makeVoteUpsertQuery(participants, billCode) {
    const values = [];
    const rows = participants.map((participant, index) => {
        const firstParameter = index * 3;
        values.push(participant.personId, billCode, participant.choice);
        return `($${firstParameter + 1}::bigint, jsonb_build_object($${firstParameter + 2}::text, $${firstParameter + 3}::text))`;
    });

    return {
        text: `
            INSERT INTO capitoll_v2.mps AS stored (person_id, votes_by_bill)
            VALUES ${rows.join(', ')}
            ON CONFLICT (person_id) DO UPDATE SET
                votes_by_bill = stored.votes_by_bill || EXCLUDED.votes_by_bill
        `,
        values
    };
}

function mapVotesByRiding(participants, mps, decision) {
    const mpsById = new Map(
        mps.map(mp => [String(mp.person_id), mp])
    );
    const votesByRiding = {};

    for (const participant of participants) {
        const mp = mpsById.get(participant.personId);
        const sessionKey =
            `${decision.parliamentNumber}-${decision.sessionNumber}`;
        const ridingName = mp?.ridings_by_parliament?.[sessionKey];

        if (ridingName) {
            votesByRiding[ridingName] ??= [];
            votesByRiding[ridingName].push({
                decision_division_number: decision.decisionDivisionNumber,
                choice: participant.choice
            });
        }
    }

    return votesByRiding;
}

function mergeVotesByRiding(existingVotesByRiding, newVotesByRiding) {
    const merged = { ...existingVotesByRiding };

    for (const [ridingName, newVotes] of Object.entries(newVotesByRiding)) {
        const existingVotes = Array.isArray(merged[ridingName])
            ? merged[ridingName]
            : [];
        const votesByDivision = new Map(
            existingVotes.map(vote => [
                vote.decision_division_number,
                vote
            ])
        );

        for (const vote of newVotes) {
            votesByDivision.set(vote.decision_division_number, vote);
        }

        merged[ridingName] = [...votesByDivision.values()]
            .sort((left, right) =>
                left.decision_division_number - right.decision_division_number
            );
    }

    return merged;
}

async function initializeBillRidingVoteEntries(
    pool,
    parliamentNumber,
    sessionNumber,
    resetOfficialVotes = false
) {
    const result = await pool.query(`
        WITH riding_defaults AS (
            SELECT
                bill.id,
                COALESCE(
                    jsonb_object_agg(riding.name, '[]'::jsonb)
                        FILTER (WHERE riding.name IS NOT NULL),
                    '{}'::jsonb
                ) AS official_votes,
                COALESCE(
                    jsonb_object_agg(
                        riding.name,
                        jsonb_build_object('Y', 0, 'N', 0, 'A', 0)
                    ) FILTER (WHERE riding.name IS NOT NULL),
                    '{}'::jsonb
                ) AS user_tallies
            FROM capitoll_v2.bills AS bill
            LEFT JOIN capitoll_v2.ridings AS riding
                ON riding.mps_by_parliament ? (
                    bill.parliament_number::text || '-' || bill.session_number::text
                )
            WHERE bill.parliament_number = $1
              AND bill.session_number = $2
            GROUP BY bill.id
        )
        UPDATE capitoll_v2.bills AS bill
        SET mp_votes_by_riding = CASE
                WHEN $3 THEN riding_defaults.official_votes
                ELSE riding_defaults.official_votes || bill.mp_votes_by_riding
            END,
            votes_by_key = riding_defaults.user_tallies || bill.votes_by_key
        FROM riding_defaults
        WHERE bill.id = riding_defaults.id
    `, [parliamentNumber, sessionNumber, resetOfficialVotes]);

    return result.rowCount;
}

async function importVoteParticipants(pool, decision, fetchImpl = fetch) {
    const url = `${VOTE_PARTICIPANTS_URL}/${decision.parliamentNumber}/${decision.sessionNumber}/${decision.decisionDivisionNumber}/xml`;
    const response = await fetchImpl(url, {
        headers: { Accept: 'application/xml, text/xml' }
    });

    if (!response.ok) {
        throw new Error(`Vote participants feed returned HTTP ${response.status}`);
    }

    const xml = await response.text();
    const { rows } = await pool.query(VOTE_PARTICIPANTS_XML_QUERY, [xml]);
    const participants = mapVoteParticipants(rows, decision);
    const votesByRiding = {};

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (participants.length > 0) {
            const query = makeVoteUpsertQuery(participants, decision.billCode);
            await client.query(query.text, query.values);

            const personIds = participants.map(participant => participant.personId);
            const { rows: mps } = await client.query(`
                SELECT person_id, ridings_by_parliament
                FROM capitoll_v2.mps
                WHERE person_id = ANY($1::bigint[])
            `, [personIds]);
            Object.assign(
                votesByRiding,
                mapVotesByRiding(participants, mps, decision)
            );
        }

        const { rows: bills } = await client.query(`
            SELECT mp_votes_by_riding
            FROM capitoll_v2.bills
            WHERE bill_code = $1
            FOR UPDATE
        `, [decision.billCode]);

        if (bills.length > 0) {
            const mpVotesByRiding = mergeVotesByRiding(
                bills[0].mp_votes_by_riding || {},
                votesByRiding
            );

            await client.query(`
                UPDATE capitoll_v2.bills
                SET has_been_voted_on = TRUE,
                    mp_votes_by_riding = $2::jsonb
                WHERE bill_code = $1
            `, [decision.billCode, JSON.stringify(mpVotesByRiding)]);
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return participants.length;
}

module.exports = {
    importVoteParticipants,
    initializeBillRidingVoteEntries,
    mergeVotesByRiding,
    mapVoteParticipants,
    mapVotesByRiding
};