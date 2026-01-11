import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { MessageCircle, Heart, Share, ExternalLink, Eye, Plus, Check } from 'lucide-react';
import { formatDistanceToNow, isValid, parseISO, differenceInHours } from 'date-fns';
import { likesService } from '../services/likes';
import { commentsService } from '../services/comments';
import { interactionsService } from '../services/interactions';
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
function NewsItem({ item, onLike, onBookmark, isBookmarked, onNavigate, likeData, replyCount, isFollowing, onFollow }) {
  const [imgError, setImgError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFollowCheck, setShowFollowCheck] = useState(false);
  const logoUrl = getSourceLogo(item.link);
  const isLiked = likeData?.isLiked || false;
  const likeCount = likeData?.count || 0;

  const handleFollow = (e) => {
    e.stopPropagation();
    if (!isFollowing) {
      setShowFollowCheck(true);
      setTimeout(() => setShowFollowCheck(false), 1000);
    }
    onFollow(item.source);
  };

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
        {/* Source avatar with follow button */}
        <div className="flex-shrink-0 relative w-10 h-10" onClick={(e) => e.stopPropagation()}>
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
          {/* Follow button / check animation */}
          {(showFollowCheck || !isFollowing) && (
            <button
              onClick={handleFollow}
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center bg-blue-500 text-white shadow-sm border border-intel-900"
              title={showFollowCheck ? 'Following' : 'Follow source'}
            >
              {showFollowCheck ? (
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
              ) : (
                <Plus className="w-2.5 h-2.5" strokeWidth={3} />
              )}
            </button>
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
                <Eye className={`w-4 h-4 ${isBookmarked ? 'text-blue-400' : 'text-gray-500'}`} />
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

// Stop words for trending topic extraction (English + Portuguese + Spanish)
const STOP_WORDS = new Set([
  // English
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
  'these', 'those', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
  'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'nor', 'not', 'only', 'own',
  'same', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
  'once', 'because', 'until', 'while', 'although', 'though', 'after', 'before',
  'above', 'below', 'between', 'under', 'again', 'further', 'about', 'into', 'through',
  'during', 'out', 'off', 'over', 'down', 'any', 'new', 'says', 'said', 'say',
  'according', 'report', 'reports', 'news', 'amid', 'among', 'around', 'being', 'get',
  'gets', 'got', 'make', 'makes', 'made', 'take', 'takes', 'took', 'come', 'comes',
  'came', 'goes', 'went', 'see', 'sees', 'saw', 'know', 'knows', 'knew', 'think',
  'thinks', 'thought', 'want', 'wants', 'wanted', 'use', 'uses', 'find', 'finds',
  'found', 'give', 'gives', 'gave', 'tell', 'tells', 'told', 'year', 'years',
  'day', 'days', 'time', 'first', 'last', 'long', 'great', 'little', 'old',
  'right', 'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young',
  'important', 'public', 'bad', 'good', 'best', 'worst', 'way', 'week', 'month',
  'today', 'yesterday', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'june',
  'july', 'august', 'september', 'october', 'november', 'december', 'reuters',
  'associated', 'press', 'bbc', 'cnn', 'guardian', 'times', 'post', 'journal',
  'breaking', 'update', 'latest', 'live', 'watch', 'read', 'click', 'video',
  'gov', 'sen', 'rep', 'dr', 'mr', 'mrs', 'ms', 'jr', 'sr',
  // Portuguese
  'para', 'com', 'uma', 'por', 'mais', 'como', 'mas', 'foi', 'ser', 'são',
  'tem', 'seu', 'sua', 'isso', 'esse', 'esta', 'este', 'pela', 'pelo', 'nos',
  'das', 'dos', 'que', 'não', 'nao', 'ainda', 'sobre', 'após', 'apos', 'até', 'ate',
  'onde', 'quando', 'muito', 'pode', 'deve', 'será', 'sera', 'está', 'esta',
  'foram', 'entre', 'dois', 'tres', 'três', 'anos', 'dia', 'dias', 'diz', 'disse',
  'vai', 'vão', 'vao', 'ter', 'já', 'sem', 'nem', 'só', 'todo', 'toda',
  'fica', 'contra', 'desde', 'cada', 'seus', 'suas', 'eram', 'eram',
  // Spanish
  'para', 'con', 'una', 'por', 'más', 'mas', 'como', 'pero', 'fue', 'ser', 'son',
  'tiene', 'tienen', 'esto', 'esta', 'ese', 'esa', 'del', 'los', 'las', 'que',
  'hay', 'muy', 'puede', 'pueden', 'será', 'están', 'entre', 'años', 'día',
  // Common fragments to filter
  'est', 'vel', 'ncia', 'cio', 'ção', 'cao', 'mente', 'dade', 'ado', 'ada',
]);

// Check if a word looks like a valid word (has vowels, proper length)
function isValidTrendingWord(word) {
  if (word.length < 3) return false;
  if (word.length > 20) return false;
  if (/^\d+$/.test(word)) return false;
  if (!/[aeiouáéíóúàèìòùâêîôûãõäëïöü]/i.test(word)) return false;
  return true;
}

// Extract trending words and phrases from news (smart word vs phrase detection)
function extractTrendingPhrases(newsItems) {
  if (!newsItems || newsItems.length === 0) return [];

  const phraseCounts = new Map();
  const wordCounts = new Map();
  const wordContexts = new Map();
  const capitalizedCounts = new Map();

  newsItems.forEach(item => {
    const originalTitle = item.title;
    const originalWords = originalTitle
      .replace(/[^\w\s\u00C0-\u024F'-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 3 && !/^\d+$/.test(word));

    // Track capitalization patterns (proper nouns)
    originalWords.forEach((word, idx) => {
      const lower = word.toLowerCase();
      if (idx > 0 && /^[A-Z\u00C0-\u00DC]/.test(word) && !STOP_WORDS.has(lower)) {
        capitalizedCounts.set(lower, (capitalizedCounts.get(lower) || 0) + 1);
      }
    });

    const titleWords = originalWords.map(w => w.toLowerCase());

    // Count single words (4+ chars)
    titleWords.forEach(word => {
      if (word.length >= 4 && !STOP_WORDS.has(word) && isValidTrendingWord(word)) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    });

    // Count 2-word phrases and track contexts
    for (let i = 0; i < titleWords.length - 1; i++) {
      const w1 = titleWords[i];
      const w2 = titleWords[i + 1];

      if (STOP_WORDS.has(w1) || STOP_WORDS.has(w2)) continue;
      if (!isValidTrendingWord(w1) || !isValidTrendingWord(w2)) continue;

      const phrase = `${w1} ${w2}`;
      phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);

      if (!wordContexts.has(w1)) wordContexts.set(w1, new Map());
      if (!wordContexts.has(w2)) wordContexts.set(w2, new Map());
      wordContexts.get(w1).set(phrase, (wordContexts.get(w1).get(phrase) || 0) + 1);
      wordContexts.get(w2).set(phrase, (wordContexts.get(w2).get(phrase) || 0) + 1);
    }
  });

  // Determine if a word should stand alone (very strict - prefer phrases)
  const shouldUseWord = (word, wordCount) => {
    const contexts = wordContexts.get(word);
    const capCount = capitalizedCounts.get(word) || 0;

    // Very strict proper noun check: must be capitalized 50%+ of the time
    const isStrongProperNoun = capCount >= Math.max(3, wordCount * 0.5);

    // If word has no phrase contexts and is a strong proper noun, use it
    if (!contexts || contexts.size === 0) {
      return isStrongProperNoun && wordCount >= 4;
    }

    // Check how many different phrase contexts this word appears in
    const uniqueContexts = contexts.size;

    // Only use single word if:
    // 1. It's a strong proper noun AND
    // 2. It appears in 4+ different phrase contexts (truly versatile entity)
    if (uniqueContexts >= 4 && isStrongProperNoun && wordCount >= 5) {
      return true;
    }

    // Default: prefer phrases over single words
    return false;
  };

  // Build candidates - PHRASES FIRST, then add standalone proper nouns
  const candidates = [];
  const usedWords = new Set();

  // First pass: add strong phrases (2+ mentions)
  const phraseEntries = Array.from(phraseCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  phraseEntries.forEach(([phrase, count]) => {
    const [w1, w2] = phrase.split(' ');

    // Add phrase and mark its words as covered
    candidates.push({ phrase, count, type: 'phrase' });
    usedWords.add(w1);
    usedWords.add(w2);
  });

  // Second pass: add standalone proper nouns NOT already covered by phrases
  const wordEntries = Array.from(wordCounts.entries())
    .filter(([word, count]) => count >= 4 && !usedWords.has(word) && shouldUseWord(word, count))
    .sort((a, b) => b[1] - a[1]);

  wordEntries.forEach(([word, count]) => {
    candidates.push({ phrase: word, count, type: 'word' });
  });

  // Sort and deduplicate
  const sorted = candidates.sort((a, b) => b.count - a.count);
  const final = [];

  for (const item of sorted) {
    if (final.length >= 20) break;

    const words = item.phrase.split(' ');
    let isRedundant = false;

    for (const existing of final) {
      const existingWords = existing.phrase.split(' ');
      if (item.type === 'word' && existingWords.includes(item.phrase) && existing.count >= item.count * 0.6) {
        isRedundant = true;
        break;
      }
      if (item.type === 'phrase' && existing.type === 'word' && words.includes(existing.phrase) && existing.count >= item.count * 2) {
        isRedundant = true;
        break;
      }
    }

    if (!isRedundant) {
      final.push(item);
    }
  }

  return final;
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

// Extract keywords from post text for matching
function extractPostKeywords(text) {
  if (!text) return [];
  const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'will', 'more', 'when', 'who', 'new', 'now', 'way', 'may', 'say', 'she', 'two', 'how', 'its', 'let', 'put', 'too', 'use', 'this', 'that', 'with', 'from', 'they', 'been', 'have', 'were', 'said', 'each', 'which', 'their', 'there', 'what', 'about', 'would', 'could', 'should', 'after', 'before']);
  const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  return [...new Set(words)].slice(0, 10);
}

// Calculate freshness score (0-1) based on post age
// Posts less than 1 hour old get max score, decays over 24 hours
function getFreshnessScore(pubDate) {
  if (!pubDate) return 0.3;
  try {
    const date = parseISO(pubDate);
    if (!isValid(date)) return 0.3;
    const hoursAgo = differenceInHours(new Date(), date);
    if (hoursAgo < 1) return 1.0;
    if (hoursAgo < 3) return 0.9;
    if (hoursAgo < 6) return 0.8;
    if (hoursAgo < 12) return 0.6;
    if (hoursAgo < 24) return 0.4;
    if (hoursAgo < 48) return 0.25;
    return 0.1;
  } catch (e) {
    return 0.3;
  }
}

// Calculate engagement score based on likes and comments
function getEngagementScore(likeCount, commentCount) {
  // Logarithmic scale to prevent viral posts from dominating
  const likes = Math.log10(Math.max(likeCount, 1) + 1);
  const comments = Math.log10(Math.max(commentCount, 1) + 1);
  // Normalize to 0-1 range (assuming max ~100 likes/comments)
  return Math.min((likes * 0.6 + comments * 0.4) / 2, 1);
}

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
  const { news, addToWatchlist, removeFromWatchlist, isInWatchlist, userInterests, followedSources, setFollowedSources, userCity } = useStore();

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
  const [engagementProfile, setEngagementProfile] = useState(null); // Clicks/interactions
  const loaderRef = useRef(null);

  // Track session-shown posts to prevent repetition within session
  const sessionShownRef = useRef(new Set());

  // Cache scores to prevent live reordering - only recalculate when news changes
  const cachedScoresRef = useRef(new Map());

  // Track shown news to detect new articles
  const [shownNewsIds, setShownNewsIds] = useState(() => new Set());
  const [pendingNewIds, setPendingNewIds] = useState(() => new Set()); // Track which IDs are pending (show button)
  const [justRevealedIds, setJustRevealedIds] = useState(() => new Set()); // Track IDs that were just revealed (appear at top)
  const [isInitialized, setIsInitialized] = useState(false);

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
      // Track the actual IDs of pending new posts
      setPendingNewIds(prev => {
        const updated = new Set(prev);
        newItems.forEach(item => updated.add(item.id));
        return updated;
      });
      // Update lastNewsIdsRef to include new items for next comparison
      newItems.forEach(item => lastNewsIdsRef.current.add(item.id));
    }
  }, [news, isInitialized]);

  // Handle showing new articles - debounced to prevent double-firing
  const isHandlingNewArticles = useRef(false);
  const handleShowNewArticles = () => {
    // Prevent double-firing from touch + click events
    if (isHandlingNewArticles.current) return;
    isHandlingNewArticles.current = true;

    // Clear cached scores for new posts so they get fresh scores
    pendingNewIds.forEach(id => cachedScoresRef.current.delete(id));

    // Mark pending posts as "just revealed" so they appear at top
    setJustRevealedIds(new Set(pendingNewIds));

    // Add all current news to shown set
    const newShownIds = new Set(news.map(item => item.id));
    setShownNewsIds(newShownIds);

    // Clear pending
    setPendingNewIds(new Set());

    // Scroll to top - use the feed scroll container, not window
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      const feedContainer = document.getElementById('news-feed-scroll');
      if (feedContainer) {
        feedContainer.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // Reset the guard after a short delay
      setTimeout(() => {
        isHandlingNewArticles.current = false;
      }, 300);
    });
  };

  // Listen for external trigger to load new posts (from Header/MobileNav)
  useEffect(() => {
    const handleLoadNewPosts = () => {
      if (pendingNewIds.size > 0) {
        handleShowNewArticles();
      } else {
        // Even if no pending posts, scroll to top
        const feedContainer = document.getElementById('news-feed-scroll');
        if (feedContainer) {
          feedContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('loadNewPosts', handleLoadNewPosts);
    return () => window.removeEventListener('loadNewPosts', handleLoadNewPosts);
  }, [pendingNewIds]);

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

  // Track seen posts for personalization (once per display batch)
  const lastTrackedCountRef = useRef(0);
  useEffect(() => {
    if (filteredNews.length === 0) return;

    // Only track new posts that haven't been tracked yet
    const currentDisplayed = filteredNews.slice(0, displayCount);
    if (currentDisplayed.length > lastTrackedCountRef.current) {
      const newlyDisplayed = currentDisplayed.slice(lastTrackedCountRef.current);
      const newIds = newlyDisplayed.map(item => item.id);
      interactionsService.trackSeen(newIds);
      lastTrackedCountRef.current = currentDisplayed.length;
    }
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

  // Load engagement profile from local interactions
  useEffect(() => {
    const profile = interactionsService.getEngagementProfile();
    setEngagementProfile(profile);
  }, []);

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

  const handleNavigateToPost = useCallback((postId) => {
    // Track the click for personalization
    const post = news.find(n => n.id === postId);
    if (post) {
      interactionsService.trackClick(postId, {
        source: post.source,
        category: post.category,
        keywords: extractPostKeywords(`${post.title} ${post.summary || ''}`)
      });
      // Refresh engagement profile
      setEngagementProfile(interactionsService.getEngagementProfile());
    }
    navigate(`/post/${postId}`);
  }, [news, navigate]);

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

  // Calculate trending topics from current news
  const trendingTopics = useMemo(() => {
    return extractTrendingPhrases(filteredNews);
  }, [filteredNews]);

  // Smart ranking algorithm that combines multiple signals
  // IMPORTANT: Does NOT depend on real-time likes/comments to prevent live reordering
  const calculatePostScore = useCallback((item) => {
    // Return cached score if available to prevent reordering
    if (cachedScoresRef.current.has(item.id)) {
      return cachedScoresRef.current.get(item.id);
    }

    const text = `${item.title} ${item.summary || ''}`.toLowerCase();
    const postKeywords = extractPostKeywords(text);

    // 1. FRESHNESS SCORE (0-1) - newer posts get higher scores
    const freshnessScore = getFreshnessScore(item.pubDate);

    // 2. TRENDING SCORE (0-1) - how well post matches trending topics
    let trendingScore = 0;
    if (trendingTopics.length > 0) {
      const trendingMatches = trendingTopics.filter(t =>
        text.includes(t.phrase.toLowerCase())
      ).length;
      trendingScore = Math.min(trendingMatches / 3, 1);
    }

    // 3. LIKE PROFILE SCORE (0-1) - matches user's liked content patterns
    let likeProfileScore = 0;
    if (userLikeProfile && userLikeProfile.totalLikes > 0) {
      let score = 0;
      // Source match
      if (item.source && userLikeProfile.likedSources[item.source]) {
        score += Math.min(userLikeProfile.likedSources[item.source] / 5, 1) * 0.3;
      }
      // Category match
      if (item.category && userLikeProfile.likedCategories[item.category]) {
        score += Math.min(userLikeProfile.likedCategories[item.category] / 3, 1) * 0.3;
      }
      // Keyword match
      const matchedKeywords = postKeywords.filter(kw => userLikeProfile.likedKeywords[kw]);
      if (matchedKeywords.length > 0) {
        score += Math.min(matchedKeywords.length / 3, 1) * 0.4;
      }
      likeProfileScore = score;
    }

    // 4. ENGAGEMENT PROFILE SCORE (0-1) - matches user's clicked content patterns
    let engagementScore = 0;
    if (engagementProfile && engagementProfile.totalClicks > 0) {
      let score = 0;
      // Source match from clicks
      if (item.source && engagementProfile.clickedSources[item.source]) {
        score += Math.min(engagementProfile.clickedSources[item.source] / 5, 1) * 0.3;
      }
      // Category match from clicks
      if (item.category && engagementProfile.clickedCategories[item.category]) {
        score += Math.min(engagementProfile.clickedCategories[item.category] / 3, 1) * 0.3;
      }
      // Keyword match from clicks
      const matchedKeywords = postKeywords.filter(kw => engagementProfile.clickedKeywords[kw]);
      if (matchedKeywords.length > 0) {
        score += Math.min(matchedKeywords.length / 3, 1) * 0.4;
      }
      engagementScore = score;
    }

    // 5. SEEN PENALTY (0-1) - reduce score for posts seen multiple times
    const viewCount = interactionsService.getViewCount(item.id);
    const seenPenalty = viewCount > 0 ? Math.min(viewCount * 0.15, 0.5) : 0;

    // 6. ALREADY CLICKED PENALTY - strongly deprioritize clicked posts
    const clickedPenalty = engagementProfile?.clickedPostIds?.has(item.id) ? 0.6 : 0;

    // 7. SESSION SHOWN PENALTY - prevent showing same post repeatedly in session
    const sessionPenalty = sessionShownRef.current.has(item.id) ? 0.3 : 0;

    // COMBINE SCORES with weights
    // Freshness is most important, followed by personalization
    // NOTE: Post engagement (likes/comments) removed to prevent live reordering
    const rawScore =
      freshnessScore * 0.40 +      // 40% - freshness (prevents stale content)
      trendingScore * 0.25 +       // 25% - trending topics
      likeProfileScore * 0.20 +    // 20% - like history
      engagementScore * 0.15;      // 15% - click history

    // Apply penalties
    const finalScore = Math.max(rawScore - seenPenalty - clickedPenalty - sessionPenalty, 0.01);

    // Add small random factor (0-0.05) to prevent deterministic ordering
    const randomFactor = Math.random() * 0.05;

    const score = finalScore + randomFactor;

    // Cache the score to prevent reordering when other factors change
    cachedScoresRef.current.set(item.id, score);

    // Limit cache size
    if (cachedScoresRef.current.size > 1000) {
      const entries = Array.from(cachedScoresRef.current.entries());
      cachedScoresRef.current = new Map(entries.slice(-500));
    }

    return score;
  }, [trendingTopics, userLikeProfile, engagementProfile]);

  // Smart sorted news with diversity enforcement
  const sortedNews = useMemo(() => {
    if (filteredNews.length === 0) return [];

    // Separate posts into categories
    const justRevealedPosts = filteredNews.filter(item => justRevealedIds.has(item.id));
    const otherPosts = filteredNews.filter(item => !justRevealedIds.has(item.id));

    // Sort just revealed by date (newest first)
    justRevealedPosts.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));

    // Identify truly fresh posts (less than 2 hours old, not yet seen)
    const freshPosts = [];
    const regularPosts = [];
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

    otherPosts.forEach(post => {
      const pubTime = new Date(post.pubDate || 0).getTime();
      const isFresh = pubTime > twoHoursAgo;
      const notClicked = !engagementProfile?.clickedPostIds?.has(post.id);
      const notSeenMuch = interactionsService.getViewCount(post.id) < 3;

      if (isFresh && notClicked && notSeenMuch) {
        freshPosts.push(post);
      } else {
        regularPosts.push(post);
      }
    });

    // Score all regular posts
    const scoredPosts = regularPosts.map(post => ({
      ...post,
      _score: calculatePostScore(post)
    }));

    // Sort by score (highest first)
    scoredPosts.sort((a, b) => b._score - a._score);

    // Score fresh posts but keep them prioritized
    const scoredFresh = freshPosts.map(post => ({
      ...post,
      _score: calculatePostScore(post)
    }));
    scoredFresh.sort((a, b) => b._score - a._score);

    // INTERLEAVE: Mix fresh posts throughout the feed to ensure they're seen
    // Strategy: Reserve every 5th slot for fresh posts (if available)
    const result = [...justRevealedPosts];
    let freshIdx = 0;
    let regularIdx = 0;

    // First, add up to 3 top fresh posts at the start
    const topFresh = scoredFresh.slice(0, 3);
    result.push(...topFresh);
    freshIdx = 3;

    // Then interleave remaining
    while (regularIdx < scoredPosts.length || freshIdx < scoredFresh.length) {
      // Add 4 regular posts
      for (let i = 0; i < 4 && regularIdx < scoredPosts.length; i++) {
        result.push(scoredPosts[regularIdx++]);
      }
      // Add 1 fresh post if available
      if (freshIdx < scoredFresh.length) {
        result.push(scoredFresh[freshIdx++]);
      }
    }

    // Apply diversity enforcement - prevent same source clustering
    const diversified = enforceSourceDiversity(result, 2);

    // Prevent same category clustering (no more than 3 consecutive)
    const categoryDiversified = [];
    for (let i = 0; i < diversified.length; i++) {
      const post = diversified[i];
      let consecutiveSameCategory = 0;

      // Count consecutive posts with same category
      for (let j = categoryDiversified.length - 1; j >= 0 && j >= categoryDiversified.length - 3; j--) {
        if (categoryDiversified[j].category === post.category) {
          consecutiveSameCategory++;
        } else {
          break;
        }
      }

      if (consecutiveSameCategory >= 3) {
        // Find next post with different category to swap
        for (let k = i + 1; k < diversified.length; k++) {
          if (diversified[k].category !== post.category) {
            // Swap
            [diversified[i], diversified[k]] = [diversified[k], diversified[i]];
            categoryDiversified.push(diversified[i]);
            break;
          }
        }
        if (categoryDiversified.length <= i) {
          categoryDiversified.push(post); // No swap found, just add
        }
      } else {
        categoryDiversified.push(post);
      }
    }

    // Track shown posts in this session
    categoryDiversified.forEach(post => sessionShownRef.current.add(post.id));

    // Limit session tracking to prevent memory issues
    if (sessionShownRef.current.size > 500) {
      const arr = Array.from(sessionShownRef.current);
      sessionShownRef.current = new Set(arr.slice(-300));
    }

    return categoryDiversified;
  }, [filteredNews, justRevealedIds, calculatePostScore, engagementProfile]);

  const displayedNews = sortedNews.slice(0, displayCount);
  const hasMore = displayCount < sortedNews.length;

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

  // Handle follow/unfollow source
  const handleFollowSource = (source) => {
    const current = followedSources || [];
    if (current.includes(source)) {
      setFollowedSources(current.filter(s => s !== source));
    } else {
      setFollowedSources([...current, source]);
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
    // Clear cached scores when switching tabs to get fresh ranking
    cachedScoresRef.current.clear();
    // Show all articles when switching tabs
    if (pendingNewIds.size > 0) {
      setShownNewsIds(new Set(news.map(item => item.id)));
      setPendingNewIds(new Set());
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
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* New articles button */}
      {pendingNewIds.size > 0 && (
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            handleShowNewArticles();
          }}
          className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30 text-blue-400 font-medium text-sm border-b border-intel-700 transition-colors cursor-pointer select-none"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          Show {pendingNewIds.size} new {pendingNewIds.size === 1 ? 'post' : 'posts'}
        </button>
      )}

      {/* Feed */}
      <div id="news-feed-scroll" className="flex-1 overflow-y-auto">
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
                  isFollowing={followedSources?.includes(item.source)}
                  onFollow={handleFollowSource}
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
