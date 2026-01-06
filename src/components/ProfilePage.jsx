import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, User, MapPin, Bell, LogOut, ChevronRight, Check, TrendingUp, Globe2, Cpu, Zap, Scale, FileText, Leaf, Bitcoin } from 'lucide-react';
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
  const { userCity, userInterests, setUserCity, setUserInterests, watchlist, alerts } = useStore();
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showInterestsPicker, setShowInterestsPicker] = useState(false);
  const [supportedCities, setSupportedCities] = useState([]);

  // Fetch supported cities from backend
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/cities`)
      .then(res => res.json())
      .then(cities => setSupportedCities(cities))
      .catch(err => console.error('Failed to fetch cities:', err));
  }, []);

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
          <h1 className="text-xl font-bold text-white">Profile</h1>
        </div>
      </div>

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
  );
}

export default ProfilePage;
