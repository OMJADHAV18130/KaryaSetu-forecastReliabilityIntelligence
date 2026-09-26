# KaryaSetu — Forecast Reliability Intelligence

**AI-Based Forecast Bust Detection for Medium-Range Weather Forecasts**  
Smart India Hackathon 2026 · Problem Statement 26079  
Ministry of Earth Sciences / NCMRWF · Team: KaryaSetu

> ⚠️ **This is a demo prototype. All data displayed is simulated and does NOT represent real NCMRWF forecast output, observations, or validated AI metrics.**

---

## What It Does

This operational meteorological decision-support dashboard acts as a **reliability layer over numerical weather prediction (NWP)**. It helps forecasters understand:

- **Where** a forecast may fail (region-wise confidence maps)
- **When** reliability deteriorates (D1–D10 timeline)
- **How large** the bust risk is (bust probability per region per day)
- **Why** the model is uncertain (explainable AI signals grounded in measurable features)

The system **does not replace NWP** — it adds a reliability assessment layer on top of it.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Routing | React Router v6 |
| Data fetching | TanStack Query (React Query) |
| HTTP client | Axios |
| Map | Leaflet + React-Leaflet + GeoJSON |
| Charts | Apache ECharts (echarts-for-react) |
| Icons | Lucide React |
| Utilities | clsx |

---

## Setup and Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The app runs at `http://localhost:5173` (or the next available port).

---

## Folder Structure

```
src/
├── components/
│   ├── Navbar.jsx
│   ├── Sidebar.jsx
│   ├── RiskCard.jsx
│   ├── ForecastMap.jsx
│   ├── ConfidenceLegend.jsx
│   ├── RegionDrawer.jsx
│   ├── RiskTimeline.jsx
│   ├── RegionRiskTable.jsx
│   ├── ExplanationPanel.jsx
│   ├── ForecastComparison.jsx
│   ├── FeatureImportanceChart.jsx
│   ├── HistoricalEventCard.jsx
│   ├── FilterBar.jsx
│   ├── StatusBadge.jsx
│   ├── LoadingState.jsx
│   └── ErrorState.jsx
├── pages/
│   ├── Dashboard.jsx
│   ├── ForecastMapPage.jsx
│   ├── BustDetection.jsx
│   ├── Verification.jsx
│   ├── AIExplanation.jsx
│   ├── HistoricalEvents.jsx
│   ├── ModelPerformance.jsx
│   └── Settings.jsx
├── data/
│   ├── mockRegions.js
│   ├── mockHistoricalEvents.js
│   ├── mockExplanations.js
│   ├── mockModelPerformance.js
│   └── mockVerification.js
├── services/
│   └── api.js
├── hooks/
│   └── useForecast.js
├── App.jsx
├── main.jsx
└── index.css
public/
└── geojson/
    └── india-states.geojson
```

---

## Switching to FastAPI Backend

1. Start your FastAPI backend at `http://localhost:8000`
2. Open `src/services/api.js` and change `const USE_MOCK = false`
3. Implement these endpoints:

| Endpoint | Description |
|---|---|
| `GET /api/forecast/overview` | National KPIs, timeline |
| `GET /api/forecast/map` | Region map data |
| `GET /api/forecast/{region}` | Region detail |
| `GET /api/bust-risk` | Ranked bust risk |
| `GET /api/verification` | Forecast vs observation |
| `GET /api/historical-events` | Historical events |
| `GET /api/explanations/{region}` | AI explanation signals |
| `GET /api/model-performance` | Model metrics |
| `GET /api/health` | Health check |

---

## 10-Step Demo Flow

1. Open Overview — see India-wide confidence/bust KPIs
2. Review 4 KPI cards
3. Switch to D5 — map recolors, KPIs update
4. Click Maharashtra on the map — region drawer opens
5. Read bust probability 78% and low confidence 22%
6. Click Explain Risk — AI Explanation page
7. Review contributing signals grounded in measurable features
8. Navigate to Historical Events, select Monsoon Depression July 2025
9. Compare AI risk signal vs observed forecast degradation timeline
10. Open Model Performance — review demo-labeled metrics

---

## Disclaimers

- All metrics are demo placeholders — not validated on real NCMRWF data
- No NCMRWF logos or official measurements used
- Model performance metrics must be replaced after real temporal cross-validation

---

**Team KaryaSetu** | SIH 2026 | PS 26079
