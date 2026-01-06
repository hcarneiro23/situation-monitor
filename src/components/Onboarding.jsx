import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Check,
  TrendingUp,
  Globe2,
  Cpu,
  Zap,
  Scale,
  FileText,
  Leaf,
  Bitcoin,
  Newspaper,
  Search,
  Rss
} from 'lucide-react';
import CityAutocomplete from './CityAutocomplete';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Get favicon URL for a source
function getSourceLogo(source) {
  const domainMap = {
    'Reuters': 'reuters.com', 'BBC': 'bbc.com', 'CNN': 'cnn.com', 'Fox News': 'foxnews.com',
    'NBC News': 'nbcnews.com', 'ABC News': 'abcnews.go.com', 'CBS News': 'cbsnews.com',
    'NPR': 'npr.org', 'NYT': 'nytimes.com', 'Washington Post': 'washingtonpost.com',
    'USA Today': 'usatoday.com', 'Politico': 'politico.com', 'Bloomberg': 'bloomberg.com',
    'CNBC': 'cnbc.com', 'MarketWatch': 'marketwatch.com', 'Yahoo Finance': 'finance.yahoo.com',
    'Al Jazeera': 'aljazeera.com', 'The Guardian': 'theguardian.com', 'Financial Times': 'ft.com',
    'Folha de S.Paulo': 'folha.uol.com.br', 'Estadão': 'estadao.com.br', 'CNN Brasil': 'cnnbrasil.com.br',
    'Gazeta do Povo': 'gazetadopovo.com.br', 'UOL': 'uol.com.br', 'Terra': 'terra.com.br',
    'G1': 'g1.globo.com', 'HuffPost': 'huffpost.com', 'Vox': 'vox.com', 'Slate': 'slate.com',
  };
  const domain = domainMap[source];
  if (domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  }
  return null;
}

// Available interests with icons and descriptions
const INTERESTS = [
  { id: 'markets', label: 'Markets & Finance', icon: TrendingUp, description: 'Stocks, bonds, currencies, and market movements' },
  { id: 'geopolitics', label: 'Geopolitics', icon: Globe2, description: 'International relations, conflicts, and diplomacy' },
  { id: 'technology', label: 'Technology', icon: Cpu, description: 'Tech industry, semiconductors, AI, and innovation' },
  { id: 'energy', label: 'Energy & Commodities', icon: Zap, description: 'Oil, gas, metals, and resource markets' },
  { id: 'trade', label: 'Trade & Sanctions', icon: Scale, description: 'Tariffs, trade agreements, and economic sanctions' },
  { id: 'policy', label: 'Policy & Regulation', icon: FileText, description: 'Government policy, laws, and regulatory changes' },
  { id: 'climate', label: 'Climate & Environment', icon: Leaf, description: 'Climate policy, sustainability, and ESG' },
  { id: 'crypto', label: 'Crypto & Digital Assets', icon: Bitcoin, description: 'Cryptocurrency, blockchain, and digital finance' },
];

function Onboarding() {
  const { setUserCity, setUserInterests, setFollowedSources, setOnboardingCompleted, news } = useStore();
  const [step, setStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedSources, setSelectedSources] = useState([]);
  const [supportedCities, setSupportedCities] = useState([]);
  const [sourceSearch, setSourceSearch] = useState('');
  const [imgErrors, setImgErrors] = useState({});

  const totalSteps = 4;

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

  const toggleInterest = (interestId) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const toggleSource = (source) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const handleComplete = () => {
    setUserInterests(selectedInterests);
    setUserCity(selectedCity);
    setFollowedSources(selectedSources);
    setOnboardingCompleted(true);
  };

  const handleSkip = () => {
    setOnboardingCompleted(true);
  };

  const canProceed = () => {
    if (step === 1) return selectedInterests.length > 0;
    return true;
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Newspaper className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Welcome to Situation Monitor</h1>
            <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
              Your personalized intelligence feed for global events and their market implications.
            </p>
            <p className="text-gray-500 mb-8">
              Let's set up your feed in just a few steps.
            </p>
          </div>
        );

      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">What interests you?</h2>
            <p className="text-gray-400 text-center mb-6">
              Select topics to personalize your feed. Choose at least one.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
              {INTERESTS.map(interest => {
                const Icon = interest.icon;
                const isSelected = selectedInterests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-intel-600 bg-intel-800 hover:border-intel-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-500/20' : 'bg-intel-700'}`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                            {interest.label}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {interest.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 2:
        const hasLocalNewsSupport = supportedCities.some(
          c => c.toLowerCase() === selectedCity.toLowerCase()
        );
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Where are you located?</h2>
            <p className="text-gray-400 text-center mb-6">
              Get local and regional news tailored to your city.
            </p>

            {/* City autocomplete input */}
            <div className="max-w-md mx-auto mb-4">
              <CityAutocomplete
                value={selectedCity}
                onChange={setSelectedCity}
                supportedCities={supportedCities}
                placeholder="Type your city..."
              />
            </div>

            {/* Selected city info */}
            {selectedCity && (
              <div className="max-w-md mx-auto mb-4">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  hasLocalNewsSupport
                    ? 'bg-green-500/20 border border-green-500/50'
                    : 'bg-blue-500/20 border border-blue-500/50'
                }`}>
                  <MapPin className={`w-4 h-4 ${hasLocalNewsSupport ? 'text-green-400' : 'text-blue-400'}`} />
                  <span className={`font-medium ${hasLocalNewsSupport ? 'text-green-300' : 'text-blue-300'}`}>
                    {selectedCity}
                  </span>
                  {hasLocalNewsSupport ? (
                    <span className="ml-auto text-xs text-green-400">Local news available</span>
                  ) : (
                    <span className="ml-auto text-xs text-gray-400">International news only</span>
                  )}
                </div>
              </div>
            )}

            {/* Global option */}
            <div className="max-w-md mx-auto mb-4">
              <button
                onClick={() => setSelectedCity('')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                  !selectedCity
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-intel-600 bg-intel-800 hover:border-intel-500'
                }`}
              >
                <Globe2 className={`w-5 h-5 ${!selectedCity ? 'text-blue-400' : 'text-gray-400'}`} />
                <span className={!selectedCity ? 'text-white' : 'text-gray-300'}>
                  Global (International news only)
                </span>
                {!selectedCity && <Check className="w-4 h-4 text-blue-400 ml-auto" />}
              </button>
            </div>

            <p className="max-w-md mx-auto text-center text-sm text-gray-500 mt-4">
              Cities with local news sources will show the "Local news" badge when typing.
            </p>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Follow news sources</h2>
            <p className="text-gray-400 text-center mb-6">
              Select sources to see their posts in your "Following" feed.
            </p>

            {/* Search input */}
            <div className="max-w-md mx-auto mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search sources..."
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-intel-800 border border-intel-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Selected count */}
            {selectedSources.length > 0 && (
              <div className="max-w-md mx-auto mb-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                  <Rss className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 font-medium">
                    {selectedSources.length} source{selectedSources.length !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedSources([])}
                    className="ml-auto text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            {/* Sources grid */}
            <div className="max-w-lg mx-auto max-h-72 overflow-y-auto rounded-xl border border-intel-600 bg-intel-800 p-2">
              {availableSources.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Rss className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Loading sources...</p>
                  <p className="text-sm mt-1">News sources will appear here</p>
                </div>
              ) : filteredSources.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No sources found matching "{sourceSearch}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredSources.map(source => {
                    const isSelected = selectedSources.includes(source);
                    const logoUrl = getSourceLogo(source);
                    return (
                      <button
                        key={source}
                        onClick={() => toggleSource(source)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'bg-blue-500/20 border border-blue-500'
                            : 'bg-intel-700 border border-transparent hover:border-intel-500'
                        }`}
                      >
                        {logoUrl && !imgErrors[source] ? (
                          <img
                            src={logoUrl}
                            alt=""
                            className="w-6 h-6 rounded-full bg-intel-600 flex-shrink-0"
                            onError={() => setImgErrors(prev => ({ ...prev, [source]: true }))}
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {source.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span className={`text-sm truncate flex-1 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {source}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="max-w-md mx-auto text-center text-sm text-gray-500 mt-4">
              You can change this later in your profile settings.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-intel-900 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-intel-800">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Skip button */}
      <div className="p-4 flex justify-end">
        <button
          onClick={handleSkip}
          className="text-gray-500 hover:text-gray-300 text-sm"
        >
          Skip for now
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {renderStep()}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-6 border-t border-intel-700">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              step === 0
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white hover:bg-intel-800'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? 'bg-blue-500' : i < step ? 'bg-blue-500/50' : 'bg-intel-600'
                }`}
              />
            ))}
          </div>

          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                canProceed()
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-intel-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              Get Started
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
