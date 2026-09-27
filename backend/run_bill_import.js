const pool = require('./db');
const { importRelevantBills } = require('./bill_importer');

async function main() {
    try {
        console.log('Starting V2 bill import...');

        const result = await importRelevantBills(pool);

        console.log('Bill import complete!');
        console.log(result);
    } catch (error) {
        console.error('Bill import failed:');
        console.error(error);
    } finally {
        await pool.end();
    }
}

main();