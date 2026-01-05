import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { TrendingUp, Hash, Globe, Users, Building2, Flame } from 'lucide-react';

// Keywords to extract and categorize
const TOPIC_CATEGORIES = {
  regions: ['china', 'russia', 'ukraine', 'israel', 'gaza', 'iran', 'europe', 'us', 'usa', 'america', 'germany', 'france', 'uk', 'japan', 'india', 'brazil', 'mexico', 'venezuela', 'saudi', 'taiwan', 'korea', 'middle east', 'asia', 'africa'],
  entities: ['nato', 'eu', 'un', 'opec', 'fed', 'ecb', 'imf', 'world bank', 'pentagon', 'kremlin', 'white house', 'congress', 'senate'],
  leaders: ['biden', 'trump', 'putin', 'xi', 'zelensky', 'netanyahu', 'macron', 'scholz', 'modi', 'lula', 'milei', 'maduro', 'powell'],
  topics: ['tariff', 'sanctions', 'war', 'conflict', 'peace', 'ceasefire', 'election', 'inflation', 'interest rate', 'oil', 'gas', 'energy', 'trade', 'military', 'nuclear', 'climate', 'economy', 'recession', 'growth', 'crisis', 'protest', 'coup', 'attack', 'missile', 'drone', 'ai', 'technology', 'semiconductor', 'chip']
};

function TrendingTopics() {
  const { news } = useStore();

  const trendingData = useMemo(() => {
    if (!news || news.length === 0) return { topics: [], categories: {} };

    const topicCounts = {};
    const topicCategories = {};
    const topicNews = {};

    // Combine all news text
    news.forEach(item => {
      const text = `${item.title} ${item.summary || ''}`.toLowerCase();

      // Check each category
      Object.entries(TOPIC_CATEGORIES).forEach(([category, keywords]) => {
        keywords.forEach(keyword => {
          if (text.includes(keyword)) {
            const normalizedKey = keyword.charAt(0).toUpperCase() + keyword.slice(1);
            topicCounts[normalizedKey] = (topicCounts[normalizedKey] || 0) + 1;
            topicCategories[normalizedKey] = category;

            if (!topicNews[normalizedKey]) {
              topicNews[normalizedKey] = [];
            }
            if (topicNews[normalizedKey].length < 3) {
              topicNews[normalizedKey].push({
                id: item.id,
                title: item.title,
                source: item.source
              });
            }
          }
        });
      });
    });

    // Sort by count and get top topics
    const sortedTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([topic, count]) => ({
        topic,
        count,
        category: topicCategories[topic],
        news: topicNews[topic] || [],
        intensity: count > 10 ? 'hot' : count > 5 ? 'warm' : 'normal'
      }));

    // Group by category for display
    const byCategory = {
      regions: sortedTopics.filter(t => t.category === 'regions').slice(0, 6),
      entities: sortedTopics.filter(t => t.category === 'entities').slice(0, 4),
      leaders: sortedTopics.filter(t => t.category === 'leaders').slice(0, 5),
      topics: sortedTopics.filter(t => t.category === 'topics').slice(0, 8)
    };

    return { topics: sortedTopics, categories: byCategory };
  }, [news]);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'regions': return Globe;
      case 'entities': return Building2;
      case 'leaders': return Users;
      default: return Hash;
    }
  };

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

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'regions': return 'Regions';
      case 'entities': return 'Organizations';
      case 'leaders': return 'Key Figures';
      case 'topics': return 'Topics';
      default: return category;
    }
  };

  return (
    <div className="bg-intel-800 rounded-xl border border-intel-700 overflow-hidden h-full">
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
      <div className="p-4 space-y-4 max-h-[550px] overflow-y-auto">
        {trendingData.topics.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Loading trending topics...</p>
          </div>
        ) : (
          <>
            {/* Top trending - horizontal scroll */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-red-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Most Mentioned</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingData.topics.slice(0, 8).map(item => (
                  <div
                    key={item.topic}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-default ${getIntensityStyle(item.intensity)}`}
                    title={`${item.count} mentions`}
                  >
                    <span>{item.topic}</span>
                    <span className="ml-2 opacity-60">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By category */}
            {Object.entries(trendingData.categories).map(([category, items]) => {
              if (items.length === 0) return null;
              const Icon = getCategoryIcon(category);

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400 uppercase tracking-wide">
                      {getCategoryLabel(category)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map(item => (
                      <div
                        key={item.topic}
                        className={`group relative px-2.5 py-1 rounded-md border text-xs transition-colors cursor-default ${getIntensityStyle(item.intensity)}`}
                      >
                        <span>{item.topic}</span>
                        <span className="ml-1.5 opacity-50">{item.count}</span>

                        {/* Tooltip with related news */}
                        {item.news.length > 0 && (
                          <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-intel-900 border border-intel-600 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <div className="text-xs text-gray-400 mb-1">Related headlines:</div>
                            {item.news.map(n => (
                              <div key={n.id} className="text-xs text-gray-300 line-clamp-1 mb-1">
                                {n.title}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Word cloud style display for remaining */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">All Trending</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {trendingData.topics.slice(8).map(item => (
                  <span
                    key={item.topic}
                    className="px-2 py-0.5 text-xs bg-intel-700/50 text-gray-400 rounded hover:bg-intel-600 hover:text-gray-300 transition-colors cursor-default"
                    style={{
                      fontSize: `${Math.min(0.75 + (item.count / 20), 1)}rem`
                    }}
                  >
                    {item.topic}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-intel-700 bg-intel-700/30">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-red-500"></div>
              Hot (10+)
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-amber-500"></div>
              Warm (5+)
            </span>
          </div>
          <span>Updates with news feed</span>
        </div>
      </div>
    </div>
  );
}

export default TrendingTopics;
