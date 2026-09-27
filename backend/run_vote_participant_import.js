const pool = require('./db');
const { DecisionQueue } = require('./decision_queue');
const { importThirdReadingDivisions } = require('./vote_importer');
const { importVoteParticipants } = require('./vote_participant_importer');

async function main() {
    try {
        console.log('Finding third-reading votes...');

        const queue = new DecisionQueue();

        const scanResult = await importThirdReadingDivisions(
            pool,
            queue
        );

        console.log(`Found ${queue.pending.length} third-reading decisions.`);

        if (queue.pending.length === 0) {
            console.log('Nothing to import.');
            return;
        }

        let decisionCount = 0;
        let participantCount = 0;

        await queue.drain(async decision => {
            decisionCount++;

            console.log(
                `[${decisionCount}] Importing ${decision.billCode} ` +
                `(division ${decision.decisionDivisionNumber})...`
            );

            const imported = await importVoteParticipants(
                pool,
                decision
            );

            participantCount += imported;

            console.log(`    Imported ${imported} MP votes`);
        });

        console.log('');
        console.log('All vote participants imported!');
        console.log({
            decisionsProcessed: decisionCount,
            participantRecordsProcessed: participantCount,
            latestDivisionNumbers: scanResult.latestDivisionNumbers
        });

    } catch (error) {
        console.error('Vote participant import failed:');
        console.error(error);

    } finally {
        await pool.end();
    }
}

main();