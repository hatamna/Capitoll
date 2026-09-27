import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import './App.css';
import { getRidingMpEntries } from './ridingUtils.js';
import logo from './assets/capitollLogo.png';


const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000';


function HomePage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [category, setCategory] = useState('All');

  const [mps, setMps] = useState([]);
  const [bills, setBills] = useState([]);
  const [ridings, setRidings] = useState([]);

  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');


  // =========================================
  // LOAD MPs + BILLS
  // =========================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        setDataError('');

        const [
          mpResponse,
          billResponse,
          ridingResponse
        ] = await Promise.all([
          fetch(
            `${API_URL}/api/v2/mps`
          ),

          fetch(
            `${API_URL}/api/v2/bills`
          ),

          fetch(
            `${API_URL}/api/v2/ridings`
          )
        ]);


        const mpData =
          await mpResponse.json();

        const billData =
          await billResponse.json();

        const ridingData =
          await ridingResponse.json();


        if (!mpResponse.ok) {
          throw new Error(
            mpData.error ||
            'Failed to load MPs'
          );
        }


        if (!billResponse.ok) {
          throw new Error(
            billData.error ||
            'Failed to load bills'
          );
        }

        if (!ridingResponse.ok) {
          throw new Error(
            ridingData.error ||
            'Failed to load riding history'
          );
        }


        setMps(
          mpData.mps || []
        );


        setBills(
          Array.isArray(billData)
            ? billData
            : billData.bills || []
        );

        setRidings(
          Array.isArray(ridingData)
            ? ridingData
            : []
        );

      } catch (error) {
        console.error(
          'Failed to load parliamentary data:',
          error
        );

        setDataError(
          'Could not load parliamentary data.'
        );

      } finally {
        setLoadingData(false);
      }
    };


    loadData();

  }, []);


  // =========================================
  // QUERY
  // =========================================

  const query = search
    .trim()
    .toLowerCase();


  // =========================================
  // HELPERS
  // =========================================

  const startsWithWord = (
    text,
    searchQuery
  ) => {

    if (!text || !searchQuery) {
      return false;
    }


    return text
      .toLowerCase()
      .split(/\s+/)
      .some((word) =>
        word.startsWith(
          searchQuery
        )
      );
  };


  const cleanBillCode = (value) => {
    return String(value || '')
      .replace(
        /\s*\(\s*\d+\s*-\s*\d+\s*\)\s*$/g,
        ''
      )
      .trim();
  };


  // =========================================
  // MP SEARCH
  // =========================================

  const getMpSearchScore = (mp) => {
    if (!query) {
      return 0;
    }

    const personId = String(mp.person_id || '').toLowerCase().trim();
    const name =
      mp.name?.toLowerCase() || '';

    const riding =
      mp.riding_name?.toLowerCase() || '';

    const party =
      mp.party?.toLowerCase() || '';

    if (personId && personId === query) {
      return 130;
    }

    if (personId && personId.startsWith(query)) {
      return 115;
    }

    if (name === query) {
      return 120;
    }

    if (name.startsWith(query)) {
      return 110;
    }

    if (
      startsWithWord(
        name,
        query
      )
    ) {
      return 100;
    }

    if (riding === query) {
      return 95;
    }

    if (riding.startsWith(query)) {
      return 90;
    }

    if (
      startsWithWord(
        riding,
        query
      )
    ) {
      return 80;
    }

    if (name.includes(query)) {
      return 70;
    }

    if (personId && personId.includes(query)) {
      return 65;
    }

    if (riding.includes(query)) {
      return 60;
    }

    if (party.startsWith(query)) {
      return 20;
    }

    if (party.includes(query)) {
      return 10;
    }

    return 0;
  };


  const filteredMps = mps
    .map((mp) => ({
      ...mp,

      searchScore:
        getMpSearchScore(mp)
    }))

    .filter((mp) =>
      mp.searchScore > 0
    )

    .sort((a, b) => {

      if (
        b.searchScore !==
        a.searchScore
      ) {
        return (
          b.searchScore -
          a.searchScore
        );
      }


      return (
        a.name || ''
      ).localeCompare(
        b.name || ''
      );
    });


  // =========================================
  // RIDINGS
  // =========================================

  const ridingSearchItems = ridings.map((riding) => ({
    ...riding,
    riding_name: riding.name,
    mp_history: getRidingMpEntries(riding, mps),
  }));


  const getRidingSearchScore = (
    riding
  ) => {

    if (!query) {
      return 0;
    }

    const personId = String(riding.mp_history?.[0]?.person_id || '').toLowerCase().trim();
    const name =
      riding.riding_name
        ?.toLowerCase() || '';

    if (personId && personId === query) {
      return 125;
    }

    if (name === query) {
      return 120;
    }

    if (name.startsWith(query)) {
      return 110;
    }

    if (
      startsWithWord(
        name,
        query
      )
    ) {
      return 100;
    }

    if (name.includes(query)) {
      return 60;
    }

    return 0;
  };


  const filteredRidings = ridingSearchItems
    .map((riding) => ({
      ...riding,

      searchScore:
        getRidingSearchScore(
          riding
        )
    }))

    .filter((riding) =>
      riding.searchScore > 0
    )

    .sort((a, b) => {

      if (
        b.searchScore !==
        a.searchScore
      ) {
        return (
          b.searchScore -
          a.searchScore
        );
      }


      return (
        a.riding_name || ''
      ).localeCompare(
        b.riding_name || ''
      );
    });


  // =========================================
  // BILL SEARCH
  // =========================================

  const getBillSearchScore = (
    bill
  ) => {

    if (!query) {
      return 0;
    }

    const rawBase =
      cleanBillCode(
        bill.number_code ||
        bill.bill_code
      )
        .toLowerCase();

    const baseCode = rawBase.replace(/\s+/g, '');

    const parlNum = String(bill.parliament_number || '').trim();
    const sessNum = String(bill.session_number || '').trim();

    const canonicalCode = (bill.bill_code || '').toLowerCase().replace(/\s+/g, '');
    const fullDisplayCode = parlNum && sessNum ? `${baseCode}(${parlNum}-${sessNum})` : baseCode;
    const parlOnlyCode = parlNum ? `${baseCode}(${parlNum})` : baseCode;

    const title =
      [bill.long_title_en, bill.long_title_fr, bill.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    const normalizedQuery =
      query.replace(
        /\s+/g,
        ''
      );

    // Exact match for full parenthesized codes (e.g. "c-11(45-1)" or "c-11 (45-1)")
    if (
      (canonicalCode && canonicalCode === normalizedQuery) ||
      fullDisplayCode === normalizedQuery
    ) {
      return 200;
    }

    // Prefix match for parenthesized typing (e.g. "c-11(", "c-11(45", "c-11(45-")
    if (
      (canonicalCode && canonicalCode.startsWith(normalizedQuery)) ||
      fullDisplayCode.startsWith(normalizedQuery)
    ) {
      return 180;
    }

    // Parliament number in parentheses (e.g. "c-11(45)" or "c-11 (45)")
    if (parlOnlyCode === normalizedQuery) {
      return 175;
    }

    if (parlOnlyCode.startsWith(normalizedQuery)) {
      return 170;
    }

    // Dynamic parenthesis inspection: query contains "(" with specific session/parliament
    const parenMatch = query.match(/^([^(]+)\((.*)$/);
    if (parenMatch) {
      const qBase = parenMatch[1].trim().toLowerCase().replace(/\s+/g, '');
      const qInside = parenMatch[2].replace(/\)/g, '').trim().toLowerCase();

      if (baseCode === qBase || baseCode.startsWith(qBase)) {
        const numbers = qInside.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
          if (numbers[0] === parlNum && numbers[1] === sessNum) {
            return 200;
          }
        } else if (numbers && numbers.length === 1) {
          if (qInside.includes('sess') && numbers[0] === sessNum) {
            return 185;
          }
          if (qInside.includes('parl') && numbers[0] === parlNum) {
            return 185;
          }
          if (numbers[0] === parlNum) {
            return 180;
          }
          if (numbers[0] === sessNum) {
            return 175;
          }
        }

        if (qInside && (title.includes(qInside) || String(bill.status || '').toLowerCase().includes(qInside))) {
          return 175;
        }

        return 165;
      }
    }

    // Standard base code matching (e.g. "c-11")
    if (
      baseCode ===
      normalizedQuery
    ) {
      return 150;
    }

    if (
      baseCode.startsWith(
        normalizedQuery
      )
    ) {
      return 140;
    }

    if (
      title.startsWith(query)
    ) {
      return 110;
    }

    if (
      startsWithWord(
        title,
        query
      )
    ) {
      return 100;
    }

    if (
      title.includes(query)
    ) {
      return 70;
    }

    return 0;
  };


  const filteredBills = bills
    .map((bill) => ({
      ...bill,

      searchScore:
        getBillSearchScore(
          bill
        )
    }))

    .filter((bill) =>
      bill.searchScore > 0
    )

    .sort((a, b) => {

      if (
        b.searchScore !==
        a.searchScore
      ) {
        return (
          b.searchScore -
          a.searchScore
        );
      }


      if (
        Number(
          b.parliament_number
        ) !==
        Number(
          a.parliament_number
        )
      ) {
        return (
          Number(
            b.parliament_number
          ) -
          Number(
            a.parliament_number
          )
        );
      }


      if (
        Number(
          b.session_number
        ) !==
        Number(
          a.session_number
        )
      ) {
        return (
          Number(
            b.session_number
          ) -
          Number(
            a.session_number
          )
        );
      }


      return 0;
    });


  // =========================================
  // RESULT TYPES
  // =========================================

  const shouldShowMpResults =
    query !== '' &&
    (
      category === 'All' ||
      category === 'MPs'
    );


  const shouldShowBillResults =
    query !== '' &&
    (
      category === 'All' ||
      category === 'Bills'
    );


  const shouldShowRidingResults =
    query !== '' &&
    (
      category === 'All' ||
      category === 'Ridings'
    );


  // =========================================
  // HANDLERS
  // =========================================

  const handleSubmit = (e) => {
    e.preventDefault();
    if (search.trim()) {
      setSearchOpen(true);
    }
  };


  const handleCategory = (
    selectedCategory
  ) => {
    setCategory(
      selectedCategory
    );
  };


  const handleMpClick = (mp) => {
    navigate(
      `/mps/${mp.person_id}`
    );
  };




  const handleBillClick = (
    bill
  ) => {

    const baseCode =
      cleanBillCode(
        bill.number_code ||
        bill.bill_code
      );


    if (!baseCode) {
      return;
    }


    const urlCode =
      bill.parliament_number &&
        bill.session_number

        ? `${baseCode}(${bill.parliament_number}-${bill.session_number})`

        : baseCode;


    navigate(
      `/bills/${urlCode.toLowerCase()}`
    );
  };


  return (
    <div className="page">

      <main className="main">

        <div className="topLogo">

          <img
            src={logo}
            alt="Capitoll"
            className="topLogoImage"
          />

        </div>


        <div
          className="searchArea"

          onFocus={() =>
            setSearchOpen(true)
          }

          onBlur={(e) => {

            if (
              !e.currentTarget.contains(
                e.relatedTarget
              )
            ) {
              setSearchOpen(false);
            }

          }}
        >

          <form
            className={`searchBar ${searchOpen
                ? 'searchBarOpen'
                : ''
              }`}

            onSubmit={
              handleSubmit
            }
          >

            <span className="searchIcon">
              ⌕
            </span>


            <input
              type="text"

              placeholder="Search MPs, bills, or ridings"

              value={search}

              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />


            <button type="submit">
              Search
            </button>

          </form>


          {searchOpen && (

            <div className="searchDropdown">

              <p className="searchLabel">
                Search by
              </p>


              <div className="searchCategories">

                {[
                  'All',
                  'MPs',
                  'Bills',
                  'Ridings'
                ].map((item) => (

                  <button
                    key={item}

                    type="button"

                    className={
                      category === item
                        ? 'activeCategory'
                        : ''
                    }

                    onClick={() =>
                      handleCategory(
                        item
                      )
                    }
                  >
                    {item}
                  </button>

                ))}

              </div>


              {query === '' ? (

                <div className="searchHint">

                  <span className="hintIcon">
                    ⌕
                  </span>

                  <div>

                    <strong>
                      Start exploring Parliament
                    </strong>

                    <p>
                      Search for an MP,
                      bill, or Canadian riding.
                    </p>

                  </div>

                </div>

              ) : (

                <>

                  {loadingData && (

                    <div className="searchHint">

                      <strong>
                        Loading parliamentary data...
                      </strong>

                    </div>

                  )}


                  {!loadingData &&
                    dataError && (

                      <div className="searchHint">

                        <div>

                          <strong>
                            {dataError}
                          </strong>

                          <p>
                            Could not reach the Capitoll API.
                          </p>

                        </div>

                      </div>

                    )}


                  {!loadingData &&
                    !dataError &&
                    shouldShowMpResults && (

                      <div className="mpResults">

                        {filteredMps
                          .slice(0, 8)
                          .map((mp) => (

                            <button
                              key={
                                `mp-${mp.person_id}`
                              }

                              type="button"

                              className="searchSuggestion"

                              onMouseDown={(e) =>
                                e.preventDefault()
                              }

                              onClick={() =>
                                handleMpClick(
                                  mp
                                )
                              }
                            >

                              <span className="suggestionIcon">
                                👤
                              </span>


                              <div>

                                <strong>
                                  {mp.name}
                                </strong>

                                <p>
                                  {mp.riding_name}

                                  {mp.party
                                    ? ` • ${mp.party}`
                                    : ''}

                                  {mp.person_id
                                    ? ` • ID: ${mp.person_id}`
                                    : ''}
                                </p>

                              </div>


                              <span className="arrow">
                                →
                              </span>

                            </button>

                          ))}

                      </div>

                    )}


                  {!loadingData &&
                    !dataError &&
                    shouldShowBillResults && (

                      <div className="mpResults">

                        {filteredBills
                          .slice(0, 8)
                          .map((bill) => {

                            const baseCode =
                              cleanBillCode(
                                bill.number_code ||
                                bill.bill_code ||
                                'Bill'
                              );


                            const displayCode =
                              bill.parliament_number &&
                                bill.session_number

                                ? `${baseCode} (${bill.parliament_number}-${bill.session_number})`

                                : baseCode;


                            return (

                              <button
                                key={
                                  `${bill.id || baseCode}-${bill.parliament_number}-${bill.session_number}`
                                }

                                type="button"

                                className="searchSuggestion"

                                onMouseDown={(e) =>
                                  e.preventDefault()
                                }

                                onClick={() =>
                                  handleBillClick(
                                    bill
                                  )
                                }
                              >

                                <span className="suggestionIcon">
                                  📄
                                </span>


                                <div>

                                  <strong>
                                    {displayCode}
                                  </strong>

                                  <p>
                                    {
                                      bill.long_title_en ||
                                      'No title available'
                                    }
                                  </p>

                                </div>


                                <span className="arrow">
                                  →
                                </span>

                              </button>

                            );

                          })}

                      </div>

                    )}


                  {!loadingData &&
                    !dataError &&
                    shouldShowRidingResults && (

                      <div className="mpResults">

                        {filteredRidings
                          .slice(0, 8)
                          .map((riding) => (

                            <article
                              key={`riding-${riding.riding_name}`}
                              className="searchSuggestion ridingSearchSuggestion"
                            >
                              <span className="suggestionIcon" aria-hidden="true">
                                📍
                              </span>

                              <div className="ridingSearchContent">
                                <Link
                                  className="ridingSearchTitle"
                                  to={`/ridings/${encodeURIComponent(riding.id)}`}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => setSearchOpen(false)}
                                >
                                  {riding.riding_name}
                                </Link>
                                {riding.mp_history.length > 0 ? (
                                  <div
                                    className="ridingMpHistory"
                                    aria-label={riding.mp_history[0].is_current ? 'Current MP' : 'MP history, newest to oldest'}
                                  >
                                    {riding.mp_history.map((mp) => (
                                      <Link
                                        key={`${riding.riding_name}-${mp.person_id}`}
                                        className="ridingMpHistoryLink"
                                        to={`/mps/${encodeURIComponent(mp.person_id)}`}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => setSearchOpen(false)}
                                      >
                                        <span className="ridingMpName">{mp.name}</span>
                                        <span className="ridingMpTerm">
                                          {mp.is_current
                                            ? 'Current MP'
                                            : `Parliament ${mp.parliament_number}, Session ${mp.session_number}`}
                                        </span>
                                        <span className="ridingMpArrow" aria-hidden="true">→</span>
                                      </Link>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="ridingMpEmpty">No MP data available.</p>
                                )}
                              </div>
                            </article>

                          ))}

                      </div>

                    )}


                  {!loadingData &&
                    !dataError &&
                    category === 'All' &&
                    filteredMps.length === 0 &&
                    filteredBills.length === 0 &&
                    filteredRidings.length === 0 && (

                      <div className="searchHint">

                        <strong>
                          No results found
                        </strong>

                      </div>

                    )}


                  {!loadingData &&
                    !dataError &&
                    category !== 'All' &&
                    (
                      (category === 'MPs' && filteredMps.length === 0) ||
                      (category === 'Bills' && filteredBills.length === 0) ||
                      (category === 'Ridings' && filteredRidings.length === 0)
                    ) && (
                      <div className="searchHint">
                        <strong>No {category.toLowerCase()} found</strong>
                        <p>Try another name, bill code, or riding.</p>
                      </div>
                    )}

                </>

              )}

            </div>

          )}

        </div>

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


export default HomePage;