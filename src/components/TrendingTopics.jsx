import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { TrendingUp, Hash, Flame } from 'lucide-react';

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
  const { news } = useStore();

  const trendingData = useMemo(() => {
    if (!news || news.length === 0) return { topics: [], phrases: [] };

    const wordCounts = {};
    const wordNews = {};
    const phrasesCounts = {};
    const phrasesNews = {};

    news.forEach(item => {
      const text = `${item.title} ${item.summary || ''}`;

      // Extract individual words
      const words = text
        .toLowerCase()
        .replace(/[^\w\s'-]/g, ' ')
        .split(/\s+/)
        .filter(word =>
          word.length > 2 &&
          !STOP_WORDS.has(word) &&
          !/^\d+$/.test(word)
        );

      // Count words
      const seenWords = new Set();
      words.forEach(word => {
        if (!seenWords.has(word)) {
          seenWords.add(word);
          wordCounts[word] = (wordCounts[word] || 0) + 1;

          if (!wordNews[word]) wordNews[word] = [];
          if (wordNews[word].length < 3) {
            wordNews[word].push({
              id: item.id,
              title: item.title,
              source: item.source
            });
          }
        }
      });

      // Extract 2-word phrases (bigrams) from title only for better quality
      const titleWords = item.title
        .toLowerCase()
        .replace(/[^\w\s'-]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !/^\d+$/.test(word));

      for (let i = 0; i < titleWords.length - 1; i++) {
        const w1 = titleWords[i];
        const w2 = titleWords[i + 1];

        // Skip if either word is a stop word
        if (STOP_WORDS.has(w1) || STOP_WORDS.has(w2)) continue;

        const phrase = `${w1} ${w2}`;
        phrasesCounts[phrase] = (phrasesCounts[phrase] || 0) + 1;

        if (!phrasesNews[phrase]) phrasesNews[phrase] = [];
        if (phrasesNews[phrase].length < 3) {
          phrasesNews[phrase].push({
            id: item.id,
            title: item.title,
            source: item.source
          });
        }
      }
    });

    // Get max count for intensity calculation
    const maxCount = Math.max(...Object.values(wordCounts), 1);

    // Sort and get top words
    const topWords = Object.entries(wordCounts)
      .filter(([word, count]) => count >= 2) // At least 2 mentions
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([word, count]) => ({
        text: word.charAt(0).toUpperCase() + word.slice(1),
        count,
        news: wordNews[word] || [],
        intensity: count >= maxCount * 0.6 ? 'hot' : count >= maxCount * 0.3 ? 'warm' : 'normal'
      }));

    // Sort and get top phrases (at least 2 occurrences)
    const topPhrases = Object.entries(phrasesCounts)
      .filter(([phrase, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase, count]) => ({
        text: phrase.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        count,
        news: phrasesNews[phrase] || [],
        intensity: count >= 5 ? 'hot' : count >= 3 ? 'warm' : 'normal'
      }));

    return { topics: topWords, phrases: topPhrases };
  }, [news]);

  const getIntensityStyle = (intensity) => {
    switch (intensity) {
      case 'hot':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warm':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-intel-600 text-gray-300 border-intel-500';
    }
  };

  return (
    <div className="bg-intel-800 rounded-xl border border-intel-700 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-intel-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-amber-400" />
          <h2 className="font-semibold text-white">Trending Topics</h2>
        </div>
        <span className="text-xs text-gray-500">
          From {news.length} articles
        </span>
      </div>

      {/* Content */}
      <div className="p-5 space-y-6 flex-1 overflow-y-auto">
        {trendingData.topics.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Loading trending topics...</p>
          </div>
        ) : (
          <>
            {/* Top trending phrases */}
            {trendingData.phrases.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Trending Phrases</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {trendingData.phrases.map(item => (
                    <div
                      key={item.text}
                      className={`group relative px-4 py-2 rounded-lg border text-sm font-medium transition-all hover:scale-105 cursor-default ${getIntensityStyle(item.intensity)}`}
                    >
                      <span>{item.text}</span>
                      <span className="ml-2 opacity-60 text-xs">{item.count}</span>

                      {/* Tooltip */}
                      {item.news.length > 0 && (
                        <div className="absolute bottom-full left-0 mb-2 w-72 p-3 bg-intel-900 border border-intel-600 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <div className="text-xs text-gray-400 mb-2 font-medium">Related headlines:</div>
                          {item.news.map(n => (
                            <div key={n.id} className="text-xs text-gray-300 line-clamp-2 mb-1.5 last:mb-0">
                              {n.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top words */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Most Mentioned</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {trendingData.topics.slice(0, 15).map(item => (
                  <div
                    key={item.text}
                    className={`group relative px-3 py-1.5 rounded-md border text-sm transition-all hover:scale-105 cursor-default ${getIntensityStyle(item.intensity)}`}
                  >
                    <span>{item.text}</span>
                    <span className="ml-2 opacity-50 text-xs">{item.count}</span>

                    {/* Tooltip */}
                    {item.news.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-intel-900 border border-intel-600 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <div className="text-xs text-gray-400 mb-2 font-medium">Related headlines:</div>
                        {item.news.map(n => (
                          <div key={n.id} className="text-xs text-gray-300 line-clamp-1 mb-1.5 last:mb-0">
                            {n.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Word cloud for remaining */}
            {trendingData.topics.length > 15 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Also Trending</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingData.topics.slice(15).map(item => {
                    const maxCount = trendingData.topics[0]?.count || 1;
                    const size = 0.75 + (item.count / maxCount) * 0.35;

                    return (
                      <span
                        key={item.text}
                        className="group relative px-2.5 py-1 bg-intel-700/50 text-gray-400 rounded-md hover:bg-intel-600 hover:text-gray-300 transition-all cursor-default"
                        style={{ fontSize: `${size}rem` }}
                      >
                        {item.text}

                        {/* Tooltip */}
                        {item.news.length > 0 && (
                          <div className="absolute bottom-full left-0 mb-2 w-56 p-2.5 bg-intel-900 border border-intel-600 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-xs">
                            <div className="text-gray-400 mb-1.5 font-medium">{item.count} mentions</div>
                            {item.news.slice(0, 2).map(n => (
                              <div key={n.id} className="text-gray-300 line-clamp-1 mb-1 last:mb-0">
                                {n.title}
                              </div>
                            ))}
                          </div>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-intel-700 bg-intel-700/30 mt-auto">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              Hot
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
              Warm
            </span>
          </div>
          <span>Extracted from news</span>
        </div>
      </div>
    </div>
  );
}

export default TrendingTopics;
