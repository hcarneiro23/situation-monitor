import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Newspaper,
  Search,
  Rss
} from 'lucide-react';

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

function Onboarding() {
  const { setFollowedSources, setOnboardingCompleted, news } = useStore();
  const [step, setStep] = useState(0);
  const [selectedSources, setSelectedSources] = useState([]);
  const [sourceSearch, setSourceSearch] = useState('');
  const [imgErrors, setImgErrors] = useState({});

  const totalSteps = 2;

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

  const toggleSource = (source) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const handleComplete = () => {
    setFollowedSources(selectedSources);
    setOnboardingCompleted(true);
  };

  const handleSkip = () => {
    setOnboardingCompleted(true);
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
              Let's set up your feed.
            </p>
          </div>
        );

      case 1:
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
              className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600"
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
