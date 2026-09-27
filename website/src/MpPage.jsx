import { useEffect, useState } from 'react';

import {
    useNavigate,
    useParams
} from 'react-router-dom';

import './App.css';

import logo from './assets/capitollLogo.png';
import SharedFooter from './components/SharedFooter.jsx';


const API_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:3000';


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


    const entries = Object.entries(history).flatMap(([key, value]) => {
        const compositeKey = key.match(/^(\d+)-(\d+)$/);
        if (compositeKey && typeof value === 'string') {
            return [{
                parliament: Number(compositeKey[1]),
                session: Number(compositeKey[2]),
                value,
            }];
        }

        if (/^\d+$/.test(key) && Array.isArray(value)) {
            return value.map((entry) => ({
                parliament: Number(key),
                session: Number(entry?.sessionNumber || 0),
                value: entry?.[field],
            }));
        }

        return [];
    }).sort((left, right) =>
        right.parliament - left.parliament || right.session - left.session
    );

    const latest = entries.find((entry) => entry.value);
    if (latest) {
        return latest.value;
    }


    return '';
}


function getMpVote(item) {
    return (
        item.mp_vote ||
        item.vote ||
        ''
    );
}


function getRidingMajority(item) {
    return (
        item.riding_majority ||
        ''
    );
}


function getBillDisplayCode(item) {
    const baseCode =
        String(
            item.number_code ||
            item.bill_code ||
            'Bill'
        )
            .replace(
                /\(\d+-\d+\)$/g,
                ''
            )
            .trim();


    if (
        item.parliament_number &&
        item.session_number
    ) {
        return (
            `${baseCode} (${item.parliament_number}-${item.session_number})`
        );
    }


    return baseCode;
}


function buildBillUrl(item) {
    if (item.bill_code) {
        return (
            `/bills/${encodeURIComponent(
                item.bill_code.toLowerCase()
            )}`
        );
    }


    const baseCode =
        String(
            item.number_code || ''
        )
            .replace(
                /\(\d+-\d+\)$/g,
                ''
            )
            .trim();


    if (!baseCode) {
        return '';
    }


    const urlCode =
        item.parliament_number &&
            item.session_number

            ? `${baseCode}(${item.parliament_number}-${item.session_number})`

            : baseCode;


    return (
        `/bills/${encodeURIComponent(
            urlCode.toLowerCase()
        )}`
    );
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
        comparison,
        setComparison
    ] = useState(null);


    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');


    useEffect(() => {

        const loadMp = async () => {

            try {

                setLoading(true);
                setError('');


                // =====================================
                // MP DATA
                // =====================================

                const response =
                    await fetch(
                        `${API_URL}/api/v2/mps/${personId}`
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
                // RIDING
                // =====================================

                const ridingName =
                    getLatestValue(
                        data.ridings_by_parliament,
                        'ridingName'
                    );


                // =====================================
                // PHOTO
                // =====================================

                if (ridingName) {

                    try {

                        const photoResponse =
                            await fetch(
                                `${API_URL}/api/v2/mp-photo?riding_name=${encodeURIComponent(
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

                    } catch (photoError) {

                        console.error(
                            'Failed to load MP photo:',
                            photoError
                        );

                    }

                }


                // =====================================
                // BILL ACTIVITY
                // =====================================

                try {

                    const billResponse =
                        await fetch(
                            `${API_URL}/api/v2/mps/${personId}/bills`
                        );


                    const billData =
                        await billResponse.json();


                    if (billResponse.ok) {

                        setBillActivity(
                            Array.isArray(
                                billData.bills
                            )
                                ? billData.bills
                                : []
                        );


                        setComparison(
                            billData.comparison ||
                            null
                        );

                    } else {

                        console.error(
                            'Bill activity API error:',
                            billData
                        );

                        setBillActivity([]);

                    }

                } catch (billError) {

                    console.error(
                        'Could not load bill activity:',
                        billError
                    );

                    setBillActivity([]);

                }


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

            }

        };


        loadMp();

    }, [personId]);


    if (loading) {

        return (
            <div className="page">

                <header className="detailHeader">

                    <img
                        src={logo}
                        alt="Capitoll"
                        className="detailLogo"
                    />

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


    const sameCount =
        comparison
            ?.same_as_riding_majority ||
        0;


    const comparableCount =
        comparison
            ?.comparable_bills ||
        0;

    const compliancePercentage =
        comparison?.match_percentage;


    const differentCount =
        comparison
            ?.different_from_riding_majority ||
        0;


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

                <section className="detailCard mpFullCard">


                    <div className="mpTopGrid">


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


                        <div className="comparisonColumn">

                            <p className="comparisonTitle">
                                RIDING VOTE COMPARISON
                            </p>


                            <div className="comparisonBox">

                                {comparableCount > 0 ? (

                                    <>

                                        <div className="comparisonMainNumber">
                                            {compliancePercentage}%
                                        </div>


                                        <p className="comparisonMainLabel">
                                            compliance with riding majority
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
                                                    {differentCount}
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
                                    associated with {fullName}.
                                </p>

                            </div>


                            <div className="billCountPill">

                                {billActivity.length}

                                {' '}

                                {billActivity.length === 1
                                    ? 'bill'
                                    : 'bills'}

                            </div>

                        </div>


                        {billActivity.length > 0 ? (

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


                                        const mpVote =
                                            getMpVote(
                                                item
                                            );


                                        const ridingMajority =
                                            getRidingMajority(
                                                item
                                            );


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
                                                                MP: {mpVote}
                                                            </span>

                                                        )}

                                                    </div>


                                                    <p className="mpBillTitle">

                                                        {
                                                            item.long_title_en ||
                                                            'Title unavailable'
                                                        }

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


                                                            {item.majority_matches_mp === true && (

                                                                <span className="comparisonSame">
                                                                    Same recorded position
                                                                </span>

                                                            )}


                                                            {item.majority_matches_mp === false && (

                                                                <span className="comparisonDifferent">
                                                                    Different recorded position
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
                                    No recorded bill activity available yet.
                                </strong>


                                <p>
                                    Capitoll will show bill decisions
                                    here when vote records are available
                                    for this MP.
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


export default MpPage;