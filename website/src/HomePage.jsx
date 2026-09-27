import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './App.css';
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
          billResponse
        ] = await Promise.all([
          fetch(
            `${API_URL}/api/v2/mps`
          ),

          fetch(
            `${API_URL}/api/v2/bills`
          )
        ]);


        const mpData =
          await mpResponse.json();

        const billData =
          await billResponse.json();


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


        setMps(
          mpData.mps || []
        );


        setBills(
          Array.isArray(billData)
            ? billData
            : billData.bills || []
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
        /\(\d+-\d+\)$/g,
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


    const name =
      mp.name?.toLowerCase() || '';

    const riding =
      mp.riding_name?.toLowerCase() || '';

    const party =
      mp.party?.toLowerCase() || '';


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

  const ridings = Array.from(
    new Map(
      mps
        .filter((mp) =>
          mp.riding_name
        )

        .map((mp) => [
          mp.riding_name,

          {
            riding_name:
              mp.riding_name,

            person_id:
              mp.person_id,

            mp_name:
              mp.name,

            party:
              mp.party
          }
        ])
    ).values()
  );


  const getRidingSearchScore = (
    riding
  ) => {

    if (!query) {
      return 0;
    }


    const name =
      riding.riding_name
        ?.toLowerCase() || '';


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


  const filteredRidings = ridings
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


    const baseCode =
      cleanBillCode(
        bill.number_code ||
        bill.bill_code
      )
        .toLowerCase();


    const title =
      (
        bill.long_title_en ||
        ''
      )
        .toLowerCase();


    const normalizedQuery =
      query.replace(
        /\s+/g,
        ''
      );


    const normalizedCode =
      baseCode.replace(
        /\s+/g,
        ''
      );


    if (
      normalizedCode ===
      normalizedQuery
    ) {
      return 150;
    }


    if (
      normalizedCode.startsWith(
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


  const handleRidingClick = (
    riding
  ) => {
    navigate(
      `/mps/${riding.person_id}`
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

                            <button
                              key={
                                `riding-${riding.riding_name}`
                              }

                              type="button"

                              className="searchSuggestion"

                              onMouseDown={(e) =>
                                e.preventDefault()
                              }

                              onClick={() =>
                                handleRidingClick(
                                  riding
                                )
                              }
                            >

                              <span className="suggestionIcon">
                                📍
                              </span>


                              <div>

                                <strong>
                                  {
                                    riding.riding_name
                                  }
                                </strong>

                                <p>
                                  {
                                    riding.mp_name
                                  }

                                  {riding.party
                                    ? ` • ${riding.party}`
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