import React from 'react';
import { useStore } from '../store/useStore';
import { useAuth } from '../context/AuthContext';
import { Activity, Wifi, WifiOff, Clock, Bell, Settings, LogOut, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function Header() {
  const { isConnected, lastUpdate, alerts, news, signals } = useStore();
  const { user, signOut } = useAuth();
  const unreadAlerts = alerts.filter(a => !a.read).length;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-intel-700">
      <div className="max-w-[1920px] mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo and title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-cyan-500">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Situation Monitor</h1>
              <p className="text-xs text-gray-400 -mt-0.5">Intelligence Console</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-gray-500">News Items:</span>
              <span className="text-white font-medium">{news.length}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-gray-500">Active Signals:</span>
              <span className="text-white font-medium">{signals.length}</span>
            </div>
          </div>

          {/* Right side - status and controls */}
          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
              isConnected
                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                : 'bg-red-500/10 text-red-400 border border-red-500/30'
            }`}>
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span>Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* Last update */}
            {lastUpdate && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                <span>
                  Updated {formatDistanceToNow(new Date(lastUpdate), { addSuffix: true })}
                </span>
              </div>
            )}

            {/* Alerts button */}
            <button
              className="relative p-2 rounded-lg hover:bg-intel-700 transition-colors"
              title="Alerts"
            >
              <Bell className="w-5 h-5 text-gray-400" />
              {unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {unreadAlerts}
                </span>
              )}
            </button>

            {/* Settings */}
            <button
              className="p-2 rounded-lg hover:bg-intel-700 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>

            {/* User menu */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-intel-600">
                <div className="hidden sm:flex items-center gap-2">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-intel-600 flex items-center justify-center">
                      <User className="w-3 h-3 text-gray-400" />
                    </div>
                  )}
                  <span className="text-xs text-gray-400 max-w-[100px] truncate">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg hover:bg-intel-700 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation bar */}
        <nav className="flex items-center gap-1 pb-2 overflow-x-auto scrollbar-hide">
          {[
            { id: 'what-matters-now', label: 'What Matters Now' },
            { id: 'news', label: 'News Feed' },
            { id: 'signals', label: 'Signals' },
            { id: 'relationships', label: 'Relationships' },
            { id: 'markets', label: 'Markets' },
            { id: 'scenarios', label: 'Scenarios' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'watchlist', label: 'Watchlist' }
          ].map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-intel-700 rounded transition-colors whitespace-nowrap"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default Header;
