import { create } from 'zustand';
import { userPreferencesService } from '../services/userPreferences';
import { notificationsService } from '../services/notifications';
import { watchlistService } from '../services/watchlist';

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

  // Current user ID for preference storage
  currentUserId: null,
  preferencesLoading: true,

  // User preferences (from Firestore per user)
  userCity: null,
  userInterests: [],
  followedSources: [],
  onboardingCompleted: false,
  availableCities: [],

  // Watchlist (synced with Firestore)
  watchlist: [],

  // Track processed news IDs to avoid batch notifications
  processedNewsIds: new Set(),

  // Track which post IDs have already been notified (global dedup)
  notifiedPostIds: new Set(),

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

  // Load user preferences from Firestore
  loadUserPreferences: async (userId) => {
    if (!userId) {
      set({
        currentUserId: null,
        userCity: null,
        userInterests: [],
        followedSources: [],
        onboardingCompleted: false,
        watchlist: [],
        preferencesLoading: false
      });
      return;
    }

    set({ currentUserId: userId, preferencesLoading: true });

    try {
      const [prefs, watchlist] = await Promise.all([
        userPreferencesService.getPreferences(userId),
        watchlistService.getWatchlist(userId)
      ]);

      if (prefs) {
        set({
          userCity: prefs.userCity || null,
          userInterests: prefs.userInterests || [],
          followedSources: prefs.followedSources || [],
          onboardingCompleted: prefs.onboardingCompleted || false,
          watchlist: watchlist || [],
          preferencesLoading: false
        });
      } else {
        // New user - no preferences yet
        set({
          userCity: null,
          userInterests: [],
          followedSources: [],
          onboardingCompleted: false,
          watchlist: watchlist || [],
          preferencesLoading: false
        });
      }
    } catch (error) {
      console.error('[Store] Error loading preferences:', error);
      set({ preferencesLoading: false });
    }
  },

  // Clear preferences on logout
  clearUserPreferences: () => {
    set({
      currentUserId: null,
      userCity: null,
      userInterests: [],
      followedSources: [],
      onboardingCompleted: false,
      watchlist: [],
      preferencesLoading: false
    });
  },

  // User preferences (onboarding) - saves to Firestore
  setUserCity: (city) => {
    const userId = get().currentUserId;
    set({ userCity: city });
    if (userId) {
      userPreferencesService.saveCity(userId, city);
    }
  },
  setUserInterests: (interests) => {
    const userId = get().currentUserId;
    set({ userInterests: interests });
    if (userId) {
      userPreferencesService.saveInterests(userId, interests);
    }
  },
  setFollowedSources: (sources) => {
    const userId = get().currentUserId;
    set({ followedSources: sources });
    if (userId) {
      userPreferencesService.saveFollowedSources(userId, sources);
    }
  },
  setOnboardingCompleted: (completed) => {
    const userId = get().currentUserId;
    set({ onboardingCompleted: completed });
    if (userId) {
      userPreferencesService.saveOnboardingCompleted(userId, completed);
    }
  },
  resetOnboarding: () => {
    const userId = get().currentUserId;
    set({ userCity: null, userInterests: [], followedSources: [], onboardingCompleted: false });
    if (userId) {
      userPreferencesService.savePreferences(userId, {
        userCity: null,
        userInterests: [],
        followedSources: [],
        onboardingCompleted: false
      });
    }
  },
  setAvailableCities: (cities) => set({ availableCities: cities }),

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

  // Watchlist management (synced with Firestore)
  addToWatchlist: (item) => {
    const userId = get().currentUserId;
    // If tracking a news item, extract keywords for similarity matching
    let enhancedItem = { ...item };
    if (item.type === 'news' && item.data) {
      const text = `${item.data.title} ${item.data.summary || ''}`.toLowerCase();
      // Extract significant words (5+ chars, not common words)
      // Comprehensive stop words list to reduce false positives
      const stopWords = new Set([
        // Common articles, prepositions, conjunctions
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was',
        'one', 'our', 'out', 'has', 'have', 'been', 'will', 'more', 'when', 'who', 'new',
        'now', 'way', 'may', 'say', 'she', 'two', 'how', 'its', 'let', 'put', 'too', 'use',
        'with', 'this', 'that', 'from', 'they', 'would', 'there', 'their', 'what', 'about',
        'which', 'could', 'into', 'than', 'then', 'them', 'these', 'some', 'other', 'only',
        'just', 'over', 'such', 'make', 'like', 'even', 'most', 'also', 'after', 'made',
        'many', 'before', 'through', 'back', 'much', 'where', 'being', 'well', 'down',
        'should', 'because', 'each', 'those', 'people', 'very', 'both', 'first', 'last',
        'long', 'great', 'little', 'same', 'another', 'know', 'need', 'feel', 'seem',
        'want', 'give', 'take', 'come', 'think', 'look', 'good', 'year', 'years', 'time',
        'said', 'says', 'according', 'report', 'reports', 'reported', 'news', 'today',
        'week', 'month', 'since', 'still', 'while', 'during', 'between', 'under', 'around',
        'until', 'though', 'every', 'found', 'part', 'work', 'world', 'country', 'state',
        'government', 'official', 'officials', 'million', 'billion', 'percent',
        // Additional common news words that cause false matches
        'says', 'told', 'asked', 'added', 'noted', 'warned', 'announced', 'claimed',
        'expected', 'likely', 'latest', 'recent', 'former', 'current', 'major', 'global',
        'local', 'national', 'international', 'public', 'private', 'several', 'various',
        'following', 'including', 'according', 'sources', 'media', 'press', 'statement',
        'decision', 'action', 'situation', 'issue', 'issues', 'matter', 'case', 'event',
        'events', 'amid', 'against', 'calls', 'called', 'faces', 'facing', 'making',
        'taking', 'going', 'coming', 'looking', 'seeking', 'planning', 'working',
        'meeting', 'talks', 'deal', 'deals', 'plans', 'move', 'moves', 'step', 'steps',
        'days', 'weeks', 'months', 'hours', 'minutes', 'monday', 'tuesday', 'wednesday',
        'thursday', 'friday', 'saturday', 'sunday', 'morning', 'evening', 'night',
        'early', 'late', 'next', 'past', 'future', 'ahead', 'begin', 'began', 'start',
        'started', 'continue', 'continued', 'remain', 'remains', 'remained'
      ]);
      // Require 5+ chars to be more selective
      const words = text.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length >= 5 && !stopWords.has(w));
      // Get unique keywords, prioritize longer/more specific words
      const uniqueWords = [...new Set(words)].sort((a, b) => b.length - a.length);
      // Keep only 8 most specific keywords (longer words are more specific)
      enhancedItem.keywords = uniqueWords.slice(0, 8);
      enhancedItem.trackedAt = new Date().toISOString();
      enhancedItem.notifiedIds = [item.data.id]; // Don't notify for the original post
    }
    const watchlist = [...get().watchlist, enhancedItem];
    set({ watchlist });
    if (userId) {
      watchlistService.saveWatchlist(userId, watchlist);
    }
  },

  removeFromWatchlist: (itemId) => {
    const userId = get().currentUserId;
    const watchlist = get().watchlist.filter(i => i.id !== itemId);
    set({ watchlist });
    if (userId) {
      watchlistService.saveWatchlist(userId, watchlist);
    }
  },

  isInWatchlist: (itemId) => {
    return get().watchlist.some(i => i.id === itemId);
  },

  // Find similar news for a tracked post
  getSimilarNews: (trackedItem) => {
    if (!trackedItem.keywords || trackedItem.keywords.length === 0) return [];
    const { news } = get();
    const notifiedIds = new Set(trackedItem.notifiedIds || []);

    return news
      .filter(item => !notifiedIds.has(item.id))
      .map(item => {
        const text = `${item.title} ${item.summary || ''}`.toLowerCase();
        // Use word boundary matching to avoid partial matches
        const matchCount = trackedItem.keywords.filter(kw => {
          const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          return regex.test(text);
        }).length;
        const matchScore = matchCount / trackedItem.keywords.length;
        return { ...item, matchScore, matchCount };
      })
      // At least 50% keyword match AND minimum 4 keyword matches
      .filter(item => item.matchScore >= 0.5 && item.matchCount >= 4)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
  },

  // Check all tracked posts for new similar news and create notifications
  // Only processes news items that haven't been processed yet to avoid batch notifications
  checkTrackedPostsForUpdates: (newNewsItems = null) => {
    const { watchlist, news, currentUserId, processedNewsIds, notifiedPostIds } = get();
    const trackedPosts = watchlist.filter(item => item.type === 'news');

    if (trackedPosts.length === 0 || !currentUserId) return;

    // Determine which news items to check
    // If newNewsItems provided, only check those; otherwise check unprocessed items
    let itemsToCheck;
    if (newNewsItems && newNewsItems.length > 0) {
      itemsToCheck = newNewsItems;
    } else {
      // Filter to only news items we haven't processed yet
      itemsToCheck = news.filter(item => !processedNewsIds.has(item.id));
    }

    if (itemsToCheck.length === 0) return;

    let updated = false;
    const newGlobalNotifiedIds = new Set(notifiedPostIds);

    const updatedWatchlist = watchlist.map(item => {
      if (item.type !== 'news' || !item.keywords || item.keywords.length === 0) {
        return item;
      }

      const notifiedIds = new Set(item.notifiedIds || []);
      const newNotifiedIds = [...(item.notifiedIds || [])];

      itemsToCheck.forEach(newsItem => {
        // Skip if already notified for this tracked post
        if (notifiedIds.has(newsItem.id)) return;

        // Skip if already notified globally (prevents duplicate notifications)
        if (newGlobalNotifiedIds.has(newsItem.id)) return;

        const text = `${newsItem.title} ${newsItem.summary || ''}`.toLowerCase();

        // Use word boundary matching to avoid partial word matches
        const matchCount = item.keywords.filter(kw => {
          // Escape regex special chars and use word boundaries
          const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escaped}\\b`, 'i');
          return regex.test(text);
        }).length;

        const matchScore = matchCount / item.keywords.length;

        // Require at least 40% keyword match AND minimum 2 keyword matches
        // This ensures we catch related posts while filtering out unrelated ones
        if (matchScore >= 0.4 && matchCount >= 2) {
          // Create Firebase notification for similar news
          notificationsService.createNotification({
            userId: currentUserId,
            type: 'similar_story',
            title: newsItem.title.slice(0, 100) + (newsItem.title.length > 100 ? '...' : ''),
            message: `Similar to: "${item.name.slice(0, 50)}${item.name.length > 50 ? '...' : ''}"`,
            postId: newsItem.id
          });

          // Mark as notified (both locally and globally)
          newNotifiedIds.push(newsItem.id);
          newGlobalNotifiedIds.add(newsItem.id);
          updated = true;
        }
      });

      if (newNotifiedIds.length !== (item.notifiedIds || []).length) {
        return { ...item, notifiedIds: newNotifiedIds };
      }
      return item;
    });

    // Update processed news IDs (keep last 500 to prevent memory issues)
    const newProcessedIds = new Set(processedNewsIds);
    itemsToCheck.forEach(item => newProcessedIds.add(item.id));

    // Trim sets to prevent memory issues
    const trimSet = (s, max) => {
      if (s.size > max) {
        const arr = Array.from(s);
        return new Set(arr.slice(-max));
      }
      return s;
    };

    set({
      processedNewsIds: trimSet(newProcessedIds, 500),
      notifiedPostIds: trimSet(newGlobalNotifiedIds, 500)
    });

    if (updated) {
      set({ watchlist: updatedWatchlist });
      watchlistService.saveWatchlist(currentUserId, updatedWatchlist);
    }
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

  // Get news filtered by user's preferences (interests + location)
  getNewsByUserLocation: () => {
    const { news, userCity, userInterests } = get();

    // City to region mapping
    const cityRegions = {
      'new york': 'north_america', 'nyc': 'north_america', 'los angeles': 'north_america', 'chicago': 'north_america',
      'houston': 'north_america', 'dallas': 'north_america', 'miami': 'north_america', 'san francisco': 'north_america',
      'seattle': 'north_america', 'denver': 'north_america', 'boston': 'north_america', 'philadelphia': 'north_america',
      'washington dc': 'north_america', 'atlanta': 'north_america', 'toronto': 'north_america', 'vancouver': 'north_america',
      'montreal': 'north_america', 'calgary': 'north_america', 'ottawa': 'north_america', 'edmonton': 'north_america',
      'london': 'europe', 'paris': 'europe', 'berlin': 'europe', 'madrid': 'europe', 'barcelona': 'europe',
      'rome': 'europe', 'milan': 'europe', 'amsterdam': 'europe', 'brussels': 'europe', 'vienna': 'europe',
      'munich': 'europe', 'frankfurt': 'europe', 'zurich': 'europe', 'geneva': 'europe', 'lisbon': 'europe',
      'dublin': 'europe', 'stockholm': 'europe', 'copenhagen': 'europe', 'oslo': 'europe', 'helsinki': 'europe',
      'prague': 'europe', 'budapest': 'europe', 'warsaw': 'europe', 'athens': 'europe',
      'tokyo': 'east_asia', 'beijing': 'east_asia', 'shanghai': 'east_asia', 'hong kong': 'east_asia',
      'seoul': 'east_asia', 'taipei': 'east_asia', 'singapore': 'southeast_asia', 'bangkok': 'southeast_asia',
      'kuala lumpur': 'southeast_asia', 'jakarta': 'southeast_asia', 'manila': 'southeast_asia', 'ho chi minh': 'southeast_asia',
      'mumbai': 'south_asia', 'delhi': 'south_asia', 'bangalore': 'south_asia', 'chennai': 'south_asia',
      'kolkata': 'south_asia', 'karachi': 'south_asia', 'dhaka': 'south_asia',
      'dubai': 'middle_east', 'abu dhabi': 'middle_east', 'doha': 'middle_east', 'riyadh': 'middle_east',
      'tel aviv': 'middle_east', 'jerusalem': 'middle_east', 'istanbul': 'middle_east', 'cairo': 'middle_east',
      'johannesburg': 'africa', 'cape town': 'africa', 'nairobi': 'africa', 'lagos': 'africa',
      'casablanca': 'africa', 'accra': 'africa', 'addis ababa': 'africa',
      'mexico city': 'latin_america', 'sao paulo': 'latin_america', 'rio de janeiro': 'latin_america',
      'buenos aires': 'latin_america', 'bogota': 'latin_america', 'lima': 'latin_america',
      'santiago': 'latin_america', 'caracas': 'latin_america', 'havana': 'latin_america',
      'sydney': 'oceania', 'melbourne': 'oceania', 'brisbane': 'oceania', 'perth': 'oceania',
      'auckland': 'oceania', 'wellington': 'oceania',
    };

    // Interest to category/keyword mapping
    const interestCategories = {
      'markets': ['markets', 'business', 'economy', 'monetary'],
      'geopolitics': ['world', 'geopolitics', 'politics', 'security', 'defense'],
      'technology': ['tech', 'semiconductors', 'ai', 'cyber'],
      'energy': ['commodities', 'energy', 'oil', 'gas'],
      'trade': ['trade', 'tariff', 'sanctions', 'exports'],
      'policy': ['policy', 'regulation', 'legislation'],
      'climate': ['climate', 'environment', 'sustainability'],
      'crypto': ['crypto', 'bitcoin', 'blockchain', 'digital currency'],
    };

    const cityLower = userCity?.toLowerCase();
    const userRegion = cityLower ? cityRegions[cityLower] : null;

    // Filter by location first
    let filtered = news.filter(item => {
      // If no city selected, include all international news
      if (!userCity) {
        return item.scope === 'international' || !item.scope;
      }

      // Always include international news
      if (item.scope === 'international' || !item.scope) return true;

      // Include regional news if user's city is in that region
      if (item.scope === 'regional' && userRegion && item.feedRegion === userRegion) {
        return true;
      }

      // Include local news if it matches user's city
      if (item.scope === 'local' && item.cities) {
        return item.cities.some(city => city.toLowerCase() === cityLower);
      }

      return false;
    });

    // If user has interests, boost/prioritize matching content
    // But don't exclude non-matching content entirely
    if (userInterests && userInterests.length > 0) {
      const interestKeywords = userInterests.flatMap(interest =>
        interestCategories[interest] || [interest]
      );

      // Score items based on interest match
      filtered = filtered.map(item => {
        const text = `${item.title} ${item.summary} ${item.category}`.toLowerCase();
        const matchScore = interestKeywords.reduce((score, keyword) => {
          return text.includes(keyword) ? score + 1 : score;
        }, 0);
        return { ...item, interestScore: matchScore };
      });

      // Sort by interest match (higher scores first), then by date
      filtered.sort((a, b) => {
        if (b.interestScore !== a.interestScore) {
          return b.interestScore - a.interestScore;
        }
        return new Date(b.pubDate) - new Date(a.pubDate);
      });
    }

    return filtered;
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
