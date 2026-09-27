const CONSTITUENCIES_FEED_URL =
    'https://www.ourcommons.ca/members/en/constituencies/xml?parlSession=';

const CONSTITUENCIES_XML_QUERY = `
    SELECT
        (xpath('string(PersonId)', constituency_xml))[1]::text AS person_id,
        (xpath('string(Name)', constituency_xml))[1]::text AS riding_name,
        (xpath('string(CurrentPersonOfficialFirstName)', constituency_xml))[1]::text
            AS official_first_name,
        (xpath('string(CurrentPersonOfficialLastName)', constituency_xml))[1]::text
            AS official_last_name,
        (xpath('string(CurrentCaucusShortName)', constituency_xml))[1]::text
            AS caucus_short_name
    FROM unnest(
        xpath('/ArrayOfConstituency/Constituency', XMLPARSE(DOCUMENT $1))
    ) AS constituencies(constituency_xml)
`;

function mapConstituencies(rows) {
    const recordsByPerson = new Map();

    for (const row of rows) {
        const personId = row.person_id?.trim();
        const ridingName = row.riding_name?.trim();

        if (!/^\d+$/.test(personId || '') || /^0+$/.test(personId) || !ridingName) {
            continue;
        }

        recordsByPerson.set(personId, {
            personId,
            ridingName,
            officialFirstName: row.official_first_name?.trim() || '',
            officialLastName: row.official_last_name?.trim() || '',
            caucusShortName: row.caucus_short_name?.trim() || ''
        });
    }

    return [...recordsByPerson.values()];
}

function withSessionValue(historyByParliament, parliamentNumber, sessionNumber, field, value) {
    const updatedHistory = historyByParliament && typeof historyByParliament === 'object'
        ? { ...historyByParliament }
        : {};
    const parliamentKey = String(parliamentNumber);
    const previousEntries = updatedHistory[parliamentKey];
    const sessionEntries = Array.isArray(previousEntries) ? previousEntries : [];

    updatedHistory[parliamentKey] = [
        ...sessionEntries.filter(entry => Number(entry.sessionNumber) !== sessionNumber),
        { sessionNumber, [field]: value }
    ].sort((left, right) => left.sessionNumber - right.sessionNumber);

    return updatedHistory;
}

function makeUpsertValues(records, columnsPerRow, buildRow, jsonColumns) {
    const values = [];
    const tuples = records.map((record, rowIndex) => {
        const rowValues = buildRow(record);
        const firstParameter = rowIndex * columnsPerRow;
        values.push(...rowValues);
        return `(${rowValues.map((_, columnIndex) => {
            const parameter = `$${firstParameter + columnIndex + 1}`;
            return jsonColumns.includes(columnIndex)
                ? `${parameter}::jsonb`
                : parameter;
        }).join(', ')})`;
    });

    return { tuples: tuples.join(', '), values };
}

async function importCurrentConstituencies(pool, parlSession, fetchImpl = fetch) {
    if (!parlSession || !Number.isInteger(parlSession.parliamentNumber) ||
        !Number.isInteger(parlSession.sessionNumber)) {
        return 0;
    }

    const sessionCode =
        `${parlSession.parliamentNumber}-${parlSession.sessionNumber}`;
    const response = await fetchImpl(
        `${CONSTITUENCIES_FEED_URL}${encodeURIComponent(sessionCode)}`,
        { headers: { Accept: 'application/xml, text/xml' } }
    );

    if (!response.ok) {
        throw new Error(
            `Constituencies feed for ${sessionCode} returned HTTP ${response.status}`
        );
    }

    const xml = await response.text();
    const { rows } = await pool.query(CONSTITUENCIES_XML_QUERY, [xml]);
    const constituencies = mapConstituencies(rows);

    if (constituencies.length === 0) {
        return 0;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const ridingNames = [...new Set(constituencies.map(record => record.ridingName))];
        await client.query(`
            INSERT INTO capitoll_v2.ridings (name)
            SELECT riding_name
            FROM unnest($1::text[]) AS names(riding_name)
            ON CONFLICT (name) DO NOTHING
        `, [ridingNames]);

        const personIds = constituencies.map(record => record.personId);
        const [ridingResult, mpResult] = await Promise.all([
            client.query(`
                SELECT name, mps_by_parliament
                FROM capitoll_v2.ridings
                WHERE name = ANY($1::text[])
            `, [ridingNames]),
            client.query(`
                SELECT
                    person_id,
                    official_first_name,
                    official_last_name,
                    ridings_by_parliament,
                    parties_by_parliament
                FROM capitoll_v2.mps
                WHERE person_id = ANY($1::bigint[])
            `, [personIds])
        ]);

        const ridingHistories = new Map(
            ridingResult.rows.map(row => [row.name, row.mps_by_parliament])
        );
        const mpHistories = new Map(
            mpResult.rows.map(row => [String(row.person_id), row])
        );

        const mpRecords = constituencies.map(record => {
            const existing = mpHistories.get(record.personId);
            return {
                personId: record.personId,
                officialFirstName: record.officialFirstName,
                officialLastName: record.officialLastName,
                ridingsByParliament: withSessionValue(
                    existing?.ridings_by_parliament,
                    parlSession.parliamentNumber,
                    parlSession.sessionNumber,
                    'ridingName',
                    record.ridingName
                ),
                partiesByParliament: withSessionValue(
                    existing?.parties_by_parliament,
                    parlSession.parliamentNumber,
                    parlSession.sessionNumber,
                    'caucusShortName',
                    record.caucusShortName
                )
            };
        });

        const ridingRecordsByName = new Map();
        for (const record of constituencies) {
            ridingRecordsByName.set(record.ridingName, {
                ridingName: record.ridingName,
                mpsByParliament: withSessionValue(
                    ridingHistories.get(record.ridingName),
                    parlSession.parliamentNumber,
                    parlSession.sessionNumber,
                    'personId',
                    record.personId
                )
            });
        }
        const ridingRecords = [...ridingRecordsByName.values()];

        const mpValues = makeUpsertValues(mpRecords, 5, record => [
            record.personId,
            record.officialFirstName,
            record.officialLastName,
            JSON.stringify(record.ridingsByParliament),
            JSON.stringify(record.partiesByParliament)
        ], [3, 4]);
        await client.query(`
            INSERT INTO capitoll_v2.mps AS stored (
                person_id,
                official_first_name,
                official_last_name,
                ridings_by_parliament,
                parties_by_parliament
            ) VALUES ${mpValues.tuples}
            ON CONFLICT (person_id) DO UPDATE SET
                official_first_name = COALESCE(
                    NULLIF(EXCLUDED.official_first_name, ''),
                    stored.official_first_name
                ),
                official_last_name = COALESCE(
                    NULLIF(EXCLUDED.official_last_name, ''),
                    stored.official_last_name
                ),
                ridings_by_parliament = EXCLUDED.ridings_by_parliament,
                parties_by_parliament = EXCLUDED.parties_by_parliament
        `, mpValues.values);

        const ridingValues = makeUpsertValues(ridingRecords, 2, record => [
            record.ridingName,
            JSON.stringify(record.mpsByParliament)
        ], [1]);
        await client.query(`
            INSERT INTO capitoll_v2.ridings (name, mps_by_parliament)
            VALUES ${ridingValues.tuples}
            ON CONFLICT (name) DO UPDATE SET
                mps_by_parliament = EXCLUDED.mps_by_parliament
        `, ridingValues.values);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return constituencies.length;
}

module.exports = { importCurrentConstituencies, mapConstituencies };