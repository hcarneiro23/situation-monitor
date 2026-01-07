import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsService } from '../services/notifications';
import { Bell, LogOut, User, Settings, ChevronDown } from 'lucide-react';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  // Subscribe to notifications for unread count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const unsubscribe = notificationsService.subscribeToNotifications(user.uid, (notifs) => {
      setUnreadCount(notifs.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [user]);

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
    if (location.pathname === '/') {
      // Already on home - trigger load new posts
      window.dispatchEvent(new CustomEvent('loadNewPosts'));
    } else {
      // Navigate to home
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-intel-900/80 backdrop-blur-md border-b border-intel-700">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* User - Mobile (left side, clickable to profile) */}
          {user && (
            <button
              onClick={() => navigate('/profile')}
              className="lg:hidden p-1 rounded-full hover:bg-intel-700 transition-colors"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-intel-700 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </button>
          )}

          {/* Logo - centered on mobile, left on desktop */}
          <button
            onClick={handleLogoClick}
            className="flex items-center hover:opacity-80 transition-opacity lg:absolute lg:relative lg:left-0 absolute left-1/2 -translate-x-1/2 lg:translate-x-0"
          >
            <h1 className="text-xl font-bold text-white">Routers</h1>
          </button>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notifications - Desktop only */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-full hover:bg-intel-700 transition-colors hidden lg:block"
            >
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

            {/* Spacer for mobile to balance the layout */}
            <div className="w-8 lg:hidden" />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
