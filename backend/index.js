const express = require('express');
const pool = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());

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
            'SELECT * FROM bills ORDER BY id'
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
    try {
        const billId = req.params.billId;
        const ridingId = req.query.riding_id;

        const result = await pool.query(
            `
            SELECT choice, COUNT(*) AS total_votes
            FROM votes
            WHERE bill_id = $1
              AND riding_id = $2
            GROUP BY choice
            `,
            [billId, ridingId]
        );

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: 'Failed to fetch vote results'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});