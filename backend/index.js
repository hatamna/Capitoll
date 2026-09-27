const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { MpPhotoError, getMpOfficialPhoto } = require('./mp_photo_service');
const { getBillsAwaitingThirdReading } = require('./bill_service');
const {
    UserVoteError,
    getBillAndRidingVoteResult,
    getRidingVoteHistory
} = require('./user_vote_service');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('CapitalToll backend is running');
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

app.get('/api/bills', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM capitoll_v2.bills ORDER BY id'
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: 'Failed to fetch bills'
        });
    }
});

app.get('/api/bills/awaiting-third-reading', async (req, res) => {
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

app.get('/api/v2/bill-riding-result', async (req, res) => {
    try {
        const result = await getBillAndRidingVoteResult(
            pool,
            req.query.riding_name,
            req.query.bill_code
        );
        res.json(result);
    } catch (error) {
        if (error instanceof UserVoteError) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message
            });
        }

        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Failed to get bill and riding vote result'
        });
    }
});

app.get('/api/v2/ridings/:ridingName/vote-history', async (req, res) => {
    try {
        const result = await getRidingVoteHistory(
            pool,
            req.params.ridingName,
            req.query.bill_code
        );
        res.json(result);
    } catch (error) {
        if (error instanceof UserVoteError) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message
            });
        }

        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Failed to get riding vote history'
        });
    }
});

app.post('/api/votes', async (req, res) => {
    try {
        const { bill_id, riding_id, choice } = req.body;

        if (!bill_id || !riding_id || !choice) {
            return res.status(400).json({
                success: false,
                error: 'bill_id, riding_id, and choice are required'
            });
        }

        const validChoices = ['YES', 'NO', 'ABSTAIN'];

        if (!validChoices.includes(choice)) {
            return res.status(400).json({
                success: false,
                error: 'choice must be YES, NO, or ABSTAIN'
            });
        }

        const billResult = await pool.query(
            'SELECT voting_open FROM bills WHERE id = $1',
            [bill_id]);

        if (billResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Bill not found'
            });
        }

        if (!billResult.rows[0].voting_open) {
            return res.status(400).json({
                success: false,
                error: 'Voting is closed for this bill'
            });
        }

        const ridingResult = await pool.query(
            'SELECT id FROM ridings WHERE id = $1',
            [riding_id]
        );

        if (ridingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Riding not found'
            });
        }

        const result = await pool.query(
            `
            INSERT INTO votes (bill_id, riding_id, choice)
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [bill_id, riding_id, choice]
        );

        res.status(201).json({
            success: true,
            vote: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: 'Failed to submit vote'
        });
    }
});

app.get('/api/bills/:billId/results', async (req, res) => {
    const { billId } = req.params;
    const { riding_id } = req.query;

    try {
        const result = await pool.query(
            `SELECT choice, COUNT(*) AS total_votes
             FROM votes
             WHERE bill_id = $1
               AND riding_id = $2
             GROUP BY choice`,
            [billId, riding_id]
        );

        const counts = {
            YES: 0,
            NO: 0,
            ABSTAIN: 0
        };

        result.rows.forEach(row => {
            counts[row.choice] = parseInt(row.total_votes);
        });

        const totalResponses =
            counts.YES +
            counts.NO +
            counts.ABSTAIN;

        const getPercentage = (count) => {
            if (totalResponses === 0) {
                return 0;
            }

            return Math.round((count / totalResponses) * 100);
        };

        res.json({
            bill_id: parseInt(billId),
            riding_id: parseInt(riding_id),
            total_responses: totalResponses,

            results: {
                YES: {
                    count: counts.YES,
                    percentage: getPercentage(counts.YES)
                },

                NO: {
                    count: counts.NO,
                    percentage: getPercentage(counts.NO)
                },

                ABSTAIN: {
                    count: counts.ABSTAIN,
                    percentage: getPercentage(counts.ABSTAIN)
                }
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Failed to get results'
        });
    }
});

app.get('/api/bills/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM bills WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Bill not found'
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Failed to get bill'
        });
    }
});

app.get('/api/ridings/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM ridings WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Riding not found'
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Failed to get riding'
        });
    }
});

app.get('/api/ridings/:ridingName/mp-photo', async (req, res) => {
    try {
        const result = await getMpOfficialPhoto(pool, req.params.ridingName);
        res.json({ success: true, ...result });
    } catch (error) {
        if (error instanceof MpPhotoError) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message
            });
        }

        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Failed to get MP photo'
        });
    }
});

app.get('/api/mps/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM mps WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'MP not found'
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Failed to get MP'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});