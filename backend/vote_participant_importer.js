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

    if (participants.length === 0) {
        return 0;
    }

    const query = makeVoteUpsertQuery(participants, decision.billCode);
    await pool.query(query.text, query.values);
    return participants.length;
}

module.exports = { importVoteParticipants, mapVoteParticipants };