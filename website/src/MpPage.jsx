import { useEffect, useState } from 'react';

import {
    useNavigate,
    useParams
} from 'react-router-dom';

import './App.css';

import logo from './assets/capitollLogo.png';


function getLatestValue(
    history,
    field
) {
    if (
        !history ||
        typeof history !== 'object'
    ) {
        return '';
    }


    const parliamentNumbers =
        Object.keys(history).sort(
            (a, b) =>
                Number(b) - Number(a)
        );


    for (
        const parliamentNumber
        of parliamentNumbers
    ) {

        const sessions =
            history[parliamentNumber];


        if (!Array.isArray(sessions)) {
            continue;
        }


        const sortedSessions =
            [...sessions].sort(
                (a, b) =>
                    Number(
                        b.sessionNumber || 0
                    ) -
                    Number(
                        a.sessionNumber || 0
                    )
            );


        for (
            const session
            of sortedSessions
        ) {

            if (
                session?.[field]
            ) {
                return session[field];
            }

        }

    }


    return '';
}


function cleanBillCode(value) {
    return String(value || '')
        .replace(
            /\(\d+-\d+\)$/g,
            ''
        )
        .trim();
}


function normalizeVote(value) {
    const vote =
        String(value || '')
            .trim()
            .toLowerCase();


    if (
        vote === 'yes' ||
        vote === 'yea' ||
        vote === 'for'
    ) {
        return 'YES';
    }


    if (
        vote === 'no' ||
        vote === 'nay' ||
        vote === 'against'
    ) {
        return 'NO';
    }


    if (
        vote === 'abstain' ||
        vote === 'abstained'
    ) {
        return 'ABSTAIN';
    }


    if (
        vote === 'paired'
    ) {
        return 'PAIRED';
    }


    if (!vote) {
        return '';
    }


    return vote.toUpperCase();
}


function getMpVote(item) {
    return normalizeVote(
        item.mp_vote ??
        item.vote ??
        item.vote_value ??
        item.position ??
        item.decision ??
        item.participant_vote ??
        item.vote_decision
    );
}


function getRidingMajority(item) {
    const explicit =
        item.riding_majority ??
        item.community_majority ??
        item.constituent_majority ??
        item.majority_vote ??
        item.riding_result;


    if (explicit) {
        return normalizeVote(explicit);
    }


    const yes =
        Number(
            item.yes_count ??
            item.yea_count ??
            item.yes ??
            item.yea ??
            0
        );


    const no =
        Number(
            item.no_count ??
            item.nay_count ??
            item.no ??
            item.nay ??
            0
        );


    const abstain =
        Number(
            item.abstain_count ??
            item.abstained_count ??
            item.abstain ??
            0
        );


    const max =
        Math.max(
            yes,
            no,
            abstain
        );


    if (max <= 0) {
        return '';
    }


    const winners = [];


    if (yes === max) {
        winners.push('YES');
    }

    if (no === max) {
        winners.push('NO');
    }

    if (abstain === max) {
        winners.push('ABSTAIN');
    }


    if (winners.length !== 1) {
        return '';
    }


    return winners[0];
}


function getBillCode(item) {
    return cleanBillCode(
        item.number_code ??
        item.bill_code ??
        item.bill_number ??
        item.code
    );
}


function getBillTitle(item) {
    return (
        item.long_title_en ??
        item.title ??
        item.bill_title ??
        item.short_title_en ??
        'Title unavailable'
    );
}


function getParliament(item) {
    return (
        item.parliament_number ??
        item.parliament ??
        ''
    );
}


function getSession(item) {
    return (
        item.session_number ??
        item.session ??
        ''
    );
}


function getBillDisplayCode(item) {
    const baseCode =
        getBillCode(item);


    const parliament =
        getParliament(item);


    const session =
        getSession(item);


    if (
        baseCode &&
        parliament &&
        session
    ) {
        return (
            `${baseCode} (${parliament}-${session})`
        );
    }


    return (
        baseCode ||
        'Bill'
    );
}


function buildBillUrl(item) {
    const baseCode =
        getBillCode(item);


    if (!baseCode) {
        return '';
    }


    const parliament =
        getParliament(item);


    const session =
        getSession(item);


    const urlCode =
        parliament &&
            session

            ? `${baseCode}(${parliament}-${session})`

            : baseCode;


    return (
        `/bills/${encodeURIComponent(
            urlCode.toLowerCase()
        )}`
    );
}


function extractBillActivity(data) {
    if (!data) {
        return [];
    }


    if (Array.isArray(data)) {
        return data;
    }


    const possibleArrays = [
        data.bills,
        data.bill_activity,
        data.billActivity,
        data.bill_votes,
        data.billVotes,
        data.votes,
        data.activity
    ];


    for (
        const possible
        of possibleArrays
    ) {

        if (Array.isArray(possible)) {
            return possible;
        }

    }


    return [];
}


function MpPage() {
    const { personId } =
        useParams();

    const navigate =
        useNavigate();


    const [mp, setMp] =
        useState(null);

    const [photo, setPhoto] =
        useState('');

    const [
        billActivity,
        setBillActivity
    ] = useState([]);


    const [
        loadingBills,
        setLoadingBills
    ] = useState(true);


    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');


    useEffect(() => {

        const loadMp = async () => {

            try {

                setLoading(true);
                setLoadingBills(true);
                setError('');


                // =====================================
                // MP
                // =====================================

                const response =
                    await fetch(
                        `http://localhost:3000/api/v2/mps/${personId}`
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        'Failed to load MP'
                    );

                }


                setMp(data);


                // =====================================
                // PHOTO
                // =====================================

                const ridingName =
                    getLatestValue(
                        data.ridings_by_parliament,
                        'ridingName'
                    );


                if (ridingName) {

                    try {

                        const photoResponse =
                            await fetch(
                                `http://localhost:3000/api/v2/mp-photo?riding_name=${encodeURIComponent(
                                    ridingName
                                )}`
                            );


                        const photoData =
                            await photoResponse.json();


                        if (photoResponse.ok) {

                            const photoUrl =
                                photoData.photo_url ||
                                photoData.photoUrl ||
                                photoData.image_url ||
                                photoData.imageUrl ||
                                photoData.url ||
                                '';


                            setPhoto(
                                photoUrl
                            );

                        }

                    } catch (
                    photoError
                    ) {

                        console.error(
                            'Failed to load MP photo:',
                            photoError
                        );

                    }

                }


                // =====================================
                // BILL ACTIVITY
                //
                // First checks if the MP endpoint
                // already returned bill data.
                //
                // If not, tries:
                // /api/v2/mps/:personId/bills
                // =====================================

                let activity =
                    extractBillActivity(
                        data
                    );


                if (
                    activity.length === 0
                ) {

                    try {

                        const billResponse =
                            await fetch(
                                `http://localhost:3000/api/v2/mps/${personId}/bills`
                            );


                        if (billResponse.ok) {

                            const billData =
                                await billResponse.json();


                            activity =
                                extractBillActivity(
                                    billData
                                );

                        }

                    } catch (
                    billError
                    ) {

                        console.error(
                            'Could not load MP bill activity:',
                            billError
                        );

                    }

                }


                setBillActivity(
                    activity
                );


            } catch (error) {

                console.error(
                    'Failed to load MP:',
                    error
                );


                setError(
                    error.message ||
                    'Failed to load MP'
                );


            } finally {

                setLoading(false);
                setLoadingBills(false);

            }

        };


        loadMp();

    }, [personId]);


    // =========================================
    // LOADING
    // =========================================

    if (loading) {

        return (
            <div className="page">

                <header className="detailHeader">

                    <img
                        src={logo}
                        alt="Capitoll"
                        className="detailLogo"
                    />


                    <button
                        type="button"
                        className="detailBackButton"

                        onClick={() =>
                            navigate('/')
                        }
                    >
                        ← Back to search
                    </button>

                </header>


                <main className="detailMain">

                    <section className="detailCard">

                        <h2>
                            Loading MP...
                        </h2>

                    </section>

                </main>


                <SharedFooter />

            </div>
        );

    }


    // =========================================
    // ERROR
    // =========================================

    if (
        error ||
        !mp
    ) {

        return (
            <div className="page">

                <header className="detailHeader">

                    <img
                        src={logo}
                        alt="Capitoll"
                        className="detailLogo"
                    />


                    <button
                        type="button"
                        className="detailBackButton"

                        onClick={() =>
                            navigate('/')
                        }
                    >
                        ← Back to search
                    </button>

                </header>


                <main className="detailMain">

                    <section className="detailCard">

                        <h1>
                            Could not load MP
                        </h1>

                        <p>
                            {error}
                        </p>

                    </section>

                </main>


                <SharedFooter />

            </div>
        );

    }


    // =========================================
    // MP INFO
    // =========================================

    const fullName =
        `${mp.official_first_name || ''
            } ${mp.official_last_name || ''
            }`
            .trim();


    const riding =
        getLatestValue(
            mp.ridings_by_parliament,
            'ridingName'
        );


    const party =
        getLatestValue(
            mp.parties_by_parliament,
            'caucusShortName'
        );


    // =========================================
    // RIDING COMPARISON
    // =========================================

    const comparisonRows =
        billActivity
            .map((item) => {

                const mpVote =
                    getMpVote(item);


                const ridingMajority =
                    getRidingMajority(
                        item
                    );


                return {
                    item,
                    mpVote,
                    ridingMajority
                };

            })

            .filter((row) =>
                row.mpVote &&
                row.ridingMajority
            );


    const sameCount =
        comparisonRows.filter(
            (row) =>
                row.mpVote ===
                row.ridingMajority
        ).length;


    const differentCount =
        comparisonRows.length -
        sameCount;


    // =========================================
    // OPEN BILL
    // =========================================

    const handleBillClick = (
        item
    ) => {

        const url =
            buildBillUrl(
                item
            );


        if (!url) {
            return;
        }


        navigate(url);

    };


    return (
        <div className="page">


            {/* =====================================
          HEADER
      ===================================== */}

            <header className="detailHeader">

                <img
                    src={logo}
                    alt="Capitoll"
                    className="detailLogo"
                />


                <button
                    type="button"
                    className="detailBackButton"

                    onClick={() =>
                        navigate('/')
                    }
                >
                    ← Back to search
                </button>

            </header>


            {/* =====================================
          SCROLLABLE MAIN
      ===================================== */}

            <main className="detailMain">


                <section className="detailCard mpFullCard">


                    {/* =================================
              TOP PROFILE
          ================================= */}

                    <div className="mpTopGrid">


                        {/* MP INFO */}

                        <div className="mpProfileInfo">

                            <p className="detailEyebrow">
                                MEMBER OF PARLIAMENT
                            </p>


                            <h1 className="mpProfileName">

                                {
                                    fullName ||
                                    'Unknown MP'
                                }

                            </h1>


                            <div className="mpDetailGrid">

                                <div className="mpDetailItem">

                                    <span>
                                        RIDING
                                    </span>

                                    <strong>
                                        {
                                            riding ||
                                            'Unknown'
                                        }
                                    </strong>

                                </div>


                                <div className="mpDetailItem">

                                    <span>
                                        PARTY
                                    </span>

                                    <strong>
                                        {
                                            party ||
                                            'Unknown'
                                        }
                                    </strong>

                                </div>


                                <div className="mpDetailItem">

                                    <span>
                                        PARLIAMENT ID
                                    </span>

                                    <strong>
                                        {mp.person_id}
                                    </strong>

                                </div>

                            </div>


                            <p className="mpDescription">

                                Official party and riding
                                details are shown using the
                                latest parliamentary
                                information currently stored
                                in Capitoll.

                            </p>

                        </div>


                        {/* =================================
                RIDING VOTE COMPARISON
            ================================= */}

                        <div className="comparisonColumn">

                            <p className="comparisonTitle">
                                RIDING VOTE
                                COMPARISON
                            </p>


                            <div className="comparisonBox">

                                {comparisonRows.length > 0 ? (

                                    <>

                                        <div className="comparisonMainNumber">

                                            {sameCount}

                                            <span>
                                                /{
                                                    comparisonRows.length
                                                }
                                            </span>

                                        </div>


                                        <p className="comparisonMainLabel">
                                            same as riding
                                            majority
                                        </p>


                                        <div className="comparisonDivider" />


                                        <div className="comparisonStats">

                                            <div>

                                                <strong>
                                                    {sameCount}
                                                </strong>

                                                <span>
                                                    Same
                                                </span>

                                            </div>


                                            <div>

                                                <strong>
                                                    {
                                                        differentCount
                                                    }
                                                </strong>

                                                <span>
                                                    Different
                                                </span>

                                            </div>

                                        </div>

                                    </>

                                ) : (

                                    <div className="comparisonPending">

                                        <strong>
                                            —
                                        </strong>

                                        <span>
                                            No comparable riding
                                            votes yet
                                        </span>

                                    </div>

                                )}

                            </div>


                            <p className="comparisonNote">
                                Based only on recorded bills
                                where both the MP vote and
                                riding majority are available.
                            </p>

                        </div>


                        {/* =================================
                MP PHOTO
            ================================= */}

                        <div className="mpPhotoColumn">

                            <div className="mpPhotoFrame">

                                {photo ? (

                                    <img
                                        src={photo}
                                        alt={fullName}
                                        className="mpPhoto"
                                    />

                                ) : (

                                    <div className="mpPhotoPlaceholder">
                                        👤
                                    </div>

                                )}

                            </div>

                        </div>


                    </div>


                    {/* =================================
              BILL ACTIVITY
          ================================= */}

                    <div className="mpSectionDivider" />


                    <section className="mpBillSection">

                        <div className="mpBillHeader">

                            <div>

                                <p className="detailEyebrow">
                                    PARLIAMENTARY ACTIVITY
                                </p>


                                <h2>
                                    Bill activity
                                </h2>


                                <p>
                                    Recorded bill decisions
                                    associated with {
                                        fullName ||
                                        'this MP'
                                    }.
                                </p>

                            </div>


                            <div className="billCountPill">

                                {
                                    billActivity.length
                                }

                                {' '}

                                {
                                    billActivity.length === 1
                                        ? 'bill'
                                        : 'bills'
                                }

                            </div>

                        </div>


                        {loadingBills ? (

                            <div className="billEmptyState">
                                Loading bill activity...
                            </div>

                        ) : billActivity.length > 0 ? (

                            <div className="mpBillList">

                                {billActivity.map(
                                    (
                                        item,
                                        index
                                    ) => {

                                        const displayCode =
                                            getBillDisplayCode(
                                                item
                                            );


                                        const title =
                                            getBillTitle(
                                                item
                                            );


                                        const mpVote =
                                            getMpVote(
                                                item
                                            );


                                        const ridingMajority =
                                            getRidingMajority(
                                                item
                                            );


                                        const comparable =
                                            mpVote &&
                                            ridingMajority;


                                        const same =
                                            comparable &&
                                            mpVote ===
                                            ridingMajority;


                                        return (

                                            <button
                                                key={
                                                    `${item.id ??
                                                    displayCode
                                                    }-${index}`
                                                }

                                                type="button"

                                                className="mpBillCard"

                                                onClick={() =>
                                                    handleBillClick(
                                                        item
                                                    )
                                                }
                                            >

                                                <div className="mpBillIcon">
                                                    📄
                                                </div>


                                                <div className="mpBillContent">

                                                    <div className="mpBillTopLine">

                                                        <strong>
                                                            {
                                                                displayCode
                                                            }
                                                        </strong>


                                                        {mpVote && (

                                                            <span
                                                                className={
                                                                    `mpVoteBadge ${mpVote === 'YES'
                                                                        ? 'voteYes'
                                                                        : mpVote === 'NO'
                                                                            ? 'voteNo'
                                                                            : 'voteOther'
                                                                    }`
                                                                }
                                                            >
                                                                MP: {
                                                                    mpVote
                                                                }
                                                            </span>

                                                        )}

                                                    </div>


                                                    <p className="mpBillTitle">
                                                        {title}
                                                    </p>


                                                    {ridingMajority && (

                                                        <div className="ridingComparisonLine">

                                                            <span>
                                                                Riding majority:
                                                                {' '}
                                                                <strong>
                                                                    {
                                                                        ridingMajority
                                                                    }
                                                                </strong>
                                                            </span>


                                                            {comparable && (

                                                                <span
                                                                    className={
                                                                        same
                                                                            ? 'comparisonSame'
                                                                            : 'comparisonDifferent'
                                                                    }
                                                                >

                                                                    {same
                                                                        ? 'Same recorded position'
                                                                        : 'Different recorded position'}

                                                                </span>

                                                            )}

                                                        </div>

                                                    )}

                                                </div>


                                                <div className="mpBillArrow">
                                                    →
                                                </div>

                                            </button>

                                        );

                                    }
                                )}

                            </div>

                        ) : (

                            <div className="billEmptyState">

                                <strong>
                                    No recorded bill activity
                                    available yet.
                                </strong>


                                <p>
                                    Capitoll will show bill
                                    decisions here when vote
                                    records are available for
                                    this MP.
                                </p>

                            </div>

                        )}

                    </section>


                </section>

            </main>


            <SharedFooter />

        </div>
    );
}


function SharedFooter() {

    return (
        <footer className="footer">

            <div className="footerCopyright">
                © 2026 Capitoll
            </div>


            <div className="footerCenter">

                <div className="footerLinks">

                    <button type="button">
                        About
                    </button>

                    <span>•</span>

                    <button type="button">
                        Data Sources
                    </button>

                    <span>•</span>

                    <button type="button">
                        Privacy
                    </button>

                </div>


                <p className="footerNotice">

                    Parliamentary, riding, and MP
                    data is drawn from public sources.
                    Capitoll aims to keep information
                    current, but accuracy,
                    completeness, and availability
                    are not guaranteed.

                </p>

            </div>


            <div className="footerHackathon">
                Built for Hack the Hill III 🇨🇦
            </div>

        </footer>
    );

}


export default MpPage;