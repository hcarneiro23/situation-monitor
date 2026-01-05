import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Data state
  news: [],
  signals: [],
  markets: {},
  scenarios: [],
  events: [],
  summary: null,
  relationships: null,

  // UI state
  isConnected: false,
  lastUpdate: null,
  selectedSignal: null,
  selectedScenario: null,
  selectedRegion: null,
  expandedNews: null,

  // Watchlist
  watchlist: JSON.parse(localStorage.getItem('watchlist') || '[]'),

  // Comments
  comments: JSON.parse(localStorage.getItem('comments') || '{}'),

  // Alerts
  alerts: [],

  // Revision history
  revisionHistory: [],

  // Actions
  setNews: (news) => set({ news }),
  setSignals: (signals) => set({ signals }),
  setMarkets: (markets) => set({ markets }),
  setScenarios: (scenarios) => set({ scenarios }),
  setEvents: (events) => set({ events }),
  setSummary: (summary) => set({ summary }),
  setRelationships: (relationships) => set({ relationships }),

  setConnected: (isConnected) => set({ isConnected }),
  setLastUpdate: (lastUpdate) => set({ lastUpdate }),

  setSelectedSignal: (selectedSignal) => set({ selectedSignal }),
  setSelectedScenario: (selectedScenario) => set({ selectedScenario }),
  setSelectedRegion: (selectedRegion) => set({ selectedRegion }),
  setExpandedNews: (expandedNews) => set({ expandedNews }),

  // Full state update from WebSocket
  updateFullState: (state) => {
    const prevSummary = get().summary;

    set({
      news: state.news || [],
      signals: state.signals || [],
      markets: state.markets || {},
      scenarios: state.scenarios || [],
      events: state.events || [],
      summary: state.summary,
      lastUpdate: state.lastUpdate
    });

    // Track revision if summary changed
    if (prevSummary && state.summary &&
        prevSummary.summary !== state.summary?.summary) {
      const history = get().revisionHistory;
      set({
        revisionHistory: [
          {
            timestamp: new Date().toISOString(),
            previousSummary: prevSummary.summary,
            newSummary: state.summary.summary,
            keyChange: 'Summary updated'
          },
          ...history.slice(0, 19) // Keep last 20
        ]
      });
    }
  },

  // Watchlist management
  addToWatchlist: (item) => {
    const watchlist = [...get().watchlist, item];
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    set({ watchlist });
  },

  removeFromWatchlist: (itemId) => {
    const watchlist = get().watchlist.filter(i => i.id !== itemId);
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    set({ watchlist });
  },

  isInWatchlist: (itemId) => {
    return get().watchlist.some(i => i.id === itemId);
  },

  // Comment management
  addComment: (postId, comment) => {
    const comments = { ...get().comments };
    if (!comments[postId]) {
      comments[postId] = [];
    }
    comments[postId] = [
      {
        id: Date.now().toString(),
        text: comment.text,
        author: comment.author || 'Anonymous',
        timestamp: new Date().toISOString()
      },
      ...comments[postId]
    ];
    localStorage.setItem('comments', JSON.stringify(comments));
    set({ comments });
  },

  getComments: (postId) => {
    return get().comments[postId] || [];
  },

  deleteComment: (postId, commentId) => {
    const comments = { ...get().comments };
    if (comments[postId]) {
      comments[postId] = comments[postId].filter(c => c.id !== commentId);
      localStorage.setItem('comments', JSON.stringify(comments));
      set({ comments });
    }
  },

  // Alert management
  addAlert: (alert) => {
    const alerts = [
      { ...alert, id: Date.now(), timestamp: new Date().toISOString(), read: false },
      ...get().alerts.slice(0, 49) // Keep last 50
    ];
    set({ alerts });
  },

  markAlertRead: (alertId) => {
    const alerts = get().alerts.map(a =>
      a.id === alertId ? { ...a, read: true } : a
    );
    set({ alerts });
  },

  clearAlerts: () => set({ alerts: [] }),

  // Get filtered news by various criteria
  getNewsByRegion: (region) => {
    return get().news.filter(n =>
      n.regions.some(r => r.toLowerCase().includes(region.toLowerCase()))
    );
  },

  getNewsBySignal: (signalId) => {
    const signal = get().signals.find(s => s.id === signalId);
    if (!signal) return [];
    return get().news.filter(n =>
      signal.relatedNewsIds.includes(n.id)
    );
  },

  getSignalsByMarket: (market) => {
    return get().signals.filter(s =>
      s.affectedMarkets.some(m =>
        m.toLowerCase().includes(market.toLowerCase())
      )
    );
  },

  // Check watchlist for alerts
  checkWatchlistAlerts: () => {
    const { watchlist, signals, news } = get();

    watchlist.forEach(item => {
      if (item.type === 'region') {
        const relevantSignals = signals.filter(s =>
          s.affectedRegions.includes(item.id)
        );
        const strongSignal = relevantSignals.find(s => s.strength >= 60);
        if (strongSignal) {
          get().addAlert({
            type: 'watchlist',
            title: `Signal Alert: ${item.name}`,
            message: `${strongSignal.name} signal strength at ${strongSignal.strength}%`,
            severity: 'high',
            relatedItem: item
          });
        }
      }

      if (item.type === 'signal') {
        const signal = signals.find(s => s.id === item.id);
        if (signal && signal.direction === 'increasing' && signal.strength >= 50) {
          get().addAlert({
            type: 'watchlist',
            title: `Signal Increasing: ${item.name}`,
            message: `${signal.name} is strengthening (${signal.strength}%)`,
            severity: 'medium',
            relatedItem: item
          });
        }
      }
    });
  }
}));
