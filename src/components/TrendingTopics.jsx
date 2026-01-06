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
      // Examples: "Trump" in "Trump tariffs", "Trump administration", "Trump policy", "Trump says"
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
