const pool = require('./db');
const { importRelevantBills } = require('./bill_importer');
const { importCurrentConstituencies } = require('./constituency_importer');
const { DecisionQueue } = require('./decision_queue');
const { importBillVoteDivisions } = require('./vote_importer');
const {
    importVoteParticipants,
    initializeBillRidingVoteEntries
} = require('./vote_participant_importer');

const INITIAL_IMPORT_NAME = 'capitoll_v2_composite_session_maps';

async function loadInitialData() {
    const billImport = await importRelevantBills(pool);
    if (!billImport.currentParlSession) {
        return {
            bills: billImport.importedCount,
            constituencies: 0,
            voteDivisions: 0,
            voteParticipants: 0
        };
    }

    const { rows: sessions } = await pool.query(`
        SELECT DISTINCT parliament_number, session_number
        FROM capitoll_v2.bills
        ORDER BY parliament_number, session_number
    `);

    await pool.query(`
        UPDATE capitoll_v2.mps
        SET ridings_by_parliament = '{}'::jsonb,
            votes_by_bill = '{}'::jsonb
    `);
    await pool.query(`
        UPDATE capitoll_v2.ridings
        SET mps_by_parliament = '{}'::jsonb
    `);

    let constituencyCount = 0;

    for (const session of sessions) {
        const parliamentNumber = Number(session.parliament_number);
        const sessionNumber = Number(session.session_number);
        constituencyCount += await importCurrentConstituencies(pool, {
            parliamentNumber,
            sessionNumber
        });
        await initializeBillRidingVoteEntries(
            pool,
            parliamentNumber,
            sessionNumber,
            true
        );
    }

    const decisionQueue = new DecisionQueue();
    const { queuedCount, latestDivisionNumbers } =
        await importBillVoteDivisions(pool, decisionQueue);
    let voteParticipantCount = 0;

    await decisionQueue.drain(async decision => {
        voteParticipantCount += await importVoteParticipants(pool, decision);
    });

    for (const [sessionKey, lastDivisionNumber] of Object.entries(latestDivisionNumbers)) {
        const [parliamentNumber, sessionNumber] = sessionKey.split('-').map(Number);
        await pool.query(`
            INSERT INTO capitoll_v2.vote_import_state (
                parliament_number,
                session_number,
                last_decision_division_number
            )
            VALUES ($1, $2, $3)
            ON CONFLICT (parliament_number, session_number) DO UPDATE SET
                last_decision_division_number = EXCLUDED.last_decision_division_number,
                updated_at = NOW()
        `, [parliamentNumber, sessionNumber, lastDivisionNumber]);
    }

    await pool.query(`
        INSERT INTO capitoll_v2.initial_import_state (
            import_name,
            current_parliament_number,
            current_session_number
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (import_name) DO UPDATE SET
            completed_at = NOW(),
            current_parliament_number = EXCLUDED.current_parliament_number,
            current_session_number = EXCLUDED.current_session_number
    `, [
        INITIAL_IMPORT_NAME,
        billImport.currentParlSession.parliamentNumber,
        billImport.currentParlSession.sessionNumber
    ]);

    return {
        bills: billImport.importedCount,
        parliamentSessions: sessions.length,
        constituencies: constituencyCount,
        voteDivisions: queuedCount,
        voteParticipants: voteParticipantCount
    };
}

if (require.main === module) {
    loadInitialData()
        .then(summary => console.log('Initial import complete:', summary))
        .catch(error => {
            console.error('Initial import failed:', error);
            process.exitCode = 1;
        })
        .finally(() => pool.end());
}

module.exports = { INITIAL_IMPORT_NAME, loadInitialData };