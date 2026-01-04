// Signal Generator - Derives actionable signals from news flow

const SIGNAL_TEMPLATES = {
  sanctions: {
    name: 'Sanctions Risk',
    description: 'Probability of new or expanded economic sanctions',
    keywords: ['sanction', 'restrict', 'ban', 'blacklist', 'penalty', 'freeze assets'],
    markets: ['FXI', 'RSX', 'oil', 'gold', 'USD'],
    historicalResponse: 'Sanctions typically cause 5-15% decline in targeted country ETFs, commodity supply disruption, and USD strength'
  },
  escalation: {
    name: 'Conflict Escalation',
    description: 'Risk of military or geopolitical escalation',
    keywords: ['attack', 'strike', 'military', 'troops', 'invasion', 'missile', 'bomb', 'war', 'offensive'],
    markets: ['oil', 'gold', 'defense', 'VIX', 'treasuries'],
    historicalResponse: 'Escalation drives oil +3-10%, gold +1-3%, VIX +20-40%, safe haven flows into USD and treasuries'
  },
  deescalation: {
    name: 'De-escalation Progress',
    description: 'Signs of diplomatic progress or tension reduction',
    keywords: ['ceasefire', 'negotiate', 'talks', 'peace', 'agreement', 'withdraw', 'diplomatic'],
    markets: ['risk assets', 'equities', 'EM', 'oil', 'gold'],
    historicalResponse: 'De-escalation typically reverses risk-off positioning, supports EM and cyclicals, pressures gold and VIX'
  },
  policyHawk: {
    name: 'Hawkish Policy Shift',
    description: 'Central banks signaling tighter monetary policy',
    keywords: ['rate hike', 'hawkish', 'inflation concern', 'tightening', 'restrictive', 'higher for longer'],
    markets: ['bonds', 'growth stocks', 'USD', 'gold', 'real estate'],
    historicalResponse: 'Hawkish shifts cause bond yields +10-30bp, growth stock underperformance, USD strength'
  },
  policyDove: {
    name: 'Dovish Policy Shift',
    description: 'Central banks signaling easier monetary policy',
    keywords: ['rate cut', 'dovish', 'pause', 'accommodation', 'support', 'easing', 'stimulus'],
    markets: ['bonds', 'growth stocks', 'gold', 'EM'],
    historicalResponse: 'Dovish shifts support duration assets, growth stocks, weaken USD, support EM'
  },
  supplyShock: {
    name: 'Supply Chain Stress',
    description: 'Disruptions to critical supply chains',
    keywords: ['shortage', 'supply chain', 'disruption', 'bottleneck', 'export ban', 'shipping', 'port'],
    markets: ['affected commodities', 'transport', 'manufacturing'],
    historicalResponse: 'Supply shocks cause commodity price spikes, margin compression for dependent industries'
  },
  tradeWar: {
    name: 'Trade Tension',
    description: 'Escalating trade restrictions between major economies',
    keywords: ['tariff', 'trade war', 'import duty', 'retaliation', 'trade barrier', 'protectionism'],
    markets: ['global trade', 'EM', 'industrials', 'agriculture'],
    historicalResponse: 'Trade tensions hurt exporters, support domestic alternatives, increase inflation'
  },
  politicalRisk: {
    name: 'Political Instability',
    description: 'Government instability or unexpected political change',
    keywords: ['coup', 'resign', 'collapse', 'impeach', 'protest', 'unrest', 'crisis', 'snap election'],
    markets: ['local currency', 'local equities', 'regional EM'],
    historicalResponse: 'Political instability causes local asset selloff, currency weakness, regional contagion'
  },
  techRestriction: {
    name: 'Tech Decoupling',
    description: 'Restrictions on technology trade or investment',
    keywords: ['chip ban', 'semiconductor', 'export control', 'tech restriction', 'AI regulation', 'data localization'],
    markets: ['semiconductors', 'tech hardware', 'China tech'],
    historicalResponse: 'Tech restrictions disrupt supply chains, benefit domestic alternatives, hurt cross-border tech'
  },
  energyShock: {
    name: 'Energy Supply Risk',
    description: 'Threats to energy supply or major price movements',
    keywords: ['opec', 'oil cut', 'pipeline', 'refinery', 'lng', 'energy crisis', 'gas supply'],
    markets: ['oil', 'natural gas', 'energy sector', 'utilities', 'transport'],
    historicalResponse: 'Energy supply risks cause price spikes, benefit producers, hurt consumers and transport'
  }
};

function calculateSignalStrength(matchCount, newsRelevance, recentMatches) {
  // Base score from match count
  let strength = Math.min(matchCount * 15, 60);

  // Boost from news relevance
  strength += newsRelevance * 5;

  // Boost from recency (more recent = stronger signal)
  strength += recentMatches * 10;

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
  if (!template) return [];

  return news.filter(item => {
    const text = `${item.title} ${item.summary}`.toLowerCase();
    return template.keywords.some(kw => text.includes(kw));
  }).slice(0, 5);
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

    for (const [signalType, template] of Object.entries(SIGNAL_TEMPLATES)) {
      // Find all news matching this signal type
      const relatedNews = findRelatedNews(news, signalType);

      if (relatedNews.length === 0) continue;

      // Calculate metrics
      const matchCount = relatedNews.length;
      const avgRelevance = relatedNews.reduce((sum, n) => sum + n.relevanceScore, 0) / matchCount;
      const recentMatches = relatedNews.filter(n => new Date(n.pubDate) > oneHourAgo).length;

      const strength = calculateSignalStrength(matchCount, avgRelevance, recentMatches);

      // Only include signals with meaningful strength
      if (strength < 20) continue;

      // Determine if signal is strengthening or weakening
      const combinedText = relatedNews.map(n => `${n.title} ${n.summary}`).join(' ');
      const direction = determineDirection(template.keywords, combinedText);

      // Get affected regions from news
      const affectedRegions = [...new Set(relatedNews.flatMap(n => n.regions))];

      // Build signal
      signals.push({
        id: signalType,
        type: signalType,
        name: template.name,
        description: template.description,
        strength,
        direction,
        confidence: Math.min(strength + 10, 95), // Confidence slightly higher than strength
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
