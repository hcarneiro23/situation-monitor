import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, TrendingUp, Bell } from 'lucide-react';
import { useStore } from '../store/useStore';

function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { alerts } = useStore();
  const unreadCount = alerts.filter(a => !a.read).length;

  const tabs = [
    { id: 'home', icon: Home, label: 'Home', path: '/' },
    { id: 'search', icon: Search, label: 'Search', path: '/search' },
    { id: 'trending', icon: TrendingUp, label: 'Trending', path: '/trending' },
    { id: 'notifications', icon: Bell, label: 'Notifications', path: '/notifications' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/post/') || location.pathname.startsWith('/topic/');
    }
    return location.pathname === path;
  };

  const handleTabClick = (id, path) => {
    if (id === 'home') {
      if (location.pathname === '/') {
        // Already on home - trigger load new posts
        window.dispatchEvent(new CustomEvent('loadNewPosts'));
      } else {
        // Navigate to home
        navigate(path);
      }
    } else {
      navigate(path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-intel-900 border-t border-intel-700 lg:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ id, icon: Icon, label, path }) => {
          const active = isActive(path);
          return (
            <button
              key={id}
              onClick={() => handleTabClick(id, path)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {id === 'notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileNav;
