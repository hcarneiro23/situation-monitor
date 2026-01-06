import React, { useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, TrendingUp, User } from 'lucide-react';

function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const readyToRefreshRef = useRef(false);

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
        navigate(path);
      }
    } else {
      readyToRefreshRef.current = false;
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
