// Scenario Engine - Dynamically generates scenarios from trending news

// Theme detection patterns for identifying news clusters
const THEME_PATTERNS = {
  'US-China Relations': {
    keywords: ['china', 'beijing', 'xi jinping', 'tariff', 'trade war', 'semiconductor', 'chip', 'taiwan', 'huawei', 'tiktok'],
    paths: [
      { id: 'escalation', name: 'Trade War Escalation', triggers: ['tariff', 'trade war', 'chip ban', 'export control', 'retaliation', 'sanctions'] },
      { id: 'stabilization', name: 'Managed Competition', triggers: ['dialogue', 'talks', 'cooperation', 'agreement', 'communication', 'meeting'] },
      { id: 'deescalation', name: 'Significant De-escalation', triggers: ['breakthrough', 'deal', 'rollback', 'lift sanction', 'agreement signed'] }
    ]
  },
  'Russia-Ukraine Conflict': {
    keywords: ['russia', 'ukraine', 'kyiv', 'moscow', 'putin', 'zelensky', 'kremlin', 'nato', 'crimea', 'donbas'],
    paths: [
      { id: 'escalation', name: 'Conflict Intensification', triggers: ['offensive', 'escalation', 'nuclear', 'nato', 'attack', 'mobilization', 'missile'] },
      { id: 'frozen', name: 'Frozen Conflict', triggers: ['stalemate', 'continued', 'ongoing', 'no change', 'front line'] },
      { id: 'negotiation', name: 'Negotiated Settlement', triggers: ['ceasefire', 'peace', 'negotiate', 'settlement', 'talks', 'agreement', 'truce'] }
    ]
  },
  'Middle East Tensions': {
    keywords: ['israel', 'gaza', 'iran', 'hezbollah', 'houthi', 'saudi', 'tehran', 'netanyahu', 'hamas', 'yemen', 'red sea'],
    paths: [
      { id: 'escalation', name: 'Regional Escalation', triggers: ['iran', 'attack', 'strike', 'retaliation', 'hezbollah', 'houthi', 'war', 'missile'] },
      { id: 'contained', name: 'Contained Instability', triggers: ['ongoing', 'continued', 'limited', 'local', 'proxy'] },
      { id: 'stabilization', name: 'Regional Stabilization', triggers: ['peace', 'ceasefire', 'normalization', 'agreement', 'deal', 'hostage'] }
    ]
  },
  'Federal Reserve Policy': {
    keywords: ['fed', 'federal reserve', 'powell', 'interest rate', 'inflation', 'fomc', 'monetary policy', 'rate cut', 'rate hike'],
    paths: [
      { id: 'hawkish', name: 'Higher for Longer', triggers: ['inflation', 'hawkish', 'rate hike', 'higher for longer', 'restrictive', 'sticky'] },
      { id: 'gradual', name: 'Gradual Normalization', triggers: ['on track', 'gradual', 'data dependent', 'progress', 'moderate', 'soft landing'] },
      { id: 'dovish', name: 'Aggressive Easing', triggers: ['recession', 'crisis', 'emergency', 'large cut', 'dovish pivot', 'slowdown'] }
    ]
  },
  'European Politics': {
    keywords: ['europe', 'eu', 'european union', 'germany', 'france', 'uk', 'brexit', 'macron', 'scholz', 'brussels'],
    paths: [
      { id: 'fragmentation', name: 'Political Fragmentation', triggers: ['populist', 'far-right', 'crisis', 'division', 'protest', 'collapse'] },
      { id: 'stability', name: 'Status Quo', triggers: ['coalition', 'stable', 'maintain', 'continue', 'support'] },
      { id: 'integration', name: 'Deeper Integration', triggers: ['unity', 'reform', 'agreement', 'cooperation', 'joint', 'defense'] }
    ]
  },
  'Energy & Climate': {
    keywords: ['oil', 'opec', 'energy', 'climate', 'renewable', 'gas', 'carbon', 'emission', 'green', 'solar', 'wind'],
    paths: [
      { id: 'crisis', name: 'Energy Crisis', triggers: ['shortage', 'spike', 'cut', 'disruption', 'crisis', 'embargo'] },
      { id: 'transition', name: 'Managed Transition', triggers: ['investment', 'target', 'plan', 'progress', 'renewable', 'capacity'] },
      { id: 'breakthrough', name: 'Green Breakthrough', triggers: ['breakthrough', 'record', 'milestone', 'deal', 'agreement', 'commitment'] }
    ]
  },
  'Latin America': {
    keywords: ['brazil', 'mexico', 'argentina', 'venezuela', 'colombia', 'lula', 'milei', 'maduro', 'latin america', 'south america'],
    paths: [
      { id: 'instability', name: 'Political Instability', triggers: ['protest', 'crisis', 'coup', 'unrest', 'sanctions', 'authoritarian'] },
      { id: 'reform', name: 'Economic Reform', triggers: ['reform', 'imf', 'austerity', 'privatization', 'liberalization'] },
      { id: 'growth', name: 'Regional Growth', triggers: ['growth', 'investment', 'trade', 'cooperation', 'deal'] }
    ]
  },
  'Asia-Pacific': {
    keywords: ['japan', 'korea', 'india', 'asean', 'australia', 'philippines', 'vietnam', 'south china sea', 'indo-pacific'],
    paths: [
      { id: 'tensions', name: 'Rising Tensions', triggers: ['dispute', 'military', 'conflict', 'tension', 'provocation'] },
      { id: 'competition', name: 'Economic Competition', triggers: ['trade', 'investment', 'supply chain', 'manufacturing'] },
      { id: 'cooperation', name: 'Regional Cooperation', triggers: ['alliance', 'agreement', 'partnership', 'summit', 'deal'] }
    ]
  }
};

// Market implications for each path type
const MARKET_IMPLICATIONS = {
  escalation: { bullish: ['defense', 'gold', 'oil'], bearish: ['equities', 'EM', 'risk assets'], neutral: ['treasuries'] },
  deescalation: { bullish: ['equities', 'EM', 'growth'], bearish: ['gold', 'defense', 'VIX'], neutral: ['bonds'] },
  stabilization: { bullish: ['global equities', 'EM'], bearish: ['volatility', 'safe havens'], neutral: ['balanced'] },
  frozen: { bullish: ['defense', 'energy'], bearish: ['European growth'], neutral: ['US assets'] },
  negotiation: { bullish: ['European equities', 'EUR'], bearish: ['oil', 'gold', 'defense'], neutral: ['US equities'] },
  contained: { bullish: ['oil', 'defense'], bearish: ['regional equities'], neutral: ['global markets'] },
  hawkish: { bullish: ['USD', 'financials'], bearish: ['growth stocks', 'bonds', 'EM'], neutral: ['value'] },
  gradual: { bullish: ['broad market', 'quality growth'], bearish: ['extreme positioning'], neutral: ['balanced'] },
  dovish: { bullish: ['treasuries', 'gold', 'defensives'], bearish: ['cyclicals', 'financials'], neutral: ['tech'] },
  fragmentation: { bullish: ['USD', 'gold'], bearish: ['EUR', 'European banks'], neutral: ['US equities'] },
  stability: { bullish: ['European equities'], bearish: ['volatility'], neutral: ['global markets'] },
  integration: { bullish: ['EUR', 'European growth'], bearish: ['USD'], neutral: ['global diversified'] },
  crisis: { bullish: ['oil', 'gas', 'energy stocks'], bearish: ['airlines', 'industrials'], neutral: ['renewables'] },
  transition: { bullish: ['renewables', 'EVs', 'green tech'], bearish: ['oil majors', 'coal'], neutral: ['utilities'] },
  breakthrough: { bullish: ['clean energy', 'tech'], bearish: ['fossil fuels'], neutral: ['balanced'] },
  instability: { bullish: ['USD', 'gold'], bearish: ['EM', 'regional currencies'], neutral: ['US assets'] },
  reform: { bullish: ['local equities', 'bonds'], bearish: ['incumbents'], neutral: ['diversified EM'] },
  growth: { bullish: ['EM', 'commodities'], bearish: ['USD'], neutral: ['global diversified'] },
  tensions: { bullish: ['defense', 'gold'], bearish: ['regional equities'], neutral: ['US assets'] },
  competition: { bullish: ['supply chain diversification'], bearish: ['China-exposed'], neutral: ['balanced'] },
  cooperation: { bullish: ['regional equities', 'trade'], bearish: ['protectionism plays'], neutral: ['global'] }
};

const BASE_SCENARIOS = [
  {
    id: 'us-china-trade',
    theme: 'US-China Relations',
    title: 'US-China Trade & Tech Tension',
    paths: [
      {
        id: 'escalation',
        name: 'Trade War Escalation',
        description: 'Expanding tariffs, tech restrictions, and retaliatory measures',
        baseProbability: 30,
        triggers: ['tariff', 'trade war', 'chip ban', 'export control', 'retaliation'],
        signposts: [
          'New tariff announcements',
          'Expanded entity list additions',
          'Retaliatory measures from China',
          'Tech sector decoupling actions'
        ],
        marketImplications: {
          bullish: ['US domestic manufacturing', 'defense', 'reshoring beneficiaries'],
          bearish: ['China-exposed multinationals', 'semiconductors', 'global trade ETFs'],
          neutral: ['US treasuries', 'gold']
        }
      },
      {
        id: 'stabilization',
        name: 'Managed Competition',
        description: 'Continued tension but with guardrails, selective engagement',
        baseProbability: 50,
        triggers: ['dialogue', 'talks', 'cooperation', 'agreement', 'communication'],
        signposts: [
          'High-level diplomatic meetings',
          'Targeted agreements on specific issues',
          'Reduced rhetoric from both sides',
          'Restoration of military communication'
        ],
        marketImplications: {
          bullish: ['global equities', 'EM', 'trade-sensitive sectors'],
          bearish: ['volatility', 'safe havens'],
          neutral: ['sector-neutral positioning']
        }
      },
      {
        id: 'deescalation',
        name: 'Significant De-escalation',
        description: 'Major diplomatic breakthrough, tariff rollback',
        baseProbability: 20,
        triggers: ['breakthrough', 'deal', 'rollback', 'lift sanction', 'agreement signed'],
        signposts: [
          'Phase 2 trade deal progress',
          'Tariff reductions announced',
          'Tech cooperation frameworks',
          'Summit meetings scheduled'
        ],
        marketImplications: {
          bullish: ['FXI', 'KWEB', 'global trade', 'semiconductors', 'EM'],
          bearish: ['USD', 'defense', 'reshoring plays'],
          neutral: []
        }
      }
    ]
  },
  {
    id: 'russia-ukraine',
    theme: 'Russia-Ukraine Conflict',
    title: 'Eastern European Security',
    paths: [
      {
        id: 'escalation',
        name: 'Conflict Intensification',
        description: 'Major offensive, expanded scope, or NATO involvement risk',
        baseProbability: 25,
        triggers: ['offensive', 'escalation', 'nuclear', 'nato', 'attack', 'mobilization'],
        signposts: [
          'Large-scale military operations',
          'Attacks on NATO territory',
          'Nuclear rhetoric escalation',
          'New weapons systems deployed'
        ],
        marketImplications: {
          bullish: ['oil', 'gas', 'defense', 'gold', 'wheat'],
          bearish: ['European equities', 'EUR', 'global risk assets'],
          neutral: ['US treasuries']
        }
      },
      {
        id: 'frozen',
        name: 'Frozen Conflict',
        description: 'Continued fighting at current levels, no resolution',
        baseProbability: 50,
        triggers: ['stalemate', 'continued', 'ongoing', 'no change'],
        signposts: [
          'Stable front lines',
          'Continued Western support',
          'No peace talks progress',
          'Sanctions remain in place'
        ],
        marketImplications: {
          bullish: ['defense', 'European energy alternatives'],
          bearish: ['European growth', 'European banks'],
          neutral: ['US assets', 'Asian markets']
        }
      },
      {
        id: 'negotiation',
        name: 'Negotiated Settlement',
        description: 'Peace talks progress, ceasefire, or territorial compromise',
        baseProbability: 25,
        triggers: ['ceasefire', 'peace', 'negotiate', 'settlement', 'talks', 'agreement'],
        signposts: [
          'Direct negotiations announced',
          'Ceasefire implementation',
          'Third-party mediation progress',
          'Sanctions relief discussion'
        ],
        marketImplications: {
          bullish: ['European equities', 'EUR', 'global growth', 'Ukraine reconstruction'],
          bearish: ['oil', 'gas', 'defense', 'gold'],
          neutral: ['US equities']
        }
      }
    ]
  },
  {
    id: 'middle-east',
    theme: 'Middle East Tensions',
    title: 'Regional Security & Oil',
    paths: [
      {
        id: 'escalation',
        name: 'Regional Escalation',
        description: 'Wider conflict involving multiple state actors',
        baseProbability: 25,
        triggers: ['iran', 'attack', 'strike', 'retaliation', 'hezbollah', 'houthi', 'war'],
        signposts: [
          'Direct state-to-state military action',
          'Oil infrastructure attacks',
          'Shipping disruptions expand',
          'US military engagement'
        ],
        marketImplications: {
          bullish: ['oil', 'gold', 'defense', 'VIX'],
          bearish: ['airlines', 'shipping', 'regional equities'],
          neutral: ['US treasuries']
        }
      },
      {
        id: 'contained',
        name: 'Contained Instability',
        description: 'Ongoing tensions but limited to current scope',
        baseProbability: 50,
        triggers: ['ongoing', 'continued', 'limited', 'local'],
        signposts: [
          'Proxy conflicts continue',
          'Oil supply largely unaffected',
          'No major power escalation',
          'Diplomatic efforts ongoing'
        ],
        marketImplications: {
          bullish: ['oil (moderate support)', 'defense'],
          bearish: ['regional tourism', 'Israel equities'],
          neutral: ['global markets']
        }
      },
      {
        id: 'stabilization',
        name: 'Regional Stabilization',
        description: 'Peace agreements, normalization progress',
        baseProbability: 25,
        triggers: ['peace', 'ceasefire', 'normalization', 'agreement', 'deal'],
        signposts: [
          'Saudi-Israel normalization progress',
          'Iran nuclear deal revival',
          'Hostage releases',
          'Regional economic cooperation'
        ],
        marketImplications: {
          bullish: ['regional equities', 'EM', 'global growth'],
          bearish: ['oil', 'gold', 'defense'],
          neutral: ['energy transition plays']
        }
      }
    ]
  },
  {
    id: 'fed-policy',
    theme: 'Federal Reserve Policy',
    title: 'US Monetary Policy Path',
    paths: [
      {
        id: 'hawkish',
        name: 'Higher for Longer',
        description: 'Fed maintains restrictive stance, delays cuts',
        baseProbability: 35,
        triggers: ['inflation', 'hawkish', 'rate hike', 'higher for longer', 'restrictive'],
        signposts: [
          'Inflation remains above target',
          'Strong labor market data',
          'Hawkish Fed commentary',
          'Market reprices cut expectations'
        ],
        marketImplications: {
          bullish: ['USD', 'financials', 'value stocks'],
          bearish: ['growth stocks', 'bonds', 'EM', 'real estate'],
          neutral: []
        }
      },
      {
        id: 'gradual',
        name: 'Gradual Normalization',
        description: 'Measured rate cuts as inflation moderates',
        baseProbability: 45,
        triggers: ['on track', 'gradual', 'data dependent', 'progress', 'moderate'],
        signposts: [
          'Inflation trending toward target',
          'Labor market cooling orderly',
          '25bp cuts at select meetings',
          'Balance sheet reduction continues'
        ],
        marketImplications: {
          bullish: ['broad market', 'quality growth', 'investment grade credit'],
          bearish: ['short USD', 'extreme positioning'],
          neutral: ['balanced allocation']
        }
      },
      {
        id: 'dovish',
        name: 'Aggressive Easing',
        description: 'Rapid cuts due to economic weakness',
        baseProbability: 20,
        triggers: ['recession', 'crisis', 'emergency', 'large cut', 'dovish pivot'],
        signposts: [
          'Sharp economic deterioration',
          'Financial stress emergence',
          'Inflation collapses',
          'Unemployment spikes'
        ],
        marketImplications: {
          bullish: ['treasuries', 'gold', 'defensive sectors'],
          bearish: ['cyclicals', 'financials', 'credit'],
          neutral: ['tech (mixed)']
        }
      }
    ]
  }
];

function matchesPath(text, path) {
  const textLower = text.toLowerCase();
  let matches = 0;
  path.triggers.forEach(trigger => {
    if (textLower.includes(trigger)) matches++;
  });
  return matches;
}

// Detect which themes are trending in the news
function detectTrendingThemes(news) {
  const themeScores = {};
  const combinedText = news.map(n => `${n.title} ${n.summary}`.toLowerCase()).join(' ');

  for (const [themeName, themeData] of Object.entries(THEME_PATTERNS)) {
    let score = 0;
    let matchedKeywords = [];

    themeData.keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = (combinedText.match(regex) || []).length;
      if (matches > 0) {
        score += matches;
        matchedKeywords.push(keyword);
      }
    });

    if (score > 0) {
      themeScores[themeName] = { score, matchedKeywords, ...themeData };
    }
  }

  // Sort by score and return top themes
  return Object.entries(themeScores)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 6) // Top 6 trending themes
    .map(([name, data]) => ({ name, ...data }));
}

// Generate a dynamic scenario from a trending theme
function generateDynamicScenario(theme, news, signals) {
  const themeNews = news.filter(item => {
    const text = `${item.title} ${item.summary}`.toLowerCase();
    return theme.keywords.some(kw => text.includes(kw));
  });

  const combinedText = themeNews.map(n => `${n.title} ${n.summary}`).join(' ');

  // Create scenario with dynamic paths
  const paths = theme.paths.map(pathTemplate => {
    const matches = matchesPath(combinedText, pathTemplate);
    const implications = MARKET_IMPLICATIONS[pathTemplate.id] || { bullish: [], bearish: [], neutral: [] };

    return {
      id: pathTemplate.id,
      name: pathTemplate.name,
      description: `Based on ${themeNews.length} recent news items`,
      baseProbability: 33,
      currentProbability: 33,
      triggers: pathTemplate.triggers,
      matchCount: matches,
      signposts: generateSignposts(pathTemplate, themeNews),
      marketImplications: implications
    };
  });

  // Calculate probabilities based on match counts
  const totalMatches = paths.reduce((sum, p) => sum + p.matchCount, 0);

  if (totalMatches > 0) {
    let totalProb = 0;
    paths.forEach(path => {
      const weight = path.matchCount / totalMatches;
      path.currentProbability = Math.round(20 + (weight * 60)); // 20-80% range
      totalProb += path.currentProbability;
    });

    // Normalize to 100%
    paths.forEach(path => {
      path.currentProbability = Math.round((path.currentProbability / totalProb) * 100);
    });
  }

  // Find leading path
  const leadingPath = paths.reduce((max, p) =>
    p.currentProbability > max.currentProbability ? p : max
  );

  return {
    id: theme.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    theme: theme.name,
    title: generateScenarioTitle(theme, themeNews),
    newsCount: themeNews.length,
    trendScore: theme.score,
    paths,
    leadingPath: leadingPath.id,
    relatedNews: themeNews.slice(0, 5).map(n => ({
      id: n.id,
      title: n.title,
      source: n.source,
      timestamp: n.timestamp
    })),
    activeSignals: signals.filter(s =>
      theme.keywords.some(kw =>
        s.name.toLowerCase().includes(kw) ||
        s.affectedRegions.some(r => r.toLowerCase().includes(kw))
      )
    ).map(s => s.id),
    lastUpdate: new Date().toISOString()
  };
}

// Generate relevant signposts from news headlines
function generateSignposts(path, news) {
  const signposts = [];
  const pathTriggers = path.triggers;

  news.forEach(item => {
    const text = `${item.title}`.toLowerCase();
    if (pathTriggers.some(t => text.includes(t))) {
      signposts.push(item.title.slice(0, 80) + (item.title.length > 80 ? '...' : ''));
    }
  });

  return signposts.slice(0, 4);
}

// Generate a title based on the most impactful news
function generateScenarioTitle(theme, news) {
  if (news.length === 0) return theme.name;

  // Find the most recent high-impact headline
  const topNews = news[0];
  const keywords = theme.keywords;

  // Extract key context from headline
  for (const kw of keywords) {
    if (topNews.title.toLowerCase().includes(kw)) {
      return `${theme.name}: ${topNews.title.slice(0, 40)}...`;
    }
  }

  return theme.name;
}

export const scenarioEngine = {
  updateScenarios(signals, news) {
    // Detect trending themes from current news
    const trendingThemes = detectTrendingThemes(news);

    if (trendingThemes.length === 0) {
      // Fallback to base scenarios if no themes detected
      return JSON.parse(JSON.stringify(BASE_SCENARIOS)).map(s => ({
        ...s,
        paths: s.paths.map(p => ({ ...p, currentProbability: p.baseProbability })),
        leadingPath: s.paths[0].id,
        relatedNews: [],
        activeSignals: [],
        lastUpdate: new Date().toISOString()
      }));
    }

    // Generate dynamic scenarios from trending themes
    const scenarios = trendingThemes.map(theme =>
      generateDynamicScenario(theme, news, signals)
    );

    // Sort by trend score (most trending first)
    scenarios.sort((a, b) => b.trendScore - a.trendScore);

    return scenarios;
  },

  getScenarioByTheme(scenarios, theme) {
    return scenarios.find(s =>
      s.theme.toLowerCase().includes(theme.toLowerCase())
    );
  },

  getMarketExposure(scenarios) {
    const exposure = {
      bullish: new Map(),
      bearish: new Map(),
      uncertain: []
    };

    scenarios.forEach(scenario => {
      const leadingPath = scenario.paths.find(p => p.id === scenario.leadingPath);
      if (!leadingPath) return;

      const probability = leadingPath.currentProbability / 100;

      leadingPath.marketImplications.bullish.forEach(market => {
        const current = exposure.bullish.get(market) || 0;
        exposure.bullish.set(market, current + probability);
      });

      leadingPath.marketImplications.bearish.forEach(market => {
        const current = exposure.bearish.get(market) || 0;
        exposure.bearish.set(market, current + probability);
      });
    });

    return {
      bullish: [...exposure.bullish.entries()].sort((a, b) => b[1] - a[1]),
      bearish: [...exposure.bearish.entries()].sort((a, b) => b[1] - a[1])
    };
  }
};
