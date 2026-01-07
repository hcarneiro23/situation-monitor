import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, Bell, Check, Trash2 } from 'lucide-react';

function NotificationsPage() {
  const navigate = useNavigate();
  const { alerts, markAlertRead, clearAlerts } = useStore();

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const markAllAsRead = () => {
    alerts.forEach(alert => {
      if (!alert.read) {
        markAlertRead(alert.id);
      }
    });
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="min-h-screen bg-intel-900 pb-16 lg:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-intel-900/80 backdrop-blur-md border-b border-intel-700">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-intel-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">Notifications</h1>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-2 rounded-full hover:bg-intel-700 transition-colors"
                title="Mark all as read"
              >
                <Check className="w-5 h-5 text-gray-400" />
              </button>
            )}
            {alerts.length > 0 && (
              <button
                onClick={clearAlerts}
                className="p-2 rounded-full hover:bg-intel-700 transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-full bg-intel-800 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-gray-500" />
            </div>
            <h2 className="text-lg font-medium text-white mb-1">No notifications yet</h2>
            <p className="text-gray-500 text-center text-sm">
              When you track topics or sources, you'll see alerts here when there's new activity.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-intel-700">
            {alerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => {
                  markAlertRead(alert.id);
                  if (alert.topicId) {
                    navigate(`/topic/${encodeURIComponent(alert.title)}`);
                  }
                }}
                className={`w-full flex items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-intel-800 ${
                  !alert.read ? 'bg-intel-800/50' : ''
                }`}
              >
                {/* Unread indicator */}
                <div className="pt-1.5">
                  <div className={`w-2 h-2 rounded-full ${!alert.read ? 'bg-blue-400' : 'bg-transparent'}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${!alert.read ? 'text-white' : 'text-gray-300'}`}>
                      {alert.title}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{alert.message}</p>
                  <p className="text-xs text-gray-600 mt-1">{formatTime(alert.timestamp)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
