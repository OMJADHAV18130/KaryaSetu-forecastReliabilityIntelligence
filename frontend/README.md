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
│   ├── layout/
│   │   ├── Layout.tsx
│   │   └── Sidebar.tsx
│   └── map/
│       ├── IndiaMap.tsx          # shared map: both views, boundary corrector active
│       ├── DistrictRiskMap.tsx   # district bust-risk choropleth layer
│       ├── RiskLegend.tsx        # gradient scale + extreme-district ranking
│       ├── MapControls.tsx       # day selector + layer selector
│       └── LocationDrawer.tsx    # point/district detail drawer
├── pages/
│   ├── Overview.tsx
│   ├── ForecastMap.tsx
│   ├── BustDetection.tsx
│   ├── Verification.tsx
│   ├── Explainability.tsx
│   ├── HistoricalEvents.tsx
│   ├── ModelPerformance.tsx
│   └── Settings.tsx
├── lib/
│   └── riskScale.ts              # colour ramps + HIGH/MODERATE/LOW thresholds
├── data/
│   ├── indianDistricts.ts        # district list + IDW interpolation helper
│   └── mock*.ts                  # offline demo payloads
├── services/
│   └── api.ts                    # centralised client, mock/live switch
├── hooks/
│   └── index.ts
├── types/
│   └── index.ts
├── App.tsx
├── main.tsx
└── index.css
public/
├── geojson/
│   ├── india-states.geojson      # sovereign boundary overlay
│   └── india-districts.geojson   # district choropleth boundaries
└── india_boundary_corrections.pmtiles
scripts/
└── build-district-geojson.mjs    # regenerates india-districts.geojson
```

---

## Map Views

The map's top bar has a **Grid Map / Bust Risk Map** toggle.

- **Grid Map** (default, unchanged) — trained 5.625° grid anchors, district station
  pins, optional coarse grid bounds, and hover/click inspection anywhere.
- **Bust Risk Map** — a choropleth of all 755 Census 2011 districts coloured by the
  continuous bust-probability / confidence scale, with a threshold legend, the
  extreme-district ranking, and adaptive district labels (top extremes at country
  zoom, every visible district from zoom 6).

Both views keep the **Indian Boundary Corrector** tile layer and the **Survey of
India** boundary overlay active, and the boundary overlay always draws above the
district fills. District values are inverse-distance interpolations of the trained
grid — not per-district model runs.

Regenerate the district boundaries from the upstream file with:

```bash
npm run build:districts -- <source.geojson> [tolerance]
```

---

## Switching to FastAPI Backend

1. Start your FastAPI backend at `http://localhost:8000`
2. Set `VITE_API_MODE=live` in `.env` (and `VITE_API_BASE_URL` if it differs)
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
