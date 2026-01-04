import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  GitBranch, ChevronRight, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Clock, ExternalLink
} from 'lucide-react';

function ScenarioWorkspace() {
  const { scenarios, signals, news } = useStore();
  const [expandedScenario, setExpandedScenario] = useState(null);

  const getProbabilityColor = (prob) => {
    if (prob >= 50) return 'text-blue-400';
    if (prob >= 30) return 'text-amber-400';
    return 'text-gray-400';
  };

  const getPathStyle = (path, isLeading) => {
    if (isLeading) {
      return 'bg-blue-500/10 border-blue-500/50';
    }
    if (path.id === 'escalation') {
      return 'bg-red-500/5 border-red-500/20';
    }
    if (path.id === 'deescalation' || path.id === 'stabilization' || path.id === 'negotiation') {
      return 'bg-green-500/5 border-green-500/20';
    }
    return 'bg-intel-700/50 border-intel-600';
  };

  return (
    <div className="bg-intel-800 rounded-xl border border-intel-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-intel-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-white">Scenario Workspace</h2>
        </div>
        <span className="text-xs text-gray-500">{scenarios.length} active themes</span>
      </div>

      {/* Scenarios list */}
      <div className="divide-y divide-intel-700 max-h-[600px] overflow-y-auto">
        {scenarios.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Loading scenarios...</p>
          </div>
        ) : (
          scenarios.map(scenario => (
            <div key={scenario.id} className="p-4">
              {/* Scenario header */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedScenario(
                  expandedScenario === scenario.id ? null : scenario.id
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-white">{scenario.title}</h3>
                    <span className="text-xs text-gray-500">({scenario.theme})</span>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedScenario === scenario.id ? 'rotate-90' : ''
                  }`}
                />
              </div>

              {/* Probability bars for paths */}
              <div className="mt-3 space-y-2">
                {scenario.paths.map(path => {
                  const isLeading = scenario.leadingPath === path.id;
                  return (
                    <div key={path.id} className="flex items-center gap-2">
                      <div className="w-24 text-xs text-gray-400 truncate">{path.name}</div>
                      <div className="flex-1 h-2 bg-intel-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isLeading ? 'bg-blue-500' :
                            path.id === 'escalation' ? 'bg-red-500' :
                            path.id === 'deescalation' || path.id === 'stabilization' ? 'bg-green-500' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${path.currentProbability || path.baseProbability}%` }}
                        />
                      </div>
                      <span className={`w-10 text-xs text-right ${getProbabilityColor(path.currentProbability || path.baseProbability)}`}>
                        {path.currentProbability || path.baseProbability}%
                      </span>
                      {isLeading && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                          Leading
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Expanded details */}
              {expandedScenario === scenario.id && (
                <div className="mt-4 pt-4 border-t border-intel-600 animate-slide-in">
                  {/* Path details */}
                  <div className="space-y-4">
                    {scenario.paths.map(path => {
                      const isLeading = scenario.leadingPath === path.id;
                      return (
                        <div
                          key={path.id}
                          className={`p-3 rounded-lg border ${getPathStyle(path, isLeading)}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-sm font-medium text-white flex items-center gap-2">
                                {path.name}
                                {isLeading && <CheckCircle className="w-3 h-3 text-blue-400" />}
                              </h4>
                              <p className="text-xs text-gray-400 mt-1">{path.description}</p>
                            </div>
                            <span className={`text-lg font-semibold ${getProbabilityColor(path.currentProbability)}`}>
                              {path.currentProbability || path.baseProbability}%
                            </span>
                          </div>

                          {/* Signposts */}
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1">Key Signposts</div>
                            <ul className="space-y-1">
                              {path.signposts.slice(0, 3).map((signpost, i) => (
                                <li key={i} className="text-xs text-gray-300 flex items-start gap-1">
                                  <Clock className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-500" />
                                  {signpost}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Market implications */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            {path.marketImplications.bullish.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1 text-green-400 mb-1">
                                  <TrendingUp className="w-3 h-3" />
                                  Bullish
                                </div>
                                <div className="text-gray-400">
                                  {path.marketImplications.bullish.slice(0, 3).join(', ')}
                                </div>
                              </div>
                            )}
                            {path.marketImplications.bearish.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1 text-red-400 mb-1">
                                  <TrendingDown className="w-3 h-3" />
                                  Bearish
                                </div>
                                <div className="text-gray-400">
                                  {path.marketImplications.bearish.slice(0, 3).join(', ')}
                                </div>
                              </div>
                            )}
                            {path.marketImplications.neutral.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1 text-gray-400 mb-1">
                                  <Minus className="w-3 h-3" />
                                  Neutral
                                </div>
                                <div className="text-gray-400">
                                  {path.marketImplications.neutral.slice(0, 3).join(', ')}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Related news */}
                  {scenario.relatedNews && scenario.relatedNews.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-intel-600">
                      <div className="text-xs text-gray-500 mb-2">Recent Related News</div>
                      <div className="space-y-2">
                        {scenario.relatedNews.slice(0, 3).map(item => (
                          <div key={item.id} className="flex items-center gap-2 text-xs">
                            <ExternalLink className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            <span className="text-gray-300 line-clamp-1">{item.title}</span>
                            <span className="text-gray-500 flex-shrink-0">{item.source}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active signals */}
                  {scenario.activeSignals && scenario.activeSignals.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-intel-600">
                      <div className="text-xs text-gray-500 mb-2">Connected Signals</div>
                      <div className="flex flex-wrap gap-1">
                        {scenario.activeSignals.map(signalId => {
                          const signal = signals.find(s => s.id === signalId);
                          if (!signal) return null;
                          return (
                            <span
                              key={signalId}
                              className={`px-2 py-0.5 text-xs rounded ${
                                signal.strength >= 70
                                  ? 'bg-red-500/20 text-red-400'
                                  : signal.strength >= 50
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              {signal.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-intel-700 bg-intel-700/30">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-blue-500"></div>
              Leading Path
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-red-500"></div>
              Escalation
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-green-500"></div>
              De-escalation
            </span>
          </div>
          <span>Probabilities update with news flow</span>
        </div>
      </div>
    </div>
  );
}

export default ScenarioWorkspace;
