// Event Calendar - Tracks upcoming geopolitical and economic events

import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 });

// Known recurring events and their market sensitivity
const KNOWN_EVENTS = [
  // Central Bank Meetings
  { type: 'fomc', name: 'FOMC Meeting', frequency: '6-weekly', sensitivity: 'high', markets: ['equities', 'bonds', 'USD', 'gold'] },
  { type: 'ecb', name: 'ECB Meeting', frequency: '6-weekly', sensitivity: 'high', markets: ['EUR', 'European equities', 'bunds'] },
  { type: 'boj', name: 'BoJ Meeting', frequency: 'monthly', sensitivity: 'high', markets: ['JPY', 'JGB', 'Nikkei'] },
  { type: 'pboc', name: 'PBoC Rate Decision', frequency: 'monthly', sensitivity: 'medium', markets: ['CNY', 'China equities', 'commodities'] },

  // Economic Data
  { type: 'nfp', name: 'US Nonfarm Payrolls', frequency: 'monthly', sensitivity: 'high', markets: ['equities', 'bonds', 'USD'] },
  { type: 'cpi', name: 'US CPI', frequency: 'monthly', sensitivity: 'high', markets: ['bonds', 'gold', 'USD', 'equities'] },
  { type: 'gdp', name: 'US GDP', frequency: 'quarterly', sensitivity: 'high', markets: ['equities', 'bonds', 'USD'] },

  // Political/Geopolitical
  { type: 'election', name: 'Election', frequency: 'varies', sensitivity: 'very high', markets: ['local currency', 'local equities', 'volatility'] },
  { type: 'summit', name: 'International Summit', frequency: 'varies', sensitivity: 'medium', markets: ['geopolitically exposed assets'] },
  { type: 'opec', name: 'OPEC+ Meeting', frequency: 'monthly', sensitivity: 'high', markets: ['oil', 'energy sector', 'petrocurrencies'] },
];

// Generate upcoming events based on known schedule
function generateUpcomingEvents() {
  const events = [];
  const now = new Date();

  // FOMC meetings 2024-2025 (approximate)
  const fomcDates = [
    '2025-01-29', '2025-03-19', '2025-05-07', '2025-06-18',
    '2025-07-30', '2025-09-17', '2025-11-05', '2025-12-17'
  ];

  fomcDates.forEach(date => {
    const eventDate = new Date(date);
    if (eventDate > now) {
      events.push({
        id: `fomc-${date}`,
        type: 'central_bank',
        name: 'Federal Reserve FOMC Meeting',
        date: date,
        sensitivity: 'high',
        description: 'Interest rate decision and economic projections',
        markets: ['S&P 500', 'Treasuries', 'USD', 'Gold'],
        whatToWatch: 'Rate decision, dot plot, Powell press conference tone',
        potentialImpact: 'High - Can move markets 1-3% intraday'
      });
    }
  });

  // ECB meetings
  const ecbDates = [
    '2025-01-30', '2025-03-06', '2025-04-17', '2025-06-05',
    '2025-07-17', '2025-09-11', '2025-10-30', '2025-12-18'
  ];

  ecbDates.forEach(date => {
    const eventDate = new Date(date);
    if (eventDate > now) {
      events.push({
        id: `ecb-${date}`,
        type: 'central_bank',
        name: 'ECB Monetary Policy Meeting',
        date: date,
        sensitivity: 'high',
        description: 'Eurozone interest rate decision',
        markets: ['EUR/USD', 'European equities', 'Bunds'],
        whatToWatch: 'Rate decision, inflation outlook, Lagarde comments',
        potentialImpact: 'High - EUR can move 50-100 pips'
      });
    }
  });

  // OPEC+ meetings (monthly)
  for (let i = 0; i < 6; i++) {
    const opecDate = new Date(now);
    opecDate.setMonth(opecDate.getMonth() + i);
    opecDate.setDate(1); // First week typically

    events.push({
      id: `opec-${opecDate.toISOString().slice(0, 7)}`,
      type: 'commodity',
      name: 'OPEC+ Meeting',
      date: opecDate.toISOString().slice(0, 10),
      sensitivity: 'high',
      description: 'Oil production quota decisions',
      markets: ['Crude Oil', 'Energy Sector', 'Petrocurrencies'],
      whatToWatch: 'Production targets, compliance, voluntary cuts',
      potentialImpact: 'High - Oil can move 3-5% on surprises'
    });
  }

  // Monthly US data releases (approximate)
  for (let i = 0; i < 3; i++) {
    const month = new Date(now);
    month.setMonth(month.getMonth() + i);

    // NFP - First Friday
    const nfpDate = new Date(month.getFullYear(), month.getMonth(), 1);
    while (nfpDate.getDay() !== 5) nfpDate.setDate(nfpDate.getDate() + 1);

    if (nfpDate > now) {
      events.push({
        id: `nfp-${nfpDate.toISOString().slice(0, 10)}`,
        type: 'economic_data',
        name: 'US Nonfarm Payrolls',
        date: nfpDate.toISOString().slice(0, 10),
        sensitivity: 'high',
        description: 'Monthly employment report',
        markets: ['S&P 500', 'Treasuries', 'USD'],
        whatToWatch: 'Headline jobs, unemployment rate, wage growth',
        potentialImpact: 'High - Major driver of Fed expectations'
      });
    }

    // CPI - Around 10th-13th
    const cpiDate = new Date(month.getFullYear(), month.getMonth(), 12);
    if (cpiDate > now) {
      events.push({
        id: `cpi-${cpiDate.toISOString().slice(0, 10)}`,
        type: 'economic_data',
        name: 'US CPI Inflation',
        date: cpiDate.toISOString().slice(0, 10),
        sensitivity: 'very_high',
        description: 'Consumer Price Index report',
        markets: ['Treasuries', 'Gold', 'Growth stocks', 'USD'],
        whatToWatch: 'Headline CPI, Core CPI, shelter costs',
        potentialImpact: 'Very High - Can trigger major repricing'
      });
    }
  }

  // Known political events
  const politicalEvents = [
    {
      id: 'germany-election-2025',
      type: 'election',
      name: 'German Federal Election',
      date: '2025-02-23',
      sensitivity: 'high',
      description: 'German parliamentary elections',
      markets: ['DAX', 'EUR', 'European banks'],
      whatToWatch: 'Coalition formation, fiscal policy direction',
      potentialImpact: 'High - Major implications for EU policy'
    },
    {
      id: 'us-debt-ceiling',
      type: 'political',
      name: 'US Debt Ceiling Deadline',
      date: '2025-01-02',
      sensitivity: 'very_high',
      description: 'Federal debt limit reinstatement',
      markets: ['Treasuries', 'USD', 'Equities', 'VIX'],
      whatToWatch: 'Congressional negotiations, Treasury actions',
      potentialImpact: 'Very High - Potential for major volatility'
    }
  ];

  politicalEvents.forEach(event => {
    const eventDate = new Date(event.date);
    if (eventDate > now) {
      events.push(event);
    }
  });

  // Sort by date
  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  return events.slice(0, 30); // Return next 30 events
}

function calculateDaysUntil(date) {
  const now = new Date();
  const eventDate = new Date(date);
  const diff = eventDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getUrgencyLevel(daysUntil) {
  if (daysUntil <= 2) return 'imminent';
  if (daysUntil <= 7) return 'this_week';
  if (daysUntil <= 14) return 'next_two_weeks';
  if (daysUntil <= 30) return 'this_month';
  return 'upcoming';
}

export const eventCalendar = {
  async getUpcoming() {
    const cached = cache.get('events');
    if (cached) return cached;

    const events = generateUpcomingEvents().map(event => ({
      ...event,
      daysUntil: calculateDaysUntil(event.date),
      urgency: getUrgencyLevel(calculateDaysUntil(event.date))
    }));

    cache.set('events', events);
    return events;
  },

  getEventsByType(events, type) {
    return events.filter(e => e.type === type);
  },

  getHighSensitivityEvents(events) {
    return events.filter(e =>
      e.sensitivity === 'high' || e.sensitivity === 'very_high'
    );
  },

  getImminentEvents(events) {
    return events.filter(e => e.daysUntil <= 7);
  }
};
