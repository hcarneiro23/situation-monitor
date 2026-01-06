import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Search, X } from 'lucide-react';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (isValid(date)) {
      return formatDistanceToNow(date, { addSuffix: false });
    }
  } catch (e) {}
  return '';
}

function SearchBar() {
  const navigate = useNavigate();
  const { news } = useStore();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = query.length >= 2
    ? news
        .filter(item => {
          const text = `${item.title} ${item.summary || ''} ${item.source || ''}`.toLowerCase();
          const terms = query.toLowerCase().split(' ').filter(t => t.length > 0);
          return terms.some(term => text.includes(term));
        })
        .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
        .slice(0, 8)
    : [];

  const handleItemClick = (itemId) => {
    setQuery('');
    setIsFocused(false);
    navigate(`/post/${itemId}`);
  };

  const clearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div className={`relative flex items-center bg-intel-800 rounded-full border transition-colors ${
        isFocused ? 'border-blue-500 bg-intel-900' : 'border-transparent'
      }`}>
        <Search className={`absolute left-3 w-4 h-4 ${isFocused ? 'text-blue-400' : 'text-gray-500'}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search"
          className="w-full bg-transparent py-2.5 pl-10 pr-10 text-white placeholder-gray-500 focus:outline-none text-[15px]"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 p-0.5 rounded-full bg-blue-500 hover:bg-blue-400 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isFocused && (query.length >= 2 || query.length === 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-intel-900 border border-intel-700 rounded-xl shadow-xl overflow-hidden z-50">
          {query.length < 2 ? (
            <div className="px-4 py-3 text-gray-500 text-sm">
              Try searching for news, topics, or sources
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-gray-500 text-sm">
              No results for "{query}"
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className="w-full text-left px-4 py-3 hover:bg-intel-800 transition-colors border-b border-intel-700 last:border-b-0"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span className="font-medium text-gray-400">{item.source}</span>
                    <span>·</span>
                    <span>{formatDate(item.pubDate)}</span>
                  </div>
                  <p className="text-white text-[14px] leading-snug line-clamp-2">{item.title}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
