const pool = require('./db');
const {
    importCurrentConstituencies
} = require('./constituency_importer');

async function main() {
    try {
        console.log('Starting constituency import...');

        const importedCount =
            await importCurrentConstituencies(pool, {
                parliamentNumber: 45,
                sessionNumber: 1
            });

        console.log('Constituency import complete!');
        console.log({
            importedCount
        });

    } catch (error) {
        console.error('Constituency import failed:');
        console.error(error);

    } finally {
        await pool.end();
    }
}

main();