import { useState } from 'react';
import './App.css';
import logo from './assets/capitollLogo.png';

function App() {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [category, setCategory] = useState('All');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!search.trim()) return;

    console.log('Searching:', {
      query: search,
      category: category
    });
  };

  const handleCategory = (selectedCategory) => {
    setCategory(selectedCategory);
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
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setSearchOpen(false);
            }
          }}
        >

          <form
            className={`searchBar ${searchOpen ? 'searchBarOpen' : ''}`}
            onSubmit={handleSubmit}
          >
            <span className="searchIcon">⌕</span>

            <input
              type="text"
              placeholder="Search MPs, bills, or ridings"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                  className={category === 'All' ? 'activeCategory' : ''}
                  onClick={() => handleCategory('All')}
                >
                  All
                </button>

                <button
                  type="button"
                  className={category === 'MPs' ? 'activeCategory' : ''}
                  onClick={() => handleCategory('MPs')}
                >
                  MPs
                </button>

                <button
                  type="button"
                  className={category === 'Bills' ? 'activeCategory' : ''}
                  onClick={() => handleCategory('Bills')}
                >
                  Bills
                </button>

                <button
                  type="button"
                  className={category === 'Ridings' ? 'activeCategory' : ''}
                  onClick={() => handleCategory('Ridings')}
                >
                  Ridings
                </button>

              </div>


              {search.trim() === '' ? (

                <div className="searchHint">
                  <span className="hintIcon">⌕</span>

                  <div>
                    <strong>Start exploring Parliament</strong>
                    <p>
                      Search for an MP, bill, or Canadian riding.
                    </p>
                  </div>
                </div>

              ) : (

                <button
                  type="button"
                  className="searchSuggestion"
                  onClick={() => {
                    console.log(
                      `Search ${category}:`,
                      search
                    );
                  }}
                >
                  <span className="suggestionIcon">⌕</span>

                  <div>
                    <strong>
                      Search {category === 'All' ? 'Capitoll' : category}
                    </strong>

                    <p>
                      Results for "{search}"
                    </p>
                  </div>

                  <span className="arrow">→</span>
                </button>

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
          <button type="button">About</button>
          <span>•</span>
          <button type="button">Data Sources</button>
          <span>•</span>
          <button type="button">Privacy</button>
        </div>

        <div className="footerHackathon">
          Built for Hack the Hill III 🇨🇦
        </div>

      </footer>

    </div>
  );
}

export default App;