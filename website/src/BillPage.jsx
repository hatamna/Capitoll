import { useEffect, useState } from 'react';

import {
    useNavigate,
    useParams
} from 'react-router-dom';

import './App.css';

import logo from './assets/capitollLogo.png';


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


    // =========================================
    // CLEAN URL
    // =========================================

    const parseBillUrl = (
        value
    ) => {

        let decoded =
            decodeURIComponent(
                value
            );


        // If somehow duplicated:
        // c-10(45-1)(45-1)
        // becomes:
        // c-10(45-1)

        decoded =
            decoded.replace(
                /(\(\d+-\d+\))\1+$/,
                '$1'
            );


        const match =
            decoded.match(
                /^(.+?)\((\d+)-(\d+)\)$/
            );


        if (match) {

            return {

                code:
                    match[1]
                        .toLowerCase()
                        .trim(),

                parliamentNumber:
                    Number(
                        match[2]
                    ),

                sessionNumber:
                    Number(
                        match[3]
                    )

            };

        }


        return {

            code:
                decoded
                    .toLowerCase()
                    .trim(),

            parliamentNumber:
                null,

            sessionNumber:
                null

        };

    };


    // =========================================
    // LOAD BILL
    // =========================================

    useEffect(() => {

        const loadBill = async () => {

            try {

                setLoading(true);
                setError('');


                const parsed =
                    parseBillUrl(
                        billCode
                    );


                const response =
                    await fetch(
                        'http://localhost:3000/api/v2/bills'
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        'Failed to load bills'
                    );

                }


                const bills =
                    Array.isArray(data)
                        ? data
                        : data.bills || [];


                const foundBill =
                    bills.find((item) => {

                        const itemCode =
                            String(
                                item.number_code ||
                                item.bill_code ||
                                ''
                            )
                                .replace(
                                    /\(\d+-\d+\)$/g,
                                    ''
                                )
                                .trim()
                                .toLowerCase();


                        const codeMatches =
                            itemCode ===
                            parsed.code;


                        const parliamentMatches =
                            parsed.parliamentNumber
                                ? Number(
                                    item.parliament_number
                                ) ===
                                parsed.parliamentNumber
                                : true;


                        const sessionMatches =
                            parsed.sessionNumber
                                ? Number(
                                    item.session_number
                                ) ===
                                parsed.sessionNumber
                                : true;


                        return (
                            codeMatches &&
                            parliamentMatches &&
                            sessionMatches
                        );

                    });


                if (!foundBill) {

                    throw new Error(
                        'Bill not found'
                    );

                }


                setBill(
                    foundBill
                );

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


                    <section>

                        <p className="billSectionLabel">
                            ABOUT THIS BILL
                        </p>


                        <p className="billDescription">
                            This page displays the parliamentary
                            information currently stored in Capitoll.
                            Representative voting records and community
                            feedback can be displayed here alongside
                            the bill as that data is connected.
                        </p>

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
                    Parliamentary, riding, and MP data is drawn
                    from public sources. Capitoll aims to keep
                    information current, but accuracy,
                    completeness, and availability are not guaranteed.
                </p>

            </div>


            <div className="footerHackathon">
                Built for Hack the Hill III 🇨🇦
            </div>

        </footer>
    );
}


export default BillPage;