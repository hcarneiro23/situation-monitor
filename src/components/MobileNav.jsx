import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, TrendingUp, User } from 'lucide-react';

function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'home', icon: Home, label: 'Home', path: '/' },
    { id: 'search', icon: Search, label: 'Search', path: '/search' },
    { id: 'trending', icon: TrendingUp, label: 'Trending', path: '/trending' },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/post/') || location.pathname.startsWith('/topic/');
    }
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-intel-900 border-t border-intel-700 lg:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ id, icon: Icon, label, path }) => {
          const active = isActive(path);
          return (
            <button
              key={id}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-1">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileNav;
