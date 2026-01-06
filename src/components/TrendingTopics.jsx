import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

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
  if (word.length < 3) return false; // Minimum 3 characters
  if (word.length > 20) return false; // Too long
  if (/^\d+$/.test(word)) return false; // All numbers
  if (!/[aeiouáéíóúàèìòùâêîôûãõäëïöü]/i.test(word)) return false; // Must have vowels
  return true;
}

function TrendingTopics() {
  const navigate = useNavigate();
  const { news } = useStore();

  const handleTopicClick = (topic) => {
    const encodedTopic = encodeURIComponent(topic.text);
    navigate(`/topic/${encodedTopic}`);
  };

  const topics = useMemo(() => {
    if (!news || news.length === 0) return [];

    const phraseCounts = new Map();
    const wordCounts = new Map();
    const wordContexts = new Map(); // Track what phrases each word appears in
    const capitalizedCounts = new Map(); // Track if word is typically capitalized (proper noun)

    // Extract words and 2-word phrases from titles
    news.forEach(item => {
      const originalTitle = item.title;

      // Extract original words to check capitalization
      const originalWords = originalTitle
        .replace(/[^\w\s\u00C0-\u024F'-]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length >= 3 && !/^\d+$/.test(word));

      // Track capitalization patterns (proper nouns start with capital mid-sentence)
      originalWords.forEach((word, idx) => {
        const lower = word.toLowerCase();
        if (idx > 0 && /^[A-Z\u00C0-\u00DC]/.test(word) && !STOP_WORDS.has(lower)) {
          capitalizedCounts.set(lower, (capitalizedCounts.get(lower) || 0) + 1);
        }
      });

      const titleWords = originalWords.map(w => w.toLowerCase());

      // Count single words (must be 4+ chars for single word topics)
      titleWords.forEach(word => {
        if (word.length >= 4 && !STOP_WORDS.has(word) && isValidWord(word)) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      });

      // Count 2-word phrases and track word contexts
      for (let i = 0; i < titleWords.length - 1; i++) {
        const w1 = titleWords[i];
        const w2 = titleWords[i + 1];

        if (STOP_WORDS.has(w1) || STOP_WORDS.has(w2)) continue;
        if (!isValidWord(w1) || !isValidWord(w2)) continue;

        const phrase = `${w1} ${w2}`;
        phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);

        // Track contexts for each word
        if (!wordContexts.has(w1)) wordContexts.set(w1, new Map());
        if (!wordContexts.has(w2)) wordContexts.set(w2, new Map());
        wordContexts.get(w1).set(phrase, (wordContexts.get(w1).get(phrase) || 0) + 1);
        wordContexts.get(w2).set(phrase, (wordContexts.get(w2).get(phrase) || 0) + 1);
      }
    });

    // Determine if a word should stand alone or needs phrase context
    const shouldUseWord = (word, wordCount) => {
      const contexts = wordContexts.get(word);
      const capCount = capitalizedCounts.get(word) || 0;

      // Strong proper noun indicator: frequently capitalized mid-sentence
      const isLikelyProperNoun = capCount >= Math.max(2, wordCount * 0.3);

      if (!contexts || contexts.size === 0) {
        // No phrase contexts, use word if frequent enough
        return wordCount >= 3;
      }

      // Check how many different phrase contexts this word appears in
      const uniqueContexts = contexts.size;
      const totalContextAppearances = Array.from(contexts.values()).reduce((a, b) => a + b, 0);

      // If word appears in 3+ different phrases, it's likely a standalone entity (proper noun)
      // Examples: "Trump" in "Trump tariffs", "Trump administration", "Trump policy"
      if (uniqueContexts >= 3 && isLikelyProperNoun) {
        return true;
      }

      // If word appears mostly in ONE phrase, prefer the phrase
      const maxPhraseCount = Math.max(...contexts.values());
      if (maxPhraseCount >= totalContextAppearances * 0.6 && maxPhraseCount >= 2) {
        // This word is strongly associated with one phrase
        return false;
      }

      // Proper nouns should stand alone even with fewer contexts
      if (isLikelyProperNoun && wordCount >= 3) {
        return true;
      }

      // Generic words (not proper nouns) need phrase context
      if (!isLikelyProperNoun && wordCount < 5) {
        return false;
      }

      return wordCount >= 3;
    };

    // Build candidates
    const candidates = [];
    const usedWords = new Set();

    // First pass: identify strong single-word topics (proper nouns, entities)
    const wordEntries = Array.from(wordCounts.entries())
      .filter(([word, count]) => count >= 3 && shouldUseWord(word, count))
      .sort((a, b) => b[1] - a[1]);

    wordEntries.forEach(([word, count]) => {
      candidates.push({ text: word, count, type: 'word' });
      usedWords.add(word);
    });

    // Second pass: add phrases where component words aren't already strong topics
    const phraseEntries = Array.from(phraseCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1]);

    phraseEntries.forEach(([phrase, count]) => {
      const [w1, w2] = phrase.split(' ');

      // Skip if both words are already covered by strong single-word topics
      const w1Strong = usedWords.has(w1) && wordCounts.get(w1) >= count * 1.5;
      const w2Strong = usedWords.has(w2) && wordCounts.get(w2) >= count * 1.5;

      if (w1Strong && w2Strong) {
        return; // Skip redundant phrase
      }

      // If phrase is stronger than individual words, prefer phrase
      const w1Count = wordCounts.get(w1) || 0;
      const w2Count = wordCounts.get(w2) || 0;

      // Check if phrase represents a meaningful compound concept
      const phraseIsStronger = count >= Math.max(w1Count, w2Count) * 0.5;
      const neitherWordStrong = !usedWords.has(w1) && !usedWords.has(w2);

      if (phraseIsStronger || neitherWordStrong) {
        candidates.push({ text: phrase, count, type: 'phrase' });
        // Mark words as covered by this phrase
        if (!usedWords.has(w1)) usedWords.add(w1);
        if (!usedWords.has(w2)) usedWords.add(w2);
      }
    });

    // Sort by count and remove redundancy
    const sorted = candidates.sort((a, b) => b.count - a.count);

    // Final deduplication: don't show both "Trump" and "Trump tariffs"
    const final = [];
    const coveredTexts = new Set();

    for (const item of sorted) {
      if (final.length >= 10) break;

      const words = item.text.split(' ');

      // Check if this topic is redundant with existing topics
      let isRedundant = false;
      for (const existing of final) {
        const existingWords = existing.text.split(' ');
        // Skip if single word is contained in an existing phrase with similar count
        if (item.type === 'word' && existingWords.includes(item.text) && existing.count >= item.count * 0.6) {
          isRedundant = true;
          break;
        }
        // Skip if phrase contains an existing single word topic with much higher count
        if (item.type === 'phrase' && existing.type === 'word' && words.includes(existing.text) && existing.count >= item.count * 2) {
          isRedundant = true;
          break;
        }
      }

      if (!isRedundant) {
        final.push(item);
      }
    }

    return final.map(item => ({
      text: item.text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      count: item.count
    }));
  }, [news]);

  if (topics.length === 0) {
    return (
      <div className="py-4">
        <h2 className="text-lg font-bold text-white mb-4">Trends</h2>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">Trends</h2>
      <div className="space-y-3">
        {topics.map((topic) => (
          <button
            key={topic.text}
            onClick={() => handleTopicClick(topic)}
            className="w-full text-left group hover:bg-intel-800 -mx-2 px-2 py-1 rounded transition-colors"
          >
            <p className="text-white text-[15px] leading-tight group-hover:text-blue-400">{topic.text}</p>
            <p className="text-gray-500 text-xs mt-0.5">{topic.count} mentions</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default TrendingTopics;
