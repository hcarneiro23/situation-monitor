import yahooFinance from 'yahoo-finance2';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 60 }); // 1 minute cache

// Suppress yahoo-finance2 validation warnings
yahooFinance.suppressNotices(['yahooSurvey']);

// Key market symbols to track
const SYMBOLS = {
  // Major Indices
  indices: [
    { symbol: '^GSPC', name: 'S&P 500', category: 'index' },
    { symbol: '^DJI', name: 'Dow Jones', category: 'index' },
    { symbol: '^IXIC', name: 'NASDAQ', category: 'index' },
    { symbol: '^VIX', name: 'VIX', category: 'volatility' },
    { symbol: '^STOXX50E', name: 'Euro Stoxx 50', category: 'index' },
    { symbol: '^N225', name: 'Nikkei 225', category: 'index' },
    { symbol: '^HSI', name: 'Hang Seng', category: 'index' },
  ],
  // Commodities
  commodities: [
    { symbol: 'CL=F', name: 'Crude Oil WTI', category: 'energy' },
    { symbol: 'BZ=F', name: 'Brent Crude', category: 'energy' },
    { symbol: 'NG=F', name: 'Natural Gas', category: 'energy' },
    { symbol: 'GC=F', name: 'Gold', category: 'precious metals' },
    { symbol: 'SI=F', name: 'Silver', category: 'precious metals' },
    { symbol: 'HG=F', name: 'Copper', category: 'industrial metals' },
    { symbol: 'ZW=F', name: 'Wheat', category: 'agriculture' },
    { symbol: 'ZC=F', name: 'Corn', category: 'agriculture' },
    { symbol: 'ZS=F', name: 'Soybeans', category: 'agriculture' },
  ],
  // FX Pairs
  fx: [
    { symbol: 'EURUSD=X', name: 'EUR/USD', category: 'fx' },
    { symbol: 'GBPUSD=X', name: 'GBP/USD', category: 'fx' },
    { symbol: 'USDJPY=X', name: 'USD/JPY', category: 'fx' },
    { symbol: 'USDCNY=X', name: 'USD/CNY', category: 'fx' },
    { symbol: 'USDCHF=X', name: 'USD/CHF', category: 'fx' },
    { symbol: 'DX-Y.NYB', name: 'Dollar Index', category: 'fx' },
  ],
  // Rates/Bonds
  rates: [
    { symbol: '^TNX', name: '10Y Treasury', category: 'rates' },
    { symbol: '^TYX', name: '30Y Treasury', category: 'rates' },
    { symbol: '^FVX', name: '5Y Treasury', category: 'rates' },
    { symbol: '^IRX', name: '13W Treasury', category: 'rates' },
  ],
  // Sector ETFs
  sectors: [
    { symbol: 'XLE', name: 'Energy Sector', category: 'sector' },
    { symbol: 'XLF', name: 'Financials', category: 'sector' },
    { symbol: 'XLK', name: 'Technology', category: 'sector' },
    { symbol: 'XLV', name: 'Healthcare', category: 'sector' },
    { symbol: 'XLI', name: 'Industrials', category: 'sector' },
    { symbol: 'XLP', name: 'Consumer Staples', category: 'sector' },
    { symbol: 'XLU', name: 'Utilities', category: 'sector' },
  ],
  // Geopolitically relevant
  geopolitical: [
    { symbol: 'FXI', name: 'China Large Cap', category: 'country' },
    { symbol: 'EWJ', name: 'Japan', category: 'country' },
    { symbol: 'EWG', name: 'Germany', category: 'country' },
    { symbol: 'EWU', name: 'UK', category: 'country' },
    { symbol: 'INDA', name: 'India', category: 'country' },
    { symbol: 'EWZ', name: 'Brazil', category: 'country' },
    { symbol: 'EWW', name: 'Mexico', category: 'country' },
  ]
};

// Political/policy drivers for each asset
const ASSET_DRIVERS = {
  'CL=F': ['OPEC policy', 'Middle East tensions', 'US sanctions on Iran/Russia', 'Global demand outlook', 'SPR releases'],
  'BZ=F': ['OPEC+ decisions', 'European energy policy', 'Russia supply disruptions', 'Asian demand'],
  'NG=F': ['European energy security', 'Russia-EU relations', 'LNG shipping', 'Weather patterns'],
  'GC=F': ['Fed policy', 'Real rates', 'Geopolitical risk', 'USD strength', 'Central bank buying'],
  'SI=F': ['Industrial demand', 'Green energy policy', 'Fed policy', 'Risk sentiment'],
  'HG=F': ['China demand', 'Green transition', 'Supply disruptions', 'Global manufacturing'],
  'ZW=F': ['Ukraine conflict', 'Black Sea shipping', 'Weather', 'Export restrictions'],
  'ZC=F': ['Biofuel policy', 'China demand', 'Weather', 'Fertilizer costs'],
  '^VIX': ['Policy uncertainty', 'Geopolitical risk', 'Market positioning', 'Event calendar'],
  '^GSPC': ['Fed policy', 'Earnings', 'Fiscal policy', 'Trade relations', 'Consumer sentiment'],
  'EURUSD=X': ['ECB vs Fed policy', 'European energy', 'Trade balance', 'Risk sentiment'],
  'USDJPY=X': ['BoJ policy', 'Rate differentials', 'Risk appetite', 'Intervention risk'],
  'USDCNY=X': ['PBoC policy', 'Trade tensions', 'Capital flows', 'Economic data'],
  '^TNX': ['Fed expectations', 'Inflation', 'Debt issuance', 'Flight to safety'],
  'XLE': ['Oil prices', 'Energy policy', 'Capex cycle', 'Transition risk'],
  'XLK': ['Trade policy', 'Chip restrictions', 'AI investment', 'Regulation'],
  'FXI': ['US-China relations', 'Property sector', 'PBoC stimulus', 'COVID policy'],
};

async function fetchYahooQuote(symbol) {
  try {
    // Use yahoo-finance2 which handles authentication automatically
    const [quote, history] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.chart(symbol, {
        period1: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        period2: new Date(),
        interval: '1d'
      }).catch(() => null)
    ]);

    if (!quote) return null;

    const currentPrice = quote.regularMarketPrice;
    const previousClose = quote.regularMarketPreviousClose || quote.previousClose;
    const change = quote.regularMarketChange || (currentPrice - previousClose);
    const changePercent = quote.regularMarketChangePercent || ((change / previousClose) * 100);

    // Extract history closes
    let closes = [];
    if (history && history.quotes) {
      closes = history.quotes
        .filter(q => q.close !== null)
        .map(q => q.close)
        .slice(-5);
    }

    return {
      price: currentPrice,
      previousClose,
      change,
      changePercent,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      marketState: quote.marketState,
      timestamp: quote.regularMarketTime ? new Date(quote.regularMarketTime).toISOString() : new Date().toISOString(),
      history: closes.length > 0 ? closes : [previousClose, currentPrice]
    };
  } catch (error) {
    console.error(`[MarketData] Failed to fetch ${symbol}:`, error.message);
    return null;
  }
}

function determineTrend(history) {
  if (!history || history.length < 2) return 'neutral';
  const recent = history.slice(-3);
  const older = history.slice(0, -3);

  if (recent.length === 0 || older.length === 0) return 'neutral';

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  const diff = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (diff > 1) return 'up';
  if (diff < -1) return 'down';
  return 'neutral';
}

function generateMarketContext(symbol, data) {
  const drivers = ASSET_DRIVERS[symbol] || ['General market sentiment', 'Risk appetite'];
  const trend = determineTrend(data.history);

  let context = '';

  if (Math.abs(data.changePercent) > 2) {
    context = `Significant ${data.changePercent > 0 ? 'rally' : 'selloff'}. `;
  } else if (Math.abs(data.changePercent) > 1) {
    context = `Notable ${data.changePercent > 0 ? 'strength' : 'weakness'}. `;
  }

  context += `Primary drivers: ${drivers.slice(0, 2).join(', ')}. `;

  if (trend !== 'neutral') {
    context += `5-day trend: ${trend === 'up' ? 'bullish' : 'bearish'}.`;
  }

  return context;
}

export const marketDataService = {
  async getAll() {
    const cached = cache.get('markets');
    if (cached) return cached;

    console.log('[MarketData] Fetching market data...');

    const result = {
      indices: [],
      commodities: [],
      fx: [],
      rates: [],
      sectors: [],
      geopolitical: [],
      lastUpdate: new Date().toISOString()
    };

    // Fetch all symbols in parallel (with rate limiting)
    const allSymbols = [
      ...SYMBOLS.indices,
      ...SYMBOLS.commodities,
      ...SYMBOLS.fx,
      ...SYMBOLS.rates,
      ...SYMBOLS.sectors,
      ...SYMBOLS.geopolitical
    ];

    // Batch fetch to avoid rate limits
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < allSymbols.length; i += batchSize) {
      batches.push(allSymbols.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const promises = batch.map(async ({ symbol, name, category }) => {
        const data = await fetchYahooQuote(symbol);
        if (data) {
          return {
            symbol,
            name,
            category,
            ...data,
            trend: determineTrend(data.history),
            context: generateMarketContext(symbol, data),
            drivers: ASSET_DRIVERS[symbol] || []
          };
        }
        return null;
      });

      const results = await Promise.all(promises);

      results.filter(r => r !== null).forEach(item => {
        if (SYMBOLS.indices.find(s => s.symbol === item.symbol)) {
          result.indices.push(item);
        } else if (SYMBOLS.commodities.find(s => s.symbol === item.symbol)) {
          result.commodities.push(item);
        } else if (SYMBOLS.fx.find(s => s.symbol === item.symbol)) {
          result.fx.push(item);
        } else if (SYMBOLS.rates.find(s => s.symbol === item.symbol)) {
          result.rates.push(item);
        } else if (SYMBOLS.sectors.find(s => s.symbol === item.symbol)) {
          result.sectors.push(item);
        } else if (SYMBOLS.geopolitical.find(s => s.symbol === item.symbol)) {
          result.geopolitical.push(item);
        }
      });

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    cache.set('markets', result);
    console.log('[MarketData] Fetched', Object.values(result).flat().length - 1, 'symbols');

    return result;
  },

  async getSymbol(symbol) {
    return fetchYahooQuote(symbol);
  },

  getDrivers(symbol) {
    return ASSET_DRIVERS[symbol] || [];
  }
};
