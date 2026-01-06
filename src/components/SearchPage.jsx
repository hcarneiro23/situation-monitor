import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Search, ArrowLeft, ExternalLink, MapPin, Globe2 } from 'lucide-react';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (isValid(date)) {
      return formatDistanceToNow(date, { addSuffix: false });
    }
    const nativeDate = new Date(dateStr);
    if (isValid(nativeDate)) {
      return formatDistanceToNow(nativeDate, { addSuffix: false });
    }
  } catch (e) {}
  return '';
}

function getSourceLogo(link) {
  try {
    if (link) {
      const url = new URL(link);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
    }
  } catch (e) {}
  return null;
}

function SearchPage() {
  const navigate = useNavigate();
  const { news } = useStore();
  const [query, setQuery] = useState('');
  const [imgErrors, setImgErrors] = useState({});

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setImgErrors({}); // Clear image errors on new search
  };

  const trimmedQuery = query.trim();

  const results = useMemo(() => {
    if (trimmedQuery.length < 2) return [];

    const searchTerms = trimmedQuery.toLowerCase().split(' ').filter(t => t.length > 0);
    if (searchTerms.length === 0) return [];

    return news
      .filter(item => {
        const text = `${item.title} ${item.summary || ''} ${item.source || ''}`.toLowerCase();
        return searchTerms.some(term => text.includes(term));
      })
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 50);
  }, [news, trimmedQuery]);

  const handleItemClick = (itemId) => {
    navigate(`/post/${itemId}`);
  };

  return (
    <div className="min-h-screen bg-intel-900 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-intel-900/80 backdrop-blur-md border-b border-intel-700">
        <div className="flex items-center gap-3 px-4 py-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-intel-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search news..."
              autoFocus
              className="w-full bg-intel-800 border border-intel-600 rounded-full py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {trimmedQuery.length < 2 ? (
        <div key="empty-state" className="p-8 text-center text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Search for news articles</p>
          <p className="text-sm mt-1">Enter at least 2 characters</p>
        </div>
      ) : results.length === 0 ? (
        <div key="no-results" className="p-8 text-center text-gray-500">
          <p>No results found for "{trimmedQuery}"</p>
          <p className="text-sm mt-1">Try different keywords</p>
        </div>
      ) : (
        <div key={`results-${trimmedQuery}`} className="divide-y divide-intel-700">
          {results.map((item) => {
            const logoUrl = getSourceLogo(item.link);
            return (
              <article
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className="px-4 py-3 hover:bg-intel-800/50 transition-colors cursor-pointer"
              >
                <div className="flex gap-3">
                  {/* Source avatar */}
                  <div className="flex-shrink-0">
                    {logoUrl && !imgErrors[item.id] ? (
                      <img
                        src={logoUrl}
                        alt=""
                        className="w-10 h-10 rounded-full bg-intel-700 object-cover"
                        onError={() => setImgErrors(prev => ({ ...prev, [item.id]: true }))}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                        {item.source?.slice(0, 2).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-sm">
                      <span className="font-bold text-white">{item.source}</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-500">{formatDate(item.pubDate)}</span>
                      {item.scope === 'local' && (
                        <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                          <MapPin className="w-3 h-3" />
                        </span>
                      )}
                      {item.scope === 'regional' && (
                        <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                          <Globe2 className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[15px] text-white mt-0.5 leading-snug line-clamp-2">{item.title}</p>
                    {item.summary && (
                      <p className="text-[13px] text-gray-400 mt-1 line-clamp-1">{item.summary}</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SearchPage;
