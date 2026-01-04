import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  TrendingUp, TrendingDown, Minus, BarChart2, Fuel,
  DollarSign, Landmark, Briefcase, Globe
} from 'lucide-react';

function MarketPanels() {
  const { markets, signals } = useStore();
  const [activeTab, setActiveTab] = useState('commodities');

  const tabs = [
    { id: 'commodities', label: 'Commodities', icon: Fuel },
    { id: 'fx', label: 'FX', icon: DollarSign },
    { id: 'rates', label: 'Rates', icon: Landmark },
    { id: 'indices', label: 'Indices', icon: BarChart2 },
    { id: 'sectors', label: 'Sectors', icon: Briefcase },
    { id: 'geopolitical', label: 'Country ETFs', icon: Globe }
  ];

  const currentData = markets[activeTab] || [];

  const formatPrice = (price, symbol) => {
    if (!price) return '-';
    if (symbol?.includes('=X')) {
      return price.toFixed(4);
    }
    if (price > 1000) {
      return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return price.toFixed(2);
  };

  const formatChange = (change, percent) => {
    if (change === undefined || percent === undefined) return { text: '-', color: 'text-gray-400' };

    const sign = change >= 0 ? '+' : '';
    const color = change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400';

    return {
      text: `${sign}${change.toFixed(2)} (${sign}${percent.toFixed(2)}%)`,
      color
    };
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  // Find relevant signals for a market
  const getMarketSignals = (symbol, name) => {
    return signals.filter(signal =>
      signal.affectedMarkets.some(m =>
        m.toLowerCase().includes(symbol.toLowerCase()) ||
        m.toLowerCase().includes(name.toLowerCase()) ||
        symbol.toLowerCase().includes(m.toLowerCase())
      )
    ).slice(0, 2);
  };

  return (
    <div className="bg-intel-800 rounded-xl border border-intel-700 overflow-hidden">
      {/* Header with tabs */}
      <div className="px-4 py-3 border-b border-intel-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-green-400" />
            <h2 className="font-semibold text-white">Market Context</h2>
          </div>
          {markets.lastUpdate && (
            <span className="text-xs text-gray-500">
              {new Date(markets.lastUpdate).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const count = markets[tab.id]?.length || 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-intel-700 text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    activeTab === tab.id ? 'bg-blue-600' : 'bg-intel-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Market grid */}
      <div className="p-4">
        {currentData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Loading market data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentData.map(item => {
              const changeData = formatChange(item.change, item.changePercent);
              const relatedSignals = getMarketSignals(item.symbol, item.name);

              return (
                <div
                  key={item.symbol}
                  className="bg-intel-700/50 rounded-lg p-4 border border-intel-600 hover:border-intel-500 transition-colors card-hover"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-medium text-white">{item.name}</h3>
                      <span className="text-xs text-gray-500">{item.symbol}</span>
                    </div>
                    {getTrendIcon(item.trend)}
                  </div>

                  {/* Price */}
                  <div className="mb-3">
                    <div className="text-2xl font-semibold text-white">
                      {formatPrice(item.price, item.symbol)}
                    </div>
                    <div className={`text-sm ${changeData.color}`}>
                      {changeData.text}
                    </div>
                  </div>

                  {/* Mini chart placeholder - shows history */}
                  {item.history && item.history.length > 1 && (
                    <div className="h-8 flex items-end gap-0.5 mb-3">
                      {item.history.map((val, i) => {
                        const min = Math.min(...item.history);
                        const max = Math.max(...item.history);
                        const height = max > min
                          ? ((val - min) / (max - min)) * 100
                          : 50;
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-sm ${
                              i === item.history.length - 1
                                ? item.change >= 0 ? 'bg-green-400' : 'bg-red-400'
                                : 'bg-intel-500'
                            }`}
                            style={{ height: `${Math.max(height, 10)}%` }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Context - what's driving it */}
                  {item.context && (
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                      {item.context}
                    </p>
                  )}

                  {/* Related signals */}
                  {relatedSignals.length > 0 && (
                    <div className="pt-2 border-t border-intel-600">
                      <div className="text-xs text-gray-500 mb-1">Active Signals</div>
                      <div className="flex flex-wrap gap-1">
                        {relatedSignals.map(signal => (
                          <span
                            key={signal.id}
                            className={`px-1.5 py-0.5 text-xs rounded ${
                              signal.strength >= 70
                                ? 'bg-red-500/20 text-red-400'
                                : signal.strength >= 50
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {signal.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Drivers */}
                  {item.drivers && item.drivers.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-intel-600">
                      <div className="text-xs text-gray-500 mb-1">Key Drivers</div>
                      <div className="flex flex-wrap gap-1">
                        {item.drivers.slice(0, 3).map((driver, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 text-xs bg-intel-600 text-gray-300 rounded"
                          >
                            {driver}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer legend */}
      <div className="px-4 py-3 border-t border-intel-700 bg-intel-700/30">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Data via Yahoo Finance API • Delayed up to 15 min</span>
          <span>Click any asset for detailed analysis</span>
        </div>
      </div>
    </div>
  );
}

export default MarketPanels;
