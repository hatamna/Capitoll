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

    const billResult = await importRelevantBills(pool);

    console.log(
        `Bills synced: ${billResult.importedCount}`
    );


    // We need the current Parliament/session before
    // importing constituencies or divisions.
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

    const queue = new DecisionQueue();


    // --------------------------------------------------
    // 4. FIND LAST DIVISION WE ALREADY SCANNED
    // --------------------------------------------------

    const stateResult = await pool.query(
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
        stateResult.rows[0]?.last_decision_division_number || 0;

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