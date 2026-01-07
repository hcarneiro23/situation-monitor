import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsService } from '../services/notifications';
import { ArrowLeft, Bell, Check, Heart, User } from 'lucide-react';

function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  // Subscribe to notifications
  useEffect(() => {
    if (!user) return;

    const unsubscribe = notificationsService.subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user]);

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

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await notificationsService.markAsRead(notification.id);
    }
    // Navigate to the post
    if (notification.postId) {
      navigate(`/post/${notification.postId}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
              <span className="text-sm text-gray-500">{unreadCount} new</span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-full bg-intel-800 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-gray-500" />
            </div>
            <h2 className="text-lg font-medium text-white mb-1">No notifications yet</h2>
            <p className="text-gray-500 text-center text-sm">
              You'll see activity and updates here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-intel-700">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full flex items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-intel-800 ${
                  !notification.read ? 'bg-intel-800/50' : ''
                }`}
              >
                {/* User avatar or icon */}
                <div className="flex-shrink-0">
                  {notification.fromUserPhoto ? (
                    <img
                      src={notification.fromUserPhoto}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-intel-700 flex items-center justify-center">
                      {notification.type === 'comment_like' ? (
                        <Heart className="w-5 h-5 text-red-400" />
                      ) : (
                        <User className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                    )}
                    <p className={`font-medium ${!notification.read ? 'text-white' : 'text-gray-300'}`}>
                      {notification.title}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{notification.message}</p>
                  <p className="text-xs text-gray-600 mt-1">{formatTime(notification.createdAt)}</p>
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
