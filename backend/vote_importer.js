const VOTES_FEED_URL =
    'https://www.ourcommons.ca/Members/en/votes/xml?parlSession=';

const VOTE_XML_QUERY = `
    SELECT
        (xpath('string(/Vote/ParliamentNumber)', vote_xml))[1]::text
            AS parliament_number,

        (xpath('string(/Vote/SessionNumber)', vote_xml))[1]::text
            AS session_number,

        (xpath('string(/Vote/DecisionDivisionNumber)', vote_xml))[1]::text
            AS decision_division_number,

        (xpath('string(/Vote/DecisionDivisionSubject)', vote_xml))[1]::text
            AS decision_division_subject,

        (xpath('string(/Vote/BillNumberCode)', vote_xml))[1]::text
            AS bill_number_code

    FROM unnest(
        xpath(
            '/ArrayOfVote/Vote',
            XMLPARSE(DOCUMENT $1)
        )
    ) AS votes(vote_xml)
`;

async function fetchSessionVotes(pool, parliamentNumber, sessionNumber, fetchImpl) {
    const sessionCode = `${parliamentNumber}-${sessionNumber}`;
    const response = await fetchImpl(
        `${VOTES_FEED_URL}${encodeURIComponent(sessionCode)}`,
        { headers: { Accept: 'application/xml, text/xml' } }
    );

    if (!response.ok) {
        throw new Error(
            `House votes feed for ${sessionCode} returned HTTP ${response.status}`
        );
    }

    const xml = await response.text();
    const { rows } = await pool.query(VOTE_XML_QUERY, [xml]);
    return rows;
}

function getLatestDivisionNumber(votes, parliamentNumber, sessionNumber) {
    return votes.reduce((latest, vote) => {
        const voteParliament = Number(vote.parliament_number);
        const voteSession = Number(vote.session_number);
        const divisionNumber = Number(vote.decision_division_number);

        if (voteParliament !== parliamentNumber || voteSession !== sessionNumber ||
            !Number.isInteger(divisionNumber)) {
            return latest;
        }

        return Math.max(latest, divisionNumber);
    }, 0);
}

function enqueueBillVotes(
    votes,
    queue,
    parliamentNumber,
    sessionNumber,
    minimumDivisionNumber = 0,
    eligibleBillNumberCodes = null
) {
    if (parliamentNumber < 40) {
        return 0;
    }

    const imported = new Set();

    for (const vote of votes) {
        const voteParliamentNumber = Number(vote.parliament_number);
        const voteSessionNumber = Number(vote.session_number);
        const decisionDivisionNumber = Number(vote.decision_division_number);
        const billNumberCode = vote.bill_number_code?.trim();

        if (voteParliamentNumber !== parliamentNumber ||
            voteSessionNumber !== sessionNumber ||
            decisionDivisionNumber <= minimumDivisionNumber ||
            !Number.isInteger(decisionDivisionNumber) ||
            !/^C-[1-9]\d{0,3}$/i.test(billNumberCode || '') ||
            (eligibleBillNumberCodes &&
                !eligibleBillNumberCodes.has(billNumberCode.toLowerCase()))) {
            continue;
        }

        const billCode =
            `${billNumberCode.toLowerCase()}(${voteParliamentNumber}-${voteSessionNumber})`;
        const key = `${voteParliamentNumber}-${voteSessionNumber}-${decisionDivisionNumber}-${billCode}`;

        if (imported.has(key)) {
            continue;
        }

        queue.enqueue({
            parliamentNumber: voteParliamentNumber,
            sessionNumber: voteSessionNumber,
            decisionDivisionNumber,
            billCode
        });
        imported.add(key);
    }

    return imported.size;
}

async function importBillVoteDivisions(pool, queue, fetchImpl = fetch) {
    const { rows: sessions } = await pool.query(`
        SELECT
            parliament_number,
            session_number,
            ARRAY_AGG(DISTINCT LOWER(number_code)) AS bill_number_codes
        FROM capitoll_v2.bills
        WHERE parliament_number >= 40
          AND session_number >= 1
        GROUP BY parliament_number, session_number
        ORDER BY parliament_number, session_number
    `);

    let queuedCount = 0;
    const latestDivisionNumbers = {};

    for (const session of sessions) {
        const parliamentNumber = Number(session.parliament_number);
        const sessionNumber = Number(session.session_number);
        if (!Number.isInteger(parliamentNumber) || parliamentNumber < 40 ||
            !Number.isInteger(sessionNumber) || sessionNumber < 1) {
            continue;
        }

        const votes = await fetchSessionVotes(
            pool,
            parliamentNumber,
            sessionNumber,
            fetchImpl
        );
        latestDivisionNumbers[`${parliamentNumber}-${sessionNumber}`] =
            getLatestDivisionNumber(votes, parliamentNumber, sessionNumber);
        queuedCount += enqueueBillVotes(
            votes,
            queue,
            parliamentNumber,
            sessionNumber,
            0,
            new Set(session.bill_number_codes)
        );
    }

    return {
        queuedCount,
        latestDivisionNumbers
    };
}

async function importNewBillVoteDivisions(
    pool,
    queue,
    parliamentNumber,
    sessionNumber,
    lastDivisionNumber,
    fetchImpl = fetch
) {
    if (parliamentNumber < 40 || sessionNumber < 1) {
        return {
            newVotesFound: false,
            latestDivisionNumber: lastDivisionNumber,
            queuedCount: 0
        };
    }

    const votes = await fetchSessionVotes(
        pool,
        parliamentNumber,
        sessionNumber,
        fetchImpl
    );
        const { rows: billRows } = await pool.query(`
            SELECT DISTINCT LOWER(number_code) AS number_code
            FROM capitoll_v2.bills
            WHERE parliament_number = $1
              AND session_number = $2
        `, [parliamentNumber, sessionNumber]);
    const latestDivisionNumber = getLatestDivisionNumber(
        votes,
        parliamentNumber,
        sessionNumber
    );

    if (latestDivisionNumber <= lastDivisionNumber) {
        return { newVotesFound: false, latestDivisionNumber, queuedCount: 0 };
    }

    const queuedCount = enqueueBillVotes(
        votes,
        queue,
        parliamentNumber,
        sessionNumber,
        lastDivisionNumber,
        new Set(billRows.map(row => row.number_code))
    );

    return { newVotesFound: true, latestDivisionNumber, queuedCount };
}

module.exports = {
    enqueueBillVotes,
    importBillVoteDivisions,
    importNewBillVoteDivisions
};