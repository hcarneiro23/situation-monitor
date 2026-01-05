import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { newsAggregator } from './services/newsAggregator.js';
import { marketDataService } from './services/marketData.js';
import { signalGenerator } from './services/signalGenerator.js';
import { scenarioEngine } from './services/scenarioEngine.js';
import { eventCalendar } from './services/eventCalendar.js';
import { analysisEngine } from './services/analysisEngine.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Store for real-time state
const state = {
  news: [],
  signals: [],
  markets: {},
  scenarios: [],
  events: [],
  summary: null,
  lastUpdate: null
};

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);

  // Send current state on connection
  ws.send(JSON.stringify({ type: 'FULL_STATE', data: state }));

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadcast(type, data) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

// API Routes
app.get('/api/state', (req, res) => {
  res.json(state);
});

app.get('/api/news', async (req, res) => {
  try {
    const news = await newsAggregator.getLatest();
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/markets', async (req, res) => {
  try {
    const markets = await marketDataService.getAll();
    res.json(markets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/signals', (req, res) => {
  res.json(state.signals);
});

app.get('/api/scenarios', (req, res) => {
  res.json(state.scenarios);
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await eventCalendar.getUpcoming();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/summary', (req, res) => {
  res.json(state.summary);
});

app.get('/api/relationships', (req, res) => {
  res.json(analysisEngine.getRelationshipMap());
});

// User alerts/watchlist
const userWatchlists = new Map();

app.post('/api/watchlist', (req, res) => {
  const { userId, items } = req.body;
  userWatchlists.set(userId || 'default', items);
  res.json({ success: true });
});

app.get('/api/watchlist/:userId', (req, res) => {
  const items = userWatchlists.get(req.params.userId) || [];
  res.json(items);
});

// Update loop - runs every 60 seconds for news, 30 seconds for markets
async function updateNewsAndSignals() {
  try {
    console.log('[Update] Fetching news...');
    const news = await newsAggregator.getLatest();
    state.news = news;

    console.log('[Update] Generating signals...');
    state.signals = signalGenerator.generateFromNews(news, state.markets);

    console.log('[Update] Updating scenarios...');
    state.scenarios = scenarioEngine.updateScenarios(state.signals, state.news);

    console.log('[Update] Generating summary...');
    state.summary = analysisEngine.generateSummary(state.news, state.signals, state.scenarios);

    state.lastUpdate = new Date().toISOString();

    broadcast('NEWS_UPDATE', { news: state.news, signals: state.signals });
    broadcast('SUMMARY_UPDATE', state.summary);
    broadcast('SCENARIO_UPDATE', state.scenarios);

    console.log(`[Update] Complete. ${news.length} news items, ${state.signals.length} signals`);
  } catch (error) {
    console.error('[Update] News error:', error.message);
  }
}

async function updateMarkets() {
  try {
    const markets = await marketDataService.getAll();
    state.markets = markets;
    broadcast('MARKET_UPDATE', markets);
  } catch (error) {
    console.error('[Update] Market error:', error.message);
  }
}

async function updateEvents() {
  try {
    const events = await eventCalendar.getUpcoming();
    state.events = events;
    broadcast('EVENT_UPDATE', events);
  } catch (error) {
    console.error('[Update] Events error:', error.message);
  }
}

// Initial load and intervals
async function initialize() {
  console.log('[Init] Starting Situation Monitor backend...');

  await Promise.all([
    updateNewsAndSignals(),
    updateMarkets(),
    updateEvents()
  ]);

  // News and signals every 2 minutes
  setInterval(updateNewsAndSignals, 120000);

  // Markets every 30 seconds
  setInterval(updateMarkets, 30000);

  // Events every 5 minutes
  setInterval(updateEvents, 300000);

  console.log('[Init] Update loops started');
}

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`[Server] Running on http://${HOST}:${PORT}`);
  initialize();
});
