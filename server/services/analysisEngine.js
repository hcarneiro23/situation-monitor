// Analysis Engine - Generates summaries and relationship maps

const RELATIONSHIP_MAP = {
  nodes: [
    // Major Powers
    { id: 'us', name: 'United States', type: 'country', bloc: 'west', importance: 10 },
    { id: 'china', name: 'China', type: 'country', bloc: 'east', importance: 10 },
    { id: 'russia', name: 'Russia', type: 'country', bloc: 'east', importance: 8 },
    { id: 'eu', name: 'European Union', type: 'bloc', bloc: 'west', importance: 9 },
    { id: 'japan', name: 'Japan', type: 'country', bloc: 'west', importance: 7 },
    { id: 'india', name: 'India', type: 'country', bloc: 'neutral', importance: 7 },

    // Key Regional Players
    { id: 'saudi', name: 'Saudi Arabia', type: 'country', bloc: 'neutral', importance: 7 },
    { id: 'iran', name: 'Iran', type: 'country', bloc: 'east', importance: 6 },
    { id: 'israel', name: 'Israel', type: 'country', bloc: 'west', importance: 6 },
    { id: 'ukraine', name: 'Ukraine', type: 'country', bloc: 'west', importance: 6 },
    { id: 'taiwan', name: 'Taiwan', type: 'country', bloc: 'west', importance: 7 },
    { id: 'turkey', name: 'Turkey', type: 'country', bloc: 'neutral', importance: 5 },
    { id: 'brazil', name: 'Brazil', type: 'country', bloc: 'neutral', importance: 5 },

    // Key Industries
    { id: 'semiconductors', name: 'Semiconductors', type: 'industry', importance: 9 },
    { id: 'energy', name: 'Energy', type: 'industry', importance: 9 },
    { id: 'defense', name: 'Defense', type: 'industry', importance: 7 },
    { id: 'tech', name: 'Technology', type: 'industry', importance: 8 },
    { id: 'finance', name: 'Financial Services', type: 'industry', importance: 8 },
    { id: 'agriculture', name: 'Agriculture', type: 'industry', importance: 6 },
    { id: 'shipping', name: 'Shipping/Trade', type: 'industry', importance: 7 },

    // Critical Resources
    { id: 'oil', name: 'Crude Oil', type: 'commodity', importance: 9 },
    { id: 'gas', name: 'Natural Gas', type: 'commodity', importance: 8 },
    { id: 'chips', name: 'Advanced Chips', type: 'commodity', importance: 9 },
    { id: 'rare_earth', name: 'Rare Earths', type: 'commodity', importance: 7 },
    { id: 'wheat', name: 'Wheat/Grain', type: 'commodity', importance: 6 },
  ],

  edges: [
    // US relationships
    { source: 'us', target: 'china', type: 'rivalry', strength: 9, label: 'Strategic Competition' },
    { source: 'us', target: 'russia', type: 'rivalry', strength: 8, label: 'Adversarial' },
    { source: 'us', target: 'eu', type: 'alliance', strength: 8, label: 'NATO/Trade' },
    { source: 'us', target: 'japan', type: 'alliance', strength: 9, label: 'Security Treaty' },
    { source: 'us', target: 'taiwan', type: 'support', strength: 8, label: 'Strategic Ambiguity' },
    { source: 'us', target: 'israel', type: 'alliance', strength: 9, label: 'Strategic Ally' },
    { source: 'us', target: 'saudi', type: 'partnership', strength: 6, label: 'Energy/Security' },

    // China relationships
    { source: 'china', target: 'russia', type: 'partnership', strength: 7, label: 'Strategic Partnership' },
    { source: 'china', target: 'taiwan', type: 'claim', strength: 10, label: 'Territorial Claim' },
    { source: 'china', target: 'iran', type: 'partnership', strength: 5, label: 'Oil/Trade' },
    { source: 'china', target: 'saudi', type: 'trade', strength: 6, label: 'Oil Imports' },

    // Russia relationships
    { source: 'russia', target: 'ukraine', type: 'conflict', strength: 10, label: 'Active Conflict' },
    { source: 'russia', target: 'eu', type: 'rivalry', strength: 8, label: 'Sanctions/Energy' },
    { source: 'russia', target: 'iran', type: 'partnership', strength: 6, label: 'Military/Trade' },

    // Middle East
    { source: 'iran', target: 'israel', type: 'rivalry', strength: 9, label: 'Adversarial' },
    { source: 'iran', target: 'saudi', type: 'rivalry', strength: 7, label: 'Regional Rivalry' },
    { source: 'saudi', target: 'israel', type: 'emerging', strength: 4, label: 'Normalization Process' },

    // Supply chain dependencies
    { source: 'taiwan', target: 'semiconductors', type: 'production', strength: 10, label: '90% Advanced Chips' },
    { source: 'china', target: 'rare_earth', type: 'production', strength: 9, label: '60% Global Supply' },
    { source: 'china', target: 'semiconductors', type: 'demand', strength: 9, label: 'Major Consumer' },
    { source: 'russia', target: 'oil', type: 'production', strength: 8, label: 'Major Exporter' },
    { source: 'russia', target: 'gas', type: 'production', strength: 9, label: 'Major Exporter' },
    { source: 'saudi', target: 'oil', type: 'production', strength: 10, label: 'Swing Producer' },
    { source: 'ukraine', target: 'wheat', type: 'production', strength: 7, label: 'Major Exporter' },
    { source: 'russia', target: 'wheat', type: 'production', strength: 8, label: 'Major Exporter' },

    // Industry-market links
    { source: 'semiconductors', target: 'tech', type: 'input', strength: 10, label: 'Critical Input' },
    { source: 'oil', target: 'energy', type: 'input', strength: 10, label: 'Primary Fuel' },
    { source: 'gas', target: 'energy', type: 'input', strength: 9, label: 'Primary Fuel' },
  ]
};

function analyzeNewsForThemes(news) {
  const themes = {
    'US-China': { count: 0, items: [], sentiment: 0 },
    'Russia-Ukraine': { count: 0, items: [], sentiment: 0 },
    'Middle East': { count: 0, items: [], sentiment: 0 },
    'Central Banks': { count: 0, items: [], sentiment: 0 },
    'Energy': { count: 0, items: [], sentiment: 0 },
    'Tech/Chips': { count: 0, items: [], sentiment: 0 },
  };

  news.forEach(item => {
    const text = `${item.title} ${item.summary}`.toLowerCase();

    if (text.includes('china') && (text.includes('us') || text.includes('america') || text.includes('trade') || text.includes('tariff'))) {
      themes['US-China'].count++;
      themes['US-China'].items.push(item);
    }
    if (text.includes('russia') || text.includes('ukraine') || text.includes('putin') || text.includes('zelensky')) {
      themes['Russia-Ukraine'].count++;
      themes['Russia-Ukraine'].items.push(item);
    }
    if (text.includes('israel') || text.includes('iran') || text.includes('saudi') || text.includes('gaza') || text.includes('houthi') || text.includes('hezbollah')) {
      themes['Middle East'].count++;
      themes['Middle East'].items.push(item);
    }
    if (text.includes('fed ') || text.includes('ecb') || text.includes('central bank') || text.includes('rate') || text.includes('inflation') || text.includes('monetary')) {
      themes['Central Banks'].count++;
      themes['Central Banks'].items.push(item);
    }
    if (text.includes('oil') || text.includes('gas') || text.includes('opec') || text.includes('energy')) {
      themes['Energy'].count++;
      themes['Energy'].items.push(item);
    }
    if (text.includes('chip') || text.includes('semiconductor') || text.includes('ai ') || text.includes('tech')) {
      themes['Tech/Chips'].count++;
      themes['Tech/Chips'].items.push(item);
    }
  });

  return themes;
}

function generateWhatMattersNow(news, signals, scenarios) {
  const themes = analyzeNewsForThemes(news);
  const sortedThemes = Object.entries(themes)
    .filter(([_, data]) => data.count > 0)
    .sort((a, b) => b[1].count - a[1].count);

  const topSignals = signals.slice(0, 3);
  const activeScenarios = scenarios.filter(s => s.relatedNews && s.relatedNews.length > 0);

  // Generate key developments
  const keyDevelopments = sortedThemes.slice(0, 4).map(([theme, data]) => {
    const topItem = data.items[0];
    return {
      theme,
      headline: topItem?.title || `${theme} developments`,
      itemCount: data.count,
      topSource: topItem?.source || 'Multiple sources',
      relevance: topItem?.relevanceScore || 5
    };
  });

  // Determine confidence and uncertainty
  const highConfidenceItems = news.filter(n => n.signalStrength === 'confirmed').length;
  const uncertainItems = news.filter(n => n.signalStrength === 'early').length;
  const overallConfidence = highConfidenceItems > uncertainItems ? 'moderate-high' : 'moderate';

  // Generate what would change the view
  const viewChangers = [];
  if (topSignals.length > 0) {
    topSignals.forEach(signal => {
      if (signal.direction === 'increasing') {
        viewChangers.push(`De-escalation in ${signal.name.toLowerCase()} would reduce risk premium`);
      } else {
        viewChangers.push(`Escalation in ${signal.name.toLowerCase()} would increase risk`);
      }
    });
  }

  return {
    timestamp: new Date().toISOString(),
    keyDevelopments,
    activeSignals: topSignals.map(s => ({
      name: s.name,
      strength: s.signalStrengthLabel,
      direction: s.direction
    })),
    dominantThemes: sortedThemes.slice(0, 3).map(([theme]) => theme),
    overallConfidence,
    uncertaintyLevel: uncertainItems > 10 ? 'elevated' : 'normal',
    whatWouldChangeView: viewChangers,
    newsAnalyzed: news.length,
    signalsActive: signals.length,
    summary: generateNarrativeSummary(keyDevelopments, topSignals)
  };
}

function generateNarrativeSummary(developments, signals) {
  if (developments.length === 0) {
    return 'Limited high-relevance news flow. Markets may be driven by technical factors and positioning.';
  }

  const parts = [];

  // Lead with most important development
  const lead = developments[0];
  parts.push(`${lead.theme} remains a key focus with ${lead.itemCount} relevant items.`);

  // Add signal context
  if (signals.length > 0) {
    const strongSignals = signals.filter(s => s.strength >= 50);
    if (strongSignals.length > 0) {
      parts.push(`Active signals include ${strongSignals.map(s => s.name.toLowerCase()).join(', ')}.`);
    }
  }

  // Add secondary themes
  if (developments.length > 1) {
    const secondary = developments.slice(1, 3).map(d => d.theme).join(' and ');
    parts.push(`Also monitor ${secondary} for potential catalysts.`);
  }

  return parts.join(' ');
}

export const analysisEngine = {
  generateSummary(news, signals, scenarios) {
    return generateWhatMattersNow(news, signals, scenarios);
  },

  getRelationshipMap() {
    return RELATIONSHIP_MAP;
  },

  getNodeConnections(nodeId) {
    const connections = RELATIONSHIP_MAP.edges.filter(
      e => e.source === nodeId || e.target === nodeId
    );

    return connections.map(conn => ({
      ...conn,
      connectedNode: conn.source === nodeId ? conn.target : conn.source,
      connectedNodeName: RELATIONSHIP_MAP.nodes.find(
        n => n.id === (conn.source === nodeId ? conn.target : conn.source)
      )?.name
    }));
  },

  getSupplyChainExposure(commodity) {
    const producers = RELATIONSHIP_MAP.edges.filter(
      e => e.target === commodity && e.type === 'production'
    );

    const consumers = RELATIONSHIP_MAP.edges.filter(
      e => e.target === commodity && e.type === 'demand'
    );

    return {
      commodity,
      producers: producers.map(p => ({
        country: RELATIONSHIP_MAP.nodes.find(n => n.id === p.source)?.name,
        share: p.label
      })),
      consumers: consumers.map(c => ({
        country: RELATIONSHIP_MAP.nodes.find(n => n.id === c.source)?.name,
        importance: c.label
      })),
      risks: getRisksForCommodity(commodity)
    };
  },

  getRiskTransmissionPath(fromNode, toNode) {
    // Simple BFS to find connection path
    const visited = new Set();
    const queue = [[fromNode]];

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (current === toNode) {
        return path.map((nodeId, i) => {
          const node = RELATIONSHIP_MAP.nodes.find(n => n.id === nodeId);
          const nextNode = path[i + 1];
          const edge = nextNode ? RELATIONSHIP_MAP.edges.find(
            e => (e.source === nodeId && e.target === nextNode) ||
              (e.target === nodeId && e.source === nextNode)
          ) : null;

          return {
            node: node?.name || nodeId,
            type: node?.type,
            connectionType: edge?.type,
            connectionLabel: edge?.label
          };
        });
      }

      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = RELATIONSHIP_MAP.edges
          .filter(e => e.source === current || e.target === current)
          .map(e => e.source === current ? e.target : e.source);

        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push([...path, neighbor]);
          }
        }
      }
    }

    return null; // No path found
  }
};

function getRisksForCommodity(commodity) {
  const risks = {
    oil: ['OPEC production decisions', 'Middle East conflict', 'Sanctions on Russia/Iran', 'US shale output'],
    gas: ['Russia-EU relations', 'LNG shipping capacity', 'Weather demand', 'Infrastructure attacks'],
    chips: ['Taiwan Strait tensions', 'US export controls', 'China retaliation', 'Manufacturing concentration'],
    rare_earth: ['China export restrictions', 'Processing bottlenecks', 'Geopolitical leverage'],
    wheat: ['Black Sea shipping', 'Ukraine conflict', 'Export restrictions', 'Weather events']
  };

  return risks[commodity] || ['Supply disruption', 'Demand shock', 'Policy intervention'];
}
