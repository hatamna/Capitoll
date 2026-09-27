class UserVoteError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

function getTally(votesByKey, ridingName) {
    const ridingVotes = votesByKey?.[ridingName] || {};
    const tally = {
        Y: Number(ridingVotes.Y) || 0,
        N: Number(ridingVotes.N) || 0,
        A: Number(ridingVotes.A) || 0
    };
    const total = tally.Y + tally.N + tally.A;
    const highestCount = Math.max(tally.Y, tally.N, tally.A);
    const leaders = highestCount === 0
        ? []
        : Object.keys(tally).filter(choice => tally[choice] === highestCount);
    const communityMajority = leaders.length === 1 ? leaders[0] : null;

    return {
        tally,
        total,
        communityMajority
    };
}

async function getRidingComplianceScore(db, ridingName) {
    if (typeof ridingName !== 'string' || !ridingName.trim()) {
        throw new UserVoteError(400, 'riding_name is required');
    }

    const ridingResult = await db.query(`
        SELECT name
        FROM capitoll_v2.ridings
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
    `, [ridingName.trim()]);

    if (ridingResult.rows.length === 0) {
        throw new UserVoteError(404, 'Riding not found');
    }

    const canonicalRidingName = ridingResult.rows[0].name;
    const billsResult = await db.query(`
        SELECT
            bill_code,
            mp_votes_by_riding,
            votes_by_key
        FROM capitoll_v2.bills
        WHERE has_been_voted_on = TRUE
          AND mp_votes_by_riding ? $1
          AND votes_by_key ? $1
    `, [canonicalRidingName]);

    let comparedBills = 0;
    let alignedBills = 0;

    for (const bill of billsResult.rows) {
        const ridingTally = bill.votes_by_key?.[canonicalRidingName] || {};
        const counts = {
            Y: Number(ridingTally.Y) || 0,
            N: Number(ridingTally.N) || 0,
            A: Number(ridingTally.A) || 0
        };
        const totalResponses = counts.Y + counts.N + counts.A;

        if (totalResponses === 0) {
            continue;
        }

        const highestCount = Math.max(counts.Y, counts.N, counts.A);
        const communityChoices = Object.keys(counts).filter(
            choice => counts[choice] === highestCount
        );

        if (communityChoices.length !== 1) {
            continue;
        }

        const mpVotes = bill.mp_votes_by_riding?.[canonicalRidingName];
        if (!Array.isArray(mpVotes)) {
            continue;
        }

        const latestMpVote = mpVotes.at(-1);
        const latestMpChoice = typeof latestMpVote === 'string'
            ? latestMpVote
            : latestMpVote?.choice;
        if (!['Y', 'N', 'A'].includes(latestMpChoice)) {
            continue;
        }

        comparedBills += 1;
        if (communityChoices[0] === latestMpChoice) {
            alignedBills += 1;
        }
    }

    return {
        riding_name: canonicalRidingName,
        compliance_score: comparedBills === 0
            ? 0
            : Math.round((alignedBills / comparedBills) * 100),
        aligned_bills: alignedBills,
        compared_bills: comparedBills
    };
}

function getOfficialVoteTally(mps, billCode) {
    const tally = { Y: 0, N: 0, A: 0 };

    for (const mp of mps) {
        const choice = mp.votes_by_bill?.[billCode];
        if (Object.hasOwn(tally, choice)) {
            tally[choice] += 1;
        }
    }

    const total = tally.Y + tally.N + tally.A;
    const result = total === 0
        ? null
        : tally.Y > tally.N
            ? 'Agreed To'
            : tally.N > tally.Y ? 'Negatived' : 'Tie';

    return { tally, total, result };
}

async function getBillAndRidingVoteResult(db, ridingName, billCode) {
    if (typeof billCode !== 'string' || typeof ridingName !== 'string' ||
        !billCode.trim() || !ridingName.trim()) {
        throw new UserVoteError(400, 'riding_name and bill_code are required');
    }

    billCode = billCode.replace(/\s+/g, '').toLowerCase();
    ridingName = ridingName.trim();
    const billResult = await db.query(`
        SELECT
            bill_code,
            number_code,
            parliament_number,
            session_number,
            long_title_en,
            long_title_fr,
            status,
            has_been_voted_on,
            mp_votes_by_riding,
            votes_by_key
        FROM capitoll_v2.bills
        WHERE bill_code = $1
    `, [billCode]);

    if (billResult.rows.length === 0) {
        throw new UserVoteError(404, 'Bill not found');
    }

    const bill = billResult.rows[0];
    const ridingResult = await db.query(`
        SELECT mps_by_parliament
        FROM capitoll_v2.ridings
        WHERE name = $1
    `, [ridingName]);

    if (ridingResult.rows.length === 0) {
        throw new UserVoteError(404, 'Riding not found');
    }

    const parliamentNumber = Number(bill.parliament_number);
    const sessionNumber = Number(bill.session_number);
    const sessionKey = `${parliamentNumber}-${sessionNumber}`;
    const ridingHistory = ridingResult.rows[0].mps_by_parliament;
    const mpPersonId = ridingHistory?.[sessionKey];

    if (!mpPersonId) {
        throw new UserVoteError(409, 'Riding is not available for this bill session');
    }

    const mpResult = await db.query(`
        SELECT
            person_id,
            official_first_name,
            official_last_name,
            ridings_by_parliament,
            votes_by_bill
        FROM capitoll_v2.mps
        WHERE person_id = $2
           OR votes_by_bill ? $1
    `, [billCode, mpPersonId]);

    const mp = mpResult.rows.find(candidate =>
        String(candidate.person_id) === String(mpPersonId)
    );
    const mpVote = mp?.votes_by_bill?.[billCode] || null;
    const { tally, total, communityMajority } = getTally(bill.votes_by_key, ridingName);
    const officialResult = getOfficialVoteTally(mpResult.rows, billCode);
    const mpName = mp
        ? [mp.official_first_name, mp.official_last_name].filter(Boolean).join(' ')
        : null;

    return {
        bill: {
            bill_code: bill.bill_code,
            title_en: bill.long_title_en,
            title_fr: bill.long_title_fr,
            status: bill.status,
            has_been_voted_on: bill.has_been_voted_on,
            mp_votes_by_riding: bill.mp_votes_by_riding,
            user_vote_tallies_by_riding: bill.votes_by_key
        },
        riding: {
            name: ridingName,
            parliament_number: parliamentNumber,
            session_number: sessionNumber
        },
        user_tally: {
            counts: tally,
            total,
            majority: communityMajority
        },
        mp: {
            person_id: mp ? String(mp.person_id) : null,
            name: mpName || null,
            vote: mpVote
        },
        all_mps_result: officialResult,
        bill_code: billCode,
        riding_name: ridingName,
        parliament_number: parliamentNumber,
        session_number: sessionNumber,
        tally,
        total,
        community_majority: communityMajority,
        mp_person_id: mp ? String(mp.person_id) : null,
        mp_vote: mpVote,
        majority_matches_mp: communityMajority && mpVote
            ? communityMajority === mpVote
            : null
    };
}

async function getRidingVoteResult(db, billCode, ridingName) {
    return getBillAndRidingVoteResult(db, ridingName, billCode);
}

async function getRidingVoteHistory(db, ridingName, billCode) {
    const result = await getBillAndRidingVoteResult(db, ridingName, billCode);
    const billKey = result.bill.bill_code;

    return {
        riding_name: result.riding.name,
        bills: {
            [billKey]: {
                mp_vote: {
                    person_id: result.mp.person_id,
                    name: result.mp.name,
                    choice: result.mp.vote
                },
                user_tally: result.user_tally,
                overall_house_vote: result.all_mps_result
            }
        }
    };
}

async function submitRidingVote(pool, { billCode, ridingName, choice }) {
    const normalizedBillCode = typeof billCode === 'string'
        ? billCode.replace(/\s+/g, '').toLowerCase()
        : '';
    const normalizedRidingName = typeof ridingName === 'string'
        ? ridingName.trim()
        : '';
    const normalizedChoice = typeof choice === 'string'
        ? choice.trim().toUpperCase()
        : '';

    if (!normalizedBillCode || !normalizedRidingName || !normalizedChoice) {
        throw new UserVoteError(400, 'bill_code, riding_name, and choice are required');
    }

    if (!['Y', 'N', 'A'].includes(normalizedChoice)) {
        throw new UserVoteError(400, 'choice must be Y, N, or A');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const updateResult = await client.query(`
            UPDATE capitoll_v2.bills AS bill
            SET votes_by_key = jsonb_set(
                COALESCE(bill.votes_by_key, '{}'::jsonb),
                ARRAY[$2::text],
                COALESCE(bill.votes_by_key -> $2::text, '{}'::jsonb) ||
                    jsonb_build_object(
                        $3::text,
                        COALESCE(
                            (bill.votes_by_key -> $2::text ->> $3::text)::integer,
                            0
                        ) + 1
                    ),
                true
            )
            WHERE bill.bill_code = $1
              AND EXISTS (
                  SELECT 1
                  FROM capitoll_v2.ridings AS riding
                  WHERE riding.name = $2
                    AND riding.mps_by_parliament ? (
                        bill.parliament_number::text || '-' || bill.session_number::text
                    )
              )
            RETURNING bill.bill_code
        `, [normalizedBillCode, normalizedRidingName, normalizedChoice]);

        if (updateResult.rows.length === 0) {
            await getBillAndRidingVoteResult(
                client,
                normalizedRidingName,
                normalizedBillCode
            );
            throw new UserVoteError(409, 'Riding is not available for this bill session');
        }

        const result = await getBillAndRidingVoteResult(
            client,
            normalizedRidingName,
            normalizedBillCode
        );
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    UserVoteError,
    getBillAndRidingVoteResult,
    getRidingComplianceScore,
    getRidingVoteHistory,
    getRidingVoteResult,
    submitRidingVote
};
