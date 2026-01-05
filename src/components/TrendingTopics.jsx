import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Check } from 'lucide-react';

// Common stop words to filter out
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

function TrendingTopics() {
  const { news, addToWatchlist, removeFromWatchlist, isInWatchlist } = useStore();

  const toggleTopicWatchlist = (topic) => {
    const topicId = `topic-${topic.text.toLowerCase().replace(/\s+/g, '-')}`;
    if (isInWatchlist(topicId)) {
      removeFromWatchlist(topicId);
    } else {
      addToWatchlist({
        id: topicId,
        type: 'topic',
        name: topic.text,
        count: topic.count,
        createdAt: new Date().toISOString()
      });
    }
  };

  const isTopicWatched = (topic) => {
    const topicId = `topic-${topic.text.toLowerCase().replace(/\s+/g, '-')}`;
    return isInWatchlist(topicId);
  };

  const topics = useMemo(() => {
    if (!news || news.length === 0) return [];

    const phrasesCounts = {};

    news.forEach(item => {
      // Extract 2-word phrases from title
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
        phrasesCounts[phrase] = (phrasesCounts[phrase] || 0) + 1;
      }
    });

    // Get top phrases
    return Object.entries(phrasesCounts)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase, count]) => ({
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
        {topics.map((topic, index) => {
          const watched = isTopicWatched(topic);
          return (
            <div key={topic.text} className="group flex items-start justify-between">
              <div>
                <p className="text-white text-[15px] leading-tight">{topic.text}</p>
                <p className="text-gray-500 text-xs mt-0.5">{topic.count} mentions</p>
              </div>
              <button
                onClick={() => toggleTopicWatchlist(topic)}
                className={`p-1 rounded transition-colors ${
                  watched
                    ? 'text-blue-400'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
                title={watched ? 'Tracking' : 'Track'}
              >
                {watched ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TrendingTopics;
