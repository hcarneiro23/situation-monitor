import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { X } from 'lucide-react';

function AlertPanel() {
  const { alerts, markAlertRead, news, watchlist, addAlert } = useStore();
  const unreadAlerts = alerts.filter(a => !a.read);
  const prevNewsRef = useRef(news);

  // Check for new mentions of watched topics
  useEffect(() => {
    if (prevNewsRef.current.length === 0 || news.length === 0) {
      prevNewsRef.current = news;
      return;
    }

    const topicItems = watchlist.filter(item => item.type === 'topic');
    const prevNewsIds = new Set(prevNewsRef.current.map(n => n.id));
    const newNews = news.filter(n => !prevNewsIds.has(n.id));

    if (newNews.length > 0) {
      topicItems.forEach(topic => {
        const topicName = topic.name.toLowerCase();
        const matchingNews = newNews.filter(item => {
          const text = `${item.title} ${item.summary || ''}`.toLowerCase();
          return text.includes(topicName);
        });

        if (matchingNews.length > 0) {
          addAlert({
            type: 'topic',
            title: topic.name,
            message: `${matchingNews.length} new ${matchingNews.length === 1 ? 'mention' : 'mentions'}`,
            severity: 'info',
            topicId: topic.id
          });
        }
      });
    }

    prevNewsRef.current = news;
  }, [news, watchlist]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (unreadAlerts.length > 0) {
      const timer = setTimeout(() => {
        markAlertRead(unreadAlerts[0].id);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [unreadAlerts]);

  if (unreadAlerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {unreadAlerts.slice(0, 3).map((alert, index) => (
        <div
          key={alert.id}
          className="bg-intel-800 border border-intel-600 rounded-xl shadow-lg p-4 animate-slide-in flex items-start gap-3"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Blue dot indicator */}
          <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{alert.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{alert.message}</p>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => markAlertRead(alert.id)}
            className="p-1 hover:bg-intel-600 rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-500 hover:text-white" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default AlertPanel;
