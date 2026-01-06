import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuth } from '../context/AuthContext';
import { Bell, LogOut, User, Settings, ChevronDown } from 'lucide-react';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, alerts } = useStore();
  const { user, signOut } = useAuth();
  const unreadCount = alerts.filter(a => !a.read).length;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);
  const readyToRefreshRef = useRef(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      setShowUserMenu(false);
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleLogoClick = () => {
    const feedContainer = document.getElementById('news-feed-scroll');
    const scrollTop = feedContainer ? feedContainer.scrollTop : window.scrollY;
    const isAtTop = scrollTop < 50;

    if (location.pathname === '/' && isAtTop && readyToRefreshRef.current) {
      // Second click while at top - refresh the page
      readyToRefreshRef.current = false;
      window.location.reload();
    } else if (location.pathname === '/') {
      // First click or not at top - scroll to top
      if (feedContainer) {
        feedContainer.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      readyToRefreshRef.current = true;
    } else {
      // Not on home page - navigate to home
      readyToRefreshRef.current = false;
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-intel-900/80 backdrop-blur-md border-b border-intel-700">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <h1 className="text-xl font-bold text-white">Situation Monitor</h1>
            {/* Connection indicator */}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}
                 title={isConnected ? 'Live' : 'Offline'} />
          </button>

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

            {/* User - Desktop dropdown menu */}
            {user && (
              <div className="relative hidden lg:block" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 rounded-full hover:bg-intel-700 transition-colors"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-intel-700 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown menu */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-intel-800 border border-intel-700 rounded-xl shadow-lg overflow-hidden">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-intel-700">
                      <p className="text-white font-medium truncate">{user.displayName || 'User'}</p>
                      <p className="text-gray-500 text-sm truncate">{user.email}</p>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/profile');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-intel-700 transition-colors"
                      >
                        <Settings className="w-5 h-5 text-gray-400" />
                        <span className="text-white">Settings</span>
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-intel-700 transition-colors"
                      >
                        <LogOut className="w-5 h-5 text-red-400" />
                        <span className="text-red-400">Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User - Mobile (just avatar, uses MobileNav for profile) */}
            {user && (
              <div className="lg:hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-intel-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
