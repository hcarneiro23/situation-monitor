import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, TrendingUp } from 'lucide-react';

// Common stop words to filter out (English + Portuguese + Spanish)
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
function isValidWord(word) {
  if (word.length < 3) return false;
  if (word.length > 20) return false;
  if (/^\d+$/.test(word)) return false;
  if (!/[aeiouáéíóúàèìòùâêîôûãõäëïöü]/i.test(word)) return false;
  return true;
}

function TrendingPage() {
  const navigate = useNavigate();
  const { news } = useStore();

  const topics = useMemo(() => {
    if (!news || news.length === 0) return [];

    // Filter to only include news from the last 24 hours
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentNews = news.filter(item => {
      const itemDate = new Date(item.pubDate).getTime();
      return itemDate >= twentyFourHoursAgo;
    });

    if (recentNews.length === 0) return [];

    const phraseCounts = new Map();
    const wordCounts = new Map();
    const wordContexts = new Map();
    const capitalizedCounts = new Map();

    recentNews.forEach(item => {
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
        if (word.length >= 4 && !STOP_WORDS.has(word) && isValidWord(word)) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      });

      // Count 2-word phrases and track contexts
      for (let i = 0; i < titleWords.length - 1; i++) {
        const w1 = titleWords[i];
        const w2 = titleWords[i + 1];

        if (STOP_WORDS.has(w1) || STOP_WORDS.has(w2)) continue;
        if (!isValidWord(w1) || !isValidWord(w2)) continue;

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
      candidates.push({ text: phrase, count, type: 'phrase' });
      usedWords.add(w1);
      usedWords.add(w2);
    });

    // Second pass: add standalone proper nouns NOT already covered by phrases
    const wordEntries = Array.from(wordCounts.entries())
      .filter(([word, count]) => count >= 4 && !usedWords.has(word) && shouldUseWord(word, count))
      .sort((a, b) => b[1] - a[1]);

    wordEntries.forEach(([word, count]) => {
      candidates.push({ text: word, count, type: 'word' });
    });

    // Sort and deduplicate
    const sorted = candidates.sort((a, b) => b.count - a.count);
    const final = [];

    for (const item of sorted) {
      if (final.length >= 20) break;

      const words = item.text.split(' ');
      let isRedundant = false;

      for (const existing of final) {
        const existingWords = existing.text.split(' ');
        if (item.type === 'word' && existingWords.includes(item.text) && existing.count >= item.count * 0.6) {
          isRedundant = true;
          break;
        }
        if (item.type === 'phrase' && existing.type === 'word' && words.includes(existing.text) && existing.count >= item.count * 2) {
          isRedundant = true;
          break;
        }
      }

      if (!isRedundant) {
        final.push(item);
      }
    }

    return final.map((item, index) => ({
      text: item.text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      count: item.count,
      rank: index + 1
    }));
  }, [news]);

  const handleTopicClick = (topic) => {
    const encodedTopic = encodeURIComponent(topic.text);
    navigate(`/topic/${encodedTopic}`);
  };

  return (
    <div className="min-h-screen bg-intel-900 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-intel-900/80 backdrop-blur-md border-b border-intel-700">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-intel-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">Trending</h1>
        </div>
      </div>

      {/* Topics list */}
      <div className="divide-y divide-intel-700">
        {topics.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No trending topics yet</p>
            <p className="text-sm mt-1">Check back later</p>
          </div>
        ) : (
          topics.map((topic) => (
            <button
              key={topic.text}
              onClick={() => handleTopicClick(topic)}
              className="w-full text-left px-4 py-3 hover:bg-intel-800/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-gray-500 text-sm font-medium w-6">{topic.rank}</span>
                <div className="flex-1">
                  <p className="text-white font-medium">{topic.text}</p>
                  <p className="text-gray-500 text-sm mt-0.5">{topic.count} mentions</p>
                </div>
                <TrendingUp className="w-4 h-4 text-blue-400 mt-1" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default TrendingPage;
