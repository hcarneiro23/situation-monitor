// Scenario Engine - Manages geopolitical scenarios and probabilities

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

export const scenarioEngine = {
  updateScenarios(signals, news) {
    const scenarios = JSON.parse(JSON.stringify(BASE_SCENARIOS));

    // Combine all news text for matching
    const recentNews = news.slice(0, 50);
    const combinedText = recentNews.map(n => `${n.title} ${n.summary}`).join(' ');

    scenarios.forEach(scenario => {
      let totalMatches = 0;
      const pathScores = [];

      scenario.paths.forEach(path => {
        const matches = matchesPath(combinedText, path);
        totalMatches += matches;
        pathScores.push({
          id: path.id,
          matches,
          base: path.baseProbability
        });
      });

      // Adjust probabilities based on news matches
      if (totalMatches > 0) {
        let totalAdjusted = 0;

        scenario.paths.forEach((path, i) => {
          const score = pathScores[i];
          // Increase probability for paths with more matches
          const adjustment = (score.matches / totalMatches) * 30; // Up to 30% adjustment
          path.currentProbability = Math.min(Math.max(score.base + adjustment, 5), 80);
          totalAdjusted += path.currentProbability;
        });

        // Normalize to 100%
        scenario.paths.forEach(path => {
          path.currentProbability = Math.round((path.currentProbability / totalAdjusted) * 100);
        });
      } else {
        // Use base probabilities
        scenario.paths.forEach(path => {
          path.currentProbability = path.baseProbability;
        });
      }

      // Determine which path is "leading"
      const leadingPath = scenario.paths.reduce((max, path) =>
        path.currentProbability > max.currentProbability ? path : max
      );
      scenario.leadingPath = leadingPath.id;

      // Find relevant news for this scenario
      scenario.relatedNews = news.filter(item => {
        const itemText = `${item.title} ${item.summary}`.toLowerCase();
        return scenario.paths.some(path =>
          path.triggers.some(trigger => itemText.includes(trigger))
        );
      }).slice(0, 5).map(n => ({ id: n.id, title: n.title, source: n.source }));

      // Connect to signals
      scenario.activeSignals = signals.filter(signal => {
        const signalType = signal.type;
        return scenario.paths.some(path =>
          path.triggers.some(trigger => signalType.includes(trigger)) ||
          signal.affectedRegions.some(region =>
            scenario.theme.toLowerCase().includes(region)
          )
        );
      }).map(s => s.id);

      scenario.lastUpdate = new Date().toISOString();
    });

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
