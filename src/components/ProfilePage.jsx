import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, User, MapPin, Bell, LogOut, ChevronRight, Check, TrendingUp, Globe2, Cpu, Zap, Scale, FileText, Leaf, Bitcoin, Rss, Search, X } from 'lucide-react';
import CityAutocomplete from './CityAutocomplete';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const INTEREST_OPTIONS = [
  { id: 'markets', label: 'Markets & Finance', icon: TrendingUp },
  { id: 'geopolitics', label: 'Geopolitics', icon: Globe2 },
  { id: 'technology', label: 'Technology', icon: Cpu },
  { id: 'energy', label: 'Energy & Commodities', icon: Zap },
  { id: 'trade', label: 'Trade & Sanctions', icon: Scale },
  { id: 'policy', label: 'Policy & Regulation', icon: FileText },
  { id: 'climate', label: 'Climate & Environment', icon: Leaf },
  { id: 'crypto', label: 'Crypto & Digital Assets', icon: Bitcoin },
];

function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { userCity, userInterests, setUserCity, setUserInterests, followedSources, setFollowedSources, watchlist, alerts, news } = useStore();
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showInterestsPicker, setShowInterestsPicker] = useState(false);
  const [showSourcesPicker, setShowSourcesPicker] = useState(false);
  const [supportedCities, setSupportedCities] = useState([]);
  const [sourceSearch, setSourceSearch] = useState('');

  // Get unique sources from news
  const availableSources = useMemo(() => {
    const sources = new Set();
    news.forEach(item => {
      if (item.source) sources.add(item.source);
    });
    return [...sources].sort();
  }, [news]);

  // Filter sources by search
  const filteredSources = useMemo(() => {
    if (!sourceSearch.trim()) return availableSources;
    const search = sourceSearch.toLowerCase();
    return availableSources.filter(s => s.toLowerCase().includes(search));
  }, [availableSources, sourceSearch]);

  // Fetch supported cities from backend
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/cities`)
      .then(res => res.json())
      .then(cities => setSupportedCities(cities))
      .catch(err => console.error('Failed to fetch cities:', err));
  }, []);

  const toggleSource = (source) => {
    const current = followedSources || [];
    if (current.includes(source)) {
      setFollowedSources(current.filter(s => s !== source));
    } else {
      setFollowedSources([...current, source]);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const toggleInterest = (interestId) => {
    const current = userInterests || [];
    if (current.includes(interestId)) {
      setUserInterests(current.filter(i => i !== interestId));
    } else {
      setUserInterests([...current, interestId]);
    }
  };

  const unreadAlerts = alerts?.filter(a => !a.read).length || 0;

  return (
    <div className="min-h-screen bg-intel-900 pb-16 lg:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-intel-900/80 backdrop-blur-md border-b border-intel-700">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-intel-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">Settings</h1>
        </div>
      </div>

      {/* Content container */}
      <div className="max-w-2xl mx-auto">
        {/* User info */}
        <div className="px-4 py-6 border-b border-intel-700">
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-intel-700 flex items-center justify-center">
                <User className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-white font-medium text-lg">{user?.displayName || 'User'}</p>
              <p className="text-gray-500 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex border-b border-intel-700">
          <div className="flex-1 py-4 text-center border-r border-intel-700">
            <p className="text-white font-bold text-xl">{watchlist?.length || 0}</p>
            <p className="text-gray-500 text-sm">Tracking</p>
          </div>
          <div className="flex-1 py-4 text-center">
            <p className="text-white font-bold text-xl">{unreadAlerts}</p>
            <p className="text-gray-500 text-sm">Alerts</p>
          </div>
        </div>

        {/* Settings */}
        <div className="py-2">
        {/* Location */}
        <button
          onClick={() => setShowLocationPicker(!showLocationPicker)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-intel-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-400" />
            <div className="text-left">
              <p className="text-white">Location</p>
              <p className="text-gray-500 text-sm">
                {userCity ? userCity.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Not set'}
              </p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${showLocationPicker ? 'rotate-90' : ''}`} />
        </button>

        {showLocationPicker && (
          <div className="px-4 py-3 bg-intel-800/50">
            <CityAutocomplete
              value={userCity || ''}
              onChange={(city) => setUserCity(city)}
              supportedCities={supportedCities}
              placeholder="Type your city..."
            />
            <button
              onClick={() => {
                setUserCity('');
                setShowLocationPicker(false);
              }}
              className="w-full mt-2 p-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear location (Global news only)
            </button>
          </div>
        )}

        {/* Interests */}
        <button
          onClick={() => setShowInterestsPicker(!showInterestsPicker)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-intel-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-400" />
            <div className="text-left">
              <p className="text-white">Interests</p>
              <p className="text-gray-500 text-sm">
                {userInterests?.length ? `${userInterests.length} selected` : 'None selected'}
              </p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${showInterestsPicker ? 'rotate-90' : ''}`} />
        </button>

        {showInterestsPicker && (
          <div className="px-4 py-2 bg-intel-800/50">
            <div className="space-y-2">
              {INTEREST_OPTIONS.map(({ id, label, icon: Icon }) => {
                const selected = userInterests?.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleInterest(id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selected
                        ? 'bg-blue-500/20 border border-blue-500'
                        : 'bg-intel-700 border border-transparent hover:border-intel-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${selected ? 'text-blue-400' : 'text-gray-400'}`} />
                    <span className="text-white flex-1 text-left">{label}</span>
                    {selected && <Check className="w-5 h-5 text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Following Sources */}
        <button
          onClick={() => setShowSourcesPicker(!showSourcesPicker)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-intel-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Rss className="w-5 h-5 text-gray-400" />
            <div className="text-left">
              <p className="text-white">Following</p>
              <p className="text-gray-500 text-sm">
                {followedSources?.length ? `${followedSources.length} sources` : 'No sources followed'}
              </p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${showSourcesPicker ? 'rotate-90' : ''}`} />
        </button>

        {showSourcesPicker && (
          <div className="px-4 py-3 bg-intel-800/50">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search sources..."
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-intel-700 border border-intel-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Currently following */}
            {followedSources?.length > 0 && !sourceSearch && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 uppercase mb-2">Currently following</p>
                <div className="flex flex-wrap gap-2">
                  {followedSources.map(source => (
                    <button
                      key={source}
                      onClick={() => toggleSource(source)}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500 rounded-full text-sm text-blue-300 hover:bg-blue-500/30"
                    >
                      {source}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Available sources */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredSources.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  {sourceSearch ? `No sources matching "${sourceSearch}"` : 'Loading sources...'}
                </p>
              ) : (
                filteredSources.map(source => {
                  const selected = followedSources?.includes(source);
                  return (
                    <button
                      key={source}
                      onClick={() => toggleSource(source)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                        selected
                          ? 'bg-blue-500/20 border border-blue-500'
                          : 'bg-intel-700 border border-transparent hover:border-intel-600'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {source.slice(0, 1).toUpperCase()}
                      </div>
                      <span className={`text-sm flex-1 ${selected ? 'text-white' : 'text-gray-300'}`}>{source}</span>
                      {selected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-intel-800 transition-colors mt-4 border-t border-intel-700"
        >
          <LogOut className="w-5 h-5 text-red-400" />
          <span className="text-red-400">Sign out</span>
        </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
