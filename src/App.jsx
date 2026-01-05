import React, { useEffect, useRef } from 'react';
import { useStore } from './store/useStore';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import WhatMattersNow from './components/WhatMattersNow';
import NewsFeed from './components/NewsFeed';
import SignalPanel from './components/SignalPanel';
import PoliticalMarketOverlay from './components/PoliticalMarketOverlay';
import MarketPanels from './components/MarketPanels';
import ScenarioWorkspace from './components/ScenarioWorkspace';
import CatalystTimeline from './components/CatalystTimeline';
import Watchlist from './components/Watchlist';
import AlertPanel from './components/AlertPanel';

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
    checkWatchlistAlerts
  } = useStore();

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3001`;

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
        fetch('/api/state'),
        fetch('/api/relationships')
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
    fetch('/api/relationships')
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-intel-900 text-gray-100">
        {/* Header with connection status */}
        <Header />

        {/* Main content - single continuous surface */}
        <main className="max-w-[1920px] mx-auto px-4 py-6 space-y-6">
          {/* Alert Panel - slides in when there are alerts */}
          <AlertPanel />

          {/* Section 1: What Matters Now */}
          <section id="what-matters-now">
            <WhatMattersNow />
          </section>

          {/* Section 2 & 3: News Feed and Signals side by side */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <NewsFeed />
            </div>
            <div className="lg:col-span-1">
              <SignalPanel />
            </div>
          </section>

          {/* Section 4: Political → Market Overlay */}
          <section id="political-market">
            <PoliticalMarketOverlay />
          </section>

          {/* Section 5: Market Context Panels */}
          <section id="markets">
            <MarketPanels />
          </section>

          {/* Section 6 & 7: Scenarios and Timeline side by side */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div id="scenarios">
              <ScenarioWorkspace />
            </div>
            <div id="timeline">
              <CatalystTimeline />
            </div>
          </section>

          {/* Section 8: Personal Watchlist */}
          <section id="watchlist">
            <Watchlist />
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-intel-700 py-4 mt-8">
          <div className="max-w-[1920px] mx-auto px-4 text-center text-sm text-gray-500">
            <p>Situation Monitor - Intelligence Console</p>
            <p className="text-xs mt-1">
              Data sources: Reuters, BBC, Bloomberg, Al Jazeera, Financial Times, MarketWatch, and others.
              Market data via public APIs. Not financial advice.
            </p>
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
}

export default App;
