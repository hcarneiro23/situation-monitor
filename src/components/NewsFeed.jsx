import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { MessageCircle, Heart, Share, ExternalLink, Bell, BellRing, MapPin, Globe2 } from 'lucide-react';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { likesService } from '../services/likes';
import { commentsService } from '../services/comments';
import { useAuth } from '../context/AuthContext';

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
function NewsItem({ item, onLike, onBookmark, isBookmarked, onNavigate, likeData, replyCount, isNew }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getSourceLogo(item.link);
  const isLiked = likeData?.isLiked || false;
  const likeCount = likeData?.count || 0;

  const handleClick = () => {
    onNavigate(item.id);
  };

  const handleLike = (e) => {
    e.stopPropagation();
    onLike(item.id);
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const postUrl = `${window.location.origin}/post/${item.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.summary || item.title,
          url: postUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(postUrl);
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
            {/* New badge for fresh posts */}
            {isNew && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                NEW
              </span>
            )}
            {/* Scope badge for local/regional news */}
            {item.scope === 'local' && (
              <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                <MapPin className="w-3 h-3" />
                Local
              </span>
            )}
            {item.scope === 'regional' && (
              <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                <Globe2 className="w-3 h-3" />
                Regional
              </span>
            )}
            <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleBookmark}
                className="p-1.5 rounded-full hover:bg-intel-700 transition-colors"
                title={isBookmarked ? 'Stop tracking' : 'Track similar stories'}
              >
                {isBookmarked ? (
                  <BellRing className="w-4 h-4 text-blue-400" />
                ) : (
                  <Bell className="w-4 h-4 text-gray-500" />
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

          {/* Article image */}
          {item.image && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-intel-600">
              <img
                src={item.image}
                alt=""
                className="w-full h-48 object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}

          {/* Link preview card */}
          {!item.image && item.link && (
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
          <div className="flex items-center gap-6 mt-3" onClick={(e) => e.stopPropagation()}>
            {/* Reply - opens post page */}
            <button
              onClick={handleReply}
              className="flex items-center gap-1 text-gray-500 hover:text-blue-400 transition-colors group"
              title="Reply"
            >
              <div className="p-2 rounded-full group-hover:bg-blue-400/10 -ml-2">
                <MessageCircle className="w-[18px] h-[18px]" />
              </div>
              {replyCount > 0 && <span className="text-xs">{replyCount}</span>}
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
              {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
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
  const { user } = useAuth();
  const { news, addToWatchlist, removeFromWatchlist, isInWatchlist, userCity, userInterests, getNewsByUserLocation } = useStore();
  const [displayCount, setDisplayCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [likesMap, setLikesMap] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [seenPostIds] = useState(() => {
    // Get previously seen post IDs
    const seen = JSON.parse(localStorage.getItem('seenPostIds') || '[]');
    return new Set(seen);
  });
  const loaderRef = useRef(null);

  // Filter news based on user's selected location
  const filteredNews = getNewsByUserLocation();

  // Check if a post is new (user hasn't seen it before)
  const isNewPost = (item) => {
    return !seenPostIds.has(item.id);
  };

  // Mark displayed posts as seen
  useEffect(() => {
    if (filteredNews.length > 0) {
      const currentIds = filteredNews.slice(0, displayCount).map(item => item.id);
      const allSeen = [...seenPostIds, ...currentIds];
      // Keep only last 500 IDs to prevent localStorage bloat
      const trimmed = [...new Set(allSeen)].slice(-500);
      localStorage.setItem('seenPostIds', JSON.stringify(trimmed));
    }
  }, [filteredNews, displayCount]);

  // Subscribe to all likes
  useEffect(() => {
    const unsubscribe = likesService.subscribeToAllLikes((likes) => {
      setLikesMap(likes);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to all comments (for reply counts)
  useEffect(() => {
    const unsubscribes = [];
    const counts = {};

    // Subscribe to comments for displayed posts
    filteredNews.slice(0, displayCount).forEach(item => {
      const unsub = commentsService.subscribeToComments(item.id, (comments) => {
        // Count all comments (including nested)
        const countAll = (commentList) => {
          let count = commentList.length;
          commentList.forEach(c => {
            if (c.replies) count += countAll(c.replies);
          });
          return count;
        };
        counts[item.id] = countAll(comments);
        setCommentsMap({ ...counts });
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [filteredNews, displayCount]);

  const handleNavigateToPost = (postId) => {
    navigate(`/post/${postId}`);
  };

  // Sort by date (newest first)
  const sortedNews = [...filteredNews].sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime() || 0;
    const dateB = new Date(b.pubDate).getTime() || 0;
    return dateB - dateA;
  });

  const displayedNews = sortedNews.slice(0, displayCount);
  const hasMore = displayCount < sortedNews.length;

  // Handle like toggle
  const handleLike = async (itemId) => {
    if (!user) return;
    try {
      await likesService.toggleLike(itemId, user.uid);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  // Handle bookmark toggle (track post)
  const handleBookmark = (item) => {
    if (isInWatchlist(item.id)) {
      removeFromWatchlist(item.id);
    } else {
      addToWatchlist({
        id: item.id,
        type: 'news',
        name: item.title,
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
          <h2 className="text-xl font-bold text-white">Your Feed</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {userCity
              ? `${userCity.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} + Global`
              : 'Global news'
            }
            {userInterests && userInterests.length > 0 && (
              <span className="text-gray-500"> · Personalized</span>
            )}
          </p>
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
            {displayedNews.map((item, idx) => {
              const postLikes = likesMap[item.id] || { count: 0, userIds: [] };
              return (
                <NewsItem
                  key={`${item.id}-${idx}`}
                  item={item}
                  onLike={handleLike}
                  onBookmark={handleBookmark}
                  isBookmarked={isInWatchlist(item.id)}
                  onNavigate={handleNavigateToPost}
                  likeData={{
                    count: postLikes.count,
                    isLiked: user ? postLikes.userIds.includes(user.uid) : false
                  }}
                  replyCount={commentsMap[item.id] || 0}
                  isNew={isNewPost(item)}
                />
              );
            })}

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
