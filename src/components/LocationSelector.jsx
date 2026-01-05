import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { MapPin, X, ChevronDown, Search, Globe, Check } from 'lucide-react';

// Group cities by region for display
const CITY_GROUPS = {
  'North America': [
    'new york', 'los angeles', 'chicago', 'houston', 'dallas', 'miami',
    'san francisco', 'seattle', 'denver', 'boston', 'philadelphia',
    'washington dc', 'atlanta', 'toronto', 'vancouver', 'montreal',
    'calgary', 'ottawa', 'edmonton'
  ],
  'Europe': [
    'london', 'paris', 'berlin', 'madrid', 'barcelona', 'rome', 'milan',
    'amsterdam', 'vienna', 'munich', 'frankfurt', 'zurich', 'geneva',
    'lisbon', 'dublin', 'stockholm', 'copenhagen', 'prague', 'budapest',
    'warsaw', 'hamburg', 'rotterdam', 'the hague', 'gothenburg', 'malmo',
    'bern', 'porto', 'krakow'
  ],
  'Asia Pacific': [
    'tokyo', 'hong kong', 'singapore', 'bangkok', 'kuala lumpur', 'jakarta',
    'manila', 'seoul', 'mumbai', 'bangalore', 'delhi', 'dubai', 'abu dhabi',
    'sydney', 'melbourne', 'brisbane', 'perth', 'auckland'
  ],
  'Latin America': [
    'mexico city', 'sao paulo', 'buenos aires', 'bogota', 'santiago', 'lima'
  ],
  'Africa & Middle East': [
    'cape town', 'johannesburg', 'nairobi', 'kampala', 'cairo',
    'casablanca', 'rabat', 'marrakech'
  ]
};

// Format city name for display
function formatCityName(city) {
  return city
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function LocationSelector() {
  const { userCity, setUserCity } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter cities based on search query
  const getFilteredCities = () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return CITY_GROUPS;

    const filtered = {};
    Object.entries(CITY_GROUPS).forEach(([region, cities]) => {
      const matchingCities = cities.filter(city =>
        city.toLowerCase().includes(query)
      );
      if (matchingCities.length > 0) {
        filtered[region] = matchingCities;
      }
    });
    return filtered;
  };

  const filteredCities = getFilteredCities();

  const handleSelectCity = (city) => {
    setUserCity(city);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearCity = (e) => {
    e.stopPropagation();
    setUserCity(null);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-intel-800 hover:bg-intel-700 transition-colors border border-intel-600"
      >
        <MapPin className="w-4 h-4 text-blue-400" />
        <span className="text-sm text-white">
          {userCity ? formatCityName(userCity) : 'Select City'}
        </span>
        {userCity ? (
          <button
            onClick={handleClearCity}
            className="p-0.5 rounded-full hover:bg-intel-600 transition-colors"
            title="Clear location"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        ) : (
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-intel-800 border border-intel-600 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-intel-600">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-intel-900 border border-intel-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Global option */}
          <div
            onClick={() => handleSelectCity(null)}
            className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-intel-700 transition-colors ${!userCity ? 'bg-intel-700' : ''}`}
          >
            <Globe className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-white">Global (All international news)</span>
            {!userCity && <Check className="w-4 h-4 text-blue-400 ml-auto" />}
          </div>

          {/* City list */}
          <div className="max-h-64 overflow-y-auto">
            {Object.entries(filteredCities).map(([region, cities]) => (
              <div key={region}>
                {/* Region header */}
                <div className="px-4 py-2 bg-intel-900/50 sticky top-0">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {region}
                  </span>
                </div>

                {/* Cities */}
                {cities.map(city => (
                  <div
                    key={city}
                    onClick={() => handleSelectCity(city)}
                    className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-intel-700 transition-colors ${userCity?.toLowerCase() === city ? 'bg-intel-700' : ''}`}
                  >
                    <span className="text-sm text-white">{formatCityName(city)}</span>
                    {userCity?.toLowerCase() === city && (
                      <Check className="w-4 h-4 text-blue-400 ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            ))}

            {Object.keys(filteredCities).length === 0 && (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                No cities found matching "{searchQuery}"
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-intel-600 bg-intel-900/50">
            <p className="text-xs text-gray-500">
              Select your city to see local and regional news
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationSelector;
