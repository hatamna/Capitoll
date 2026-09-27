const pool = require('./db');
const { importRelevantBills } = require('./bill_importer');
const { importCurrentConstituencies } = require('./constituency_importer');
const { DecisionQueue } = require('./decision_queue');
const { importThirdReadingDivisions } = require('./vote_importer');
const { importVoteParticipants } = require('./vote_participant_importer');

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

    const constituencyCount = await importCurrentConstituencies(
        pool,
        billImport.currentParlSession
    );
    const decisionQueue = new DecisionQueue();
    const { queuedCount } = await importThirdReadingDivisions(pool, decisionQueue);
    let voteParticipantCount = 0;

    await decisionQueue.drain(async decision => {
        voteParticipantCount += await importVoteParticipants(pool, decision);
    });

    return {
        bills: billImport.importedCount,
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

module.exports = { loadInitialData };