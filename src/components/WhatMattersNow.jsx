import React from 'react';
import { useStore } from '../store/useStore';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Info, History, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function WhatMattersNow() {
  const { summary, signals, revisionHistory } = useStore();
  const [showHistory, setShowHistory] = React.useState(false);

  if (!summary) {
    return (
      <div className="bg-intel-800 rounded-xl p-6 border border-intel-700 animate-pulse">
        <div className="h-6 bg-intel-700 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-intel-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-intel-700 rounded w-1/2"></div>
      </div>
    );
  }

  const getConfidenceColor = (level) => {
    switch (level) {
      case 'high': return 'text-green-400';
      case 'moderate-high': return 'text-blue-400';
      case 'moderate': return 'text-amber-400';
      case 'low': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gradient-to-br from-intel-800 to-intel-900 rounded-xl border border-intel-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-intel-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">What Matters Now</h2>
            <p className="text-xs text-gray-400">
              Updated {formatDistanceToNow(new Date(summary.timestamp), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Confidence badge */}
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
            summary.overallConfidence === 'moderate-high'
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            Confidence: {summary.overallConfidence}
          </span>

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-intel-700 rounded-lg transition-colors"
            title="View revision history"
          >
            <History className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Main summary */}
      <div className="p-6">
        <p className="text-gray-200 leading-relaxed text-lg">
          {summary.summary}
        </p>

        {/* Key developments */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.keyDevelopments.map((dev, index) => (
            <div
              key={index}
              className="bg-intel-700/50 rounded-lg p-4 border border-intel-600 hover:border-blue-500/50 transition-colors card-hover"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
                  {dev.theme}
                </span>
                <span className="text-xs text-gray-500">
                  {dev.itemCount} items
                </span>
              </div>
              <p className="text-sm text-gray-200 line-clamp-2">
                {dev.headline}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">{dev.topSource}</span>
                <span className={`w-2 h-2 rounded-full ${
                  dev.relevance >= 7 ? 'bg-red-400' :
                  dev.relevance >= 5 ? 'bg-amber-400' : 'bg-green-400'
                }`}></span>
              </div>
            </div>
          ))}
        </div>

        {/* Active signals */}
        {summary.activeSignals && summary.activeSignals.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Active Signals</h3>
            <div className="flex flex-wrap gap-2">
              {summary.activeSignals.map((signal, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                    signal.strength === 'strong'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                      : signal.strength === 'moderate'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {signal.direction === 'increasing' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : signal.direction === 'decreasing' ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  <span>{signal.name}</span>
                  <span className="text-xs opacity-70">({signal.strength})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What would change our view */}
        {summary.whatWouldChangeView && summary.whatWouldChangeView.length > 0 && (
          <div className="mt-6 p-4 bg-intel-700/30 rounded-lg border border-intel-600">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">What would change this view:</h4>
                <ul className="space-y-1">
                  {summary.whatWouldChangeView.map((item, index) => (
                    <li key={index} className="text-sm text-gray-400 flex items-start gap-2">
                      <ChevronRight className="w-3 h-3 mt-1 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Stats bar */}
        <div className="mt-6 pt-4 border-t border-intel-700 flex items-center justify-between text-xs text-gray-500">
          <span>Analyzed: {summary.newsAnalyzed} news items</span>
          <span>{summary.signalsActive} active signals</span>
          <span>Uncertainty: {summary.uncertaintyLevel}</span>
        </div>
      </div>

      {/* Revision history panel */}
      {showHistory && revisionHistory.length > 0 && (
        <div className="border-t border-intel-700 p-4 bg-intel-800/50">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Revision History</h4>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {revisionHistory.map((rev, index) => (
              <div key={index} className="text-sm">
                <div className="text-xs text-gray-500 mb-1">
                  {formatDistanceToNow(new Date(rev.timestamp), { addSuffix: true })}
                </div>
                <div className="text-gray-400 line-through text-xs mb-1">{rev.previousSummary}</div>
                <div className="text-gray-300 text-xs">{rev.newSummary}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default WhatMattersNow;
