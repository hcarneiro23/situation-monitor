import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { X, Newspaper, Hash, ChevronRight, ChevronDown } from 'lucide-react';

function Watchlist() {
  const navigate = useNavigate();
  const { watchlist, removeFromWatchlist, news, getSimilarNews } = useStore();
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpanded = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Separate tracked posts and topics
  const trackedPosts = watchlist.filter(item => item.type === 'news');
  const trackedTopics = watchlist.filter(item => item.type === 'topic');

  // Count mentions for topics
  const getTopicMentions = (topicName) => {
    const name = topicName.toLowerCase();
    return news.filter(item => {
      const text = `${item.title} ${item.summary || ''}`.toLowerCase();
      return text.includes(name);
    }).length;
  };

  const totalTracked = trackedPosts.length + trackedTopics.length;

  const handleNewsClick = (newsId) => {
    navigate(`/post/${newsId}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Tracking</h2>
        <span className="text-xs text-gray-500">{totalTracked} items</span>
      </div>

      {totalTracked === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">Nothing tracked yet</p>
          <p className="text-gray-600 text-xs mt-1">Tap the bell on posts to track similar stories</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tracked Posts */}
          {trackedPosts.map(item => {
            const similarNews = getSimilarNews(item);
            return (
              <div key={item.id} className="group">
                {/* Tracked post header */}
                <div className="flex items-start gap-3">
                  <Newspaper className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm leading-tight line-clamp-2">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.data?.source}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromWatchlist(item.id)}
                    className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                    title="Stop tracking"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Similar news - dropdown */}
                {similarNews.length > 0 && (
                  <div className="mt-2 ml-7">
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {expandedItems[item.id] ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      <span>{similarNews.length} similar</span>
                    </button>
                    {expandedItems[item.id] && (
                      <div className="mt-1 space-y-1">
                        {similarNews.slice(0, 5).map(similar => (
                          <button
                            key={similar.id}
                            onClick={() => handleNewsClick(similar.id)}
                            className="w-full flex items-center gap-2 p-2 -mx-2 rounded text-left hover:bg-intel-800 transition-colors group/item"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-300 line-clamp-1 group-hover/item:text-white">
                                {similar.title}
                              </p>
                              <p className="text-xs text-gray-600">{similar.source}</p>
                            </div>
                            <ChevronRight className="w-3 h-3 text-gray-600 group-hover/item:text-gray-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Tracked Topics */}
          {trackedTopics.map(item => {
            const mentions = getTopicMentions(item.name);
            return (
              <div key={item.id} className="flex items-start gap-3">
                <Hash className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm leading-tight">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {mentions} mentions
                  </p>
                </div>
                <button
                  onClick={() => removeFromWatchlist(item.id)}
                  className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                  title="Stop tracking"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Watchlist;
