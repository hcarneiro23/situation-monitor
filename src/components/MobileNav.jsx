import React, { useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, TrendingUp, User } from 'lucide-react';

function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastHomeClickRef = useRef(0);

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

  const handleTabClick = (id, path) => {
    if (id === 'home') {
      const isAtTop = window.scrollY < 50;
      const now = Date.now();
      const timeSinceLastClick = now - lastHomeClickRef.current;

      if (location.pathname === '/' && isAtTop && timeSinceLastClick < 1000) {
        // Second click while at top - refresh the page
        window.location.reload();
      } else if (location.pathname === '/') {
        // First click or not at top - scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        lastHomeClickRef.current = now;
      } else {
        // Not on home page - navigate to home
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
