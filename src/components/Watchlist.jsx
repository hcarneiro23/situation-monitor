import React from 'react';
import { useStore } from '../store/useStore';
import { X, Newspaper, Hash, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function Watchlist() {
  const { watchlist, removeFromWatchlist, news, getSimilarNews } = useStore();

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

  // Get similar news count for tracked posts
  const getSimilarCount = (tracked) => {
    const similar = getSimilarNews(tracked);
    return similar.length;
  };

  const totalTracked = trackedPosts.length + trackedTopics.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Tracking</h2>
        <span className="text-xs text-gray-500">{totalTracked} items</span>
      </div>

      {totalTracked === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">Nothing tracked yet</p>
          <p className="text-gray-600 text-xs mt-1">Bookmark posts to track similar stories</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Tracked Posts */}
          {trackedPosts.map(item => {
            const similarCount = getSimilarCount(item);
            return (
              <div
                key={item.id}
                className="group flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-intel-800/50 transition-colors"
              >
                <Newspaper className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm leading-tight line-clamp-2">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {item.data?.source}
                    </span>
                    {similarCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-blue-400">
                        <Bell className="w-3 h-3" />
                        {similarCount} similar
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeFromWatchlist(item.id)}
                  className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Stop tracking"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {/* Tracked Topics */}
          {trackedTopics.map(item => {
            const mentions = getTopicMentions(item.name);
            return (
              <div
                key={item.id}
                className="group flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-intel-800/50 transition-colors"
              >
                <Hash className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm leading-tight">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {mentions} mentions
                  </p>
                </div>
                <button
                  onClick={() => removeFromWatchlist(item.id)}
                  className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
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
