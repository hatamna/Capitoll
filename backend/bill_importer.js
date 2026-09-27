const ALL_BILLS_FEED_URL =
    'https://www.parl.ca/LegisInfo/en/bills/xml?parlsession=all&chamber=1';

const AWAITING_THIRD_READING_FEED_URL =
    'https://www.parl.ca/LegisInfo/en/bills/xml?chamber=1&parlsession=all&status=354';


const BILL_XML_QUERY = `
    SELECT
        (xpath('string(/Bill/Id)', bill_xml))[1]::text
            AS id,

        (xpath('string(/Bill/NumberCode)', bill_xml))[1]::text
            AS number_code,

        (xpath('string(/Bill/ParliamentNumber)', bill_xml))[1]::text
            AS parliament_number,

        (xpath('string(/Bill/SessionNumber)', bill_xml))[1]::text
            AS session_number,

        (xpath('string(/Bill/LongTitleEn)', bill_xml))[1]::text
            AS long_title_en,

        (xpath('string(/Bill/LongTitleFr)', bill_xml))[1]::text
            AS long_title_fr,

        (xpath('string(/Bill/StatusName)', bill_xml))[1]::text
            AS status,

        (xpath('string(/Bill/StatusNameEn)', bill_xml))[1]::text
            AS status_en,

        (xpath(
            'string(/Bill/LatestCompletedMajorStageNameEn)',
            bill_xml
        ))[1]::text
            AS latest_completed_major_stage_name_en,

        (xpath(
            'string(/Bill/LatestCompletedMajorStageNameWithChamberSuffix)',
            bill_xml
        ))[1]::text
            AS latest_completed_major_stage_with_chamber,

        (xpath(
            'string(/Bill/OngoingStageNameEn)',
            bill_xml
        ))[1]::text
            AS ongoing_stage_name_en,

        (xpath(
            'string(/Bill/OngoingStageChamberNameEn)',
            bill_xml
        ))[1]::text
            AS ongoing_stage_chamber_name_en,

        (xpath(
            'string(/Bill/PassedHouseThirdReadingDateTime)',
            bill_xml
        ))[1]::text
            AS passed_house_third_reading_at,

        (xpath(
            'string(/Bill/DidReinstateFromPreviousSession)',
            bill_xml
        ))[1]::text
            AS did_reinstate_from_previous_session

    FROM unnest(
        xpath(
            '/Bills/Bill',
            XMLPARSE(DOCUMENT $1)
        )
    ) AS records(bill_xml)
`;


const INSERT_COLUMNS = [
    'id',
    'bill_code',
    'number_code',
    'parliament_number',
    'session_number',
    'long_title_en',
    'long_title_fr',
    'status',
    'passed_house_third_reading_at',
    'did_reinstate_from_previous_session',
    'has_been_voted_on'
];


const UPSERT_SQL = `
    INSERT INTO capitoll_v2.bills AS stored (${INSERT_COLUMNS.join(', ')})
    VALUES
`;


function parseBoolean(value) {
    return ['true', '1'].includes(
        String(value).trim().toLowerCase()
    );
}

function normalize(value) {
    return value?.trim().toLowerCase() || '';
}

function isThirdReading(value) {
    return normalize(value).includes('third reading');
}

function hasPassedHouseThirdReading(row, passedAt) {
    return Boolean(passedAt && !passedAt.startsWith('0001-01-01')) || (
        isThirdReading(row.latest_completed_major_stage_name_en) &&
        normalize(row.latest_completed_major_stage_with_chamber)
            .includes('house of commons')
    );
}

function isAtHouseThirdReading(row) {
    const status = normalize(row.status_en || row.status);
    const ongoingStage = normalize(row.ongoing_stage_name_en);
    const ongoingChamber = normalize(row.ongoing_stage_chamber_name_en);

    return (
        isThirdReading(ongoingStage) &&
        (
            ongoingChamber.includes('house of commons') ||
            status.includes('house of commons')
        )
    ) || (
        status.includes('third reading') &&
        status.includes('house of commons')
    );
}


function mapRelevantBills(rows) {
    const uniqueBills = new Map();

    for (const row of rows) {
        const passedAt =
            row.passed_house_third_reading_at?.trim();

        const hasPassedThirdReading =
            hasPassedHouseThirdReading(row, passedAt);

        if (!hasPassedThirdReading && !isAtHouseThirdReading(row)) {
            continue;
        }

        const parliamentNumber =
            Number(row.parliament_number);

        const sessionNumber =
            Number(row.session_number);

        const numberCode =
            row.number_code?.trim();


        if (
            !row.id ||
            !Number.isInteger(parliamentNumber) ||
            parliamentNumber < 40 ||
            !Number.isInteger(sessionNumber) ||
            sessionNumber <= 0 ||
            !/^C-[1-9]\d{0,3}$/i.test(numberCode || '')
        ) {
            continue;
        }


        uniqueBills.set(row.id, {
            id: row.id,

            billCode:
                `${numberCode.toLowerCase()}(${parliamentNumber}-${sessionNumber})`,

            numberCode,

            parliamentNumber,

            sessionNumber,

            longTitleEn:
                row.long_title_en?.trim() || '',

            longTitleFr:
                row.long_title_fr?.trim() || '',

            status:
                row.status_en?.trim() ||
                row.status?.trim() ||
                '',

            passedAt:
                passedAt &&
                    !passedAt.startsWith('0001-01-01')
                    ? passedAt
                    : null,

            hasBeenVotedOn: hasPassedThirdReading,

            didReinstate:
                parseBoolean(
                    row.did_reinstate_from_previous_session
                )
        });
    }


    return [...uniqueBills.values()];
}


function findCurrentParlSession(rows) {
    const sessions = rows
        .map(row => ({
            parliamentNumber:
                Number(row.parliament_number),

            sessionNumber:
                Number(row.session_number)
        }))
        .filter(session =>
            Number.isInteger(session.parliamentNumber) &&
            session.parliamentNumber >= 40 &&
            Number.isInteger(session.sessionNumber) &&
            session.sessionNumber > 0
        );


    sessions.sort((left, right) =>
        right.parliamentNumber -
        left.parliamentNumber ||

        right.sessionNumber -
        left.sessionNumber
    );


    return sessions[0] || null;
}


function makeUpsertQuery(bills) {
    const values = [];
    const rows = bills.map((bill, rowIndex) => {
        const rowValues = [
            bill.id,
            bill.billCode,
            bill.numberCode,
            bill.parliamentNumber,
            bill.sessionNumber,
            bill.longTitleEn,
            bill.longTitleFr,
            bill.status,
            bill.passedAt,
            bill.didReinstate,
            bill.hasBeenVotedOn
        ];
        const firstParameter = rowIndex * INSERT_COLUMNS.length;
        values.push(...rowValues);
        return `(${rowValues.map((_, index) => `$${firstParameter + index + 1}`).join(', ')})`;
    });

    return {
        text: `
            ${UPSERT_SQL}${rows.join(', ')}
            ON CONFLICT (id) DO UPDATE SET
                bill_code = EXCLUDED.bill_code,
                number_code = EXCLUDED.number_code,
                parliament_number = EXCLUDED.parliament_number,
                session_number = EXCLUDED.session_number,
                long_title_en = EXCLUDED.long_title_en,
                long_title_fr = EXCLUDED.long_title_fr,
                status = EXCLUDED.status,
                passed_house_third_reading_at = EXCLUDED.passed_house_third_reading_at,
                did_reinstate_from_previous_session = EXCLUDED.did_reinstate_from_previous_session,
                has_been_voted_on = EXCLUDED.has_been_voted_on
        `,
        values
    };
}


async function importRelevantBills(
    pool,
    fetchImpl = fetch
) {
    const urls = [
        ALL_BILLS_FEED_URL,
        AWAITING_THIRD_READING_FEED_URL
    ];


    const rowsByFeed = await Promise.all(

        urls.map(async url => {

            const response = await fetchImpl(
                url,
                {
                    headers: {
                        Accept:
                            'application/xml, text/xml'
                    }
                }
            );


            if (!response.ok) {
                throw new Error(
                    `LegisInfo bill feed returned HTTP ${response.status}`
                );
            }


            const xml =
                await response.text();


            const { rows } =
                await pool.query(
                    BILL_XML_QUERY,
                    [xml]
                );


            return rows;
        })
    );


    const allRows =
        rowsByFeed.flat();


    const currentParlSession =
        findCurrentParlSession(allRows);


    if (!currentParlSession) {
        return {
            importedCount: 0,
            currentParlSession: null
        };
    }


    const bills =
        mapRelevantBills(allRows);

    if (bills.length === 0) {
        return {
            importedCount: 0,
            currentParlSession
        };
    }


    const client =
        await pool.connect();


    try {
        await client.query('BEGIN');


        for (
            let offset = 0;
            offset < bills.length;
            offset += 500
        ) {

            const batch =
                bills.slice(
                    offset,
                    offset + 500
                );


            const query =
                makeUpsertQuery(batch);


            await client.query(
                query.text,
                query.values
            );
        }

        await client.query(`
            DELETE FROM capitoll_v2.bills
            WHERE NOT (id = ANY($1::bigint[]))
        `, [bills.map(bill => bill.id)]);


        await client.query('COMMIT');

    } catch (error) {

        await client.query('ROLLBACK');
        throw error;

    } finally {

        client.release();
    }


    return {
        importedCount: bills.length,
        currentParlSession
    };
}


module.exports = {
    importRelevantBills,
    mapRelevantBills
};