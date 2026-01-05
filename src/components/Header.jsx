import React from 'react';
import { useStore } from '../store/useStore';
import { useAuth } from '../context/AuthContext';
import { Bell, LogOut, User } from 'lucide-react';

function Header() {
  const { isConnected, alerts } = useStore();
  const { user, signOut } = useAuth();
  const unreadCount = alerts.filter(a => !a.read).length;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-intel-900/80 backdrop-blur-md border-b border-intel-700">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">Situation Monitor</h1>
            {/* Connection indicator */}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}
                 title={isConnected ? 'Live' : 'Offline'} />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2 rounded-full hover:bg-intel-700 transition-colors">
              <Bell className="w-5 h-5 text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-blue-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User */}
            {user && (
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-intel-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-full hover:bg-intel-700 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
