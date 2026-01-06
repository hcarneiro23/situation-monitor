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
  if (word.length < 4) return false; // Minimum 4 characters
  if (word.length > 20) return false; // Too long
  if (/^\d+$/.test(word)) return false; // All numbers
  if (!/[aeiouáéíóúàèìòùâêîôûãõäëïöü]/i.test(word)) return false; // Must have vowels
  if (/^[^aeiouáéíóúàèìòùâêîôûãõäëïöü]{4,}$/i.test(word)) return false; // Too many consonants
  return true;
}

// Check if phrase looks meaningful (not fragments)
function isMeaningfulPhrase(phrase) {
  const words = phrase.split(' ');

  // Both words must be valid
  if (!words.every(isValidWord)) return false;

  // At least one word should be 5+ characters (more likely to be meaningful)
  if (!words.some(w => w.length >= 5)) return false;

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

    // Extract 2-word phrases from titles
    news.forEach(item => {
      // Keep accented characters, remove punctuation except hyphens/apostrophes
      const titleWords = item.title
        .toLowerCase()
        .replace(/[^\w\s\u00C0-\u024F'-]/g, ' ') // Keep Unicode letters
        .split(/\s+/)
        .filter(word => word.length >= 4 && !/^\d+$/.test(word));

      for (let i = 0; i < titleWords.length - 1; i++) {
        const w1 = titleWords[i];
        const w2 = titleWords[i + 1];

        if (STOP_WORDS.has(w1) || STOP_WORDS.has(w2)) continue;
        if (!isValidWord(w1) || !isValidWord(w2)) continue;

        const phrase = `${w1} ${w2}`;

        if (!isMeaningfulPhrase(phrase)) continue;

        // Count by checking if phrase words appear in title/summary
        const text = `${item.title} ${item.summary || ''}`.toLowerCase();
        const words = phrase.split(' ');

        // Use word boundary matching to avoid partial matches
        const allWordsPresent = words.every(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'i');
          return regex.test(text);
        });

        if (allWordsPresent) {
          phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
        }
      }
    });

    // Convert to array and sort by count
    const sortedPhrases = Array.from(phraseCounts.entries())
      .filter(([, count]) => count >= 3) // Require at least 3 mentions
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return sortedPhrases.map(([phrase, count]) => ({
      text: phrase.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      count
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
