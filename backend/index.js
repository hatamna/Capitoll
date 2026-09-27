const express = require('express');
const cors = require('cors');

const pool = require('./db');

const { INITIAL_IMPORT_NAME, loadInitialData } = require('./initial_import');
const { importRelevantBills } = require('./bill_importer');
const { importCurrentConstituencies } = require('./constituency_importer');
const { DecisionQueue } = require('./decision_queue');
const { importNewBillVoteDivisions } = require('./vote_importer');

const {
    importVoteParticipants,
    initializeBillRidingVoteEntries
} = require('./vote_participant_importer');

const { getBillsAwaitingThirdReading } = require('./bill_service');
const {
    BillDescriptionError,
    getOrGenerateBillDescription
} = require('./bill_description_service');

const {
    UserVoteError,
    getRidingComplianceScore,
    getRidingVoteResult,
    submitRidingVote
} = require('./user_vote_service');

const {
    MpPhotoError,
    getMpOfficialPhoto
} = require('./mp_photo_service');


const app = express();
const PORT = process.env.PORT || 3000;


// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

app.use(cors());
app.use(express.json());


// --------------------------------------------------
// TEST
// --------------------------------------------------

app.get('/', (req, res) => {
    res.send('Capitoll V2 backend is running');
});


app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT NOW()'
        );

        res.json({
            success: true,
            time: result.rows[0].now
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: 'Database connection failed'
        });
    }
});


// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function convertOfficialMpVote(rawVote) {
    if (rawVote === 'Y') {
        return 'YES';
    }

    if (rawVote === 'N') {
        return 'NO';
    }

    // A means the MP was paired.
    if (rawVote === 'A') {
        return 'PAIRED';
    }

    return rawVote || null;
}


function getCommunityVoteInfo(
    votesByKey,
    ridingName
) {
    const ridingVotes = ridingName
        ? (
            votesByKey?.[
            ridingName
            ] || {}
        )
        : {};


    const yes =
        Number(
            ridingVotes.Y
        ) || 0;


    const no =
        Number(
            ridingVotes.N
        ) || 0;


    const abstain =
        Number(
            ridingVotes.A
        ) || 0;


    const total =
        yes +
        no +
        abstain;


    let majority = null;


    if (total > 0) {

        const highest =
            Math.max(
                yes,
                no,
                abstain
            );


        const leaders = [];


        if (yes === highest) {
            leaders.push('YES');
        }


        if (no === highest) {
            leaders.push('NO');
        }


        if (abstain === highest) {
            leaders.push('ABSTAIN');
        }


        if (leaders.length === 1) {
            majority =
                leaders[0];
        }
    }


    return {
        yes,
        no,
        abstain,
        total,
        majority
    };
}


function getMpRidingForSession(
    ridingsByParliament,
    parliamentNumber,
    sessionNumber
) {
    if (
        !ridingsByParliament ||
        typeof ridingsByParliament !== 'object'
    ) {
        return null;
    }


    const sessionKey =
        `${parliamentNumber}-${sessionNumber}`;


    const directValue =
        ridingsByParliament[
        sessionKey
        ];


    // Shape:
    // {
    //   "45-1": "Kanata"
    // }

    if (
        typeof directValue === 'string' &&
        directValue.trim()
    ) {
        return directValue.trim();
    }


    // Shape:
    // {
    //   "45": [
    //     {
    //       sessionNumber: 1,
    //       ridingName: "Kanata"
    //     }
    //   ]
    // }

    const parliamentHistory =
        ridingsByParliament[
        String(
            parliamentNumber
        )
        ];


    if (
        Array.isArray(
            parliamentHistory
        )
    ) {

        const sessionEntry =
            parliamentHistory.find(
                entry =>
                    Number(
                        entry?.sessionNumber
                    ) ===
                    Number(
                        sessionNumber
                    )
            );


        return (
            sessionEntry?.ridingName ||
            null
        );
    }


    return null;
}


function getRidingMpForSession(
    mpsByParliament,
    parliamentNumber,
    sessionNumber
) {
    if (
        !mpsByParliament ||
        typeof mpsByParliament !== 'object'
    ) {
        return null;
    }


    const sessionKey =
        `${parliamentNumber}-${sessionNumber}`;


    const directValue =
        mpsByParliament[
        sessionKey
        ];


    if (
        typeof directValue === 'string' ||
        typeof directValue === 'number'
    ) {
        return String(
            directValue
        );
    }


    if (
        directValue &&
        typeof directValue === 'object' &&
        directValue.personId
    ) {
        return String(
            directValue.personId
        );
    }


    const parliamentHistory =
        mpsByParliament[
        String(
            parliamentNumber
        )
        ];


    if (
        Array.isArray(
            parliamentHistory
        )
    ) {

        const sessionEntry =
            parliamentHistory.find(
                entry =>
                    Number(
                        entry?.sessionNumber
                    ) ===
                    Number(
                        sessionNumber
                    )
            );


        if (
            sessionEntry?.personId
        ) {
            return String(
                sessionEntry.personId
            );
        }
    }


    return null;
}


function getMpPartyForSession(
    partiesByParliament,
    parliamentNumber,
    sessionNumber
) {
    if (
        !partiesByParliament ||
        typeof partiesByParliament !== 'object'
    ) {
        return null;
    }


    const parliamentHistory =
        partiesByParliament[
        String(
            parliamentNumber
        )
        ];


    if (
        !Array.isArray(
            parliamentHistory
        )
    ) {
        return null;
    }


    const sessionEntry =
        parliamentHistory.find(
            entry =>
                Number(
                    entry?.sessionNumber
                ) ===
                Number(
                    sessionNumber
                )
        );


    return (
        sessionEntry?.caucusShortName ||
        null
    );
}


// --------------------------------------------------
// BILLS
// --------------------------------------------------


// Get all bills

app.get(
    '/api/v2/bills',
    async (req, res) => {

        try {

            const { rows } =
                await pool.query(`
                    SELECT *
                    FROM capitoll_v2.bills

                    ORDER BY
                        parliament_number DESC,
                        session_number DESC,
                        id DESC
                `);


            res.json(rows);

        } catch (error) {

            console.error(error);


            res.status(500).json({
                success: false,
                error:
                    'Failed to fetch bills'
            });
        }
    }
);


// --------------------------------------------------
// BILLS AWAITING THIRD READING
// --------------------------------------------------

app.get(
    '/api/v2/bills/awaiting-third-reading',
    async (req, res) => {

        try {

            const bills =
                await getBillsAwaitingThirdReading(
                    pool
                );


            res.json(bills);

        } catch (error) {

            console.error(error);


            res.status(500).json({
                success: false,
                error:
                    'Failed to fetch bills awaiting third reading'
            });
        }
    }
);


// --------------------------------------------------
// GET ONE BILL
// --------------------------------------------------
//
// Example:
//
// /api/v2/bills/c-10(45-1)
//

app.get(
    '/api/v2/bills/:billCode',
    async (req, res) => {

        try {

            const billCode =
                req.params.billCode
                    .toLowerCase();


            const { rows } =
                await pool.query(
                    `
                    SELECT *
                    FROM capitoll_v2.bills

                    WHERE bill_code = $1

                    ORDER BY
                        parliament_number DESC,
                        session_number DESC

                    LIMIT 1
                    `,
                    [
                        billCode
                    ]
                );


            if (
                rows.length === 0
            ) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        error:
                            'Bill not found'
                    });
            }


            res.json(
                rows[0]
            );

        } catch (error) {

            console.error(error);


            res.status(500).json({
                success: false,
                error:
                    'Failed to get bill'
            });
        }
    }
);


app.get(
    '/api/v2/bills/:billCode/description',
    async (req, res) => {
        try {
            const result = await getOrGenerateBillDescription(
                pool,
                req.params.billCode
            );
            res.json(result);
        } catch (error) {
            if (error instanceof BillDescriptionError) {
                return res.status(error.statusCode).json({
                    success: false,
                    error: error.message
                });
            }

            console.error('Failed to get bill description:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get bill description'
            });
        }
    }
);


// --------------------------------------------------
// USER / COMMUNITY VOTES
// --------------------------------------------------


// Submit a community vote

app.post(
    '/api/v2/votes',
    async (req, res) => {

        try {

            const {
                bill_code,
                riding_name,
                choice
            } = req.body;


            const result =
                await submitRidingVote(
                    pool,
                    {
                        billCode:
                            bill_code,

                        ridingName:
                            riding_name,

                        choice
                    }
                );


            res.status(201).json({
                success: true,
                ...result
            });

        } catch (error) {

            console.error(error);


            if (
                error instanceof
                UserVoteError
            ) {
                return res
                    .status(
                        error.statusCode
                    )
                    .json({
                        success: false,
                        error:
                            error.message
                    });
            }


            res.status(500).json({
                success: false,
                error:
                    'Failed to submit vote'
            });
        }
    }
);


// --------------------------------------------------
// GET COMMUNITY RESULTS FOR BILL + RIDING
// --------------------------------------------------

app.get(
    '/api/v2/bills/:billCode/results',
    async (req, res) => {

        try {

            const {
                billCode
            } = req.params;


            const {
                riding_name
            } = req.query;


            if (!riding_name) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            'riding_name is required'
                    });
            }


            const result =
                await getRidingVoteResult(
                    pool,
                    billCode.toLowerCase(),
                    riding_name
                );


            res.json(result);

        } catch (error) {

            console.error(error);


            if (
                error instanceof
                UserVoteError
            ) {

                return res
                    .status(
                        error.statusCode
                    )
                    .json({
                        success: false,
                        error:
                            error.message
                    });
            }


            res.status(500).json({
                success: false,
                error:
                    'Failed to get vote results'
            });
        }
    }
);


// --------------------------------------------------
// BILL + RIDING COMPARISON
// --------------------------------------------------
//
// Example:
//
// /api/v2/bill-riding-result
// ?riding_name=Kanata
// &bill_code=c-5(45-1)
//

app.get(
    '/api/v2/bill-riding-result',
    async (req, res) => {

        try {

            const {
                riding_name,
                bill_code
            } = req.query;


            if (
                !riding_name ||
                !bill_code
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            'riding_name and bill_code are required'
                    });
            }


            const normalizedBillCode =
                bill_code
                    .toLowerCase()
                    .trim();


            const normalizedRidingName =
                riding_name.trim();


            // --------------------------------------
            // 1. FIND BILL
            // --------------------------------------

            const billResult =
                await pool.query(
                    `
                    SELECT
                        id,
                        bill_code,
                        number_code,
                        parliament_number,
                        session_number,
                        long_title_en,
                        long_title_fr,
                        status,
                        passed_house_third_reading_at,
                        has_been_voted_on,
                        mp_votes_by_riding,
                        votes_by_key

                    FROM capitoll_v2.bills

                    WHERE
                        LOWER(number_code) =
                            LOWER($1)

                    OR
                        LOWER(bill_code) =
                            LOWER($1)

                    ORDER BY
                        parliament_number DESC,
                        session_number DESC

                    LIMIT 1
                    `,
                    [
                        normalizedBillCode
                    ]
                );


            if (
                billResult.rows.length === 0
            ) {

                return res
                    .status(404)
                    .json({
                        success: false,
                        error:
                            'Bill not found'
                    });
            }


            const bill =
                billResult.rows[0];


            // --------------------------------------
            // 2. FIND RIDING
            // --------------------------------------

            const ridingResult =
                await pool.query(
                    `
                    SELECT
                        id,
                        name,
                        mps_by_parliament

                    FROM capitoll_v2.ridings

                    WHERE
                        LOWER(name) =
                            LOWER($1)

                    LIMIT 1
                    `,
                    [
                        normalizedRidingName
                    ]
                );


            if (
                ridingResult.rows.length === 0
            ) {

                return res
                    .status(404)
                    .json({
                        success: false,
                        error:
                            'Riding not found'
                    });
            }


            const riding =
                ridingResult.rows[0];


            // --------------------------------------
            // 3. FIND MP FOR BILL SESSION
            // --------------------------------------

            const mpPersonId =
                getRidingMpForSession(
                    riding.mps_by_parliament,
                    bill.parliament_number,
                    bill.session_number
                );


            if (!mpPersonId) {

                return res
                    .status(404)
                    .json({
                        success: false,
                        error:
                            'No MP found for this riding during this bill session'
                    });
            }


            // --------------------------------------
            // 4. GET MP
            // --------------------------------------

            const mpResult =
                await pool.query(
                    `
                    SELECT
                        person_id,
                        official_first_name,
                        official_last_name,
                        ridings_by_parliament,
                        parties_by_parliament,
                        votes_by_bill

                    FROM capitoll_v2.mps

                    WHERE person_id = $1
                    `,
                    [
                        mpPersonId
                    ]
                );


            if (
                mpResult.rows.length === 0
            ) {

                return res
                    .status(404)
                    .json({
                        success: false,
                        error:
                            'MP record not found'
                    });
            }


            const mp =
                mpResult.rows[0];


            // --------------------------------------
            // 5. PARTY DURING SESSION
            // --------------------------------------

            const party =
                getMpPartyForSession(
                    mp.parties_by_parliament,
                    bill.parliament_number,
                    bill.session_number
                );


            // --------------------------------------
            // 6. MP VOTE
            // --------------------------------------

            const voteKey =
                bill.bill_code;


            const rawMpVote =
                mp.votes_by_bill
                ?.[voteKey] ??
                null;


            const mpVote =
                convertOfficialMpVote(
                    rawMpVote
                );


            // --------------------------------------
            // 7. COMMUNITY RESULT
            // --------------------------------------

            let community;


            try {

                community =
                    await getRidingVoteResult(
                        pool,
                        bill.bill_code,
                        riding.name
                    );

            } catch (error) {

                if (
                    error instanceof
                    UserVoteError
                ) {

                    community = {
                        total_responses: 0,

                        results: {
                            YES: {
                                count: 0,
                                percentage: 0
                            },

                            NO: {
                                count: 0,
                                percentage: 0
                            },

                            ABSTAIN: {
                                count: 0,
                                percentage: 0
                            }
                        }
                    };

                } else {

                    throw error;

                }
            }


            // --------------------------------------
            // 8. RESPONSE
            // --------------------------------------

            res.json({
                success: true,

                bill: {
                    id:
                        bill.id,

                    bill_code:
                        bill.bill_code,

                    number_code:
                        bill.number_code,

                    parliament_number:
                        bill.parliament_number,

                    session_number:
                        bill.session_number,

                    title:
                        bill.long_title_en,

                    title_fr:
                        bill.long_title_fr,

                    status:
                        bill.status,

                    passed_house_third_reading_at:
                        bill
                            .passed_house_third_reading_at,

                    has_been_voted_on:
                        bill.has_been_voted_on,

                    mp_votes_by_riding:
                        bill.mp_votes_by_riding,

                    user_vote_tally:
                        bill.votes_by_key
                        ?.[riding.name] || {
                            Y: 0,
                            N: 0,
                            A: 0
                        }
                },

                riding: {
                    id:
                        riding.id,

                    name:
                        riding.name
                },

                community,

                mp: {
                    person_id:
                        mp.person_id,

                    first_name:
                        mp.official_first_name,

                    last_name:
                        mp.official_last_name,

                    full_name:
                        [
                            mp.official_first_name,
                            mp.official_last_name
                        ]
                            .filter(Boolean)
                            .join(' '),

                    party,

                    vote_key:
                        voteKey,

                    raw_vote:
                        rawMpVote,

                    vote:
                        mpVote
                }
            });

        } catch (error) {

            console.error(error);


            res.status(500).json({
                success: false,
                error:
                    'Failed to get bill and riding comparison'
            });
        }
    }
);


// --------------------------------------------------
// RIDINGS
// --------------------------------------------------


// Get all ridings

app.get(
    '/api/v2/ridings',
    async (req, res) => {

        try {

                const { rows } =
                await pool.query(`
                    SELECT
                        riding.id,
                        riding.name,
                        riding.mps_by_parliament,
                        history.mp_history
                    FROM capitoll_v2.ridings AS riding
                    LEFT JOIN LATERAL (
                        SELECT COALESCE(
                            jsonb_agg(
                                jsonb_build_object(
                                    'person_id', latest.person_id,
                                    'name', COALESCE(
                                        NULLIF(CONCAT_WS(
                                            ' ',
                                            mp.official_first_name,
                                            mp.official_last_name
                                        ), ''),
                                        'MP ' || latest.person_id
                                    ),
                                    'parliament_number', latest.parliament_number,
                                    'session_number', latest.session_number
                                )
                                ORDER BY
                                    latest.parliament_number DESC,
                                    latest.session_number DESC
                            ),
                            '[]'::jsonb
                        ) AS mp_history
                        FROM (
                            SELECT DISTINCT ON (history.person_id)
                                history.person_id,
                                history.parliament_number,
                                history.session_number
                            FROM (
                                SELECT
                                    entry.person_id,
                                    CASE
                                        WHEN entry.session_key ~ '^[0-9]+-[0-9]+$'
                                        THEN split_part(entry.session_key, '-', 1)::integer
                                    END AS parliament_number,
                                    CASE
                                        WHEN entry.session_key ~ '^[0-9]+-[0-9]+$'
                                        THEN split_part(entry.session_key, '-', 2)::integer
                                    END AS session_number
                                FROM jsonb_each_text(riding.mps_by_parliament)
                                    AS entry(session_key, person_id)
                                WHERE entry.person_id ~ '^[0-9]+$'
                            ) AS history
                            WHERE history.parliament_number IS NOT NULL
                              AND history.session_number IS NOT NULL
                            ORDER BY
                                history.person_id,
                                history.parliament_number DESC,
                                history.session_number DESC
                        ) AS latest
                        LEFT JOIN capitoll_v2.mps AS mp
                            ON mp.person_id::text = latest.person_id
                    ) AS history ON TRUE
                    ORDER BY riding.name
                `);


                res.json(rows);

        } catch (error) {

            console.error(error);


            res.status(500).json({
                success: false,
                error:
                    'Failed to get ridings'
            });
        }
    }
);


// --------------------------------------------------
// RIDING COMPLIANCE / MATCH SCORE
// --------------------------------------------------

app.get(
    '/api/v2/ridings/:ridingName/compliance-score',
    async (req, res) => {

        try {

            const result =
                await getRidingComplianceScore(
                    pool,
                    req.params.ridingName
                );


            res.json(result);

        } catch (error) {

            if (
                error instanceof
                UserVoteError
            ) {

                return res
                    .status(
                        error.statusCode
                    )
                    .json({
                        success: false,
                        error:
                            error.message
                    });
            }


            console.error(error);


            res.status(500).json({
                success: false,
                error:
                    'Failed to calculate riding compliance score'
            });
        }
    }
);


// --------------------------------------------------
// GET ONE RIDING
// --------------------------------------------------

app.get(
    '/api/v2/ridings/:id',
    async (req, res) => {

        try {

            const { rows } =
                await pool.query(
                    `
                    SELECT *
                    FROM capitoll_v2.ridings

                    WHERE id = $1
                    `,
                    [
                        req.params.id
                    ]
                );


            if (
                rows.length === 0
            ) {

                return res
                    .status(404)
                    .json({
                        success: false,
                        error:
                            'Riding not found'
                    });
            }


            res.json(
                rows[0]
            );

        } catch (error) {

            console.error(error);


            res.status(500).json({
                success: false,
                error:
                    'Failed to get riding'
            });
        }
    }
);


// --------------------------------------------------
// MPs
// --------------------------------------------------


// Get all current MPs

app.get(
    '/api/v2/mps',
    async (req, res) => {

        try {

            const sessionResult =
                await pool.query(`
                    SELECT
                        parliament_number,
                        session_number

                    FROM capitoll_v2.bills

                    ORDER BY
                        parliament_number DESC,
                        session_number DESC

                    LIMIT 1
                `);


            if (
                sessionResult.rows.length === 0
            ) {

                return res
                    .status(404)
                    .json({
                        success: false,
                        error:
                            'No current Parliament/session found'
                    });
            }


            const {
                parliament_number,
                session_number
            } =
                sessionResult.rows[0];


            const parliamentKey =
                String(
                    parliament_number
                );


            const sessionKey =
                `${parliament_number}-${session_number}`;


            const { rows } =
                await pool.query(
                    `
                    SELECT
                        m.person_id,

                        m.official_first_name,

                        m.official_last_name,

                        CONCAT_WS(
                            ' ',
                            m.official_first_name,
                            m.official_last_name
                        ) AS name,

                        m.ridings_by_parliament
                            ->> ($1::text)
                            AS riding_name,

                        (
                            SELECT
                                entry->>'caucusShortName'

                            FROM jsonb_array_elements(
                                COALESCE(
                                    m.parties_by_parliament
                                        -> ($2::text),

                                    '[]'::jsonb
                                )
                            ) AS entry

                            WHERE
                                (
                                    entry
                                        ->>'sessionNumber'
                                )::int = $3

                            LIMIT 1
                        )
                        AS party

                    FROM capitoll_v2.mps AS m

                    WHERE
                        m.ridings_by_parliament
                            ? ($1::text)

                    ORDER BY
                        m.official_last_name,
                        m.official_first_name
                    `,
                    [
                        sessionKey,
                        parliamentKey,
                        session_number
                    ]
                );


            res.json({
                success: true,

                parliament:
                    parliament_number,

                session:
                    session_number,

                count:
                    rows.length,

                mps:
                    rows
            });

        } catch (error) {

            console.error(error);


            res.status(500).json({
                success: false,
                error:
                    'Failed to get current MPs'
            });
        }
    }
);


// --------------------------------------------------
// MP BILL ACTIVITY
// --------------------------------------------------
//
// Example:
//
// /api/v2/mps/123401/bills
//

app.get(
    '/api/v2/mps/:personId/bills',
    async (req, res) => {

        try {

            const personId =
                req.params.personId;


            // --------------------------------------
            // 1. GET MP
            // --------------------------------------

            const mpResult =
                await pool.query(
                    `
                    SELECT
                        person_id,
                        official_first_name,
                        official_last_name,
                        ridings_by_parliament,
                        votes_by_bill

                    FROM capitoll_v2.mps

                    WHERE person_id = $1
                    `,
                    [
                        personId
                    ]
                );


            if (
                mpResult.rows.length === 0
            ) {

                return res
                    .status(404)
                    .json({
                        success: false,
                        error:
                            'MP not found'
                    });
            }


            const mp =
                mpResult.rows[0];


            const fullName =
                [
                    mp.official_first_name,
                    mp.official_last_name
                ]
                    .filter(Boolean)
                    .join(' ');


            // --------------------------------------
            // 2. STORED VOTES
            // --------------------------------------

            const voteEntries =
                Object.entries(
                    mp.votes_by_bill ||
                    {}
                );


            if (
                voteEntries.length === 0
            ) {

                return res.json({
                    success: true,

                    person_id:
                        String(
                            mp.person_id
                        ),

                    name:
                        fullName,

                    count:
                        0,

                    comparison: {
                        comparable_bills:
                            0,

                        same_as_riding_majority:
                            0,

                        different_from_riding_majority:
                            0,

                        match_percentage:
                            null
                    },

                    bills:
                        []
                });
            }


            const billCodes =
                voteEntries.map(
                    ([billCode]) =>
                        billCode
                );


            // --------------------------------------
            // 3. LOAD BILLS
            // --------------------------------------

            const billsResult =
                await pool.query(
                    `
                    SELECT
                        id,
                        bill_code,
                        number_code,
                        parliament_number,
                        session_number,
                        long_title_en,
                        long_title_fr,
                        status,
                        passed_house_third_reading_at,
                        votes_by_key

                    FROM capitoll_v2.bills

                    WHERE
                        bill_code =
                            ANY($1::text[])

                    ORDER BY
                        parliament_number DESC,
                        session_number DESC,
                        passed_house_third_reading_at
                            DESC NULLS LAST,
                        id DESC
                    `,
                    [
                        billCodes
                    ]
                );


            const bills = [];


            // --------------------------------------
            // 4. BUILD BILL ACTIVITY
            // --------------------------------------

            for (
                const bill
                of billsResult.rows
            ) {

                const ridingName =
                    getMpRidingForSession(
                        mp.ridings_by_parliament,
                        bill.parliament_number,
                        bill.session_number
                    );


                const rawMpVote =
                    mp.votes_by_bill
                    ?.[
                    bill.bill_code
                    ] ??
                    null;


                const mpVote =
                    convertOfficialMpVote(
                        rawMpVote
                    );


                const community =
                    getCommunityVoteInfo(
                        bill.votes_by_key,
                        ridingName
                    );


                const isComparable =
                    (
                        mpVote === 'YES' ||
                        mpVote === 'NO'
                    ) &&
                    Boolean(
                        community.majority
                    );


                const majorityMatchesMp =
                    isComparable
                        ? (
                            mpVote ===
                            community.majority
                        )
                        : null;


                bills.push({
                    id:
                        bill.id,

                    bill_code:
                        bill.bill_code,

                    number_code:
                        bill.number_code,

                    parliament_number:
                        bill.parliament_number,

                    session_number:
                        bill.session_number,

                    long_title_en:
                        bill.long_title_en,

                    long_title_fr:
                        bill.long_title_fr,

                    status:
                        bill.status,

                    passed_house_third_reading_at:
                        bill
                            .passed_house_third_reading_at,


                    raw_vote:
                        rawMpVote,

                    mp_vote:
                        mpVote,


                    riding_name:
                        ridingName,

                    yes_count:
                        community.yes,

                    no_count:
                        community.no,

                    abstain_count:
                        community.abstain,

                    community_total:
                        community.total,

                    riding_majority:
                        community.majority,

                    majority_matches_mp:
                        majorityMatchesMp
                });
            }


            // --------------------------------------
            // 5. COMPARISON SUMMARY
            // --------------------------------------

            const comparableBills =
                bills.filter(
                    bill =>
                        bill
                            .majority_matches_mp !==
                        null
                );


            const sameCount =
                comparableBills.filter(
                    bill =>
                        bill
                            .majority_matches_mp ===
                        true
                ).length;


            const differentCount =
                comparableBills.filter(
                    bill =>
                        bill
                            .majority_matches_mp ===
                        false
                ).length;


            const matchPercentage =
                comparableBills.length > 0

                    ? Math.round(
                        (
                            sameCount /
                            comparableBills.length
                        ) * 100
                    )

                    : null;


            // --------------------------------------
            // 6. RESPONSE
            // --------------------------------------

            res.json({
                success:
                    true,

                person_id:
                    String(
                        mp.person_id
                    ),

                name:
                    fullName,

                count:
                    bills.length,

                comparison: {
                    comparable_bills:
                        comparableBills.length,

                    same_as_riding_majority:
                        sameCount,

                    different_from_riding_majority:
                        differentCount,

                    match_percentage:
                        matchPercentage
                },

                bills
            });

        } catch (error) {

            console.error(
                'Failed to get MP bill activity:',
                error
            );


            res.status(500).json({
                success:
                    false,

                error:
                    'Failed to get MP bill activity'
            });
        }
    }
);


// --------------------------------------------------
// GET ONE MP
// --------------------------------------------------

app.get(
    '/api/v2/mps/:personId',
    async (req, res) => {

        try {

            const { rows } =
                await pool.query(
                    `
                    SELECT *
                    FROM capitoll_v2.mps

                    WHERE person_id = $1
                    `,
                    [
                        req.params.personId
                    ]
                );


            if (
                rows.length === 0
            ) {

                return res
                    .status(404)
                    .json({
                        success: false,
                        error:
                            'MP not found'
                    });
            }


            res.json(
                rows[0]
            );

        } catch (error) {

            console.error(error);


            res.status(500).json({
                success: false,
                error:
                    'Failed to get MP'
            });
        }
    }
);


// --------------------------------------------------
// MP PHOTO
// --------------------------------------------------

app.get(
    '/api/v2/mp-photo',
    async (req, res) => {

        try {

            const {
                riding_name
            } = req.query;


            if (!riding_name) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            'riding_name is required'
                    });
            }


            const result =
                await getMpOfficialPhoto(
                    pool,
                    riding_name
                );


            res.json({
                success: true,
                ...result
            });

        } catch (error) {

            console.error(error);


            if (
                error instanceof
                MpPhotoError
            ) {

                return res
                    .status(
                        error.statusCode
                    )
                    .json({
                        success: false,
                        error:
                            error.message
                    });
            }


            res.status(500).json({
                success: false,
                error:
                    'Failed to get MP photo'
            });
        }
    }
);


// --------------------------------------------------
// AUTOMATIC PARLIAMENT DATA SYNC
// --------------------------------------------------

async function saveVoteImportCursor(parliamentNumber, sessionNumber, divisionNumber) {
    await pool.query(`
        INSERT INTO capitoll_v2.vote_import_state AS stored (
            parliament_number,
            session_number,
            last_decision_division_number
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (parliament_number, session_number) DO UPDATE SET
            last_decision_division_number = GREATEST(
                stored.last_decision_division_number,
                EXCLUDED.last_decision_division_number
            ),
            updated_at = NOW()
    `, [parliamentNumber, sessionNumber, divisionNumber]);
}

async function syncCurrentData() {

    console.log('');

    console.log(
        '------------------------------------------'
    );

    console.log(
        'Starting Capitoll data sync...'
    );

    console.log(
        '------------------------------------------'
    );


    // --------------------------------------------------
    // 1. IMPORT / UPDATE BILLS
    // --------------------------------------------------

    const billResult =
        await importRelevantBills(
            pool
        );


    console.log(
        `Bills synced: ${billResult.importedCount}`
    );


    if (
        !billResult.currentParlSession
    ) {

        console.log(
            'Could not determine current Parliament/session.'
        );

        return;
    }


    const {
        parliamentNumber,
        sessionNumber
    } =
        billResult.currentParlSession;


    console.log(
        `Current Parliament/session: ${parliamentNumber}-${sessionNumber}`
    );


    // --------------------------------------------------
    // 2. IMPORT / UPDATE CONSTITUENCIES
    // --------------------------------------------------

    const constituencyCount =
        await importCurrentConstituencies(
            pool,
            billResult.currentParlSession
        );


    // Create empty community-vote entries
    // for the current riding/bill combinations.

    await initializeBillRidingVoteEntries(
        pool,
        parliamentNumber,
        sessionNumber
    );


    console.log(
        `Constituencies synced: ${constituencyCount}`
    );


    // --------------------------------------------------
    // 3. CREATE DECISION QUEUE
    // --------------------------------------------------

    const queue =
        new DecisionQueue();


    // --------------------------------------------------
    // 4. FIND LAST DIVISION ALREADY SCANNED
    // --------------------------------------------------

    const stateResult =
        await pool.query(
            `
            SELECT
                last_decision_division_number

            FROM
                capitoll_v2.vote_import_state

            WHERE
                parliament_number = $1

            AND
                session_number = $2
            `,
            [
                parliamentNumber,
                sessionNumber
            ]
        );


    const lastDivisionNumber =
        stateResult.rows[0]
            ?.last_decision_division_number ||
        0;


    console.log(
        `Last scanned division: ${lastDivisionNumber}`
    );


    // --------------------------------------------------
    // 5. FIND NEW BILL VOTE DIVISIONS
    // --------------------------------------------------

    const voteScan =
        await importNewBillVoteDivisions(
            pool,
            queue,
            parliamentNumber,
            sessionNumber,
            lastDivisionNumber
        );


    console.log(
        `New bill vote divisions queued: ${voteScan.queuedCount}`
    );


    let voteParticipantCount = 0;
    await queue.drain(async decision => {
        voteParticipantCount += await importVoteParticipants(pool, decision);
    });

    console.log(
        `Vote participants synced: ${voteParticipantCount}`
    );


    // --------------------------------------------------
    // 7. SAVE LAST SCANNED DIVISION
    // --------------------------------------------------

    await pool.query(
        `
        INSERT INTO capitoll_v2.vote_import_state (
            parliament_number,
            session_number,
            last_decision_division_number
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (parliament_number, session_number) DO UPDATE SET
            last_decision_division_number = EXCLUDED.last_decision_division_number,
            updated_at = NOW()
        `,
        [
            parliamentNumber,
            sessionNumber,
            voteScan.latestDivisionNumber
        ]
    );


    console.log(
        '------------------------------------------'
    );

    console.log(
        'Capitoll data sync finished.'
    );

    console.log(
        '------------------------------------------'
    );

    console.log('');
}


// --------------------------------------------------
// SERVER
// --------------------------------------------------

app.listen(
    PORT,
    () => {

        console.log('');


        console.log(
            `Capitoll V2 server running on http://localhost:${PORT}`
        );


        console.log('');


        const runDataSync =
            async () => {

                const { rows } =
                    await pool.query(
                        `
                        SELECT 1

                        FROM
                            capitoll_v2.initial_import_state

                        WHERE
                            import_name = $1
                        `,
                        [
                            INITIAL_IMPORT_NAME
                        ]
                    );


                if (
                    rows.length === 0
                ) {

                    const summary =
                        await loadInitialData();


                    console.log(
                        'Initial database population complete:',
                        summary
                    );


                    return;
                }


                await syncCurrentData();
            };


        runDataSync()
            .catch(error => {

                console.error(
                    'Automatic data sync failed:'
                );


                console.error(
                    error
                );

            });

    }
);