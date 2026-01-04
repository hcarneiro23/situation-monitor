import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Eye, Plus, Trash2, Radio, Newspaper, Globe, BarChart2,
  Bell, BellOff, Settings, ChevronDown
} from 'lucide-react';

function Watchlist() {
  const {
    watchlist,
    removeFromWatchlist,
    addToWatchlist,
    signals,
    news,
    markets
  } = useStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState('region');
  const [addValue, setAddValue] = useState('');

  const getItemIcon = (type) => {
    switch (type) {
      case 'signal':
        return <Radio className="w-4 h-4 text-amber-400" />;
      case 'news':
        return <Newspaper className="w-4 h-4 text-blue-400" />;
      case 'region':
        return <Globe className="w-4 h-4 text-purple-400" />;
      case 'market':
        return <BarChart2 className="w-4 h-4 text-green-400" />;
      default:
        return <Eye className="w-4 h-4 text-gray-400" />;
    }
  };

  const getItemStatus = (item) => {
    if (item.type === 'signal') {
      const signal = signals.find(s => s.id === item.id);
      if (signal) {
        return {
          status: signal.strength >= 60 ? 'alert' : 'active',
          message: `Signal strength: ${signal.strength}%`
        };
      }
    }

    if (item.type === 'region') {
      const relatedNews = news.filter(n =>
        n.regions.some(r => r.toLowerCase().includes(item.id.toLowerCase()))
      );
      if (relatedNews.length > 0) {
        return {
          status: relatedNews[0].relevanceScore >= 7 ? 'alert' : 'active',
          message: `${relatedNews.length} recent news items`
        };
      }
    }

    return { status: 'quiet', message: 'No recent activity' };
  };

  const handleAdd = () => {
    if (!addValue.trim()) return;

    addToWatchlist({
      id: addValue.toLowerCase().replace(/\s+/g, '-'),
      type: addType,
      name: addValue,
      createdAt: new Date().toISOString()
    });

    setAddValue('');
    setShowAddForm(false);
  };

  const availableRegions = [
    'China', 'Russia', 'Ukraine', 'Iran', 'Taiwan',
    'Middle East', 'Europe', 'Japan', 'India', 'Brazil'
  ];

  const availableMarkets = [
    'Oil', 'Gold', 'S&P 500', 'VIX', 'Treasury Yields',
    'EUR/USD', 'Semiconductors', 'Energy Sector'
  ];

  return (
    <div className="bg-intel-800 rounded-xl border border-intel-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-intel-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-white">Personal Watchlist</h2>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
            showAddForm
              ? 'bg-indigo-500 text-white'
              : 'bg-intel-700 text-gray-400 hover:text-white'
          }`}
        >
          <Plus className="w-3 h-3" />
          Add Item
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="p-4 border-b border-intel-700 bg-intel-700/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Type selector */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Type</label>
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value)}
                className="w-full px-3 py-2 bg-intel-600 border border-intel-500 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="region">Region</option>
                <option value="market">Market/Asset</option>
                <option value="signal">Signal Type</option>
              </select>
            </div>

            {/* Value input or selector */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                {addType === 'region' ? 'Select Region' :
                 addType === 'market' ? 'Select Market' : 'Enter Name'}
              </label>
              {addType === 'region' ? (
                <select
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  className="w-full px-3 py-2 bg-intel-600 border border-intel-500 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose...</option>
                  {availableRegions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              ) : addType === 'market' ? (
                <select
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  className="w-full px-3 py-2 bg-intel-600 border border-intel-500 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose...</option>
                  {availableMarkets.map(market => (
                    <option key={market} value={market}>{market}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  placeholder="Enter signal name..."
                  className="w-full px-3 py-2 bg-intel-600 border border-intel-500 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              )}
            </div>

            {/* Add button */}
            <div className="flex items-end">
              <button
                onClick={handleAdd}
                disabled={!addValue}
                className="w-full px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add to Watchlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Watchlist items */}
      <div className="divide-y divide-intel-700 max-h-[400px] overflow-y-auto">
        {watchlist.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Your watchlist is empty</p>
            <p className="text-xs mt-1">Add regions, markets, or signals to monitor</p>
          </div>
        ) : (
          watchlist.map(item => {
            const status = getItemStatus(item);
            return (
              <div
                key={item.id}
                className={`p-4 hover:bg-intel-700/30 transition-colors ${
                  status.status === 'alert' ? 'bg-red-500/5' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${
                      status.status === 'alert' ? 'bg-red-500/20' :
                      status.status === 'active' ? 'bg-blue-500/20' :
                      'bg-intel-700'
                    }`}>
                      {getItemIcon(item.type)}
                    </div>

                    {/* Content */}
                    <div>
                      <h3 className="text-sm font-medium text-white">{item.name}</h3>
                      <p className="text-xs text-gray-500 capitalize">{item.type}</p>

                      {/* Status */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`w-2 h-2 rounded-full ${
                          status.status === 'alert' ? 'bg-red-400 animate-pulse' :
                          status.status === 'active' ? 'bg-blue-400' :
                          'bg-gray-500'
                        }`}></span>
                        <span className="text-xs text-gray-400">{status.message}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 hover:bg-intel-600 rounded transition-colors"
                      title="Notification settings"
                    >
                      <Bell className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => removeFromWatchlist(item.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Alert indicator for items with activity */}
                {status.status === 'alert' && (
                  <div className="mt-3 p-2 bg-red-500/10 rounded-lg border border-red-500/30">
                    <div className="flex items-center gap-2 text-xs text-red-400">
                      <Bell className="w-3 h-3" />
                      <span>Activity detected - review recommended</span>
                    </div>
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
          <span>{watchlist.length} items in watchlist</span>
          <span>Alerts trigger on signal changes, not just price moves</span>
        </div>
      </div>
    </div>
  );
}

export default Watchlist;
