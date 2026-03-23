import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { searchDocumentation, type SearchResult } from '../utils/searchUtils';
import './Search.css';

const Search: React.FC = () => {
  const { lang } = useParams();
  const currentLang = lang === 'en' ? 'en' : 'uk';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const isUk = currentLang === 'uk';

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const searchResults = await searchDocumentation(searchQuery, currentLang);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [currentLang]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return text;
    }

    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={index} className="search-highlight">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  const safeEncodeURIComponent = (str: string): string => {
    try {
      // eslint-disable-next-line no-control-regex
      const cleaned = str.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      return encodeURIComponent(cleaned);
    } catch (error) {
      console.error('Error encoding URI component:', error);
      return '';
    }
  };

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>{isUk ? '🔍 Пошук' : '🔍 Search'}</h1>
        <p className="search-description">
          {isUk ? 'Знайдіть правила, механіки та інше у документації' : 'Find rules, mechanics, and more in the documentation'}
        </p>
      </div>

      <div className="search-input-container">
        <input
          type="text"
          className="search-input"
          placeholder={isUk ? 'Введіть запит для пошуку...' : 'Enter your search query...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => {
              setQuery('');
              setResults([]);
              setHasSearched(false);
            }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {loading && (
        <div className="search-loading">
          <div className="search-spinner"></div>
          <p>{isUk ? 'Пошук...' : 'Searching...'}</p>
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <div className="search-no-results">
          <p>{isUk ? `😔 Нічого не знайдено за запитом "${query}"` : `😔 No results found for "${query}"`}</p>
          <p className="search-tip">{isUk ? 'Спробуйте інші ключові слова або перевірте правопис' : 'Try other keywords or check spelling'}</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="search-results">
          <p className="search-results-count">
            {isUk ? 'Знайдено результатів: ' : 'Results found: '}<strong>{results.length}</strong>
          </p>
          <div className="search-results-list">
            {results.map((result, index) => {
              const searchParam = safeEncodeURIComponent(query);
              const contextParam = safeEncodeURIComponent(result.context || '');
              return (
                <Link
                  key={`${result.path}-${index}`}
                  to={`${result.path}?search=${searchParam}&context=${contextParam}&matchIndex=${result.matchIndex}`}
                  className="search-result-card"
                >
                  <h3 className="search-result-title">
                    {highlightText(result.title, query)}
                  </h3>
                  <p className="search-result-excerpt">
                    {highlightText(result.excerpt, query)}
                  </p>
                  <div className="search-result-meta">
                    <span className="search-result-matches">
                      {result.matches} {isUk ? 'збігів' : 'matches'}
                    </span>
                    <span className="search-result-path">{result.path}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !hasSearched && (
        <div className="search-tips">
          <h3>{isUk ? '💡 Поради для пошуку' : '💡 Search Tips'}</h3>
          <ul>
            <li>{isUk ? 'Використовуйте ключові слова, як "хід", "акт", "кидок"' : 'Use keywords like "move", "asset", "roll"'}</li>
            <li>{isUk ? 'Вводьте мінімум 2 символи для початку пошуку' : 'Type at least 2 characters to search'}</li>
            <li>{isUk ? 'Пошук не чутливий до регістру' : 'Search is case-insensitive'}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Search;
