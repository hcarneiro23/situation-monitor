import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import NewsFeed from './components/NewsFeed';
import TrendingTopics from './components/TrendingTopics';
import Watchlist from './components/Watchlist';
import AlertPanel from './components/AlertPanel';
import PostDetail from './components/PostDetail';
import TopicDetail from './components/TopicDetail';
import Onboarding from './components/Onboarding';
import MobileNav from './components/MobileNav';
import SearchPage from './components/SearchPage';
import TrendingPage from './components/TrendingPage';
import ProfilePage from './components/ProfilePage';

// Backend URL - use environment variable for production, fallback to localhost for dev
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const getApiUrl = (path) => {
  if (!BACKEND_URL) return path;
  // Ensure URL has protocol
  const baseUrl = BACKEND_URL.startsWith('http') ? BACKEND_URL : `https://${BACKEND_URL}`;
  return `${baseUrl}${path}`;
};

const getWsUrl = () => {
  if (BACKEND_URL) {
    // Ensure URL has protocol, then convert http(s) to ws(s)
    let url = BACKEND_URL.startsWith('http') ? BACKEND_URL : `https://${BACKEND_URL}`;
    return url.replace(/^http/, 'ws');
  }
  // Local development fallback
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:3001`;
};

function App() {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const {
    updateFullState,
    setConnected,
    setNews,
    setSignals,
    setMarkets,
    setScenarios,
    setEvents,
    setSummary,
    setRelationships,
    checkWatchlistAlerts,
    checkTrackedPostsForUpdates,
    onboardingCompleted
  } = useStore();

  const connectWebSocket = () => {
    const wsUrl = getWsUrl();

    console.log('[WS] Connecting to', wsUrl);
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('[WS] Connected');
      setConnected(true);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[WS] Received:', message.type);

        switch (message.type) {
          case 'FULL_STATE':
            updateFullState(message.data);
            break;
          case 'NEWS_UPDATE':
            setNews(message.data.news);
            setSignals(message.data.signals);
            checkWatchlistAlerts();
            // Check tracked posts for similar news
            setTimeout(() => checkTrackedPostsForUpdates(), 100);
            break;
          case 'MARKET_UPDATE':
            setMarkets(message.data);
            break;
          case 'SUMMARY_UPDATE':
            setSummary(message.data);
            break;
          case 'SCENARIO_UPDATE':
            setScenarios(message.data);
            break;
          case 'EVENT_UPDATE':
            setEvents(message.data);
            break;
        }
      } catch (error) {
        console.error('[WS] Parse error:', error);
      }
    };

    wsRef.current.onclose = () => {
      console.log('[WS] Disconnected');
      setConnected(false);

      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[WS] Reconnecting...');
        connectWebSocket();
      }, 5000);
    };

    wsRef.current.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  };

  // Initial data fetch via REST (fallback)
  const fetchInitialData = async () => {
    try {
      const [stateRes, relationshipsRes] = await Promise.all([
        fetch(getApiUrl('/api/state')),
        fetch(getApiUrl('/api/relationships'))
      ]);

      if (stateRes.ok) {
        const state = await stateRes.json();
        updateFullState(state);
      }

      if (relationshipsRes.ok) {
        const relationships = await relationshipsRes.json();
        setRelationships(relationships);
      }
    } catch (error) {
      console.error('[API] Fetch error:', error);
    }
  };

  useEffect(() => {
    fetchInitialData();
    connectWebSocket();

    // Fetch relationships once
    fetch(getApiUrl('/api/relationships'))
      .then(res => res.json())
      .then(data => setRelationships(data))
      .catch(err => console.error('[API] Relationships error:', err));

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Poll for updates every 30 seconds as backup
  useEffect(() => {
    const interval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        fetchInitialData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Show onboarding for new users
  if (!onboardingCompleted) {
    return (
      <BrowserRouter>
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <ProtectedRoute>
        <div className="min-h-screen bg-intel-900 text-gray-100">
          {/* Toast notifications - fixed position */}
          <AlertPanel />

          <Routes>
            {/* Post detail page */}
            <Route path="/post/:postId" element={<PostDetail />} />

            {/* Topic detail page */}
            <Route path="/topic/:topic" element={<TopicDetail />} />

            {/* Search page (mobile) */}
            <Route path="/search" element={<SearchPage />} />

            {/* Trending page (mobile) */}
            <Route path="/trending" element={<TrendingPage />} />

            {/* Profile page (mobile) */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* Main feed */}
            <Route path="*" element={
              <>
                {/* Header */}
                <Header />

                {/* Twitter-like centered layout */}
                <main className="max-w-[1200px] mx-auto">
                  <div className="flex">
                    {/* Main feed column */}
                    <div className="flex-1 min-w-0 border-x border-intel-700">
                      <div className="h-[calc(100vh-64px)] pb-14 lg:pb-0">
                        <NewsFeed />
                      </div>
                    </div>

                    {/* Right sidebar - Trends & Watchlist */}
                    <div className="hidden lg:block w-[350px] p-4 space-y-6">
                      <TrendingTopics />
                      <Watchlist />
                    </div>
                  </div>
                </main>
              </>
            } />
          </Routes>

          {/* Mobile bottom navigation */}
          <MobileNav />
        </div>
      </ProtectedRoute>
    </BrowserRouter>
  );
}

export default App;
