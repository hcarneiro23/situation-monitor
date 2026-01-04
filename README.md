# Situation Monitor

A single-page intelligence console for monitoring how geopolitical developments translate into market behavior.

## Quick Start

```bash
# Install dependencies
npm install

# Start both backend and frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Architecture

### Backend (Node.js/Express)
- **News Aggregator**: Fetches from 15+ RSS feeds (Reuters, BBC, Bloomberg, Al Jazeera, etc.)
- **Market Data Service**: Real-time quotes via Yahoo Finance API
- **Signal Generator**: Derives signals from news patterns (sanctions risk, escalation, policy shifts)
- **Scenario Engine**: Manages geopolitical scenarios with probability adjustments
- **Event Calendar**: Tracks upcoming catalysts (central bank meetings, elections, data releases)
- **WebSocket Server**: Pushes real-time updates to clients

### Frontend (React + Vite)
- **What Matters Now**: Live intelligence summary with confidence levels
- **News Feed**: Contextualized news with market relevance scoring
- **Signal Panel**: Active signals with strength indicators
- **Relationship Map**: Interactive D3 network graph of dependencies
- **Market Panels**: Live quotes with political context
- **Scenario Workspace**: Forward scenarios with probability paths
- **Catalyst Timeline**: Upcoming events by urgency
- **Watchlist**: Personal monitoring with alerts

## Data Sources

### News
- Reuters World & Business
- BBC World & Business
- Bloomberg Markets
- Financial Times
- Al Jazeera
- New York Times World & Politics
- MarketWatch
- Brookings Institution
- Foreign Policy
- OilPrice.com

### Market Data
- Yahoo Finance API (indices, commodities, FX, rates, sectors, country ETFs)

## Key Features

1. **Causal Integration**: News → Signals → Scenarios → Markets → Validation
2. **Real-time Updates**: WebSocket connection with 30s market refresh, 2min news refresh
3. **Market Relevance Scoring**: Items ranked by impact, not recency
4. **Transmission Channels**: Clear policy → supply → pricing → risk paths
5. **Signal Strength**: Early / Building / Confirmed classification
6. **Scenario Probabilities**: Auto-adjust based on news flow
7. **Watchlist Alerts**: Trigger on signal changes, not just prices
8. **Revision History**: Track how views changed over time

## API Endpoints

```
GET /api/state       - Full current state
GET /api/news        - Latest processed news
GET /api/markets     - All market data
GET /api/signals     - Active signals
GET /api/scenarios   - Scenario probabilities
GET /api/events      - Upcoming catalysts
GET /api/summary     - Intelligence summary
GET /api/relationships - Dependency map
```

## Configuration

No API keys required - uses public RSS feeds and free-tier APIs.

For production deployment, consider:
- Rate limiting on market data fetches
- News source authentication where available
- Database persistence for historical data
- Redis caching layer

## Tech Stack

- **Backend**: Node.js, Express, WebSocket, RSS Parser, Axios
- **Frontend**: React 18, Vite, Tailwind CSS, Zustand, D3.js, Recharts
- **Styling**: Tailwind CSS with custom intel-themed color palette

## License

MIT
