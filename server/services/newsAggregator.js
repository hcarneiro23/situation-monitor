import Parser from 'rss-parser';
import axios from 'axios';
import NodeCache from 'node-cache';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; SituationMonitor/1.0)'
  }
});

const cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

// Real RSS feeds for geopolitical and financial news
const RSS_SOURCES = [
  // Major Wire Services
  { url: 'https://feeds.reuters.com/reuters/worldNews', source: 'Reuters', category: 'world' },
  { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters', category: 'business' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC', category: 'world' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC', category: 'business' },
  { url: 'https://rss.app/feeds/v1.1/apnews.com.xml', source: 'AP News', category: 'world' },

  // Financial & Economic
  { url: 'https://feeds.bloomberg.com/markets/news.rss', source: 'Bloomberg', category: 'markets' },
  { url: 'https://www.ft.com/rss/home', source: 'Financial Times', category: 'business' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', source: 'MarketWatch', category: 'markets' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', source: 'CNBC', category: 'markets' },
  { url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html', source: 'CNBC', category: 'economy' },
  { url: 'https://finance.yahoo.com/news/rssindex', source: 'Yahoo Finance', category: 'markets' },
  { url: 'https://www.economist.com/finance-and-economics/rss.xml', source: 'Economist', category: 'economy' },
  { url: 'https://www.economist.com/international/rss.xml', source: 'Economist', category: 'world' },
  { url: 'https://feeds.wsj.com/xml/rss/3_7085.xml', source: 'WSJ', category: 'world' },
  { url: 'https://feeds.wsj.com/xml/rss/3_7014.xml', source: 'WSJ', category: 'markets' },

  // Geopolitical Focus
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera', category: 'world' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NYT', category: 'world' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', source: 'NYT', category: 'politics' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', source: 'NYT', category: 'business' },
  { url: 'https://www.theguardian.com/world/rss', source: 'Guardian', category: 'world' },
  { url: 'https://www.politico.com/rss/politicopicks.xml', source: 'Politico', category: 'politics' },
  { url: 'https://www.politico.eu/feed/', source: 'Politico EU', category: 'europe' },

  // Policy & Think Tanks
  { url: 'https://www.brookings.edu/feed/', source: 'Brookings', category: 'policy' },
  { url: 'https://foreignpolicy.com/feed/', source: 'Foreign Policy', category: 'geopolitics' },
  { url: 'https://www.cfr.org/rss.xml', source: 'CFR', category: 'geopolitics' },
  { url: 'https://www.csis.org/feeds/all', source: 'CSIS', category: 'security' },
  { url: 'https://warontherocks.com/feed/', source: 'War on the Rocks', category: 'security' },
  { url: 'https://carnegieendowment.org/rss/solr/?fa=experts', source: 'Carnegie', category: 'policy' },
  { url: 'https://www.atlanticcouncil.org/feed/', source: 'Atlantic Council', category: 'geopolitics' },

  // Regional - Asia
  { url: 'https://www.scmp.com/rss/91/feed', source: 'SCMP', category: 'asia' },
  { url: 'https://asia.nikkei.com/rss/feed/nar', source: 'Nikkei Asia', category: 'asia' },
  { url: 'https://www.japantimes.co.jp/feed/', source: 'Japan Times', category: 'asia' },
  { url: 'https://www.straitstimes.com/news/world/rss.xml', source: 'Straits Times', category: 'asia' },

  // Regional - Europe & Middle East
  { url: 'https://www.dw.com/en/top-stories/rss-12229', source: 'DW', category: 'europe' },
  { url: 'https://www.france24.com/en/rss', source: 'France24', category: 'europe' },
  { url: 'https://www.middleeasteye.net/rss', source: 'Middle East Eye', category: 'middle_east' },
  { url: 'https://www.timesofisrael.com/feed/', source: 'Times of Israel', category: 'middle_east' },

  // Commodities & Energy
  { url: 'https://oilprice.com/rss/main', source: 'OilPrice', category: 'commodities' },
  { url: 'https://www.spglobal.com/commodityinsights/en/rss-feed/commodities', source: 'S&P Global', category: 'commodities' },
  { url: 'https://www.mining.com/feed/', source: 'Mining.com', category: 'commodities' },

  // Defense & Security
  { url: 'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml', source: 'Defense News', category: 'defense' },
  { url: 'https://breakingdefense.com/feed/', source: 'Breaking Defense', category: 'defense' },
  { url: 'https://www.janes.com/feeds/news', source: 'Janes', category: 'defense' },

  // Central Banks & Monetary
  { url: 'https://www.centralbanking.com/rss', source: 'Central Banking', category: 'monetary' },
];

// Keywords for market relevance scoring
const MARKET_KEYWORDS = {
  high: [
    'sanctions', 'tariff', 'trade war', 'central bank', 'interest rate', 'fed', 'ecb',
    'inflation', 'gdp', 'recession', 'default', 'debt ceiling', 'fiscal', 'monetary',
    'opec', 'oil price', 'gas price', 'commodity', 'currency', 'devaluation',
    'war', 'conflict', 'invasion', 'military', 'nuclear', 'attack',
    'election', 'coup', 'regime', 'government collapse', 'political crisis',
    'supply chain', 'shortage', 'embargo', 'blockade', 'export ban',
    'tech ban', 'chip', 'semiconductor', 'rare earth', 'critical minerals'
  ],
  medium: [
    'policy', 'regulation', 'legislation', 'bill', 'law', 'treaty',
    'summit', 'negotiation', 'diplomatic', 'alliance', 'partnership',
    'investment', 'acquisition', 'merger', 'ipo', 'earnings',
    'unemployment', 'jobs', 'manufacturing', 'industrial', 'production',
    'protest', 'strike', 'unrest', 'demonstration', 'riot'
  ],
  low: [
    'statement', 'comment', 'speech', 'interview', 'report', 'analysis',
    'meeting', 'visit', 'ceremony', 'anniversary', 'commemoration'
  ]
};

// Region-market mappings
const REGION_EXPOSURE = {
  'china': ['FXI', 'KWEB', 'BABA', 'copper', 'CNY', 'semiconductors', 'rare earth'],
  'russia': ['RSX', 'oil', 'gas', 'wheat', 'RUB', 'palladium', 'nickel'],
  'ukraine': ['wheat', 'corn', 'sunflower', 'neon', 'European defense'],
  'middle east': ['oil', 'XLE', 'defense', 'gold', 'safe havens'],
  'iran': ['oil', 'shipping', 'defense', 'gold'],
  'taiwan': ['semiconductors', 'TSM', 'INTC', 'NVDA', 'AMD', 'tech supply chain'],
  'europe': ['EUR', 'DAX', 'gas', 'EWG', 'European banks'],
  'japan': ['JPY', 'EWJ', 'JGB', 'auto', 'electronics'],
  'india': ['INDA', 'INR', 'pharmaceuticals', 'IT services'],
  'brazil': ['EWZ', 'BRL', 'soybeans', 'iron ore', 'coffee'],
  'mexico': ['EWW', 'MXN', 'nearshoring', 'auto manufacturing'],
  'saudi arabia': ['oil', 'OPEC', 'KSA', 'petrodollar'],
  'united states': ['SPY', 'USD', 'treasuries', 'tech', 'defense'],
  'united kingdom': ['GBP', 'EWU', 'gilts', 'financial services'],
};

// Transmission channels
const TRANSMISSION_CHANNELS = {
  sanctions: 'Policy -> Trade Restriction -> Supply -> Pricing',
  tariff: 'Policy -> Trade Cost -> Import Price -> Consumer Price',
  'interest rate': 'Monetary Policy -> Credit Cost -> Investment -> Growth',
  'central bank': 'Monetary Policy -> Currency -> Competitiveness -> Trade',
  war: 'Conflict -> Supply Disruption -> Commodity Price -> Inflation',
  conflict: 'Conflict -> Risk Premium -> Safe Haven Flows -> Asset Reallocation',
  election: 'Political Change -> Policy Uncertainty -> Market Volatility',
  'supply chain': 'Disruption -> Shortage -> Price Spike -> Margin Compression',
  oil: 'Energy Price -> Input Cost -> Transportation -> Broad Inflation',
  semiconductor: 'Tech Supply -> Production Bottleneck -> Sector Impact -> Tech Valuations',
};

// Normalize date to ISO format with robust parsing
function normalizeDate(dateInput) {
  if (!dateInput) return new Date().toISOString();

  try {
    const date = new Date(dateInput);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('[NewsAggregator] Invalid date:', dateInput);
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (e) {
    console.warn('[NewsAggregator] Date parse error:', dateInput, e.message);
    return new Date().toISOString();
  }
}

function scoreMarketRelevance(title, content) {
  const text = `${title} ${content}`.toLowerCase();
  let score = 0;

  MARKET_KEYWORDS.high.forEach(kw => {
    if (text.includes(kw)) score += 3;
  });
  MARKET_KEYWORDS.medium.forEach(kw => {
    if (text.includes(kw)) score += 1.5;
  });
  MARKET_KEYWORDS.low.forEach(kw => {
    if (text.includes(kw)) score += 0.5;
  });

  return Math.min(score, 10); // Cap at 10
}

function detectRegions(text) {
  const regions = [];
  const textLower = text.toLowerCase();

  Object.keys(REGION_EXPOSURE).forEach(region => {
    if (textLower.includes(region)) {
      regions.push(region);
    }
  });

  // Additional country detection
  const countries = [
    'china', 'chinese', 'beijing', 'russia', 'russian', 'moscow', 'putin',
    'ukraine', 'ukrainian', 'kyiv', 'iran', 'iranian', 'tehran',
    'taiwan', 'taiwanese', 'taipei', 'israel', 'israeli', 'palestine',
    'saudi', 'arabia', 'riyadh', 'turkey', 'turkish', 'ankara',
    'germany', 'german', 'berlin', 'france', 'french', 'paris',
    'japan', 'japanese', 'tokyo', 'india', 'indian', 'delhi', 'modi',
    'brazil', 'brazilian', 'mexico', 'mexican', 'venezuela',
    'north korea', 'pyongyang', 'kim jong', 'south korea', 'seoul'
  ];

  countries.forEach(country => {
    if (textLower.includes(country)) {
      // Map to region
      if (country.includes('china') || country.includes('beijing')) regions.push('china');
      if (country.includes('russia') || country.includes('moscow') || country.includes('putin')) regions.push('russia');
      if (country.includes('ukrain') || country.includes('kyiv')) regions.push('ukraine');
      if (country.includes('iran') || country.includes('tehran')) regions.push('iran');
      if (country.includes('taiwan') || country.includes('taipei')) regions.push('taiwan');
      if (country.includes('japan') || country.includes('tokyo')) regions.push('japan');
      if (country.includes('india') || country.includes('delhi') || country.includes('modi')) regions.push('india');
      if (country.includes('brazil')) regions.push('brazil');
      if (country.includes('mexico')) regions.push('mexico');
      if (country.includes('saudi') || country.includes('riyadh')) regions.push('saudi arabia');
      if (country.includes('german') || country.includes('berlin')) regions.push('europe');
      if (country.includes('france') || country.includes('paris')) regions.push('europe');
    }
  });

  return [...new Set(regions)];
}

function getExposedMarkets(regions) {
  const markets = new Set();
  regions.forEach(region => {
    const regionMarkets = REGION_EXPOSURE[region] || [];
    regionMarkets.forEach(m => markets.add(m));
  });
  return [...markets];
}

function detectTransmissionChannel(text) {
  const textLower = text.toLowerCase();
  for (const [keyword, channel] of Object.entries(TRANSMISSION_CHANNELS)) {
    if (textLower.includes(keyword)) {
      return channel;
    }
  }
  return 'Information -> Sentiment -> Positioning -> Price';
}

function determineSignalStrength(item) {
  const text = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();

  // Check for confirmation language
  const confirmedPatterns = ['announced', 'confirmed', 'signed', 'enacted', 'passed', 'approved', 'invaded', 'attacked'];
  const buildingPatterns = ['considering', 'planning', 'expected to', 'likely to', 'preparing', 'negotiating', 'talks'];
  const earlyPatterns = ['may', 'could', 'might', 'rumor', 'speculation', 'sources say', 'reportedly'];

  for (const pattern of confirmedPatterns) {
    if (text.includes(pattern)) return 'confirmed';
  }
  for (const pattern of buildingPatterns) {
    if (text.includes(pattern)) return 'building';
  }
  for (const pattern of earlyPatterns) {
    if (text.includes(pattern)) return 'early';
  }

  return 'building';
}

function generateWhyItMatters(item, regions, score) {
  const text = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();
  const matters = [];

  if (text.includes('sanction')) {
    matters.push('Sanctions affect trade flows, currency valuations, and commodity supply chains');
  }
  if (text.includes('tariff') || text.includes('trade war')) {
    matters.push('Trade restrictions impact import costs, corporate margins, and consumer prices');
  }
  if (text.includes('interest rate') || text.includes('central bank') || text.includes('fed ')) {
    matters.push('Monetary policy shifts affect currency strength, borrowing costs, and equity valuations');
  }
  if (text.includes('war') || text.includes('conflict') || text.includes('military')) {
    matters.push('Military developments drive risk premiums, commodity prices, and safe-haven flows');
  }
  if (text.includes('election') || text.includes('vote')) {
    matters.push('Electoral outcomes can shift policy direction, regulatory environment, and market sentiment');
  }
  if (text.includes('oil') || text.includes('opec') || text.includes('energy')) {
    matters.push('Energy prices are a key input cost affecting inflation and corporate margins globally');
  }
  if (text.includes('semiconductor') || text.includes('chip')) {
    matters.push('Semiconductor supply affects technology sector, auto industry, and manufacturing capacity');
  }
  if (text.includes('supply chain')) {
    matters.push('Supply disruptions lead to shortages, price increases, and production delays');
  }

  if (matters.length === 0 && score > 3) {
    matters.push('Developments in this area historically correlate with market volatility and sector rotation');
  }

  return matters.length > 0 ? matters[0] : 'Monitor for second-order effects on related markets';
}

function isNewInformation(item, existingNews) {
  // Check if this is substantially new vs repetition
  const titleWords = item.title.toLowerCase().split(' ').filter(w => w.length > 4);

  for (const existing of existingNews) {
    const existingWords = existing.title.toLowerCase().split(' ').filter(w => w.length > 4);
    const overlap = titleWords.filter(w => existingWords.includes(w)).length;
    if (overlap / titleWords.length > 0.6) {
      return false; // More than 60% word overlap - likely repetition
    }
  }
  return true;
}

async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    return feed.items.slice(0, 15).map(item => ({
      ...item,
      feedSource: source.source,
      feedCategory: source.category
    }));
  } catch (error) {
    console.error(`[NewsAggregator] Failed to fetch ${source.source}:`, error.message);
    return [];
  }
}

export const newsAggregator = {
  async getLatest() {
    const cached = cache.get('news');
    if (cached) return cached;

    console.log('[NewsAggregator] Fetching from', RSS_SOURCES.length, 'sources...');

    // Fetch all feeds in parallel
    const feedPromises = RSS_SOURCES.map(source => fetchFeed(source));
    const feedResults = await Promise.all(feedPromises);

    // Flatten all items
    let allItems = feedResults.flat();
    console.log('[NewsAggregator] Raw items:', allItems.length);

    // Process and enrich each item
    const processedItems = [];
    const seenTitles = new Set();

    for (const item of allItems) {
      // Deduplicate
      const titleKey = item.title.toLowerCase().slice(0, 50);
      if (seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);

      const text = `${item.title} ${item.contentSnippet || ''}`;
      const relevanceScore = scoreMarketRelevance(item.title, item.contentSnippet || '');

      // Only include items with some market relevance
      if (relevanceScore < 1) continue;

      const regions = detectRegions(text);
      const exposedMarkets = getExposedMarkets(regions);

      processedItems.push({
        id: Buffer.from(item.title + item.pubDate).toString('base64').slice(0, 16),
        title: item.title,
        summary: item.contentSnippet || '',
        source: item.feedSource,
        category: item.feedCategory,
        link: item.link,
        pubDate: normalizeDate(item.pubDate || item.isoDate),
        relevanceScore,
        signalStrength: determineSignalStrength(item),
        regions,
        exposedMarkets,
        transmissionChannel: detectTransmissionChannel(text),
        whyItMatters: generateWhyItMatters(item, regions, relevanceScore),
        isNew: isNewInformation(item, processedItems),
        isSignal: relevanceScore >= 5,
      });
    }

    // Sort by relevance score, then by date
    processedItems.sort((a, b) => {
      const scoreDiff = b.relevanceScore - a.relevanceScore;
      if (Math.abs(scoreDiff) > 1) return scoreDiff;
      return new Date(b.pubDate) - new Date(a.pubDate);
    });

    const result = processedItems.slice(0, 100);
    cache.set('news', result);

    return result;
  },

  // Group news by narrative/theme
  clusterByNarrative(news) {
    const clusters = {
      'US-China Relations': [],
      'Russia-Ukraine Conflict': [],
      'Middle East Tensions': [],
      'Central Bank Policy': [],
      'Trade & Tariffs': [],
      'Energy Markets': [],
      'Tech & Semiconductors': [],
      'Elections & Politics': [],
      'Other Developments': []
    };

    news.forEach(item => {
      const text = `${item.title} ${item.summary}`.toLowerCase();

      if (text.includes('china') && (text.includes('us') || text.includes('america') || text.includes('tariff') || text.includes('trade'))) {
        clusters['US-China Relations'].push(item);
      } else if (text.includes('russia') || text.includes('ukraine') || text.includes('putin') || text.includes('kyiv')) {
        clusters['Russia-Ukraine Conflict'].push(item);
      } else if (text.includes('israel') || text.includes('iran') || text.includes('saudi') || text.includes('gaza') || text.includes('houthi')) {
        clusters['Middle East Tensions'].push(item);
      } else if (text.includes('fed ') || text.includes('ecb') || text.includes('central bank') || text.includes('interest rate') || text.includes('monetary')) {
        clusters['Central Bank Policy'].push(item);
      } else if (text.includes('tariff') || text.includes('trade') || text.includes('export') || text.includes('import') || text.includes('sanction')) {
        clusters['Trade & Tariffs'].push(item);
      } else if (text.includes('oil') || text.includes('gas') || text.includes('opec') || text.includes('energy')) {
        clusters['Energy Markets'].push(item);
      } else if (text.includes('semiconductor') || text.includes('chip') || text.includes('tech') || text.includes('ai ') || text.includes('nvidia')) {
        clusters['Tech & Semiconductors'].push(item);
      } else if (text.includes('election') || text.includes('vote') || text.includes('parliament') || text.includes('congress')) {
        clusters['Elections & Politics'].push(item);
      } else {
        clusters['Other Developments'].push(item);
      }
    });

    return Object.fromEntries(
      Object.entries(clusters).filter(([_, items]) => items.length > 0)
    );
  }
};
