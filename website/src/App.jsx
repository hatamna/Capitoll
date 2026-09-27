import { useEffect, useState } from 'react';
import './App.css';
import logo from './assets/capitollLogo.png';

function App() {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [category, setCategory] = useState('All');

  const [mps, setMps] = useState([]);
  const [loadingMps, setLoadingMps] = useState(true);
  const [mpError, setMpError] = useState('');

  useEffect(() => {
    const loadMps = async () => {
      try {
        setLoadingMps(true);
        setMpError('');

        const response = await fetch(
          'http://localhost:3000/api/v2/mps'
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load MPs'
          );
        }

        setMps(data.mps || []);
      } catch (error) {
        console.error('Failed to load MPs:', error);

        setMpError('Could not load MPs.');
      } finally {
        setLoadingMps(false);
      }
    };

    loadMps();
  }, []);

  const filteredMps = mps.filter((mp) => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return false;
    }

    const name =
      mp.name?.toLowerCase() || '';

    const riding =
      mp.riding_name?.toLowerCase() || '';

    const party =
      mp.party?.toLowerCase() || '';

    return (
      name.includes(query) ||
      riding.includes(query) ||
      party.includes(query)
    );
  });

  const shouldShowMpResults =
    search.trim() !== '' &&
    (
      category === 'All' ||
      category === 'MPs'
    );

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!search.trim()) {
      return;
    }

    console.log('Searching:', {
      query: search,
      category
    });
  };

  const handleCategory = (selectedCategory) => {
    setCategory(selectedCategory);
  };

  const handleMpClick = (mp) => {
    console.log('Selected MP:', mp);

    /*
      Later we can change this to navigate
      to an MP profile page.

      Example:

      navigate(`/mps/${mp.person_id}`);
    */
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
          onFocus={() => setSearchOpen(true)}
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
            onSubmit={handleSubmit}
          >

            <span className="searchIcon">
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search MPs, bills, or ridings"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
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

                <button
                  type="button"
                  className={
                    category === 'All'
                      ? 'activeCategory'
                      : ''
                  }
                  onClick={() =>
                    handleCategory('All')
                  }
                >
                  All
                </button>

                <button
                  type="button"
                  className={
                    category === 'MPs'
                      ? 'activeCategory'
                      : ''
                  }
                  onClick={() =>
                    handleCategory('MPs')
                  }
                >
                  MPs
                </button>

                <button
                  type="button"
                  className={
                    category === 'Bills'
                      ? 'activeCategory'
                      : ''
                  }
                  onClick={() =>
                    handleCategory('Bills')
                  }
                >
                  Bills
                </button>

                <button
                  type="button"
                  className={
                    category === 'Ridings'
                      ? 'activeCategory'
                      : ''
                  }
                  onClick={() =>
                    handleCategory('Ridings')
                  }
                >
                  Ridings
                </button>

              </div>


              {search.trim() === '' ? (

                <div className="searchHint">

                  <span className="hintIcon">
                    ⌕
                  </span>

                  <div>
                    <strong>
                      Start exploring Parliament
                    </strong>

                    <p>
                      Search for an MP, bill,
                      or Canadian riding.
                    </p>
                  </div>

                </div>

              ) : (

                <>
                  {shouldShowMpResults && (

                    <div className="mpResults">

                      {loadingMps && (
                        <div className="searchHint">
                          <div>
                            <strong>
                              Loading MPs...
                            </strong>
                          </div>
                        </div>
                      )}

                      {!loadingMps &&
                        mpError && (
                          <div className="searchHint">
                            <div>
                              <strong>
                                {mpError}
                              </strong>

                              <p>
                                Make sure your backend
                                is running.
                              </p>
                            </div>
                          </div>
                        )}

                      {!loadingMps &&
                        !mpError &&
                        filteredMps
                          .slice(0, 8)
                          .map((mp) => (

                            <button
                              key={mp.person_id}
                              type="button"
                              className="searchSuggestion"
                              onMouseDown={(e) =>
                                e.preventDefault()
                              }
                              onClick={() =>
                                handleMpClick(mp)
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

                      {!loadingMps &&
                        !mpError &&
                        filteredMps.length === 0 && (
                          <div className="searchHint">

                            <span className="hintIcon">
                              ⌕
                            </span>

                            <div>
                              <strong>
                                No MPs found
                              </strong>

                              <p>
                                Try another name,
                                riding, or party.
                              </p>
                            </div>

                          </div>
                        )}

                    </div>

                  )}


                  {category !== 'MPs' && (
                    <button
                      type="button"
                      className="searchSuggestion"
                      onMouseDown={(e) =>
                        e.preventDefault()
                      }
                      onClick={() => {
                        console.log(
                          `Search ${category}:`,
                          search
                        );
                      }}
                    >

                      <span className="suggestionIcon">
                        ⌕
                      </span>

                      <div>

                        <strong>
                          Search {
                            category === 'All'
                              ? 'Capitoll'
                              : category
                          }
                        </strong>

                        <p>
                          Results for "{search}"
                        </p>

                      </div>

                      <span className="arrow">
                        →
                      </span>

                    </button>
                  )}

                </>

              )}

            </div>
          )}

        </div>

      </main>


      <footer className="footer">

        <div className="footerCopyright">
          © 2026 Capitoll
        </div>

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

        <div className="footerHackathon">
          Built for Hack the Hill III 🇨🇦
        </div>

      </footer>

    </div>
  );
}

export default App;