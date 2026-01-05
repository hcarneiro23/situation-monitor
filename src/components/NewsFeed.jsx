import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { MessageCircle, Heart, Share, ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';

// Get liked items from localStorage
function getLikedItems() {
  try {
    return JSON.parse(localStorage.getItem('likedNews') || '{}');
  } catch {
    return {};
  }
}

// Save liked items to localStorage
function setLikedItems(items) {
  localStorage.setItem('likedNews', JSON.stringify(items));
}

// Source logo colors for fallback avatars
const SOURCE_COLORS = {
  'Reuters': '#ff8000',
  'BBC': '#bb1919',
  'Al Jazeera': '#fa9000',
  'Financial Times': '#fff1e5',
  'Bloomberg': '#2800d7',
  'CNBC': '#005594',
  'CNN': '#cc0000',
  'The Guardian': '#052962',
  'AP News': '#ff322e',
  'MarketWatch': '#00ac4e',
  'Yahoo Finance': '#6001d2',
  'default': '#1d9bf0'
};

// Get favicon URL for a source
function getSourceLogo(link) {
  try {
    if (link) {
      const url = new URL(link);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
    }
  } catch (e) {}
  return null;
}

// Get source initials for fallback
function getSourceInitials(source) {
  if (!source) return '?';
  return source.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// Get color for source
function getSourceColor(source) {
  return SOURCE_COLORS[source] || SOURCE_COLORS.default;
}

// Safely format date
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

// Tweet-like news item component
function NewsItem({ item, likedItems, onLike, onBookmark, isBookmarked, onNavigate }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getSourceLogo(item.link);
  const isLiked = likedItems[item.id];

  const handleClick = () => {
    onNavigate(item.id);
  };

  const handleLike = (e) => {
    e.stopPropagation();
    onLike(item.id);
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.summary || item.title,
          url: item.link
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(item.link);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleBookmark = (e) => {
    e.stopPropagation();
    onBookmark(item);
  };

  const handleReply = (e) => {
    e.stopPropagation();
    onNavigate(item.id);
  };

  return (
    <article
      className="px-4 py-3 border-b border-intel-700 hover:bg-intel-800/50 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Source avatar */}
        <div className="flex-shrink-0">
          {logoUrl && !imgError ? (
            <img
              src={logoUrl}
              alt=""
              className="w-10 h-10 rounded-full bg-intel-700 object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: getSourceColor(item.source) }}
            >
              {getSourceInitials(item.source)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1 text-sm">
            <span className="font-bold text-white hover:underline">{item.source}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500">{formatDate(item.pubDate)}</span>
            <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleBookmark}
                className="p-1.5 rounded-full hover:bg-intel-700 transition-colors"
                title={isBookmarked ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-4 h-4 text-blue-400" />
                ) : (
                  <Bookmark className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Title as main tweet text */}
          <p className="text-[15px] text-white mt-0.5 leading-snug">{item.title}</p>

          {/* Summary as additional context */}
          {item.summary && (
            <p className="text-[14px] text-gray-400 mt-1 line-clamp-2">{item.summary}</p>
          )}

          {/* Link preview card */}
          {item.link && (
            <div
              className="mt-3 border border-intel-600 rounded-2xl overflow-hidden hover:bg-intel-700/30 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2"
              >
                <div className="flex items-center gap-2 text-gray-500">
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="text-xs truncate">
                    {(() => {
                      try {
                        return new URL(item.link).hostname.replace('www.', '');
                      } catch (e) {
                        return item.link;
                      }
                    })()}
                  </span>
                </div>
              </a>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-8 mt-3" onClick={(e) => e.stopPropagation()}>
            {/* Reply - opens post page */}
            <button
              onClick={handleReply}
              className="flex items-center gap-1 text-gray-500 hover:text-blue-400 transition-colors group"
              title="Reply"
            >
              <div className="p-2 rounded-full group-hover:bg-blue-400/10 -ml-2">
                <MessageCircle className="w-[18px] h-[18px]" />
              </div>
            </button>

            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors group ${isLiked ? 'text-pink-500' : 'text-gray-500 hover:text-pink-400'}`}
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <div className="p-2 rounded-full group-hover:bg-pink-400/10">
                <Heart className={`w-[18px] h-[18px] ${isLiked ? 'fill-current' : ''}`} />
              </div>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1 text-gray-500 hover:text-blue-400 transition-colors group"
              title="Share"
            >
              <div className="p-2 rounded-full group-hover:bg-blue-400/10">
                <Share className="w-[18px] h-[18px]" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function NewsFeed() {
  const navigate = useNavigate();
  const { news, addToWatchlist, removeFromWatchlist, isInWatchlist } = useStore();
  const [displayCount, setDisplayCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [likedItems, setLikedItemsState] = useState(getLikedItems);
  const loaderRef = useRef(null);

  const handleNavigateToPost = (postId) => {
    navigate(`/post/${postId}`);
  };

  // Sort by date (newest first)
  const sortedNews = [...news].sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime() || 0;
    const dateB = new Date(b.pubDate).getTime() || 0;
    return dateB - dateA;
  });

  const displayedNews = sortedNews.slice(0, displayCount);
  const hasMore = displayCount < sortedNews.length;

  // Handle like toggle
  const handleLike = (itemId) => {
    const newLikedItems = { ...likedItems };
    if (newLikedItems[itemId]) {
      delete newLikedItems[itemId];
    } else {
      newLikedItems[itemId] = true;
    }
    setLikedItemsState(newLikedItems);
    setLikedItems(newLikedItems);
  };

  // Handle bookmark toggle
  const handleBookmark = (item) => {
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

  // Infinite scroll using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setLoading(true);
          setTimeout(() => {
            setDisplayCount(prev => Math.min(prev + 15, sortedNews.length));
            setLoading(false);
          }, 300);
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, sortedNews.length]);

  return (
    <div className="h-full flex flex-col bg-intel-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-intel-900/80 backdrop-blur-md border-b border-intel-700">
        <div className="px-4 py-3">
          <h2 className="text-xl font-bold text-white">What's Happening</h2>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {sortedNews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">No news yet</p>
            <p className="text-sm mt-1">News will appear here as they come in</p>
          </div>
        ) : (
          <>
            {displayedNews.map((item, idx) => (
              <NewsItem
                key={`${item.id}-${idx}`}
                item={item}
                likedItems={likedItems}
                onLike={handleLike}
                onBookmark={handleBookmark}
                isBookmarked={isInWatchlist(item.id)}
                onNavigate={handleNavigateToPost}
              />
            ))}

            {/* Loading indicator / Infinite scroll trigger */}
            <div ref={loaderRef} className="py-6">
              {loading && (
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!hasMore && sortedNews.length > 0 && (
                <p className="text-center text-gray-600 text-sm">You're all caught up</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default NewsFeed;
