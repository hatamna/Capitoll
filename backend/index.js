const express = require('express');
const cors = require('cors');
const pool = require('./db');

const { importRelevantBills } = require('./bill_importer');
const { importCurrentConstituencies } = require('./constituency_importer');
const { DecisionQueue } = require('./decision_queue');
const { importNewThirdReadingDivisions } = require('./vote_importer');

const { getBillsAwaitingThirdReading } = require('./bill_service');

const {
    UserVoteError,
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
        const result = await pool.query('SELECT NOW()');

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
// BILLS
// --------------------------------------------------

// Get all bills
app.get('/api/v2/bills', async (req, res) => {
    try {
        const { rows } = await pool.query(`
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
                did_reinstate_from_previous_session
            FROM capitoll_v2.bills
            ORDER BY
                parliament_number DESC,
                session_number DESC,
                number_code
        `);

        res.json(rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: 'Failed to fetch bills'
        });
    }
});


// Get bills awaiting third reading
app.get('/api/v2/bills/awaiting-third-reading', async (req, res) => {
    try {
        const bills = await getBillsAwaitingThirdReading(pool);

        res.json(bills);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: 'Failed to fetch bills awaiting third reading'
        });
    }
});


// Get one bill by bill code
// Example: /api/v2/bills/c-2
app.get('/api/v2/bills/:billCode', async (req, res) => {
    try {
        const billCode = req.params.billCode.toLowerCase();

        const { rows } = await pool.query(
            `
            SELECT *
            FROM capitoll_v2.bills
            WHERE bill_code = $1
            ORDER BY
                parliament_number DESC,
                session_number DESC
            LIMIT 1
            `,
            [billCode]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Bill not found'
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: 'Failed to get bill'
        });
    }
});


// --------------------------------------------------
// USER / COMMUNITY VOTES
// --------------------------------------------------

// Submit a community vote
app.post('/api/v2/votes', async (req, res) => {
    try {
        const {
            bill_code,
            riding_name,
            choice
        } = req.body;

        const result = await submitRidingVote(pool, {
            billCode: bill_code,
            ridingName: riding_name,
            choice
        });

        res.status(201).json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error(error);

        if (error instanceof UserVoteError) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to submit vote'
        });
    }
});


// Get community voting results for a bill + riding
//
// Example:
// /api/v2/bills/c-2/results?riding_name=Kanata
app.get('/api/v2/bills/:billCode/results', async (req, res) => {
    try {
        const { billCode } = req.params;
        const { riding_name } = req.query;

        if (!riding_name) {
            return res.status(400).json({
                success: false,
                error: 'riding_name is required'
            });
        }

        const result = await getRidingVoteResult(
            pool,
            billCode.toLowerCase(),
            riding_name
        );

        res.json(result);

    } catch (error) {
        console.error(error);

        if (error instanceof UserVoteError) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to get vote results'
        });
    }
});


// --------------------------------------------------
// BILL + RIDING COMPARISON
// Community result vs actual MP vote
// --------------------------------------------------
//
// Example:
// /api/v2/bill-riding-result?riding_name=Kanata&bill_code=c-5
//

app.get('/api/v2/bill-riding-result', async (req, res) => {
    try {
        const {
            riding_name,
            bill_code
        } = req.query;


        // ------------------------------------------
        // Validate request
        // ------------------------------------------

        if (!riding_name || !bill_code) {
            return res.status(400).json({
                success: false,
                error: 'riding_name and bill_code are required'
            });
        }


        const normalizedBillCode =
            bill_code.toLowerCase().trim();

        const normalizedRidingName =
            riding_name.trim();


        // ------------------------------------------
        // 1. Find the bill
        // ------------------------------------------

        const billResult = await pool.query(
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
                passed_house_third_reading_at
            FROM capitoll_v2.bills
            WHERE LOWER(number_code) = LOWER($1)
            OR LOWER(bill_code) = LOWER($1)
            ORDER BY
                parliament_number DESC,
                session_number DESC
            LIMIT 1
            `,
            [normalizedBillCode]
        );


        if (billResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Bill not found'
            });
        }


        const bill = billResult.rows[0];


        // ------------------------------------------
        // 2. Find the riding
        // ------------------------------------------

        const ridingResult = await pool.query(
            `
            SELECT
                id,
                name,
                mps_by_parliament
            FROM capitoll_v2.ridings
            WHERE LOWER(name) = LOWER($1)
            LIMIT 1
            `,
            [normalizedRidingName]
        );


        if (ridingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Riding not found'
            });
        }


        const riding = ridingResult.rows[0];


        // ------------------------------------------
        // 3. Find which MP represented the riding
        //    during this bill's Parliament/session
        // ------------------------------------------

        const parliamentKey =
            String(bill.parliament_number);


        const mpHistory =
            riding.mps_by_parliament?.[parliamentKey];


        if (!Array.isArray(mpHistory)) {
            return res.status(404).json({
                success: false,
                error: 'No MP history found for this riding and Parliament'
            });
        }


        const sessionMp =
            mpHistory.find(
                entry =>
                    Number(entry.sessionNumber) ===
                    Number(bill.session_number)
            );


        if (!sessionMp?.personId) {
            return res.status(404).json({
                success: false,
                error: 'No MP found for this riding during this bill session'
            });
        }


        // ------------------------------------------
        // 4. Get the MP record
        // ------------------------------------------

        const mpResult = await pool.query(
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
            [sessionMp.personId]
        );


        if (mpResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'MP record not found'
            });
        }


        const mp = mpResult.rows[0];


        // ------------------------------------------
        // 5. Get MP party for that session
        // ------------------------------------------

        let party = null;


        const partyHistory =
            mp.parties_by_parliament?.[parliamentKey];


        if (Array.isArray(partyHistory)) {
            const partySession =
                partyHistory.find(
                    entry =>
                        Number(entry.sessionNumber) ===
                        Number(bill.session_number)
                );


            party =
                partySession?.caucusShortName || null;
        }


        // ------------------------------------------
        // 6. Get actual MP vote
        //
        // Database format:
        // c-5(45-1) -> Y
        // c-3(45-1) -> N
        // ------------------------------------------

        const voteKey = bill.bill_code;

        const rawMpVote =
            mp.votes_by_bill?.[voteKey] ?? null;


        let mpVote = null;


        if (rawMpVote === 'Y') {
            mpVote = 'YES';
        }

        else if (rawMpVote === 'N') {
            mpVote = 'NO';
        }

        else if (rawMpVote) {
            mpVote = rawMpVote;
        }


        // ------------------------------------------
        // 7. Get Capitoll community result
        // ------------------------------------------

        let community;


        try {
            community = await getRidingVoteResult(
                pool,
                normalizedBillCode,
                riding.name
            );

        } catch (error) {

            if (error instanceof UserVoteError) {

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


        // ------------------------------------------
        // 8. Return combined result
        // ------------------------------------------

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
                    bill.passed_house_third_reading_at
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
            error: 'Failed to get bill and riding comparison'
        });
    }
});


// --------------------------------------------------
// RIDINGS
// --------------------------------------------------

// Get all ridings
app.get('/api/v2/ridings', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                id,
                name,
                mps_by_parliament
            FROM capitoll_v2.ridings
            ORDER BY name
        `);

        res.json(rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: 'Failed to get ridings'
        });
    }
});


// Get one riding by ID
app.get('/api/v2/ridings/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `
            SELECT *
            FROM capitoll_v2.ridings
            WHERE id = $1
            `,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Riding not found'
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: 'Failed to get riding'
        });
    }
});


// --------------------------------------------------
// MPs
// --------------------------------------------------

// Get all current MPs
app.get('/api/v2/mps', async (req, res) => {
    try {
        // Find the newest Parliament/session stored in our database
        const sessionResult = await pool.query(`
            SELECT
                parliament_number,
                session_number
            FROM capitoll_v2.bills
            ORDER BY
                parliament_number DESC,
                session_number DESC
            LIMIT 1
        `);

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No current Parliament/session found'
            });
        }

        const {
            parliament_number,
            session_number
        } = sessionResult.rows[0];

        const parliamentKey = String(parliament_number);

        const { rows } = await pool.query(
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

                (
                    SELECT entry->>'ridingName'
                    FROM jsonb_array_elements(
                        COALESCE(
                            m.ridings_by_parliament -> ($1::text),
                            '[]'::jsonb
                        )
                    ) AS entry
                    WHERE
                        (entry->>'sessionNumber')::int = $2
                    LIMIT 1
                ) AS riding_name,

                (
                    SELECT entry->>'caucusShortName'
                    FROM jsonb_array_elements(
                        COALESCE(
                            m.parties_by_parliament -> ($1::text),
                            '[]'::jsonb
                        )
                    ) AS entry
                    WHERE
                        (entry->>'sessionNumber')::int = $2
                    LIMIT 1
                ) AS party

            FROM capitoll_v2.mps AS m

            WHERE EXISTS (
                SELECT 1
                FROM jsonb_array_elements(
                    COALESCE(
                        m.ridings_by_parliament -> ($1::text),
                        '[]'::jsonb
                    )
                ) AS entry
                WHERE
                    (entry->>'sessionNumber')::int = $2
            )

            ORDER BY
                m.official_last_name,
                m.official_first_name
            `,
            [
                parliamentKey,
                session_number
            ]
        );

        res.json({
            success: true,
            parliament: parliament_number,
            session: session_number,
            count: rows.length,
            mps: rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: 'Failed to get current MPs'
        });
    }
});

// Get one MP by Parliament Person ID
app.get('/api/v2/mps/:personId', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `
            SELECT *
            FROM capitoll_v2.mps
            WHERE person_id = $1
            `,
            [req.params.personId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'MP not found'
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: 'Failed to get MP'
        });
    }
});


// Get official MP photo using riding name
//
// Example:
// /api/v2/mp-photo?riding_name=Kanata
app.get('/api/v2/mp-photo', async (req, res) => {
    try {
        const { riding_name } = req.query;

        if (!riding_name) {
            return res.status(400).json({
                success: false,
                error: 'riding_name is required'
            });
        }

        const result = await getMpOfficialPhoto(
            pool,
            riding_name
        );

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error(error);

        if (error instanceof MpPhotoError) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to get MP photo'
        });
    }
});


// --------------------------------------------------
// AUTOMATIC PARLIAMENT DATA SYNC
// --------------------------------------------------

async function syncCurrentData() {
    console.log('');
    console.log('------------------------------------------');
    console.log('Starting Capitoll data sync...');
    console.log('------------------------------------------');


    // --------------------------------------------------
    // 1. IMPORT / UPDATE BILLS
    // --------------------------------------------------

    const billResult =
        await importRelevantBills(pool);


    console.log(
        `Bills synced: ${billResult.importedCount}`
    );


    if (!billResult.currentParlSession) {
        console.log(
            'Could not determine current Parliament/session.'
        );

        return;
    }


    const {
        parliamentNumber,
        sessionNumber
    } = billResult.currentParlSession;


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
            SELECT last_decision_division_number
            FROM capitoll_v2.vote_import_state
            WHERE parliament_number = $1
              AND session_number = $2
            `,
            [
                parliamentNumber,
                sessionNumber
            ]
        );


    const lastDivisionNumber =
        stateResult.rows[0]
            ?.last_decision_division_number || 0;


    console.log(
        `Last scanned division: ${lastDivisionNumber}`
    );


    // --------------------------------------------------
    // 5. FIND NEW THIRD-READING DIVISIONS
    // --------------------------------------------------

    const voteScan =
        await importNewThirdReadingDivisions(
            pool,
            queue,
            parliamentNumber,
            sessionNumber,
            lastDivisionNumber
        );


    console.log(
        `New third-reading decisions queued: ${voteScan.queuedCount}`
    );


    console.log('------------------------------------------');
    console.log('Capitoll data sync finished.');
    console.log('------------------------------------------');
    console.log('');
}


// --------------------------------------------------
// SERVER
// --------------------------------------------------

app.listen(PORT, () => {
    console.log('');

    console.log(
        `Capitoll V2 server running on http://localhost:${PORT}`
    );

    console.log('');


    syncCurrentData().catch(error => {
        console.error('Automatic data sync failed:');
        console.error(error);
    });
});