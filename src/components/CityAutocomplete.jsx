import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Search, Check, Loader2 } from 'lucide-react';

// Load cities data lazily
let citiesData = null;
let citiesLoadPromise = null;

async function loadCities() {
  if (citiesData) return citiesData;
  if (citiesLoadPromise) return citiesLoadPromise;

  citiesLoadPromise = import('cities.json').then(module => {
    citiesData = module.default;
    return citiesData;
  });

  return citiesLoadPromise;
}

// Country code to name mapping for common codes
const COUNTRY_NAMES = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain', PT: 'Portugal',
  NL: 'Netherlands', BE: 'Belgium', AT: 'Austria', CH: 'Switzerland',
  SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland',
  CZ: 'Czech Republic', HU: 'Hungary', RO: 'Romania', GR: 'Greece',
  TR: 'Turkey', RU: 'Russia', UA: 'Ukraine', JP: 'Japan', CN: 'China',
  KR: 'South Korea', IN: 'India', TH: 'Thailand', VN: 'Vietnam',
  ID: 'Indonesia', MY: 'Malaysia', SG: 'Singapore', PH: 'Philippines',
  BR: 'Brazil', MX: 'Mexico', AR: 'Argentina', CO: 'Colombia', CL: 'Chile',
  PE: 'Peru', ZA: 'South Africa', EG: 'Egypt', NG: 'Nigeria', KE: 'Kenya',
  AE: 'UAE', SA: 'Saudi Arabia', IL: 'Israel', NZ: 'New Zealand',
  IE: 'Ireland', HK: 'Hong Kong', TW: 'Taiwan'
};

function getCountryName(code) {
  return COUNTRY_NAMES[code] || code;
}

function CityAutocomplete({ value, onChange, supportedCities = [], placeholder = "Type your city..." }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);

  // Normalize city names for comparison
  const supportedCitiesLower = useMemo(() =>
    new Set(supportedCities.map(c => c.toLowerCase())),
    [supportedCities]
  );

  // Check if a city has local news support
  const hasLocalNews = (cityName) => {
    return supportedCitiesLower.has(cityName.toLowerCase());
  };

  // Search cities with debouncing
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const cities = await loadCities();
        const queryLower = query.toLowerCase();

        // Search and filter cities
        const matches = [];
        for (let i = 0; i < cities.length && matches.length < 50; i++) {
          const city = cities[i];
          if (city.name.toLowerCase().startsWith(queryLower)) {
            matches.push(city);
          }
        }

        // If not enough starts-with matches, also search for contains
        if (matches.length < 10) {
          for (let i = 0; i < cities.length && matches.length < 50; i++) {
            const city = cities[i];
            if (!city.name.toLowerCase().startsWith(queryLower) &&
                city.name.toLowerCase().includes(queryLower)) {
              matches.push(city);
            }
          }
        }

        // Sort: prioritize cities with local news support, then alphabetically
        matches.sort((a, b) => {
          const aSupported = hasLocalNews(a.name);
          const bSupported = hasLocalNews(b.name);
          if (aSupported && !bSupported) return -1;
          if (!aSupported && bSupported) return 1;
          return a.name.localeCompare(b.name);
        });

        setSuggestions(matches.slice(0, 20));
        setIsOpen(matches.length > 0);
        setHighlightedIndex(0);
      } catch (error) {
        console.error('Failed to search cities:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, supportedCitiesLower]);

  const handleSelect = (city) => {
    const cityName = city.name;
    setQuery(cityName);
    setIsOpen(false);
    onChange(cityName);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && suggestions.length > 0 && setIsOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 bg-intel-800 border border-intel-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 animate-spin" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto bg-intel-800 border border-intel-600 rounded-xl shadow-lg"
        >
          {suggestions.map((city, index) => {
            const isSupported = hasLocalNews(city.name);
            const isHighlighted = index === highlightedIndex;

            return (
              <button
                key={`${city.name}-${city.country}-${index}`}
                onClick={() => handleSelect(city)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  isHighlighted ? 'bg-intel-700' : 'hover:bg-intel-700'
                }`}
              >
                <MapPin className={`w-4 h-4 flex-shrink-0 ${isSupported ? 'text-green-400' : 'text-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white truncate">{city.name}</span>
                    {isSupported && (
                      <span className="flex-shrink-0 text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                        Local news
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{getCountryName(city.country)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CityAutocomplete;
