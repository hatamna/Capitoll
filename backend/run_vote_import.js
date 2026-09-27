const pool = require('./db');
const { DecisionQueue } = require('./decision_queue');
const { importBillVoteDivisions } = require('./vote_importer');

async function main() {
    try {
        console.log('Starting vote import...');

        const queue = new DecisionQueue();

        const result = await importBillVoteDivisions(
            pool,
            queue
        );

        console.log('Vote import scan complete!');
        console.log(result);

        console.log('Queued decisions:', queue.pending);

    } catch (error) {
        console.error('Vote import failed:');
        console.error(error);

    } finally {
        await pool.end();
    }
}

main();