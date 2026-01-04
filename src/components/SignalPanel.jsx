import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Radio, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  AlertCircle, Info, Bookmark, BookmarkCheck
} from 'lucide-react';

function SignalPanel() {
  const { signals, selectedSignal, setSelectedSignal, addToWatchlist, removeFromWatchlist, isInWatchlist } = useStore();
  const [expandedSignal, setExpandedSignal] = useState(null);

  const getStrengthColor = (strength) => {
    if (strength >= 70) return 'from-red-500 to-red-600';
    if (strength >= 50) return 'from-amber-500 to-amber-600';
    if (strength >= 30) return 'from-blue-500 to-blue-600';
    return 'from-gray-500 to-gray-600';
  };

  const getStrengthLabel = (strength) => {
    if (strength >= 70) return 'Strong';
    if (strength >= 50) return 'Moderate';
    if (strength >= 30) return 'Emerging';
    return 'Weak';
  };

  const getDirectionIcon = (direction) => {
    switch (direction) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-red-400" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-green-400" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const toggleWatchlist = (signal) => {
    if (isInWatchlist(signal.id)) {
      removeFromWatchlist(signal.id);
    } else {
      addToWatchlist({
        id: signal.id,
        type: 'signal',
        name: signal.name,
        data: signal
      });
    }
  };

  return (
    <div className="bg-intel-800 rounded-xl border border-intel-700 overflow-hidden" id="signals">
      {/* Header */}
      <div className="px-4 py-3 border-b border-intel-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="w-5 h-5 text-amber-400" />
          <h2 className="font-semibold text-white">Active Signals</h2>
        </div>
        <span className="text-xs text-gray-500">{signals.length} active</span>
      </div>

      {/* Signal list */}
      <div className="divide-y divide-intel-700 max-h-[600px] overflow-y-auto">
        {signals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Radio className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No active signals</p>
            <p className="text-xs mt-1">Signals will appear as patterns emerge from news</p>
          </div>
        ) : (
          signals.map(signal => (
            <div
              key={signal.id}
              className={`p-4 transition-colors cursor-pointer ${
                selectedSignal === signal.id ? 'bg-intel-700/50' : 'hover:bg-intel-700/30'
              }`}
            >
              {/* Signal header */}
              <div
                className="flex items-start justify-between"
                onClick={() => setExpandedSignal(expandedSignal === signal.id ? null : signal.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getDirectionIcon(signal.direction)}
                    <h3 className="text-sm font-medium text-white">{signal.name}</h3>
                  </div>
                  <p className="text-xs text-gray-400">{signal.description}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {/* Strength indicator */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${
                      signal.strength >= 70 ? 'text-red-400' :
                      signal.strength >= 50 ? 'text-amber-400' : 'text-blue-400'
                    }`}>
                      {signal.strength}%
                    </span>
                    <div className="w-16 h-2 bg-intel-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${getStrengthColor(signal.strength)} transition-all duration-500`}
                        style={{ width: `${signal.strength}%` }}
                      />
                    </div>
                  </div>

                  {/* Expand/collapse */}
                  {expandedSignal === signal.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {expandedSignal === signal.id && (
                <div className="mt-4 pt-4 border-t border-intel-600 space-y-3 animate-slide-in">
                  {/* What changed */}
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <AlertCircle className="w-3 h-3" />
                      What Changed
                    </div>
                    <p className="text-sm text-gray-300">{signal.whatChanged}</p>
                  </div>

                  {/* Why it matters */}
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Info className="w-3 h-3" />
                      Historical Response
                    </div>
                    <p className="text-sm text-gray-300">{signal.whyItMatters}</p>
                  </div>

                  {/* Affected markets */}
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Affected Markets</div>
                    <div className="flex flex-wrap gap-1">
                      {signal.affectedMarkets.map(market => (
                        <span
                          key={market}
                          className="px-2 py-0.5 text-xs bg-intel-600 rounded text-gray-300"
                        >
                          {market}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Affected regions */}
                  {signal.affectedRegions && signal.affectedRegions.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2">Affected Regions</div>
                      <div className="flex flex-wrap gap-1">
                        {signal.affectedRegions.map(region => (
                          <span
                            key={region}
                            className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded capitalize"
                          >
                            {region}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats and actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-gray-500">
                      {signal.newsCount} related items • {signal.recentNewsCount} in last hour
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(signal);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-intel-600 hover:bg-intel-500 rounded transition-colors"
                    >
                      {isInWatchlist(signal.id) ? (
                        <>
                          <BookmarkCheck className="w-3 h-3 text-blue-400" />
                          <span>Watching</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3 h-3" />
                          <span>Watch</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-intel-700 bg-intel-700/30">
        <div className="text-xs text-gray-500 mb-2">Signal Strength</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-xs text-gray-400">Strong (70%+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500"></div>
            <span className="text-xs text-gray-400">Moderate (50-69%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-xs text-gray-400">Emerging (&lt;50%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignalPanel;
