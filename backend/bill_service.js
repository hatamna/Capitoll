async function getBillsAwaitingThirdReading(pool) {
    const { rows } = await pool.query(`
        SELECT
            id,
            bill_code,
            number_code,
            parliament_number,
            session_number,
            long_title_en,
            long_title_fr,
            status,
            did_reinstate_from_previous_session
        FROM capitoll_v2.bills
        WHERE passed_house_third_reading_at IS NULL
          AND status ILIKE '%third reading%'
          AND status ILIKE '%house of commons%'
          AND (parliament_number, session_number) = (
              SELECT
                  parliament_number,
                  session_number
              FROM capitoll_v2.bills
              ORDER BY parliament_number DESC, session_number DESC
              LIMIT 1
          )
        ORDER BY number_code
    `);

    return rows;
}

module.exports = { getBillsAwaitingThirdReading };