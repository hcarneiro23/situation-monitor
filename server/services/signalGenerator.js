// Signal Generator - Derives actionable signals from news flow

const SIGNAL_TEMPLATES = {
  sanctions: {
    name: 'Sanctions Risk',
    description: 'New or expanded economic sanctions activity',
    keywords: ['sanction', 'restrict', 'ban', 'blacklist', 'penalty', 'freeze assets', 'embargo', 'blocked', 'prohibited'],
    markets: ['FXI', 'RSX', 'oil', 'gold', 'USD'],
    historicalResponse: 'Sanctions typically cause 5-15% decline in targeted country ETFs, commodity supply disruption, and USD strength'
  },
  escalation: {
    name: 'Conflict Escalation',
    description: 'Military or geopolitical escalation risk',
    keywords: ['attack', 'strike', 'military', 'troops', 'invasion', 'missile', 'bomb', 'war', 'offensive', 'combat', 'soldier', 'army', 'navy', 'airstrike', 'shell', 'artillery', 'weapon', 'drone', 'casualt', 'killed', 'wounded', 'battle', 'front line', 'advance'],
    markets: ['oil', 'gold', 'defense', 'VIX', 'treasuries'],
    historicalResponse: 'Escalation drives oil +3-10%, gold +1-3%, VIX +20-40%, safe haven flows into USD and treasuries'
  },
  deescalation: {
    name: 'De-escalation Progress',
    description: 'Diplomatic progress or tension reduction',
    keywords: ['ceasefire', 'negotiat', 'talks', 'peace', 'agreement', 'withdraw', 'diplomatic', 'dialogue', 'truce', 'summit', 'treaty', 'accord', 'deal'],
    markets: ['risk assets', 'equities', 'EM', 'oil', 'gold'],
    historicalResponse: 'De-escalation typically reverses risk-off positioning, supports EM and cyclicals, pressures gold and VIX'
  },
  policyHawk: {
    name: 'Hawkish Policy Shift',
    description: 'Central banks signaling tighter policy',
    keywords: ['rate hike', 'hawkish', 'inflation', 'tightening', 'restrictive', 'higher for longer', 'fed', 'ecb', 'boe', 'central bank', 'monetary policy', 'price pressure', 'overheating'],
    markets: ['bonds', 'growth stocks', 'USD', 'gold', 'real estate'],
    historicalResponse: 'Hawkish shifts cause bond yields +10-30bp, growth stock underperformance, USD strength'
  },
  policyDove: {
    name: 'Dovish Policy Shift',
    description: 'Central banks signaling easier policy',
    keywords: ['rate cut', 'dovish', 'pause', 'accommodation', 'easing', 'stimulus', 'quantitative', 'inject', 'support', 'slowdown', 'recession risk'],
    markets: ['bonds', 'growth stocks', 'gold', 'EM'],
    historicalResponse: 'Dovish shifts support duration assets, growth stocks, weaken USD, support EM'
  },
  supplyShock: {
    name: 'Supply Chain Stress',
    description: 'Disruptions to critical supply chains',
    keywords: ['shortage', 'supply chain', 'disruption', 'bottleneck', 'export ban', 'shipping', 'port', 'logistics', 'backlog', 'delay', 'inventory', 'stockpile'],
    markets: ['commodities', 'transport', 'manufacturing'],
    historicalResponse: 'Supply shocks cause commodity price spikes, margin compression for dependent industries'
  },
  tradeWar: {
    name: 'Trade Tension',
    description: 'Trade restrictions between major economies',
    keywords: ['tariff', 'trade war', 'import duty', 'retaliat', 'trade barrier', 'protectionism', 'trade deficit', 'trade deal', 'trade negotiat', 'customs', 'dumping', 'wto'],
    markets: ['global trade', 'EM', 'industrials', 'agriculture'],
    historicalResponse: 'Trade tensions hurt exporters, support domestic alternatives, increase inflation'
  },
  politicalRisk: {
    name: 'Political Instability',
    description: 'Government instability or political change',
    keywords: ['coup', 'resign', 'collapse', 'impeach', 'protest', 'unrest', 'crisis', 'election', 'vote', 'referendum', 'parliament', 'government', 'opposition', 'coalition', 'scandal'],
    markets: ['local currency', 'local equities', 'regional EM'],
    historicalResponse: 'Political instability causes local asset selloff, currency weakness, regional contagion'
  },
  techRestriction: {
    name: 'Tech Decoupling',
    description: 'Technology trade or investment restrictions',
    keywords: ['chip', 'semiconductor', 'export control', 'tech restriction', 'ai ', 'artificial intelligence', 'nvidia', 'tsmc', 'intel', 'asml', 'huawei', 'tech war', 'data'],
    markets: ['semiconductors', 'tech hardware', 'China tech'],
    historicalResponse: 'Tech restrictions disrupt supply chains, benefit domestic alternatives, hurt cross-border tech'
  },
  energyShock: {
    name: 'Energy Supply Risk',
    description: 'Threats to energy supply or prices',
    keywords: ['opec', 'oil', 'pipeline', 'refinery', 'lng', 'energy', 'gas', 'crude', 'brent', 'wti', 'petroleum', 'fuel', 'barrel', 'production cut'],
    markets: ['oil', 'natural gas', 'energy sector', 'utilities', 'transport'],
    historicalResponse: 'Energy supply risks cause price spikes, benefit producers, hurt consumers and transport'
  },
  middleEast: {
    name: 'Middle East Tension',
    description: 'Regional tensions in Middle East',
    keywords: ['israel', 'iran', 'gaza', 'hamas', 'hezbollah', 'saudi', 'yemen', 'houthi', 'lebanon', 'syria', 'iraq', 'gulf', 'strait of hormuz', 'red sea'],
    markets: ['oil', 'gold', 'defense', 'shipping'],
    historicalResponse: 'Middle East tensions drive oil premiums, shipping disruption, defense sector gains'
  },
  chinaUS: {
    name: 'US-China Relations',
    description: 'Developments in US-China relationship',
    keywords: ['china', 'beijing', 'xi jinping', 'us-china', 'sino-american', 'taiwan', 'south china sea', 'decoupling', 'trade war'],
    markets: ['FXI', 'KWEB', 'semiconductors', 'CNY', 'rare earth'],
    historicalResponse: 'US-China tensions impact tech supply chains, EM sentiment, and global trade flows'
  },
  russiaUkraine: {
    name: 'Russia-Ukraine Conflict',
    description: 'Developments in Russia-Ukraine war',
    keywords: ['russia', 'ukraine', 'kyiv', 'moscow', 'putin', 'zelensky', 'crimea', 'donbas', 'nato'],
    markets: ['oil', 'gas', 'wheat', 'European defense', 'EUR'],
    historicalResponse: 'Conflict developments impact European energy, agricultural commodities, and defense spending'
  },
  currencyRisk: {
    name: 'Currency Volatility',
    description: 'Major currency movements or intervention',
    keywords: ['dollar', 'euro', 'yen', 'yuan', 'currency', 'forex', 'exchange rate', 'devaluation', 'intervention', 'fx'],
    markets: ['USD', 'EUR', 'JPY', 'CNY', 'EM currencies'],
    historicalResponse: 'Currency volatility affects trade competitiveness, inflation pass-through, and EM debt servicing'
  }
};

function calculateSignalStrength(matchCount, avgRelevance, recentMatches, totalKeywordHits) {
  // Base score from match count (each matching article adds strength)
  let strength = Math.min(matchCount * 12, 50);

  // Boost from average relevance of matching articles
  strength += avgRelevance * 3;

  // Boost from recency (more recent = stronger signal)
  strength += recentMatches * 8;

  // Boost from total keyword hits (articles with multiple keyword matches)
  strength += Math.min(totalKeywordHits * 2, 20);

  return Math.min(Math.round(strength), 100);
}

function determineDirection(keywords, text) {
  const textLower = text.toLowerCase();

  // Check for negation or reversal language
  const negationPatterns = ['avoid', 'prevent', 'reduce', 'ease', 'relief', 'end', 'resolve'];
  const intensifyPatterns = ['increase', 'escalate', 'expand', 'new', 'additional', 'further', 'more'];

  let direction = 'neutral';

  for (const pattern of intensifyPatterns) {
    if (textLower.includes(pattern)) {
      direction = 'increasing';
      break;
    }
  }

  for (const pattern of negationPatterns) {
    if (textLower.includes(pattern)) {
      direction = 'decreasing';
      break;
    }
  }

  return direction;
}

function findRelatedNews(news, signalType) {
  const template = SIGNAL_TEMPLATES[signalType];
  if (!template) return { items: [], totalKeywordHits: 0 };

  let totalKeywordHits = 0;

  const items = news.filter(item => {
    const text = `${item.title} ${item.summary}`.toLowerCase();
    const hits = template.keywords.filter(kw => text.includes(kw)).length;
    if (hits > 0) {
      totalKeywordHits += hits;
      return true;
    }
    return false;
  }).slice(0, 10); // Take more items for better signal strength

  return { items, totalKeywordHits };
}

function generateWhatChanged(relatedNews) {
  if (relatedNews.length === 0) return 'No specific trigger identified';

  const sources = [...new Set(relatedNews.map(n => n.source))];
  const topics = relatedNews.map(n => n.title.slice(0, 50)).join('; ');

  return `${relatedNews.length} related items from ${sources.join(', ')}. Key: ${topics}`;
}

export const signalGenerator = {
  generateFromNews(news, markets) {
    const signals = [];
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const sixHoursAgo = new Date(now - 6 * 60 * 60 * 1000);

    for (const [signalType, template] of Object.entries(SIGNAL_TEMPLATES)) {
      // Find all news matching this signal type
      const { items: relatedNews, totalKeywordHits } = findRelatedNews(news, signalType);

      if (relatedNews.length === 0) continue;

      // Calculate metrics
      const matchCount = relatedNews.length;
      const avgRelevance = relatedNews.reduce((sum, n) => sum + (n.relevanceScore || 5), 0) / matchCount;
      const recentMatches = relatedNews.filter(n => new Date(n.pubDate) > sixHoursAgo).length;

      const strength = calculateSignalStrength(matchCount, avgRelevance, recentMatches, totalKeywordHits);

      // Only include signals with meaningful strength (lowered threshold)
      if (strength < 15) continue;

      // Determine if signal is strengthening or weakening
      const combinedText = relatedNews.map(n => `${n.title} ${n.summary}`).join(' ');
      const direction = determineDirection(template.keywords, combinedText);

      // Get affected regions from news
      const affectedRegions = [...new Set(relatedNews.flatMap(n => n.regions || []))];

      // Build signal
      signals.push({
        id: signalType,
        type: signalType,
        name: template.name,
        description: template.description,
        strength,
        direction,
        confidence: Math.min(strength + 10, 95),
        whatChanged: generateWhatChanged(relatedNews),
        whyItMatters: template.historicalResponse,
        affectedMarkets: template.markets,
        affectedRegions,
        relatedNewsIds: relatedNews.map(n => n.id),
        newsCount: matchCount,
        recentNewsCount: recentMatches,
        signalStrengthLabel: strength >= 70 ? 'strong' : strength >= 40 ? 'moderate' : 'emerging',
        lastUpdate: new Date().toISOString()
      });
    }

    // Sort by strength
    signals.sort((a, b) => b.strength - a.strength);

    return signals;
  },

  // Get signal-market correlation
  getMarketCorrelation(signalType) {
    const template = SIGNAL_TEMPLATES[signalType];
    if (!template) return null;

    return {
      directlyAffected: template.markets,
      historicalResponse: template.historicalResponse
    };
  },

  // Check if a specific signal should trigger an alert
  shouldAlert(signal, previousSignals) {
    const previous = previousSignals.find(s => s.id === signal.id);

    if (!previous) {
      // New signal with high strength
      return signal.strength >= 50;
    }

    // Significant strength increase
    const strengthIncrease = signal.strength - previous.strength;
    if (strengthIncrease >= 15) return true;

    // Direction change
    if (signal.direction !== previous.direction && signal.direction === 'increasing') return true;

    return false;
  }
};
