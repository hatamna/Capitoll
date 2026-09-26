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

async function getRidingVoteResult(db, billCode, ridingName) {
    const billResult = await db.query(`
        SELECT bill_code, parliament_number, session_number, votes_by_key
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
    const ridingHistory = ridingResult.rows[0].mps_by_parliament?.[String(parliamentNumber)];
    const isRidingInSession = Array.isArray(ridingHistory) && ridingHistory.some(entry =>
        Number(entry.sessionNumber) === sessionNumber
    );

    if (!isRidingInSession) {
        throw new UserVoteError(409, 'Riding is not available for this bill session');
    }

    const mpResult = await db.query(`
        SELECT person_id, ridings_by_parliament, votes_by_bill
        FROM capitoll_v2.mps
        WHERE votes_by_bill ? $1
          AND ridings_by_parliament ? $2
    `, [billCode, String(parliamentNumber)]);

    const mp = mpResult.rows.find(candidate => {
        const sessions = candidate.ridings_by_parliament?.[String(parliamentNumber)];
        return Array.isArray(sessions) && sessions.some(entry =>
            Number(entry.sessionNumber) === sessionNumber &&
            entry.ridingName === ridingName
        );
    });
    const mpVote = mp?.votes_by_bill?.[billCode] || null;
    const { tally, total, communityMajority } = getTally(bill.votes_by_key, ridingName);

    return {
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

async function submitRidingVote(pool, { billCode, ridingName, choice }) {
    const normalizedBillCode = typeof billCode === 'string'
        ? billCode.trim().toLowerCase()
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
                    AND EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements(
                            COALESCE(
                                riding.mps_by_parliament -> bill.parliament_number::text,
                                '[]'::jsonb
                            )
                        ) AS session_entry
                        WHERE (session_entry ->> 'sessionNumber')::integer = bill.session_number
                    )
              )
            RETURNING bill.bill_code
        `, [normalizedBillCode, normalizedRidingName, normalizedChoice]);

        if (updateResult.rows.length === 0) {
            await getRidingVoteResult(
                client,
                normalizedBillCode,
                normalizedRidingName
            );
            throw new UserVoteError(409, 'Riding is not available for this bill session');
        }

        const result = await getRidingVoteResult(
            client,
            normalizedBillCode,
            normalizedRidingName
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

module.exports = { UserVoteError, getRidingVoteResult, submitRidingVote };
