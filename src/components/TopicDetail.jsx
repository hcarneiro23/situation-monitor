import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, MessageCircle, Heart, Share, ExternalLink } from 'lucide-react';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { likesService } from '../services/likes';
import { useAuth } from '../context/AuthContext';

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

function TopicDetail() {
  const { topic } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { news } = useStore();
  const [likesMap, setLikesMap] = useState({});

  const decodedTopic = decodeURIComponent(topic);
  const topicWords = decodedTopic.toLowerCase().split(' ');

  // Find all news mentioning this topic
  const mentions = news.filter(item => {
    const text = `${item.title} ${item.summary || ''}`.toLowerCase();
    return topicWords.every(word => text.includes(word));
  }).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // Subscribe to likes
  useEffect(() => {
    const unsubscribe = likesService.subscribeToAllLikes((likes) => {
      setLikesMap(likes);
    });
    return () => unsubscribe();
  }, []);

  const handleLike = async (itemId) => {
    if (!user) return;
    try {
      await likesService.toggleLike(itemId, user.uid);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleShare = async (item) => {
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
      try {
        await navigator.clipboard.writeText(postUrl);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-intel-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-intel-900/80 backdrop-blur-md border-b border-intel-700">
        <div className="flex items-center gap-4 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-intel-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{decodedTopic}</h1>
            <p className="text-sm text-gray-400">{mentions.length} mentions</p>
          </div>
        </div>
      </div>

      {/* Mentions list */}
      <div className="max-w-2xl mx-auto">
        {mentions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">No mentions found</p>
          </div>
        ) : (
          mentions.map((item) => {
            const postLikes = likesMap[item.id] || { count: 0, userIds: [] };
            const isLiked = user ? postLikes.userIds.includes(user.uid) : false;

            return (
              <article
                key={item.id}
                className="px-4 py-3 border-b border-intel-700 hover:bg-intel-800/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/post/${item.id}`)}
              >
                <div className="flex items-center gap-2 text-sm mb-1">
                  <span className="font-bold text-white">{item.source}</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-500">{formatDate(item.pubDate)}</span>
                </div>

                <p className="text-[15px] text-white leading-snug">{item.title}</p>

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
                  <button
                    onClick={() => navigate(`/post/${item.id}`)}
                    className="flex items-center gap-1 text-gray-500 hover:text-blue-400 transition-colors group"
                  >
                    <div className="p-2 rounded-full group-hover:bg-blue-400/10 -ml-2">
                      <MessageCircle className="w-[18px] h-[18px]" />
                    </div>
                  </button>

                  <button
                    onClick={() => handleLike(item.id)}
                    className={`flex items-center gap-1 transition-colors group ${isLiked ? 'text-pink-500' : 'text-gray-500 hover:text-pink-400'}`}
                  >
                    <div className="p-2 rounded-full group-hover:bg-pink-400/10">
                      <Heart className={`w-[18px] h-[18px] ${isLiked ? 'fill-current' : ''}`} />
                    </div>
                    {postLikes.count > 0 && <span className="text-xs">{postLikes.count}</span>}
                  </button>

                  <button
                    onClick={() => handleShare(item)}
                    className="flex items-center gap-1 text-gray-500 hover:text-blue-400 transition-colors group"
                  >
                    <div className="p-2 rounded-full group-hover:bg-blue-400/10">
                      <Share className="w-[18px] h-[18px]" />
                    </div>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

export default TopicDetail;
