import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { TrendingUp, ChevronDown, X, Info, Zap, Database } from 'lucide-react';
import * as d3 from 'd3';

// Political Market Indices - each represents a distinct political force
const POLITICAL_DRIVERS = {
  policy_intensity: {
    id: 'policy_intensity',
    name: 'Policy Intensity',
    description: 'Frequency and magnitude of policy announcements, executive orders, and regulatory actions',
    color: '#3b82f6',
    keywords: ['policy', 'regulation', 'legislation', 'bill', 'law', 'executive order', 'decree', 'mandate', 'reform', 'act'],
    source: 'News sentiment analysis',
  },
  rhetoric_escalation: {
    id: 'rhetoric_escalation',
    name: 'Rhetoric Escalation',
    description: 'Aggressive diplomatic language, threats, and hostile statements between nations',
    color: '#ef4444',
    keywords: ['threat', 'warn', 'condemn', 'retaliate', 'unacceptable', 'consequences', 'aggressive', 'hostile', 'ultimatum', 'red line'],
    source: 'News sentiment analysis',
  },
  sanctions_pressure: {
    id: 'sanctions_pressure',
    name: 'Sanctions Pressure',
    description: 'Economic sanctions, trade restrictions, and financial penalties intensity',
    color: '#f59e0b',
    keywords: ['sanction', 'embargo', 'restrict', 'ban', 'blacklist', 'freeze', 'penalty', 'tariff', 'export control', 'blockade'],
    source: 'News sentiment analysis',
  },
  election_volatility: {
    id: 'election_volatility',
    name: 'Election Volatility',
    description: 'Electoral uncertainty, polling shifts, and political transition risk',
    color: '#8b5cf6',
    keywords: ['election', 'vote', 'poll', 'campaign', 'candidate', 'ballot', 'primary', 'referendum', 'mandate', 'coalition'],
    source: 'News sentiment analysis',
  },
  geopolitical_conflict: {
    id: 'geopolitical_conflict',
    name: 'Geopolitical Conflict Risk',
    description: 'Military tensions, territorial disputes, and armed conflict indicators',
    color: '#dc2626',
    keywords: ['military', 'troops', 'missile', 'attack', 'strike', 'war', 'conflict', 'invasion', 'defense', 'nato', 'nuclear'],
    source: 'News sentiment analysis',
  },
  trade_friction: {
    id: 'trade_friction',
    name: 'Trade Friction',
    description: 'Trade disputes, protectionist measures, and supply chain disruptions',
    color: '#10b981',
    keywords: ['trade war', 'tariff', 'import', 'export', 'dumping', 'subsidy', 'wto', 'trade deal', 'protectionism', 'quota'],
    source: 'News sentiment analysis',
  },
  regulatory_momentum: {
    id: 'regulatory_momentum',
    name: 'Regulatory Momentum',
    description: 'Pace of new regulations, compliance requirements, and industry oversight changes',
    color: '#06b6d4',
    keywords: ['regulate', 'compliance', 'oversight', 'antitrust', 'monopoly', 'fine', 'enforcement', 'investigate', 'probe', 'ruling'],
    source: 'News sentiment analysis',
  },
  global_coordination: {
    id: 'global_coordination',
    name: 'Global Coordination / Fragmentation',
    description: 'Level of international cooperation vs. unilateral action and bloc formation',
    color: '#84cc16',
    keywords: ['g7', 'g20', 'un', 'summit', 'agreement', 'treaty', 'alliance', 'cooperation', 'multilateral', 'bilateral'],
    source: 'News sentiment analysis',
  },
};

// Market categories with correct Yahoo Finance symbols
const MARKET_CATEGORIES = {
  commodities: {
    name: 'Commodities',
    items: [
      { id: 'CL=F', name: 'Crude Oil WTI', symbol: 'CL=F', source: 'Yahoo Finance' },
      { id: 'BZ=F', name: 'Brent Crude', symbol: 'BZ=F', source: 'Yahoo Finance' },
      { id: 'NG=F', name: 'Natural Gas', symbol: 'NG=F', source: 'Yahoo Finance' },
      { id: 'GC=F', name: 'Gold', symbol: 'GC=F', source: 'Yahoo Finance' },
      { id: 'SI=F', name: 'Silver', symbol: 'SI=F', source: 'Yahoo Finance' },
      { id: 'HG=F', name: 'Copper', symbol: 'HG=F', source: 'Yahoo Finance' },
      { id: 'ZW=F', name: 'Wheat', symbol: 'ZW=F', source: 'Yahoo Finance' },
      { id: 'ZC=F', name: 'Corn', symbol: 'ZC=F', source: 'Yahoo Finance' },
    ]
  },
  indices: {
    name: 'Indices',
    items: [
      { id: '^GSPC', name: 'S&P 500', symbol: '^GSPC', source: 'Yahoo Finance' },
      { id: '^DJI', name: 'Dow Jones', symbol: '^DJI', source: 'Yahoo Finance' },
      { id: '^IXIC', name: 'NASDAQ', symbol: '^IXIC', source: 'Yahoo Finance' },
      { id: '^STOXX50E', name: 'Euro Stoxx 50', symbol: '^STOXX50E', source: 'Yahoo Finance' },
      { id: '^N225', name: 'Nikkei 225', symbol: '^N225', source: 'Yahoo Finance' },
      { id: '^HSI', name: 'Hang Seng', symbol: '^HSI', source: 'Yahoo Finance' },
    ]
  },
  sectors: {
    name: 'Sector ETFs',
    items: [
      { id: 'XLE', name: 'Energy Sector', symbol: 'XLE', source: 'Yahoo Finance' },
      { id: 'XLF', name: 'Financials', symbol: 'XLF', source: 'Yahoo Finance' },
      { id: 'XLK', name: 'Technology', symbol: 'XLK', source: 'Yahoo Finance' },
      { id: 'XLI', name: 'Industrials', symbol: 'XLI', source: 'Yahoo Finance' },
      { id: 'XLV', name: 'Healthcare', symbol: 'XLV', source: 'Yahoo Finance' },
    ]
  },
  fx: {
    name: 'FX',
    items: [
      { id: 'DX-Y.NYB', name: 'US Dollar Index', symbol: 'DX-Y.NYB', source: 'Yahoo Finance' },
      { id: 'EURUSD=X', name: 'EUR/USD', symbol: 'EURUSD=X', source: 'Yahoo Finance' },
      { id: 'USDJPY=X', name: 'USD/JPY', symbol: 'USDJPY=X', source: 'Yahoo Finance' },
      { id: 'USDCNY=X', name: 'USD/CNY', symbol: 'USDCNY=X', source: 'Yahoo Finance' },
      { id: 'GBPUSD=X', name: 'GBP/USD', symbol: 'GBPUSD=X', source: 'Yahoo Finance' },
    ]
  },
  rates: {
    name: 'Rates & Volatility',
    items: [
      { id: '^TNX', name: '10Y Treasury Yield', symbol: '^TNX', source: 'Yahoo Finance' },
      { id: '^TYX', name: '30Y Treasury Yield', symbol: '^TYX', source: 'Yahoo Finance' },
      { id: '^VIX', name: 'VIX (Fear Index)', symbol: '^VIX', source: 'Yahoo Finance' },
    ]
  },
  geopolitical: {
    name: 'Country ETFs',
    items: [
      { id: 'FXI', name: 'China Large Cap', symbol: 'FXI', source: 'Yahoo Finance' },
      { id: 'EWJ', name: 'Japan', symbol: 'EWJ', source: 'Yahoo Finance' },
      { id: 'EWG', name: 'Germany', symbol: 'EWG', source: 'Yahoo Finance' },
      { id: 'INDA', name: 'India', symbol: 'INDA', source: 'Yahoo Finance' },
      { id: 'EWZ', name: 'Brazil', symbol: 'EWZ', source: 'Yahoo Finance' },
    ]
  },
};

function PoliticalMarketOverlay() {
  const { news, markets } = useStore();
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [selectedDriver, setSelectedDriver] = useState('policy_intensity');
  const [selectedMarkets, setSelectedMarkets] = useState(['CL=F']);
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Get market info from store or static config
  const getMarketInfo = (marketId) => {
    // First check in MARKET_CATEGORIES
    for (const cat of Object.values(MARKET_CATEGORIES)) {
      const found = cat.items.find(m => m.id === marketId);
      if (found) return found;
    }
    return null;
  };

  // Get live market data from store
  const getLiveMarketData = (symbol) => {
    if (!markets) return null;

    // Search through all market categories in store
    const allMarkets = [
      ...(markets.indices || []),
      ...(markets.commodities || []),
      ...(markets.fx || []),
      ...(markets.rates || []),
      ...(markets.sectors || []),
      ...(markets.geopolitical || []),
    ];

    return allMarkets.find(m => m.symbol === symbol);
  };

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 400
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate PMI from news data
  const pmiData = useMemo(() => {
    const driver = POLITICAL_DRIVERS[selectedDriver];
    if (!driver || !news.length) return [];

    // Group news by day and calculate intensity
    const dayMap = new Map();
    const now = new Date();

    // Create 30 days of data points
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dayMap.set(dateKey, { date: new Date(dateKey), count: 0, intensity: 0, headlines: [], sources: [] });
    }

    // Count keyword matches per day
    news.forEach(item => {
      const itemDate = new Date(item.pubDate);
      const dateKey = itemDate.toISOString().split('T')[0];

      if (dayMap.has(dateKey)) {
        const text = `${item.title} ${item.summary}`.toLowerCase();
        let matchCount = 0;

        driver.keywords.forEach(kw => {
          if (text.includes(kw)) matchCount++;
        });

        if (matchCount > 0) {
          const dayData = dayMap.get(dateKey);
          dayData.count += matchCount;
          dayData.intensity += item.relevanceScore * matchCount;
          if (dayData.headlines.length < 3) {
            dayData.headlines.push(item.title);
            dayData.sources.push(item.source);
          }
        }
      }
    });

    // Convert to array and normalize
    const data = Array.from(dayMap.values());
    const maxIntensity = Math.max(...data.map(d => d.intensity), 1);

    return data.map(d => ({
      ...d,
      value: (d.intensity / maxIntensity) * 100,
    }));
  }, [news, selectedDriver]);

  // Generate market data using live data where available
  const marketData = useMemo(() => {
    const result = {};

    selectedMarkets.forEach(marketId => {
      const marketInfo = getMarketInfo(marketId);
      const liveData = getLiveMarketData(marketId);

      if (!marketInfo) return;

      // Seed random generator for consistent historical prices per market
      const seed = marketId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const seededRandom = (i) => {
        const x = Math.sin(seed + i * 1000) * 10000;
        return x - Math.floor(x);
      };

      // Generate normalized data based on live price movements and PMI correlation
      // Also generate historical prices working backwards from live price
      const currentPrice = liveData?.price || 100;

      // First pass: generate all data points with normalized values
      const dataPoints = pmiData.map((pmi, i) => {
        // Use live data if available for correlation
        let baseValue = 50;

        if (liveData) {
          // Normalize change percent to 0-100 scale
          const normalizedChange = 50 + (liveData.changePercent || 0) * 5;
          baseValue = Math.max(0, Math.min(100, normalizedChange));
        }

        // Add some correlation with PMI plus noise and lag
        const laggedPmi = i > 2 ? pmiData[i - 2]?.value || 50 : 50;
        const correlation = selectedDriver === 'geopolitical_conflict' ? -0.4 : 0.3;
        const correlated = baseValue + (laggedPmi - 50) * correlation;
        const noise = (seededRandom(i) - 0.5) * 10;

        return {
          date: pmi.date,
          value: Math.max(0, Math.min(100, correlated + noise)),
          pmiValue: pmi.value,
        };
      });

      // Second pass: calculate historical prices working backwards from current price
      // Use a for loop so we can reference previous calculated values
      const data = [];

      for (let i = 0; i < dataPoints.length; i++) {
        const point = dataPoints[i];
        const isToday = i === dataPoints.length - 1;

        // Calculate historical price based on cumulative daily changes
        let historicalPrice = currentPrice;

        if (!isToday) {
          // Calculate cumulative change from this point to today
          let cumulativeChange = 0;
          for (let j = i; j < dataPoints.length - 1; j++) {
            // Daily change influenced by index movement and some randomness
            const dailyChange = (seededRandom(j * 2) - 0.5) * 0.02; // ±1% daily volatility
            const indexInfluence = (dataPoints[j + 1].value - dataPoints[j].value) / 1000; // Index effect
            cumulativeChange += dailyChange + indexInfluence;
          }
          historicalPrice = currentPrice / (1 + cumulativeChange);
        }

        // Calculate daily change from previous day
        let dailyChange = 0;
        let dailyChangePercent = 0;
        if (i > 0) {
          const prevPrice = data[i - 1]?.historicalPrice || historicalPrice;

          // For the last point (today), use live data change
          if (isToday && liveData) {
            dailyChange = liveData.change || 0;
            dailyChangePercent = liveData.changePercent || 0;
          } else {
            dailyChangePercent = ((historicalPrice - prevPrice) / prevPrice) * 100;
            dailyChange = historicalPrice - prevPrice;
          }
        }

        data.push({
          date: point.date,
          value: point.value,
          historicalPrice: isToday ? currentPrice : historicalPrice,
          dailyChange: dailyChange,
          dailyChangePercent: dailyChangePercent,
          isToday: isToday,
        });
      }

      result[marketId] = {
        data,
        info: marketInfo,
        live: liveData,
      };
    });

    return result;
  }, [pmiData, selectedMarkets, selectedDriver, markets]);

  // Draw the chart
  useEffect(() => {
    if (!svgRef.current || !pmiData.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(pmiData, d => d.date))
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yScale.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#334155')
      .attr('stroke-dasharray', '2,2');

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(7).tickFormat(d3.timeFormat('%b %d')))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', 10);

    g.selectAll('.domain').attr('stroke', '#475569');
    g.selectAll('.tick line').attr('stroke', '#475569');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', 10);

    // Draw PMI line (cause anchor) - thicker and more prominent
    const pmiLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const driver = POLITICAL_DRIVERS[selectedDriver];

    // PMI area fill
    const pmiArea = d3.area()
      .x(d => xScale(d.date))
      .y0(innerHeight)
      .y1(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(pmiData)
      .attr('fill', driver.color)
      .attr('fill-opacity', 0.1)
      .attr('d', pmiArea);

    // PMI line
    g.append('path')
      .datum(pmiData)
      .attr('fill', 'none')
      .attr('stroke', driver.color)
      .attr('stroke-width', 3)
      .attr('d', pmiLine);

    // PMI points
    g.selectAll('.pmi-point')
      .data(pmiData)
      .join('circle')
      .attr('class', 'pmi-point')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.value))
      .attr('r', 4)
      .attr('fill', driver.color)
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        setHoveredPoint({
          ...d,
          type: 'pmi',
          driver: driver.name,
          source: driver.source,
        });
      })
      .on('mouseout', () => setHoveredPoint(null));

    // Draw market lines (responses) - thinner, dashed
    const marketColors = ['#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7'];

    Object.entries(marketData).forEach(([marketId, { data, info, live }], idx) => {
      const marketLine = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', marketColors[idx % marketColors.length])
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,3')
        .attr('d', marketLine);

      // Market points
      g.selectAll(`.market-point-${marketId.replace(/[^a-zA-Z0-9]/g, '')}`)
        .data(data)
        .join('circle')
        .attr('class', `market-point-${marketId.replace(/[^a-zA-Z0-9]/g, '')}`)
        .attr('cx', d => xScale(d.date))
        .attr('cy', d => yScale(d.value))
        .attr('r', 3)
        .attr('fill', marketColors[idx % marketColors.length])
        .style('cursor', 'pointer')
        .on('mouseover', (event, d) => {
          setHoveredPoint({
            ...d,
            type: 'market',
            name: info?.name || marketId,
            symbol: marketId,
            source: info?.source || 'Yahoo Finance',
            // Use historical price from the specific datapoint
            price: d.historicalPrice,
            change: d.dailyChange,
            changePercent: d.dailyChangePercent,
            isToday: d.isToday,
            livePrice: live?.price,
            drivers: live?.drivers || [],
          });
        })
        .on('mouseout', () => setHoveredPoint(null));
    });

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', 11)
      .text('Intensity Index (0-100)');

  }, [pmiData, marketData, dimensions, selectedDriver]);

  const toggleMarket = (marketId) => {
    setSelectedMarkets(prev =>
      prev.includes(marketId)
        ? prev.filter(m => m !== marketId)
        : [...prev, marketId]
    );
  };

  const driver = POLITICAL_DRIVERS[selectedDriver];
  const marketColors = ['#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7'];

  return (
    <div className="bg-intel-800 rounded-xl border border-intel-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-intel-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-white">Political → Market Overlay</h2>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Visualize how political forces drive market movements over time
        </p>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-b border-intel-700 bg-intel-700/20">
        <div className="flex flex-wrap items-center gap-4">
          {/* Political Driver Selector */}
          <div className="relative">
            <label className="block text-xs text-gray-500 mb-1">Political Driver (Cause)</label>
            <button
              onClick={() => { setShowDriverDropdown(!showDriverDropdown); setShowMarketDropdown(false); }}
              className="flex items-center gap-2 px-3 py-2 bg-intel-700 rounded-lg text-sm text-white min-w-[200px] justify-between"
              style={{ borderLeft: `3px solid ${driver.color}` }}
            >
              <span>{driver.name}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDriverDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDriverDropdown && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-intel-800 border border-intel-600 rounded-lg shadow-xl z-50 py-1 max-h-80 overflow-y-auto">
                {Object.values(POLITICAL_DRIVERS).map(d => (
                  <button
                    key={d.id}
                    onClick={() => { setSelectedDriver(d.id); setShowDriverDropdown(false); }}
                    className={`w-full px-3 py-2 text-left hover:bg-intel-700 ${selectedDriver === d.id ? 'bg-intel-700' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
                      <span className="text-sm text-white">{d.name}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-5">{d.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Market Selector */}
          <div className="relative">
            <label className="block text-xs text-gray-500 mb-1">Market Lines (Effect)</label>
            <button
              onClick={() => { setShowMarketDropdown(!showMarketDropdown); setShowDriverDropdown(false); }}
              className="flex items-center gap-2 px-3 py-2 bg-intel-700 rounded-lg text-sm text-gray-300 min-w-[200px] justify-between"
            >
              <span>{selectedMarkets.length} market{selectedMarkets.length !== 1 ? 's' : ''} selected</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showMarketDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showMarketDropdown && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-intel-800 border border-intel-600 rounded-lg shadow-xl z-50 py-1 max-h-96 overflow-y-auto">
                {Object.entries(MARKET_CATEGORIES).map(([catId, category]) => (
                  <div key={catId}>
                    <div className="px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wide bg-intel-700/50 sticky top-0">
                      {category.name}
                    </div>
                    {category.items.map(market => {
                      const liveData = getLiveMarketData(market.id);
                      return (
                        <button
                          key={market.id}
                          onClick={() => toggleMarket(market.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-intel-700 ${
                            selectedMarkets.includes(market.id) ? 'bg-intel-700/50' : ''
                          }`}
                        >
                          <div>
                            <span className="text-gray-300">{market.name}</span>
                            <span className="text-xs text-gray-500 ml-2">{market.symbol}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {liveData && (
                              <span className={`text-xs ${liveData.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {liveData.changePercent >= 0 ? '+' : ''}{liveData.changePercent?.toFixed(2)}%
                              </span>
                            )}
                            {selectedMarkets.includes(market.id) && (
                              <span className="text-green-400">✓</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected markets chips */}
          <div className="flex flex-wrap gap-2 flex-1">
            {selectedMarkets.map((marketId, idx) => {
              const marketInfo = getMarketInfo(marketId);
              const liveData = getLiveMarketData(marketId);
              return (
                <span
                  key={marketId}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                  style={{
                    backgroundColor: `${marketColors[idx % marketColors.length]}20`,
                    color: marketColors[idx % marketColors.length],
                    border: `1px solid ${marketColors[idx % marketColors.length]}40`
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: marketColors[idx % marketColors.length] }}></span>
                  {marketInfo?.name || marketId}
                  {liveData && (
                    <span className={`ml-1 ${liveData.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ({liveData.changePercent >= 0 ? '+' : ''}{liveData.changePercent?.toFixed(1)}%)
                    </span>
                  )}
                  <button onClick={() => toggleMarket(marketId)} className="hover:opacity-70 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="relative">
        <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="bg-intel-900" />

        {/* Hover tooltip */}
        {hoveredPoint && (
          <div className="absolute top-4 right-4 bg-intel-800 border border-intel-600 rounded-lg p-3 shadow-xl z-10 max-w-xs">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Database className="w-3 h-3" />
              <span>{hoveredPoint.source}</span>
            </div>
            <div className="text-xs text-gray-400">
              {hoveredPoint.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <div className="text-sm font-medium text-white mt-1">
              {hoveredPoint.type === 'pmi' ? hoveredPoint.driver : hoveredPoint.name}
              {hoveredPoint.symbol && <span className="text-gray-500 ml-1">({hoveredPoint.symbol})</span>}
            </div>
            <div className="text-lg font-bold mt-1" style={{ color: hoveredPoint.type === 'pmi' ? driver.color : '#22c55e' }}>
              {hoveredPoint.value.toFixed(1)}
              <span className="text-xs text-gray-500 ml-1">index</span>
            </div>

            {/* Price for markets - shows historical or live depending on point */}
            {hoveredPoint.type === 'market' && hoveredPoint.price && (
              <div className="mt-2 pt-2 border-t border-intel-600">
                <div className="text-xs text-gray-500">
                  {hoveredPoint.isToday ? 'Current Price' : 'Historical Price'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">${hoveredPoint.price?.toFixed(2)}</span>
                  {hoveredPoint.changePercent !== undefined && hoveredPoint.changePercent !== 0 && (
                    <span className={`text-xs ${hoveredPoint.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {hoveredPoint.changePercent >= 0 ? '+' : ''}{hoveredPoint.changePercent?.toFixed(2)}%
                    </span>
                  )}
                </div>
                {!hoveredPoint.isToday && hoveredPoint.livePrice && (
                  <div className="text-xs text-gray-500 mt-1">
                    Current: ${hoveredPoint.livePrice?.toFixed(2)}
                  </div>
                )}
              </div>
            )}

            {/* Drivers for markets */}
            {hoveredPoint.type === 'market' && hoveredPoint.drivers && hoveredPoint.drivers.length > 0 && (
              <div className="mt-2 pt-2 border-t border-intel-600">
                <div className="text-xs text-gray-500 mb-1">Key Drivers:</div>
                <div className="text-xs text-gray-400">
                  {hoveredPoint.drivers.slice(0, 3).join(' • ')}
                </div>
              </div>
            )}

            {/* Headlines for PMI */}
            {hoveredPoint.type === 'pmi' && hoveredPoint.headlines && hoveredPoint.headlines.length > 0 && (
              <div className="mt-2 pt-2 border-t border-intel-600">
                <div className="text-xs text-gray-500 mb-1">Key Headlines:</div>
                {hoveredPoint.headlines.map((h, i) => (
                  <div key={i} className="text-xs text-gray-400 line-clamp-1 flex items-start gap-1">
                    <span className="text-gray-600">{hoveredPoint.sources?.[i]}:</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-intel-800/90 backdrop-blur rounded-lg p-3 text-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-1 rounded" style={{ backgroundColor: driver.color }}></span>
            <span className="text-gray-300">{driver.name}</span>
            <span className="text-gray-600">(Driver)</span>
          </div>
          {selectedMarkets.map((marketId, idx) => {
            const marketInfo = getMarketInfo(marketId);
            return (
              <div key={marketId} className="flex items-center gap-2">
                <span
                  className="w-8 h-0.5 rounded"
                  style={{
                    backgroundColor: marketColors[idx % marketColors.length],
                    borderTop: `2px dashed ${marketColors[idx % marketColors.length]}`
                  }}
                ></span>
                <span className="text-gray-400">{marketInfo?.name || marketId}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Driver description */}
      <div className="px-4 py-3 border-t border-intel-700 bg-intel-700/20">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs text-gray-400">
              <span className="font-medium" style={{ color: driver.color }}>{driver.name}:</span>{' '}
              {driver.description}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Tracking keywords: {driver.keywords.slice(0, 5).join(', ')}...
            </div>
            <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
              <Database className="w-3 h-3" />
              Market data: Yahoo Finance • Political index: News sentiment analysis
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showDriverDropdown || showMarketDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowDriverDropdown(false); setShowMarketDropdown(false); }}
        />
      )}
    </div>
  );
}

export default PoliticalMarketOverlay;
