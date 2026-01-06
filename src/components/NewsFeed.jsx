import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { MessageCircle, Heart, Share, ExternalLink, Bell, BellRing } from 'lucide-react';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { likesService } from '../services/likes';
import { commentsService } from '../services/comments';
import { useAuth } from '../context/AuthContext';

// Source logo colors for fallback avatars
const SOURCE_COLORS = {
  'Reuters': '#ff8000',
  'BBC': '#bb1919',
  'Al Jazeera': '#fa9000',
  'Financial Times': '#fff1e5',
  'Bloomberg': '#2800d7',
  'CNBC': '#005594',
  'CNN': '#cc0000',
  'The Guardian': '#052962',
  'AP News': '#ff322e',
  'MarketWatch': '#00ac4e',
  'Yahoo Finance': '#6001d2',
  'default': '#1d9bf0'
};

// Get favicon URL for a source
function getSourceLogo(link) {
  try {
    if (link) {
      const url = new URL(link);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
    }
  } catch (e) {}
  return null;
}

// Get source initials for fallback
function getSourceInitials(source) {
  if (!source) return '?';
  return source.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// Get color for source
function getSourceColor(source) {
  return SOURCE_COLORS[source] || SOURCE_COLORS.default;
}

// Safely format date
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (isValid(date)) {
      return formatDistanceToNow(date, { addSuffix: false });
    }
    const nativeDate = new Date(dateStr);
    if (isValid(nativeDate)) {
      return formatDistanceToNow(nativeDate, { addSuffix: false });
    }
  } catch (e) {}
  return '';
}

// Tweet-like news item component
function NewsItem({ item, onLike, onBookmark, isBookmarked, onNavigate, likeData, replyCount }) {
  const [imgError, setImgError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const logoUrl = getSourceLogo(item.link);
  const isLiked = likeData?.isLiked || false;
  const likeCount = likeData?.count || 0;

  const handleClick = () => {
    onNavigate(item.id);
  };

  const handleLike = (e) => {
    e.stopPropagation();
    // Trigger animation
    if (!isLiked) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
    onLike(item.id, item); // Pass item data for recommendations
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const postUrl = `${window.location.origin}/post/${item.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.summary || item.title,
          url: postUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(postUrl);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleBookmark = (e) => {
    e.stopPropagation();
    onBookmark(item);
  };

  const handleReply = (e) => {
    e.stopPropagation();
    onNavigate(item.id);
  };

  return (
    <article
      className="px-4 py-3 border-b border-intel-700 hover:bg-intel-800/50 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Source avatar */}
        <div className="flex-shrink-0">
          {logoUrl && !imgError ? (
            <img
              src={logoUrl}
              alt=""
              className="w-10 h-10 rounded-full bg-intel-700 object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: getSourceColor(item.source) }}
            >
              {getSourceInitials(item.source)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1 text-sm">
            <span className="font-bold text-white hover:underline">{item.source}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500">{formatDate(item.pubDate)}</span>
            <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleBookmark}
                className="p-1.5 rounded-full hover:bg-intel-700 transition-colors"
                title={isBookmarked ? 'Stop tracking' : 'Track similar stories'}
              >
                {isBookmarked ? (
                  <BellRing className="w-4 h-4 text-blue-400" />
                ) : (
                  <Bell className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Title as main tweet text */}
          <p className="text-[15px] text-white mt-0.5 leading-snug">{item.title}</p>

          {/* Summary as additional context */}
          {item.summary && (
            <p className="text-[14px] text-gray-400 mt-1 line-clamp-2">{item.summary}</p>
          )}

          {/* Article image */}
          {item.image && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-intel-600">
              <img
                src={item.image}
                alt=""
                className="w-full h-48 object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}

          {/* Link preview card */}
          {!item.image && item.link && (
            <div
              className="mt-3 border border-intel-600 rounded-2xl overflow-hidden hover:bg-intel-700/30 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2"
              >
                <div className="flex items-center gap-2 text-gray-500">
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="text-xs truncate">
                    {(() => {
                      try {
                        return new URL(item.link).hostname.replace('www.', '');
                      } catch (e) {
                        return item.link;
                      }
                    })()}
                  </span>
                </div>
              </a>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-6 mt-3" onClick={(e) => e.stopPropagation()}>
            {/* Reply - opens post page */}
            <button
              onClick={handleReply}
              className="flex items-center gap-1 text-gray-500 hover:text-blue-400 transition-colors group"
              title="Reply"
            >
              <div className="p-2 rounded-full group-hover:bg-blue-400/10 -ml-2">
                <MessageCircle className="w-[18px] h-[18px]" />
              </div>
              {replyCount > 0 && <span className="text-xs">{replyCount}</span>}
            </button>

            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors group ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-400'}`}
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <div className={`p-2 rounded-full group-hover:bg-red-400/10 transition-transform ${isAnimating ? 'scale-125' : 'scale-100'}`}>
                <Heart className={`w-[18px] h-[18px] transition-all duration-200 ${isLiked ? 'fill-red-500 text-red-500' : ''} ${isAnimating ? 'scale-110' : ''}`} />
              </div>
              <span className="text-xs min-w-[1ch]">{likeCount}</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1 text-gray-500 hover:text-blue-400 transition-colors group"
              title="Share"
            >
              <div className="p-2 rounded-full group-hover:bg-blue-400/10">
                <Share className="w-[18px] h-[18px]" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// Stop words for trending topic extraction
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
  'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
  'once', 'if', 'because', 'until', 'while', 'although', 'though', 'after', 'before',
  'above', 'below', 'between', 'under', 'again', 'further', 'about', 'into', 'through',
  'during', 'out', 'off', 'over', 'up', 'down', 'any', 'new', 'says', 'said', 'say',
  'according', 'report', 'reports', 'news', 'amid', 'among', 'around', 'being', 'get',
  'gets', 'got', 'make', 'makes', 'made', 'take', 'takes', 'took', 'come', 'comes',
  'came', 'go', 'goes', 'went', 'see', 'sees', 'saw', 'know', 'knows', 'knew', 'think',
  'thinks', 'thought', 'want', 'wants', 'wanted', 'use', 'uses', 'used', 'find', 'finds',
  'found', 'give', 'gives', 'gave', 'tell', 'tells', 'told', 'may', 'year', 'years',
  'day', 'days', 'time', 'first', 'last', 'long', 'great', 'little', 'own', 'old',
  'right', 'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young',
  'important', 'public', 'bad', 'good', 'best', 'worst', 'way', 'week', 'month',
  'today', 'yesterday', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'june',
  'july', 'august', 'september', 'october', 'november', 'december', 'reuters',
  'associated', 'press', 'bbc', 'cnn', 'guardian', 'times', 'post', 'journal',
  'breaking', 'update', 'latest', 'live', 'watch', 'read', 'more', 'click', 'video'
]);

// Extract trending phrases from news (phrases appearing in 2+ articles)
function extractTrendingPhrases(newsItems) {
  if (!newsItems || newsItems.length === 0) return [];

  const phrasesSet = new Set();

  // Extract all unique 2-word phrases from titles
  newsItems.forEach(item => {
    const titleWords = item.title
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !/^\d+$/.test(word));

    for (let i = 0; i < titleWords.length - 1; i++) {
      const w1 = titleWords[i];
      const w2 = titleWords[i + 1];

      if (STOP_WORDS.has(w1) || STOP_WORDS.has(w2)) continue;

      const phrase = `${w1} ${w2}`;
      phrasesSet.add(phrase);
    }
  });

  // Count articles containing each phrase
  const phrasesWithCounts = Array.from(phrasesSet).map(phrase => {
    const words = phrase.split(' ');
    const count = newsItems.filter(item => {
      const text = `${item.title} ${item.summary || ''}`.toLowerCase();
      return words.every(word => text.includes(word));
    }).length;
    return { phrase, count };
  });

  // Return phrases with 2+ mentions, sorted by count
  return phrasesWithCounts
    .filter(({ count }) => count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 trending phrases
}

// Interest keywords for matching
const INTEREST_KEYWORDS = {
  'markets': ['market', 'stock', 'trading', 'investor', 'finance', 'economy', 'bank', 'fed', 'rate', 'dow', 'nasdaq', 's&p', 'wall street'],
  'geopolitics': ['war', 'military', 'nato', 'russia', 'china', 'ukraine', 'conflict', 'troops', 'defense', 'diplomacy', 'sanctions', 'treaty'],
  'technology': ['tech', 'ai', 'artificial intelligence', 'software', 'chip', 'semiconductor', 'apple', 'google', 'microsoft', 'cyber', 'data'],
  'energy': ['oil', 'gas', 'energy', 'opec', 'crude', 'fuel', 'renewable', 'solar', 'wind', 'power', 'electricity', 'pipeline'],
  'trade': ['trade', 'tariff', 'export', 'import', 'commerce', 'supply chain', 'shipping', 'customs', 'wto'],
  'policy': ['policy', 'regulation', 'law', 'congress', 'senate', 'legislation', 'government', 'election', 'vote', 'bill'],
  'climate': ['climate', 'carbon', 'emission', 'environment', 'green', 'sustainable', 'weather', 'temperature', 'pollution'],
  'crypto': ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'token', 'defi', 'nft', 'coin', 'mining', 'wallet'],
};

// City to country mapping for news prioritization
const CITY_TO_COUNTRY = {
  // Brazil
  'sao paulo': 'brazil', 'são paulo': 'brazil', 'rio de janeiro': 'brazil', 'brasilia': 'brazil', 'brasília': 'brazil',
  'salvador': 'brazil', 'fortaleza': 'brazil', 'belo horizonte': 'brazil', 'manaus': 'brazil', 'curitiba': 'brazil',
  'recife': 'brazil', 'porto alegre': 'brazil', 'goiania': 'brazil', 'goiânia': 'brazil', 'belem': 'brazil', 'belém': 'brazil',
  'guarulhos': 'brazil', 'campinas': 'brazil', 'sao luis': 'brazil', 'são luís': 'brazil', 'maceio': 'brazil', 'maceió': 'brazil',
  'natal': 'brazil', 'florianopolis': 'brazil', 'florianópolis': 'brazil', 'vitoria': 'brazil', 'vitória': 'brazil',
  'londrina': 'brazil', 'maringa': 'brazil', 'maringá': 'brazil', 'foz do iguacu': 'brazil', 'foz do iguaçu': 'brazil',
  // USA
  'new york': 'usa', 'nyc': 'usa', 'los angeles': 'usa', 'chicago': 'usa', 'houston': 'usa', 'phoenix': 'usa',
  'philadelphia': 'usa', 'san antonio': 'usa', 'san diego': 'usa', 'dallas': 'usa', 'austin': 'usa',
  'san jose': 'usa', 'san francisco': 'usa', 'seattle': 'usa', 'denver': 'usa', 'boston': 'usa',
  'washington dc': 'usa', 'washington': 'usa', 'atlanta': 'usa', 'miami': 'usa', 'minneapolis': 'usa',
  // UK
  'london': 'uk', 'manchester': 'uk', 'birmingham': 'uk', 'glasgow': 'uk', 'liverpool': 'uk', 'edinburgh': 'uk',
  // Canada
  'toronto': 'canada', 'vancouver': 'canada', 'montreal': 'canada', 'calgary': 'canada', 'ottawa': 'canada', 'edmonton': 'canada',
  // Europe
  'paris': 'france', 'berlin': 'germany', 'munich': 'germany', 'frankfurt': 'germany', 'madrid': 'spain', 'barcelona': 'spain',
  'rome': 'italy', 'milan': 'italy', 'amsterdam': 'netherlands', 'brussels': 'belgium', 'vienna': 'austria',
  'zurich': 'switzerland', 'geneva': 'switzerland', 'lisbon': 'portugal', 'dublin': 'ireland',
  'stockholm': 'sweden', 'copenhagen': 'denmark', 'oslo': 'norway', 'helsinki': 'finland',
  'prague': 'czech', 'budapest': 'hungary', 'warsaw': 'poland', 'athens': 'greece',
  // Asia
  'tokyo': 'japan', 'osaka': 'japan', 'beijing': 'china', 'shanghai': 'china', 'hong kong': 'china',
  'seoul': 'south korea', 'taipei': 'taiwan', 'singapore': 'singapore', 'bangkok': 'thailand',
  'kuala lumpur': 'malaysia', 'jakarta': 'indonesia', 'manila': 'philippines', 'ho chi minh': 'vietnam',
  'mumbai': 'india', 'delhi': 'india', 'bangalore': 'india', 'chennai': 'india', 'kolkata': 'india',
  // Middle East
  'dubai': 'uae', 'abu dhabi': 'uae', 'doha': 'qatar', 'riyadh': 'saudi arabia',
  'tel aviv': 'israel', 'jerusalem': 'israel', 'istanbul': 'turkey', 'cairo': 'egypt',
  // Africa
  'johannesburg': 'south africa', 'cape town': 'south africa', 'nairobi': 'kenya', 'lagos': 'nigeria',
  // Latin America
  'mexico city': 'mexico', 'buenos aires': 'argentina', 'bogota': 'colombia', 'lima': 'peru',
  'santiago': 'chile', 'caracas': 'venezuela',
  // Oceania
  'sydney': 'australia', 'melbourne': 'australia', 'brisbane': 'australia', 'perth': 'australia',
  'auckland': 'new zealand', 'wellington': 'new zealand',
};

// Country to region mapping
const COUNTRY_TO_REGION = {
  'brazil': 'latin_america',
  'usa': 'north_america',
  'canada': 'north_america',
  'uk': 'europe',
  'france': 'europe', 'germany': 'europe', 'spain': 'europe', 'italy': 'europe',
  'netherlands': 'europe', 'belgium': 'europe', 'austria': 'europe', 'switzerland': 'europe',
  'portugal': 'europe', 'ireland': 'europe', 'sweden': 'europe', 'denmark': 'europe',
  'norway': 'europe', 'finland': 'europe', 'czech': 'europe', 'hungary': 'europe',
  'poland': 'europe', 'greece': 'europe',
  'japan': 'east_asia', 'china': 'east_asia', 'south korea': 'east_asia', 'taiwan': 'east_asia',
  'singapore': 'southeast_asia', 'thailand': 'southeast_asia', 'malaysia': 'southeast_asia',
  'indonesia': 'southeast_asia', 'philippines': 'southeast_asia', 'vietnam': 'southeast_asia',
  'india': 'south_asia',
  'uae': 'middle_east', 'qatar': 'middle_east', 'saudi arabia': 'middle_east',
  'israel': 'middle_east', 'turkey': 'middle_east', 'egypt': 'middle_east',
  'south africa': 'africa', 'kenya': 'africa', 'nigeria': 'africa',
  'mexico': 'latin_america', 'argentina': 'latin_america', 'colombia': 'latin_america',
  'peru': 'latin_america', 'chile': 'latin_america', 'venezuela': 'latin_america',
  'australia': 'oceania', 'new zealand': 'oceania',
};

// Brazilian news sources
const BRAZILIAN_SOURCES = [
  'Estadão', 'Folha de S.Paulo', 'Folha', 'O Globo', 'G1', 'CNN Brasil', 'UOL', 'Terra',
  'Metrópoles', 'R7', 'Veja', 'IstoÉ', 'Exame', 'InfoMoney', 'Valor Econômico',
  'Gazeta do Povo', 'Correio Braziliense', 'Zero Hora', 'O Dia', 'Lance!', 'Tecmundo',
  'Olhar Digital', 'Canaltech', 'TecMundo', 'Jovem Pan', 'Band', 'SBT', 'Record',
];

// US news sources
const US_SOURCES = [
  'NBC News', 'ABC News', 'CBS News', 'CNN', 'Fox News', 'NPR', 'PBS',
  'New York Times', 'Washington Post', 'Wall Street Journal', 'USA Today', 'Los Angeles Times',
  'Chicago Tribune', 'Boston Globe', 'Politico', 'The Hill', 'Axios', 'Bloomberg',
  'CNBC', 'MarketWatch', 'TechCrunch', 'The Verge', 'Wired', 'Ars Technica',
  'AP News', 'Reuters America',
];

// UK news sources
const UK_SOURCES = [
  'BBC', 'BBC News', 'The Guardian', 'The Telegraph', 'Financial Times', 'The Times',
  'The Independent', 'Sky News', 'Daily Mail', 'Metro',
];

function NewsFeed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { news, addToWatchlist, removeFromWatchlist, isInWatchlist, userInterests, followedSources, userCity } = useStore();

  // Get user's country and region from their city
  const userCountry = useMemo(() => {
    if (!userCity) return null;
    return CITY_TO_COUNTRY[userCity.toLowerCase()] || null;
  }, [userCity]);

  const userRegion = useMemo(() => {
    if (!userCountry) return null;
    return COUNTRY_TO_REGION[userCountry] || null;
  }, [userCountry]);
  const [displayCount, setDisplayCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [likesMap, setLikesMap] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [activeTab, setActiveTab] = useState('foryou'); // 'foryou' or 'following'
  const [userLikeProfile, setUserLikeProfile] = useState(null); // For recommendations
  const loaderRef = useRef(null);

  // Track shown news to detect new articles
  const [shownNewsIds, setShownNewsIds] = useState(() => new Set());
  const [newArticlesCount, setNewArticlesCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Random seed for this session (changes on refresh)
  const [sessionSeed] = useState(() => Math.random());

  // Track view counts per post (used for sorting, not filtering)
  const [postViewCounts, setPostViewCounts] = useState(() => {
    return JSON.parse(localStorage.getItem('postViewCounts') || '{}');
  });

  // Track previously seen posts to avoid repeats in first 30 positions
  const [seenPostIds] = useState(() => {
    const stored = localStorage.getItem('seenPostIds');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return new Set(parsed);
      } catch (e) {
        return new Set();
      }
    }
    return new Set();
  });

  // Mark posts as seen when displayed (runs once per session)
  const hasMarkedSeen = useRef(false);

  // Store the initial news IDs on first load
  const lastNewsIdsRef = useRef(new Set());

  // Initialize shown news on first load
  useEffect(() => {
    if (!isInitialized && news.length > 0) {
      const ids = new Set(news.map(item => item.id));
      setShownNewsIds(ids);
      lastNewsIdsRef.current = ids;
      setIsInitialized(true);
    }
  }, [news, isInitialized]);

  // Detect new articles (only after initialization)
  useEffect(() => {
    if (!isInitialized || news.length === 0) return;

    // Find articles that weren't in the last known set
    const newItems = news.filter(item => !lastNewsIdsRef.current.has(item.id));

    if (newItems.length > 0) {
      // Update the count
      setNewArticlesCount(newItems.length);
      // Update lastNewsIdsRef to include new items for next comparison
      newItems.forEach(item => lastNewsIdsRef.current.add(item.id));
    }
  }, [news, isInitialized]);

  // Handle showing new articles
  const handleShowNewArticles = () => {
    // Add all current news to shown set
    setShownNewsIds(new Set(news.map(item => item.id)));
    setNewArticlesCount(0);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter news based on active tab (only show "shown" articles)
  const filteredNews = useMemo(() => {
    if (!isInitialized) {
      // Before initialization, show all news
      if (activeTab === 'following' && followedSources.length > 0) {
        return news.filter(item => followedSources.includes(item.source));
      }
      return news;
    }

    // Only show articles that have been "shown" (not pending)
    const shownNews = news.filter(item => shownNewsIds.has(item.id));

    if (activeTab === 'following' && followedSources.length > 0) {
      return shownNews.filter(item => followedSources.includes(item.source));
    }
    return shownNews;
  }, [news, activeTab, followedSources, shownNewsIds, isInitialized]);

  // Extract trending phrases from all news (not just filtered)
  const trendingPhrases = useMemo(() => {
    return extractTrendingPhrases(news);
  }, [news]);

  // Calculate trending score for a post
  const getTrendingScore = (item) => {
    if (trendingPhrases.length === 0) return 0;

    const text = `${item.title} ${item.summary || ''}`.toLowerCase();
    let score = 0;
    const maxPhraseCount = trendingPhrases[0]?.count || 1; // Highest trending count

    trendingPhrases.forEach(({ phrase, count }) => {
      const words = phrase.split(' ');
      if (words.every(word => text.includes(word))) {
        // Weight by how trending the phrase is (normalized by max count)
        score += count / maxPhraseCount;
      }
    });

    // Normalize to 0-1 (cap contribution)
    return Math.min(score / 3, 1);
  };

  // Increment view counts for displayed posts (once per session)
  const hasIncrementedViews = useRef(false);
  useEffect(() => {
    if (hasIncrementedViews.current || filteredNews.length === 0) return;

    const displayedIds = filteredNews.slice(0, displayCount).map(item => item.id);
    const updatedCounts = { ...postViewCounts };

    displayedIds.forEach(id => {
      updatedCounts[id] = (updatedCounts[id] || 0) + 1;
    });

    // Clean up old entries (keep only last 1000)
    const entries = Object.entries(updatedCounts);
    if (entries.length > 1000) {
      const trimmed = Object.fromEntries(entries.slice(-1000));
      localStorage.setItem('postViewCounts', JSON.stringify(trimmed));
      setPostViewCounts(trimmed);
    } else {
      localStorage.setItem('postViewCounts', JSON.stringify(updatedCounts));
      setPostViewCounts(updatedCounts);
    }

    hasIncrementedViews.current = true;
  }, [filteredNews, displayCount]);

  // Calculate relevance score for a post based on user interests
  const getRelevanceScore = (item) => {
    if (!userInterests || userInterests.length === 0) return 0;

    const text = `${item.title} ${item.summary || ''}`.toLowerCase();
    let score = 0;

    userInterests.forEach(interest => {
      const keywords = INTEREST_KEYWORDS[interest] || [];
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          score += 1;
        }
      });
    });

    // Normalize to 0-1 range (cap at 5 keyword matches)
    return Math.min(score / 5, 1);
  };

  // Calculate country/region score for a post based on user's location
  const getCountryScore = (item) => {
    if (!userCountry) return 0;

    const source = item.source || '';

    // Check if source is from user's country (highest priority)
    if (userCountry === 'brazil' && BRAZILIAN_SOURCES.some(s => source.includes(s) || s.includes(source))) {
      return 1;
    }
    if (userCountry === 'usa' && US_SOURCES.some(s => source.includes(s) || s.includes(source))) {
      return 1;
    }
    if (userCountry === 'uk' && UK_SOURCES.some(s => source.includes(s) || s.includes(source))) {
      return 1;
    }

    // Check item's feedRegion or category for country match
    const itemCategory = (item.category || '').toLowerCase();
    const itemRegion = (item.feedRegion || '').toLowerCase();

    // Direct country match in category (e.g., 'brazil', 'usa')
    if (itemCategory === userCountry || itemCategory.includes(userCountry)) {
      return 1;
    }

    // Region match (e.g., 'latin_america', 'north_america')
    if (userRegion && (itemRegion === userRegion || itemCategory === userRegion)) {
      return 0.6;
    }

    // Check content for country-specific mentions
    const text = `${item.title} ${item.summary || ''}`.toLowerCase();
    const countryKeywords = {
      'brazil': ['brazil', 'brasil', 'brazilian', 'lula', 'bolsonaro', 'petrobras', 'bovespa'],
      'usa': ['u.s.', 'us ', 'america', 'american', 'biden', 'trump', 'congress', 'washington', 'federal reserve'],
      'uk': ['britain', 'british', 'uk ', 'london', 'england', 'parliament', 'westminster'],
      'canada': ['canada', 'canadian', 'trudeau', 'ottawa'],
      'mexico': ['mexico', 'mexican'],
      'argentina': ['argentina', 'argentine', 'buenos aires'],
    };

    const keywords = countryKeywords[userCountry] || [];
    if (keywords.some(kw => text.includes(kw))) {
      return 0.8;
    }

    return 0;
  };

  // Calculate like-based recommendation score
  const getLikeScore = (item) => {
    if (!userLikeProfile || userLikeProfile.totalLikes === 0) return 0;

    // Already-liked posts get neutral score - don't pin them to top
    if (userLikeProfile.likedPostIds?.includes(item.id)) {
      return 0;
    }

    let score = 0;
    const maxScore = 3; // For normalization

    // Source match: if user liked posts from this source before
    if (item.source && userLikeProfile.likedSources[item.source]) {
      const sourceWeight = Math.min(userLikeProfile.likedSources[item.source] / 3, 1); // Cap at 3 likes
      score += sourceWeight;
    }

    // Category match: if user liked posts from this category
    if (item.category && userLikeProfile.likedCategories[item.category]) {
      const categoryWeight = Math.min(userLikeProfile.likedCategories[item.category] / 3, 1);
      score += categoryWeight;
    }

    // Keyword match: check how many liked keywords appear in this post
    const postText = `${item.title} ${item.summary || ''}`.toLowerCase();
    let keywordMatches = 0;
    Object.entries(userLikeProfile.likedKeywords).forEach(([keyword, count]) => {
      if (postText.includes(keyword)) {
        keywordMatches += Math.min(count, 2); // Cap contribution per keyword
      }
    });
    if (keywordMatches > 0) {
      score += Math.min(keywordMatches / 5, 1); // Normalize keyword score
    }

    return Math.min(score / maxScore, 1); // Normalize to 0-1
  };

  // Subscribe to all likes
  useEffect(() => {
    const unsubscribe = likesService.subscribeToAllLikes((likes) => {
      setLikesMap(likes);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to user's likes for recommendations
  useEffect(() => {
    if (!user?.uid) {
      setUserLikeProfile(null);
      return;
    }

    const unsubscribe = likesService.subscribeToUserLikes(user.uid, (profile) => {
      setUserLikeProfile(profile);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Subscribe to all comments (for reply counts)
  useEffect(() => {
    const unsubscribes = [];
    const counts = {};

    // Subscribe to comments for displayed posts
    filteredNews.slice(0, displayCount).forEach(item => {
      const unsub = commentsService.subscribeToComments(item.id, (comments) => {
        // Count all comments (including nested)
        const countAll = (commentList) => {
          let count = commentList.length;
          commentList.forEach(c => {
            if (c.replies) count += countAll(c.replies);
          });
          return count;
        };
        counts[item.id] = countAll(comments);
        setCommentsMap({ ...counts });
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [filteredNews, displayCount]);

  const handleNavigateToPost = (postId) => {
    navigate(`/post/${postId}`);
  };

  // Track if scores have been calculated with a valid profile
  const [scoresCalculated, setScoresCalculated] = useState(false);
  const stableScoresRef = useRef({});
  const lastProfileLikesRef = useRef(0);

  // Calculate scores when profile is ready with actual likes
  useEffect(() => {
    if (!userLikeProfile || filteredNews.length === 0) return;

    // Only recalculate if:
    // 1. Scores haven't been calculated yet, OR
    // 2. Profile has significantly more likes (page refresh, not single like)
    const likeDiff = userLikeProfile.totalLikes - lastProfileLikesRef.current;
    const shouldRecalculate = !scoresCalculated || likeDiff > 1 || likeDiff < 0;

    if (shouldRecalculate) {
      console.log('[Feed] Calculating scores, totalLikes:', userLikeProfile.totalLikes);
      stableScoresRef.current = {};
      filteredNews.forEach(item => {
        stableScoresRef.current[item.id] = getLikeScore(item);
      });
      lastProfileLikesRef.current = userLikeProfile.totalLikes;
      setScoresCalculated(true);
    }
  }, [userLikeProfile, filteredNews.length, scoresCalculated]);

  // Enforce max consecutive items from same source
  const enforceSourceDiversity = (items, maxConsecutive = 2) => {
    if (items.length <= maxConsecutive) return items;

    const result = [...items];
    let i = 0;

    while (i < result.length) {
      // Count consecutive items from same source
      let consecutiveCount = 1;
      const currentSource = result[i].source;

      while (i + consecutiveCount < result.length &&
             result[i + consecutiveCount].source === currentSource) {
        consecutiveCount++;
      }

      // If we exceed max consecutive, find a different source to swap in
      if (consecutiveCount > maxConsecutive) {
        const swapIndex = i + maxConsecutive; // Position that needs swapping

        // Find next item with different source
        let foundIndex = -1;
        for (let j = swapIndex + 1; j < result.length; j++) {
          if (result[j].source !== currentSource) {
            foundIndex = j;
            break;
          }
        }

        // If found, swap them
        if (foundIndex !== -1) {
          [result[swapIndex], result[foundIndex]] = [result[foundIndex], result[swapIndex]];
        }
      }

      // Move to next group
      i += Math.min(consecutiveCount, maxConsecutive);
    }

    return result;
  };

  // Sort by combined score: trending (40%) + like history (60%)
  // Also prioritize unseen posts for first 30 positions
  const sortedNews = useMemo(() => {
    const scored = [...filteredNews].map(item => {
      // Get like score from cache or calculate
      if (stableScoresRef.current[item.id] === undefined) {
        stableScoresRef.current[item.id] = getLikeScore(item);
      }
      const likeScore = stableScoresRef.current[item.id];

      // Calculate trending score
      const trendingScore = getTrendingScore(item);

      // Combined score: trending gets 40% weight, likes get 60%
      const combinedScore = (trendingScore * 0.4) + (likeScore * 0.6);

      // Mark if this post was seen in previous sessions
      const wasSeen = seenPostIds.has(item.id);

      return { ...item, _score: combinedScore, _trendingScore: trendingScore, _likeScore: likeScore, _wasSeen: wasSeen };
    }).sort((a, b) => b._score - a._score);

    // Separate unseen and seen posts
    const unseenPosts = scored.filter(item => !item._wasSeen);
    const seenPosts = scored.filter(item => item._wasSeen);

    // For first 30 positions, prioritize unseen posts
    // If we have enough unseen posts, use them first
    // Then fill with seen posts (which can repeat after position 30)
    let result;
    if (unseenPosts.length >= 30) {
      // Plenty of unseen posts - put them first, then seen posts
      result = [...unseenPosts, ...seenPosts];
    } else {
      // Not enough unseen posts - use all unseen first, then seen
      result = [...unseenPosts, ...seenPosts];
    }

    // Apply source diversity - no more than 2 consecutive from same source
    return enforceSourceDiversity(result, 2);
  }, [filteredNews, scoresCalculated, trendingPhrases, seenPostIds]);

  const displayedNews = sortedNews.slice(0, displayCount);
  const hasMore = displayCount < sortedNews.length;

  // Mark first 30 displayed posts as seen (once per session)
  useEffect(() => {
    if (hasMarkedSeen.current || sortedNews.length === 0) return;

    // Get first 30 post IDs to mark as seen
    const postsToMark = sortedNews.slice(0, 30).map(item => item.id);

    // Add to seen set
    postsToMark.forEach(id => seenPostIds.add(id));

    // Save to localStorage (keep last 500 to prevent unbounded growth)
    const allSeenIds = Array.from(seenPostIds);
    const trimmedIds = allSeenIds.slice(-500);
    localStorage.setItem('seenPostIds', JSON.stringify(trimmedIds));

    hasMarkedSeen.current = true;
  }, [sortedNews, seenPostIds]);

  // Handle like toggle - pass post data for recommendations
  const handleLike = async (itemId, postData) => {
    if (!user) {
      console.warn('[Like] No user logged in');
      return;
    }
    console.log('[Like] Toggling like for:', itemId, 'user:', user.uid);
    try {
      const result = await likesService.toggleLike(itemId, user.uid, postData);
      console.log('[Like] Result:', result);
    } catch (err) {
      console.error('[Like] Failed to toggle like:', err);
    }
  };

  // Handle bookmark toggle (track post)
  const handleBookmark = (item) => {
    if (isInWatchlist(item.id)) {
      removeFromWatchlist(item.id);
    } else {
      addToWatchlist({
        id: item.id,
        type: 'news',
        name: item.title,
        data: item
      });
    }
  };

  // Infinite scroll using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setLoading(true);
          setTimeout(() => {
            setDisplayCount(prev => Math.min(prev + 15, sortedNews.length));
            setLoading(false);
          }, 300);
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, sortedNews.length]);

  // Reset display count and show new articles when switching tabs
  useEffect(() => {
    setDisplayCount(20);
    // Show all articles when switching tabs
    if (newArticlesCount > 0) {
      setShownNewsIds(new Set(news.map(item => item.id)));
      setNewArticlesCount(0);
    }
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col bg-intel-900">
      {/* Header with tabs */}
      <div className="sticky top-0 z-10 bg-intel-900/80 backdrop-blur-md border-b border-intel-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('foryou')}
            className={`flex-1 py-4 text-center font-medium transition-colors relative ${
              activeTab === 'foryou' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            For you
            {activeTab === 'foryou' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-4 text-center font-medium transition-colors relative ${
              activeTab === 'following' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Following
            {followedSources.length > 0 && (
              <span className="ml-1 text-xs text-gray-500">({followedSources.length})</span>
            )}
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* New articles button */}
      {newArticlesCount > 0 && (
        <button
          onClick={handleShowNewArticles}
          className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium text-sm border-b border-intel-700 transition-colors"
        >
          Show {newArticlesCount} new {newArticlesCount === 1 ? 'post' : 'posts'}
        </button>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {sortedNews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {activeTab === 'following' ? (
              followedSources.length === 0 ? (
                <>
                  <p className="text-lg">No sources followed</p>
                  <p className="text-sm mt-1">Follow news sources to see their posts here</p>
                  <button
                    onClick={() => navigate('/profile')}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 transition-colors"
                  >
                    Follow sources
                  </button>
                </>
              ) : (
                <>
                  <p className="text-lg">No posts from followed sources</p>
                  <p className="text-sm mt-1">New posts will appear here</p>
                </>
              )
            ) : (
              <>
                <p className="text-lg">No news yet</p>
                <p className="text-sm mt-1">News will appear here as they come in</p>
              </>
            )}
          </div>
        ) : (
          <>
            {displayedNews.map((item, idx) => {
              const postLikes = likesMap[item.id] || { count: 0, userIds: [] };
              return (
                <NewsItem
                  key={`${item.id}-${idx}`}
                  item={item}
                  onLike={handleLike}
                  onBookmark={handleBookmark}
                  isBookmarked={isInWatchlist(item.id)}
                  onNavigate={handleNavigateToPost}
                  likeData={{
                    count: postLikes.count,
                    isLiked: user ? postLikes.userIds.includes(user.uid) : false
                  }}
                  replyCount={commentsMap[item.id] || 0}
                />
              );
            })}

            {/* Loading indicator / Infinite scroll trigger */}
            <div ref={loaderRef} className="py-6">
              {loading && (
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!hasMore && sortedNews.length > 0 && (
                <p className="text-center text-gray-600 text-sm">You're all caught up</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default NewsFeed;
