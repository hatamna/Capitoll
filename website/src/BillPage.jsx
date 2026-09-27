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

async function fetchBillDescription(billCode) {
    const response = await fetch(
        `${API_URL}/api/v2/bills/${encodeURIComponent(billCode)}/description`,
        { headers: { Accept: 'application/json' } },
    );
    const responseText = await response.text();

    let data;
    try {
        data = JSON.parse(responseText);
    } catch {
        throw new Error(
            'The bill description API returned HTML instead of JSON. Confirm VITE_API_URL points to the updated backend and redeploy the backend if needed.',
        );
    }

    if (!response.ok) {
        throw new Error(data.error || 'Could not generate the bill description.');
    }
    if (typeof data.description !== 'string' || !data.description.trim()) {
        throw new Error('The bill description API returned an empty description.');
    }

    return data.description.trim();
}


function BillPage() {
    const { billCode } =
        useParams();

    const navigate =
        useNavigate();


    const [bill, setBill] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    const [ridings, setRidings] = useState([]);
    const [selectedRiding, setSelectedRiding] = useState('');
    const [voteResult, setVoteResult] = useState(null);
    const [voteLoading, setVoteLoading] = useState(false);
    const [voteSubmitting, setVoteSubmitting] = useState(false);
    const [voteMessage, setVoteMessage] = useState('');
    const [billDescription, setBillDescription] = useState('');
    const [descriptionAttempt, setDescriptionAttempt] = useState(0);
    const [descriptionLoading, setDescriptionLoading] = useState(false);
    const [descriptionError, setDescriptionError] = useState('');


    useEffect(() => {

        const loadBill = async () => {

            try {

                setLoading(true);
                setError('');


                const decodedBillCode =
                    decodeURIComponent(
                        billCode
                    )
                        .toLowerCase()
                        .replace(
                            /(\(\d+-\d+\))\1+$/,
                            '$1'
                        );


                const response =
                    await fetch(
                        `${API_URL}/api/v2/bills/${encodeURIComponent(
                            decodedBillCode
                        )}`
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        'Failed to load bill'
                    );

                }


                setBill(data);

            } catch (error) {

                console.error(
                    'Failed to load bill:',
                    error
                );


                setError(
                    error.message ||
                    'Failed to load bill'
                );

            } finally {

                setLoading(false);

            }

        };


        loadBill();

    }, [billCode]);

    useEffect(() => {
        if (!bill) return undefined;

        let cancelled = false;
        const loadDescription = async () => {
            try {
                setBillDescription('');
                setDescriptionLoading(true);
                setDescriptionError('');
                const description = await fetchBillDescription(bill.bill_code);
                if (!cancelled) setBillDescription(description);
            } catch (descriptionFetchError) {
                if (!cancelled) {
                    setBillDescription('');
                    setDescriptionError(
                        descriptionFetchError.message || 'Could not generate the bill description.',
                    );
                }
            } finally {
                if (!cancelled) setDescriptionLoading(false);
            }
        };

        loadDescription();
        return () => { cancelled = true; };
    }, [bill, descriptionAttempt]);

    const retryBillDescription = () => {
        setDescriptionAttempt((attempt) => attempt + 1);
    };

    useEffect(() => {
        const loadRidings = async () => {
            try {
                const response = await fetch(`${API_URL}/api/v2/ridings`);
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load ridings');
                }

                setRidings(data);
                setSelectedRiding((current) => {
                    if (current && data.some((riding) => riding.name === current)) {
                        return current;
                    }
                    return data.find((riding) => riding.name === 'Ottawa Centre')?.name
                        || data[0]?.name
                        || '';
                });
            } catch (loadError) {
                setVoteMessage(loadError.message || 'Could not load ridings.');
            }
        };

        loadRidings();
    }, []);

    useEffect(() => {
        if (!bill || !selectedRiding) {
            return undefined;
        }

        let cancelled = false;
        const loadVoteResult = async () => {
            try {
                setVoteLoading(true);
                setVoteMessage('');
                const response = await fetch(
                    `${API_URL}/api/v2/bills/${encodeURIComponent(bill.bill_code)}/results?riding_name=${encodeURIComponent(selectedRiding)}`,
                );
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'No riding vote data for this bill.');
                }
                if (!cancelled) setVoteResult(data);
            } catch (loadError) {
                if (!cancelled) {
                    setVoteResult(null);
                    setVoteMessage(loadError.message || 'Could not load vote results.');
                }
            } finally {
                if (!cancelled) setVoteLoading(false);
            }
        };

        loadVoteResult();
        return () => { cancelled = true; };
    }, [bill, selectedRiding]);

    const isAwaitingThirdVote = Boolean(
        bill &&
        bill.has_been_voted_on !== true &&
        !bill.passed_house_third_reading_at
    );

    const formatMpVote = (vote) => {
        if (!vote) return 'No recorded vote';
        const normalized = String(vote).trim().toUpperCase();
        if (normalized === 'Y' || normalized === 'YES') return 'Yea';
        if (normalized === 'A' || normalized === 'ABSTAIN' || normalized === 'PAIRED') return 'Abstained';
        if (normalized === 'N' || normalized === 'NO') return 'Nay';
        return vote;
    };

    const submitVote = async (choice) => {
        if (!bill || !selectedRiding || !isAwaitingThirdVote) return;

        try {
            setVoteSubmitting(true);
            setVoteMessage('');
            const response = await fetch(`${API_URL}/api/v2/votes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bill_code: bill.bill_code,
                    riding_name: selectedRiding,
                    choice,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Could not submit vote.');
            }
            setVoteResult(data);
            setVoteMessage('Vote recorded.');
        } catch (submitError) {
            setVoteMessage(submitError.message || 'Could not submit vote.');
        } finally {
            setVoteSubmitting(false);
        }
    };


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
                            Loading bill...
                        </h2>

                    </section>

                </main>


                <SharedFooter />

            </div>
        );
    }


    if (
        error ||
        !bill
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
                            Could not load bill
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


    const baseCode =
        String(
            bill.number_code ||
            bill.bill_code ||
            'Bill'
        )
            .replace(
                /\(\d+-\d+\)$/g,
                ''
            )
            .trim();


    const displayCode =
        bill.parliament_number &&
            bill.session_number

            ? `${baseCode} (${bill.parliament_number}-${bill.session_number})`

            : baseCode;


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

                <section className="detailCard billCard">

                    <p className="detailEyebrow">
                        BILL
                    </p>


                    <h1 className="billTitleCode">
                        {displayCode}
                    </h1>


                    <h2 className="billLongTitle">

                        {
                            bill.long_title_en ||
                            'Title unavailable'
                        }

                    </h2>


                    <div className="billDetailGrid">

                        <BillDetail
                            label="Status"

                            value={
                                bill.status ||
                                'Unknown'
                            }
                        />


                        <BillDetail
                            label="Parliament"

                            value={
                                bill.parliament_number ||
                                'Unknown'
                            }
                        />


                        <BillDetail
                            label="Session"

                            value={
                                bill.session_number ||
                                'Unknown'
                            }
                        />


                        <BillDetail
                            label="Third Reading"

                            value={
                                bill.passed_house_third_reading_at

                                    ? new Date(
                                        bill.passed_house_third_reading_at
                                    )
                                        .toLocaleDateString()

                                    : 'Not recorded'
                            }
                        />

                    </div>


                    <div className="billDivider" />

                    <section className="billVoteSection">
                        <p className="billSectionLabel">RIDING VOTE</p>
                        <label className="billRidingControl">
                            <span>Riding</span>
                            <select
                                value={selectedRiding}
                                onChange={(event) => {
                                    setVoteResult(null);
                                    setSelectedRiding(event.target.value);
                                }}
                                disabled={ridings.length === 0}
                            >
                                {ridings.map((riding) => (
                                    <option key={riding.id} value={riding.name}>
                                        {riding.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {voteLoading ? (
                            <p>Loading riding votes…</p>
                        ) : voteResult ? (
                            <div className="billVoteSummary">
                                <span>Yea: {voteResult.user_tally?.counts?.Y ?? 0}</span>
                                <span>Abstained: {voteResult.user_tally?.counts?.A ?? 0}</span>
                                <span>Nay: {voteResult.user_tally?.counts?.N ?? 0}</span>
                                <span>MP: {formatMpVote(voteResult.mp?.vote)}</span>
                            </div>
                        ) : null}

                        {voteMessage && <p className="billVoteMessage">{voteMessage}</p>}

                        {isAwaitingThirdVote ? (
                            <div className="billVoteActions">
                                <button type="button" onClick={() => submitVote('Y')} disabled={voteSubmitting || !selectedRiding}>
                                    Yea
                                </button>
                                <button type="button" onClick={() => submitVote('A')} disabled={voteSubmitting || !selectedRiding}>
                                    Abstained
                                </button>
                                <button type="button" onClick={() => submitVote('N')} disabled={voteSubmitting || !selectedRiding}>
                                    Nay
                                </button>
                            </div>
                        ) : (
                            <p className="billVoteClosedNotice">
                                Voting is closed. This bill has passed third reading or is no longer awaiting a vote.
                            </p>
                        )}
                    </section>

                    <div className="billDivider" />


                    <section>

                        <p className="billSectionLabel">
                            ABOUT THIS BILL
                        </p>


                        <div className="billDescription" aria-live="polite">
                            {descriptionLoading ? (
                                <p>Generating a neutral bill summary…</p>
                            ) : billDescription ? (
                                <p>{billDescription}</p>
                            ) : (
                                <div role="alert">
                                    <p>{descriptionError || 'Could not generate the bill description.'}</p>
                                    <button type="button" onClick={retryBillDescription}>
                                        Try again
                                    </button>
                                </div>
                            )}
                        </div>

                    </section>

                </section>

            </main>


            <SharedFooter />

        </div>
    );
}


function BillDetail({
    label,
    value
}) {

    return (
        <div className="billDetailItem">

            <span>
                {label.toUpperCase()}
            </span>

            <strong>
                {value}
            </strong>

        </div>
    );
}


export default BillPage;