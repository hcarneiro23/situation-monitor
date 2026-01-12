// Track user interactions with posts for personalization
// Uses localStorage for session-based tracking

const CLICKED_POSTS_KEY = 'clickedPosts';
const SEEN_POSTS_KEY = 'seenPosts';
const SESSION_DATA_KEY = 'sessionFeedData';
const NEGATIVE_FEEDBACK_KEY = 'negativeFeedback';
const MAX_TRACKED = 500;

// Get current timestamp
const now = () => Date.now();

// Clean old entries (older than 7 days)
const cleanOldEntries = (data) => {
  const sevenDaysAgo = now() - 7 * 24 * 60 * 60 * 1000;
  const cleaned = {};
  Object.entries(data).forEach(([id, entry]) => {
    if (entry.lastSeen > sevenDaysAgo) {
      cleaned[id] = entry;
    }
  });
  return cleaned;
};

// Trim to max size (keep most recent)
const trimToMax = (data, max) => {
  const entries = Object.entries(data);
  if (entries.length <= max) return data;

  // Sort by lastSeen descending and keep most recent
  entries.sort((a, b) => b[1].lastSeen - a[1].lastSeen);
  return Object.fromEntries(entries.slice(0, max));
};

export const interactionsService = {
  // Track when user clicks/opens a post
  trackClick(postId, postData = {}) {
    try {
      const stored = JSON.parse(localStorage.getItem(CLICKED_POSTS_KEY) || '{}');
      const existing = stored[postId] || { clicks: 0, firstClick: now() };

      stored[postId] = {
        ...existing,
        clicks: existing.clicks + 1,
        lastClick: now(),
        source: postData.source || existing.source,
        category: postData.category || existing.category,
        keywords: postData.keywords || existing.keywords || []
      };

      const cleaned = trimToMax(cleanOldEntries(stored), MAX_TRACKED);
      localStorage.setItem(CLICKED_POSTS_KEY, JSON.stringify(cleaned));
    } catch (e) {
      console.error('[Interactions] Error tracking click:', e);
    }
  },

  // Track when user sees a post in the feed
  trackSeen(postIds) {
    try {
      const stored = JSON.parse(localStorage.getItem(SEEN_POSTS_KEY) || '{}');
      const timestamp = now();

      postIds.forEach(id => {
        const existing = stored[id] || { views: 0, firstSeen: timestamp };
        stored[id] = {
          ...existing,
          views: existing.views + 1,
          lastSeen: timestamp
        };
      });

      const cleaned = trimToMax(cleanOldEntries(stored), MAX_TRACKED);
      localStorage.setItem(SEEN_POSTS_KEY, JSON.stringify(cleaned));
    } catch (e) {
      console.error('[Interactions] Error tracking seen:', e);
    }
  },

  // Get clicked posts data
  getClickedPosts() {
    try {
      return JSON.parse(localStorage.getItem(CLICKED_POSTS_KEY) || '{}');
    } catch (e) {
      return {};
    }
  },

  // Get seen posts data
  getSeenPosts() {
    try {
      return JSON.parse(localStorage.getItem(SEEN_POSTS_KEY) || '{}');
    } catch (e) {
      return {};
    }
  },

  // Build user engagement profile from clicks
  getEngagementProfile() {
    const clicked = this.getClickedPosts();
    const profile = {
      clickedSources: {},
      clickedCategories: {},
      clickedKeywords: {},
      totalClicks: 0,
      clickedPostIds: new Set()
    };

    Object.entries(clicked).forEach(([postId, data]) => {
      profile.clickedPostIds.add(postId);
      profile.totalClicks += data.clicks;

      if (data.source) {
        profile.clickedSources[data.source] = (profile.clickedSources[data.source] || 0) + data.clicks;
      }
      if (data.category) {
        profile.clickedCategories[data.category] = (profile.clickedCategories[data.category] || 0) + data.clicks;
      }
      if (data.keywords && Array.isArray(data.keywords)) {
        data.keywords.forEach(kw => {
          profile.clickedKeywords[kw] = (profile.clickedKeywords[kw] || 0) + data.clicks;
        });
      }
    });

    return profile;
  },

  // Get view count for a post (how many times shown in feed)
  getViewCount(postId) {
    const seen = this.getSeenPosts();
    return seen[postId]?.views || 0;
  },

  // Check if user has clicked a post
  hasClicked(postId) {
    const clicked = this.getClickedPosts();
    return !!clicked[postId];
  },

  // Get time since last seen (for freshness decay)
  getTimeSinceLastSeen(postId) {
    const seen = this.getSeenPosts();
    if (!seen[postId]) return Infinity;
    return now() - seen[postId].lastSeen;
  },

  // Track negative feedback (hide/not interested)
  trackNegativeFeedback(postId, postData = {}) {
    try {
      const stored = JSON.parse(localStorage.getItem(NEGATIVE_FEEDBACK_KEY) || '{}');
      stored[postId] = {
        timestamp: now(),
        source: postData.source,
        category: postData.category,
        keywords: postData.keywords || []
      };
      const cleaned = trimToMax(cleanOldEntries(stored), MAX_TRACKED);
      localStorage.setItem(NEGATIVE_FEEDBACK_KEY, JSON.stringify(cleaned));
    } catch (e) {
      console.error('[Interactions] Error tracking negative feedback:', e);
    }
  },

  // Get negative feedback data
  getNegativeFeedback() {
    try {
      return JSON.parse(localStorage.getItem(NEGATIVE_FEEDBACK_KEY) || '{}');
    } catch (e) {
      return {};
    }
  },

  // Build negative feedback profile
  getNegativeFeedbackProfile() {
    const feedback = this.getNegativeFeedback();
    const profile = {
      hiddenPostIds: new Set(Object.keys(feedback)),
      hiddenSources: {},
      hiddenCategories: {},
      hiddenKeywords: {}
    };

    Object.values(feedback).forEach(data => {
      if (data.source) {
        profile.hiddenSources[data.source] = (profile.hiddenSources[data.source] || 0) + 1;
      }
      if (data.category) {
        profile.hiddenCategories[data.category] = (profile.hiddenCategories[data.category] || 0) + 1;
      }
      if (data.keywords && Array.isArray(data.keywords)) {
        data.keywords.forEach(kw => {
          profile.hiddenKeywords[kw] = (profile.hiddenKeywords[kw] || 0) + 1;
        });
      }
    });

    return profile;
  },

  // Track rapid scroll past (user quickly scrolled past multiple items)
  trackRapidScroll(postIds, postDataMap = {}) {
    try {
      const stored = JSON.parse(localStorage.getItem(SEEN_POSTS_KEY) || '{}');
      const timestamp = now();

      postIds.forEach(id => {
        const existing = stored[id] || { views: 0, firstSeen: timestamp };
        stored[id] = {
          ...existing,
          views: existing.views + 1,
          lastSeen: timestamp,
          rapidScrolls: (existing.rapidScrolls || 0) + 1,
          source: postDataMap[id]?.source || existing.source,
          category: postDataMap[id]?.category || existing.category
        };
      });

      const cleaned = trimToMax(cleanOldEntries(stored), MAX_TRACKED);
      localStorage.setItem(SEEN_POSTS_KEY, JSON.stringify(cleaned));
    } catch (e) {
      console.error('[Interactions] Error tracking rapid scroll:', e);
    }
  },

  // Get rapid scroll count (items user scrolled past quickly)
  getRapidScrollCount(postId) {
    const seen = this.getSeenPosts();
    return seen[postId]?.rapidScrolls || 0;
  },

  // Track dwell time (time spent viewing post detail)
  trackDwellTime(postId, dwellMs, postData = {}) {
    try {
      const stored = JSON.parse(localStorage.getItem(CLICKED_POSTS_KEY) || '{}');
      const existing = stored[postId] || { clicks: 0, firstClick: now() };

      // Calculate meaningful read (>5 seconds suggests engagement)
      const isMeaningfulRead = dwellMs > 5000;

      stored[postId] = {
        ...existing,
        lastDwell: dwellMs,
        totalDwell: (existing.totalDwell || 0) + dwellMs,
        meaningfulReads: (existing.meaningfulReads || 0) + (isMeaningfulRead ? 1 : 0),
        source: postData.source || existing.source,
        category: postData.category || existing.category
      };

      const cleaned = trimToMax(cleanOldEntries(stored), MAX_TRACKED);
      localStorage.setItem(CLICKED_POSTS_KEY, JSON.stringify(cleaned));
    } catch (e) {
      console.error('[Interactions] Error tracking dwell time:', e);
    }
  },

  // Get meaningful read count for a source/category
  getMeaningfulReadProfile() {
    const clicked = this.getClickedPosts();
    const profile = {
      sourceReads: {},
      categoryReads: {},
      totalMeaningfulReads: 0
    };

    Object.values(clicked).forEach(data => {
      const reads = data.meaningfulReads || 0;
      if (reads > 0) {
        profile.totalMeaningfulReads += reads;
        if (data.source) {
          profile.sourceReads[data.source] = (profile.sourceReads[data.source] || 0) + reads;
        }
        if (data.category) {
          profile.categoryReads[data.category] = (profile.categoryReads[data.category] || 0) + reads;
        }
      }
    });

    return profile;
  },

  // Session-specific data (cleared on page refresh)
  _sessionData: null,

  getSessionData() {
    if (!this._sessionData) {
      this._sessionData = {
        engagedTopics: {},      // topics user engaged with this session
        engagedSources: {},     // sources user engaged with this session
        skippedTopics: {},      // topics user scrolled past quickly
        skippedSources: {},     // sources user scrolled past quickly
        shownPostIds: new Set(),
        startTime: now()
      };
    }
    return this._sessionData;
  },

  // Track session engagement (boost for recently engaged content)
  trackSessionEngagement(postData) {
    const session = this.getSessionData();
    if (postData.source) {
      session.engagedSources[postData.source] = (session.engagedSources[postData.source] || 0) + 1;
    }
    if (postData.category) {
      session.engagedTopics[postData.category] = (session.engagedTopics[postData.category] || 0) + 1;
    }
    // Extract keywords as topics
    if (postData.keywords) {
      postData.keywords.forEach(kw => {
        session.engagedTopics[kw] = (session.engagedTopics[kw] || 0) + 0.5;
      });
    }
  },

  // Track session skips (penalty for content user scrolled past)
  trackSessionSkip(postData) {
    const session = this.getSessionData();
    if (postData.source) {
      session.skippedSources[postData.source] = (session.skippedSources[postData.source] || 0) + 1;
    }
    if (postData.category) {
      session.skippedTopics[postData.category] = (session.skippedTopics[postData.category] || 0) + 1;
    }
  },

  // Get session boost/penalty for a post
  getSessionSignal(postData) {
    const session = this.getSessionData();
    let boost = 0;
    let penalty = 0;

    // Check engaged content (boost)
    if (postData.source && session.engagedSources[postData.source]) {
      boost += Math.min(session.engagedSources[postData.source] * 0.1, 0.3);
    }
    if (postData.category && session.engagedTopics[postData.category]) {
      boost += Math.min(session.engagedTopics[postData.category] * 0.1, 0.3);
    }

    // Check skipped content (penalty)
    if (postData.source && session.skippedSources[postData.source]) {
      penalty += Math.min(session.skippedSources[postData.source] * 0.05, 0.2);
    }
    if (postData.category && session.skippedTopics[postData.category]) {
      penalty += Math.min(session.skippedTopics[postData.category] * 0.05, 0.2);
    }

    return { boost, penalty };
  },

  // Mark post as shown in session
  markSessionShown(postId) {
    const session = this.getSessionData();
    session.shownPostIds.add(postId);
  },

  // Check if shown in session
  wasShownInSession(postId) {
    const session = this.getSessionData();
    return session.shownPostIds.has(postId);
  },

  // Reset session data
  resetSession() {
    this._sessionData = null;
  }
};
