// Track user interactions with posts for personalization
// Uses localStorage for session-based tracking

const CLICKED_POSTS_KEY = 'clickedPosts';
const SEEN_POSTS_KEY = 'seenPosts';
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
  }
};
