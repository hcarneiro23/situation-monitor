import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
  Newspaper, Filter, ChevronDown, ChevronUp, ExternalLink,
  TrendingUp, Clock, Globe, Bookmark, BookmarkCheck, ArrowUpDown
} from 'lucide-react';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';

// Safely parse a date string and return timestamp (for sorting)
function getTimestamp(dateStr) {
  if (!dateStr) return 0;

  try {
    // Try parsing as ISO first (most reliable)
    const isoDate = parseISO(dateStr);
    if (isValid(isoDate)) return isoDate.getTime();

    // Fallback to native Date parsing
    const nativeDate = new Date(dateStr);
    if (isValid(nativeDate)) return nativeDate.getTime();
  } catch (e) {
    // Parsing failed
  }

  return 0; // Invalid dates sort to the end
}

// Safely format a date for display
function safeFormatDistanceToNow(dateStr) {
  if (!dateStr) return 'Unknown';

  try {
    const date = parseISO(dateStr);
    if (isValid(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    const nativeDate = new Date(dateStr);
    if (isValid(nativeDate)) {
      return formatDistanceToNow(nativeDate, { addSuffix: true });
    }
  } catch (e) {
    // Parsing failed
  }

  return 'Unknown';
}

function NewsFeed() {
  const { news, addToWatchlist, removeFromWatchlist, isInWatchlist, expandedNews, setExpandedNews } = useStore();
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [clusterView, setClusterView] = useState(false);
  const [sortOrder, setSortOrder] = useState('latest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Cluster news by theme
  const clusteredNews = useMemo(() => {
    const clusters = {};
    news.forEach(item => {
      const text = `${item.title} ${item.summary}`.toLowerCase();
      let cluster = 'Other';

      if (text.includes('china') && (text.includes('us') || text.includes('tariff') || text.includes('trade'))) {
        cluster = 'US-China Relations';
      } else if (text.includes('russia') || text.includes('ukraine')) {
        cluster = 'Russia-Ukraine';
      } else if (text.includes('israel') || text.includes('iran') || text.includes('saudi') || text.includes('gaza')) {
        cluster = 'Middle East';
      } else if (text.includes('fed ') || text.includes('ecb') || text.includes('central bank') || text.includes('interest rate')) {
        cluster = 'Central Banks';
      } else if (text.includes('oil') || text.includes('gas') || text.includes('energy')) {
        cluster = 'Energy';
      } else if (text.includes('chip') || text.includes('semiconductor') || text.includes('tech')) {
        cluster = 'Technology';
      }

      if (!clusters[cluster]) clusters[cluster] = [];
      clusters[cluster].push(item);
    });

    return clusters;
  }, [news]);

  // Filter and sort news
  const filteredNews = useMemo(() => {
    // Always create a new array to ensure proper re-rendering
    let result = [...news];

    // Apply filter
    if (filter === 'high') {
      result = result.filter(n => n.relevanceScore >= 7);
    } else if (filter === 'signals') {
      result = result.filter(n => n.isSignal);
    } else if (filter === 'new') {
      result = result.filter(n => n.isNew);
    }

    // Apply sort - always sort to ensure correct order
    if (sortOrder === 'relevance') {
      result.sort((a, b) => {
        const scoreDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        // Tiebreaker: newest first
        return getTimestamp(b.pubDate) - getTimestamp(a.pubDate);
      });
    } else {
      // Default: sort by date (latest first)
      result.sort((a, b) => getTimestamp(b.pubDate) - getTimestamp(a.pubDate));
    }

    return result;
  }, [news, filter, sortOrder]);

  const getSignalStrengthBadge = (strength) => {
    switch (strength) {
      case 'confirmed':
        return <span className="badge badge-high">Confirmed</span>;
      case 'building':
        return <span className="badge badge-medium">Building</span>;
      case 'early':
        return <span className="badge badge-low">Early</span>;
      default:
        return null;
    }
  };

  const getRelevanceIndicator = (score) => {
    const bars = Math.ceil(score / 2);
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`w-1 h-3 rounded-sm ${
              i < bars
                ? score >= 7 ? 'bg-red-400' : score >= 5 ? 'bg-amber-400' : 'bg-blue-400'
                : 'bg-intel-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const toggleWatchlist = (item) => {
    if (isInWatchlist(item.id)) {
      removeFromWatchlist(item.id);
    } else {
      addToWatchlist({
        id: item.id,
        type: 'news',
        name: item.title.slice(0, 50),
        data: item
      });
    }
  };

  return (
    <div className="bg-intel-800 rounded-xl border border-intel-700 overflow-hidden" id="news">
      {/* Header */}
      <div className="px-4 py-3 border-b border-intel-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-white">Intelligence Feed</h2>
          <span className="text-xs text-gray-500">({filteredNews.length} items)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-intel-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <ArrowUpDown className="w-3 h-3" />
              {sortOrder === 'latest' ? 'Latest' : 'Relevance'}
              <ChevronDown className={`w-3 h-3 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showSortDropdown && (
              <div className="absolute top-full right-0 mt-1 w-32 bg-intel-800 border border-intel-600 rounded-lg shadow-xl z-50 py-1">
                <button
                  onClick={() => { setSortOrder('latest'); setShowSortDropdown(false); }}
                  className={`w-full px-3 py-1.5 text-xs text-left hover:bg-intel-700 ${sortOrder === 'latest' ? 'text-blue-400' : 'text-gray-300'}`}
                >
                  Latest
                </button>
                <button
                  onClick={() => { setSortOrder('relevance'); setShowSortDropdown(false); }}
                  className={`w-full px-3 py-1.5 text-xs text-left hover:bg-intel-700 ${sortOrder === 'relevance' ? 'text-blue-400' : 'text-gray-300'}`}
                >
                  Relevance
                </button>
              </div>
            )}
          </div>

          {/* Cluster toggle */}
          <button
            onClick={() => setClusterView(!clusterView)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              clusterView ? 'bg-blue-500/20 text-blue-400' : 'bg-intel-700 text-gray-400 hover:text-white'
            }`}
          >
            Cluster
          </button>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-intel-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <Filter className="w-3 h-3" />
            Filter
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-4 py-2 border-b border-intel-700 bg-intel-700/30 flex gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'high', label: 'High Relevance' },
            { value: 'signals', label: 'Signals Only' },
            { value: 'new', label: 'New Info' }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                filter === f.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-intel-600 text-gray-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* News list - key forces re-render when sort/filter changes */}
      <div key={`${sortOrder}-${filter}`} className="divide-y divide-intel-700 max-h-[600px] overflow-y-auto">
        {clusterView ? (
          // Clustered view
          Object.entries(clusteredNews).map(([cluster, items]) => (
            items.length > 0 && (
              <div key={cluster}>
                <div className="px-4 py-2 bg-intel-700/50 text-xs font-medium text-gray-400 uppercase tracking-wide sticky top-0">
                  {cluster} ({items.length})
                </div>
                {items.slice(0, 5).map((item, idx) => (
                  <NewsItem
                    key={`${item.id}-${idx}`}
                    item={item}
                    expanded={expandedNews === item.id}
                    onToggle={() => setExpandedNews(expandedNews === item.id ? null : item.id)}
                    onWatchlistToggle={() => toggleWatchlist(item)}
                    isWatched={isInWatchlist(item.id)}
                    getSignalStrengthBadge={getSignalStrengthBadge}
                    getRelevanceIndicator={getRelevanceIndicator}
                  />
                ))}
              </div>
            )
          ))
        ) : (
          // List view
          filteredNews.slice(0, 50).map((item, idx) => (
            <NewsItem
              key={`${item.id}-${idx}`}
              item={item}
              expanded={expandedNews === item.id}
              onToggle={() => setExpandedNews(expandedNews === item.id ? null : item.id)}
              onWatchlistToggle={() => toggleWatchlist(item)}
              isWatched={isInWatchlist(item.id)}
              getSignalStrengthBadge={getSignalStrengthBadge}
              getRelevanceIndicator={getRelevanceIndicator}
            />
          ))
        )}

        {filteredNews.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No news items match your filter</p>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {showSortDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSortDropdown(false)}
        />
      )}
    </div>
  );
}

function NewsItem({ item, expanded, onToggle, onWatchlistToggle, isWatched, getSignalStrengthBadge, getRelevanceIndicator }) {
  return (
    <div className={`p-4 hover:bg-intel-700/30 transition-colors ${item.isNew ? 'border-l-2 border-blue-500' : ''}`}>
      {/* Main row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Source and time */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-blue-400">{item.source}</span>
            <span className="text-xs text-gray-500">
              {safeFormatDistanceToNow(item.pubDate)}
            </span>
            {item.isNew && (
              <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">NEW</span>
            )}
            {getSignalStrengthBadge(item.signalStrength)}
          </div>

          {/* Title */}
          <h3
            className="text-sm font-medium text-gray-200 cursor-pointer hover:text-white line-clamp-2"
            onClick={onToggle}
          >
            {item.title}
          </h3>

          {/* Why it matters (always visible) */}
          <p className="text-xs text-gray-400 mt-1 flex items-start gap-1">
            <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-400" />
            {item.whyItMatters}
          </p>
        </div>

        {/* Right side - relevance and actions */}
        <div className="flex flex-col items-end gap-2">
          {getRelevanceIndicator(item.relevanceScore)}
          <div className="flex items-center gap-1">
            <button
              onClick={onWatchlistToggle}
              className="p-1 hover:bg-intel-600 rounded transition-colors"
              title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              {isWatched ? (
                <BookmarkCheck className="w-4 h-4 text-blue-400" />
              ) : (
                <Bookmark className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-intel-600 rounded transition-colors"
                title="Open source"
              >
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-intel-600 animate-slide-in">
          {/* Summary */}
          {item.summary && (
            <p className="text-sm text-gray-300 mb-3">{item.summary}</p>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Regions */}
            {item.regions && item.regions.length > 0 && (
              <div>
                <span className="text-gray-500 block mb-1">Regions</span>
                <div className="flex flex-wrap gap-1">
                  {item.regions.map(r => (
                    <span key={r} className="px-2 py-0.5 bg-intel-600 rounded text-gray-300 capitalize">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Exposed Markets */}
            {item.exposedMarkets && item.exposedMarkets.length > 0 && (
              <div>
                <span className="text-gray-500 block mb-1">Exposed Markets</span>
                <div className="flex flex-wrap gap-1">
                  {item.exposedMarkets.slice(0, 4).map(m => (
                    <span key={m} className="px-2 py-0.5 bg-intel-600 rounded text-gray-300">
                      {m}
                    </span>
                  ))}
                  {item.exposedMarkets.length > 4 && (
                    <span className="text-gray-500">+{item.exposedMarkets.length - 4}</span>
                  )}
                </div>
              </div>
            )}

            {/* Transmission Channel */}
            <div className="col-span-2">
              <span className="text-gray-500 block mb-1">Transmission Channel</span>
              <span className="text-gray-300">{item.transmissionChannel}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewsFeed;
