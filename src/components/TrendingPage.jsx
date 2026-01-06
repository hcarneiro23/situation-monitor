import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, TrendingUp } from 'lucide-react';

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

function TrendingPage() {
  const navigate = useNavigate();
  const { news } = useStore();

  const topics = useMemo(() => {
    if (!news || news.length === 0) return [];

    const phrasesSet = new Set();

    news.forEach(item => {
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

    const phrasesWithCounts = Array.from(phrasesSet).map(phrase => {
      const words = phrase.split(' ');
      const count = news.filter(item => {
        const text = `${item.title} ${item.summary || ''}`.toLowerCase();
        return words.every(word => text.includes(word));
      }).length;
      return { phrase, count };
    });

    return phrasesWithCounts
      .filter(({ count }) => count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map(({ phrase, count }, index) => ({
        text: phrase.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        count,
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
