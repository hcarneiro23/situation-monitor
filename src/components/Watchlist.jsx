import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Eye, Trash2, TrendingUp, Hash, Newspaper } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function Watchlist() {
  const { watchlist, removeFromWatchlist, news } = useStore();

  // Filter only topic items
  const topicItems = watchlist.filter(item => item.type === 'topic');

  // Calculate mention data for each topic based on news timestamps
  const topicMentionData = useMemo(() => {
    const data = {};

    topicItems.forEach(topic => {
      const topicName = topic.name.toLowerCase();

      // Group news by hour and count mentions
      const hourlyMentions = {};
      const now = new Date();

      // Initialize last 24 hours
      for (let i = 23; i >= 0; i--) {
        const hourDate = new Date(now - i * 60 * 60 * 1000);
        const hourKey = hourDate.toISOString().slice(0, 13);
        hourlyMentions[hourKey] = 0;
      }

      // Count mentions per hour
      news.forEach(item => {
        const text = `${item.title} ${item.summary || ''}`.toLowerCase();
        if (text.includes(topicName)) {
          const pubDate = new Date(item.pubDate);
          const hourKey = pubDate.toISOString().slice(0, 13);
          if (hourlyMentions.hasOwnProperty(hourKey)) {
            hourlyMentions[hourKey]++;
          }
        }
      });

      // Convert to array for chart
      const chartData = Object.entries(hourlyMentions)
        .map(([hour, count]) => {
          // hour is like "2024-01-05T10", need to make it valid ISO
          const date = new Date(hour + ':00:00.000Z');
          return {
            hour: date.toLocaleTimeString('en-US', { hour: 'numeric' }),
            mentions: count
          };
        });

      // Calculate current mentions
      const currentMentions = news.filter(item => {
        const text = `${item.title} ${item.summary || ''}`.toLowerCase();
        return text.includes(topicName);
      }).length;

      data[topic.id] = {
        chartData,
        currentMentions,
        relatedNews: news.filter(item => {
          const text = `${item.title} ${item.summary || ''}`.toLowerCase();
          return text.includes(topicName);
        }).slice(0, 3)
      };
    });

    return data;
  }, [topicItems, news]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-intel-900 border border-intel-600 rounded px-2 py-1 text-xs">
          <p className="text-gray-400">{label}</p>
          <p className="text-white font-medium">{payload[0].value} mentions</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-intel-800 rounded-xl border border-intel-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-intel-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-white">Topic Watchlist</h2>
        </div>
        <span className="text-xs text-gray-500">
          {topicItems.length} topics tracked
        </span>
      </div>

      {/* Watchlist items */}
      <div className="divide-y divide-intel-700">
        {topicItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No topics in watchlist</p>
            <p className="text-xs mt-1">Click the + icon on trending topics to add them</p>
          </div>
        ) : (
          topicItems.map(item => {
            const mentionData = topicMentionData[item.id] || { chartData: [], currentMentions: 0, relatedNews: [] };
            const maxMentions = Math.max(...mentionData.chartData.map(d => d.mentions), 1);

            return (
              <div key={item.id} className="p-4">
                {/* Topic header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <Hash className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">{item.name}</h3>
                      <p className="text-xs text-gray-500">Topic</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">{mentionData.currentMentions}</div>
                      <div className="text-xs text-gray-500">mentions</div>
                    </div>
                    <button
                      onClick={() => removeFromWatchlist(item.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Mention chart */}
                <div className="h-24 mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mentionData.chartData}>
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        axisLine={{ stroke: '#374151' }}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                        width={20}
                        domain={[0, Math.max(maxMentions, 1)]}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="mentions"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#f59e0b' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Related news preview */}
                {mentionData.relatedNews.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Newspaper className="w-3 h-3" />
                      Recent mentions
                    </div>
                    {mentionData.relatedNews.map(n => (
                      <div key={n.id} className="text-xs text-gray-400 line-clamp-1 pl-4 border-l-2 border-intel-600">
                        <span className="text-blue-400 mr-1">{n.source}</span>
                        {n.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-intel-700 bg-intel-700/30">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3" />
            <span>24-hour mention activity</span>
          </div>
          <span>Add topics from Trending section</span>
        </div>
      </div>
    </div>
  );
}

export default Watchlist;
