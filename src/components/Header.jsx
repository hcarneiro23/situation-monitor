import React from 'react';
import { useStore } from '../store/useStore';
import { useAuth } from '../context/AuthContext';
import { Wifi, WifiOff, LogOut, User } from 'lucide-react';

function Header() {
  const { isConnected } = useStore();
  const { user, signOut } = useAuth();

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

          {/* User */}
          {user && (
            <div className="flex items-center gap-3">
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
    </header>
  );
}

export default Header;
