# KaryaSetu — Frontend

Research prototype. Rainfall forecast bust detection, Day 1–10, over the India
region.

> **Research prototype.** Every probability on screen is an evaluation of the
> trained booster, made by the backend. Scores on the Model Scores page come from a
> September 2019 held-out test set and are not operational statistics. Anything
> served without a model is labelled **DEMO DATA**.

---

## What this is

A browser client for the KaryaSetu API. It renders maps, tables and charts. It
performs no inference of its own — there is no model in this bundle, no scoring
code, and no probability is computed here. Everything numeric comes from the
backend, which loads the booster once at startup.

---

## Tech stack

| Concern | Library |
| --- | --- |
| Framework | React 18 + Vite 5 |
| Language | TypeScript 5.3 (strict) |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| HTTP | Axios |
| Map | Leaflet + React-Leaflet + GeoJSON |
| Charts | Recharts |
| Styling | Tailwind CSS v3, driven by CSS variables |
| Icons | lucide-react |

`npm install` needs `--legacy-peer-deps`; lucide-react declares a peer range that
conflicts with React 18's.

---

## Running it

```bash
npm install --legacy-peer-deps
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
npm run preview    # serve the production build
npm run lint
npm run build:districts -- <source.geojson> [tolerance]
```

Open `http://localhost:5173`, not `http://127.0.0.1:5173` — the backend's CORS
allow-list names the `localhost` origin.

### Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_MODE` | `live` | `live` calls the backend; `mock` uses offline fixtures |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend base URL |

The checked-in `.env` is `live`. Set `VITE_API_MODE=mock` to run the whole UI with
no backend.

---

## Layout

```
src/
├── components/
│   ├── charts/
│   │   └── BustTimeSeriesChart.tsx
│   ├── layout/
│   │   ├── Layout.tsx             # shell + DEMO DATA banner
│   │   └── Sidebar.tsx            # 10 nav items + theme toggle
│   ├── map/
│   │   ├── IndiaMap.tsx           # grid view; boundary corrector active
│   │   ├── DistrictRiskMap.tsx    # district choropleth view
│   │   ├── CoordinateProbe.tsx    # click-to-inspect
│   │   ├── MapControls.tsx        # day + layer selectors
│   │   ├── RiskLegend.tsx
│   │   └── LocationDrawer.tsx
│   ├── PageHeader.tsx             # header, ReliabilityBadge, ProbabilityStat,
│   │                              # Loading / Unavailable blocks
│   ├── LocationAnalysis.tsx       # probability + day curve + input table
│   └── ModelInputTable.tsx
├── pages/                         # 10 routes, one file each
├── data/
│   ├── districtIndex.ts           # 755 districts, search index
│   ├── indianDistricts.ts         # reference cells + IDW helper
│   └── notebookEvaluation.json    # offline copy of the Sept 2019 figures
├── lib/
│   ├── theme.tsx                  # light default, dark toggle, persistence
│   └── riskScale.ts               # colour ramps + band thresholds
├── services/api.ts                # single client, mock/live switch
├── hooks/index.ts
├── types/index.ts
├── App.tsx
└── index.css                      # theme tokens in :root / .dark
public/
├── india_boundary_corrections.pmtiles
├── india-districts.geojson        # 755 districts, simplified
└── india-states.geojson
scripts/
└── build-district-geojson.mjs     # regenerates india-districts.geojson
```

---

## The ten pages

| Route | Page | File | What it shows |
| --- | --- | --- | --- |
| `/` | Overview | `Overview.tsx` | Area-by-confidence-band summary for the selected day |
| `/map` | Bust Risk Map | `ForecastMap.tsx` | Both map views: district choropleth (default) and the trained grid |
| `/search` | Location Search | `Search.tsx` | Any of 755 districts, or a typed coordinate |
| `/time-series` | Time Series | `TimeSeries.tsx` | Ten lead days at a coordinate, with per-day inputs |
| `/bust-detection` | Bust Detection | `BustDetection.tsx` | Ranked grid cells above the threshold + clustered areas |
| `/verification` | Verification | `Verification.tsx` | Forecast vs observed rainfall |
| `/explainability` | Explainability | `Explainability.tsx` | Mean \|SHAP\| globally; per-coordinate attribution |
| `/model-performance` | Model Scores | `ModelPerformance.tsx` | September 2019 held-out figures, confusion matrix, threshold sweep |
| `/historical` | Case Archive | `HistoricalEvents.tsx` | Stored historical cases |
| `/settings` | Settings | `Settings.tsx` | Model identity and artifact load status |

Any unrecognised path falls through to Overview, so a mistyped URL lands somewhere
useful rather than on a blank screen.

---

## Map views

One `MapContainer` holds both layers, with the **Bust Risk Map** as the default:

- **Bust Risk Map** — all 755 Census 2011 districts shaded by the continuous
  confidence / bust-probability scale. Values are inverse-distance interpolations of
  the trained grid, and the map says so on its face. District fills render in a
  custom Leaflet pane (`districtRisk`) so they sit above the basemap but below the
  boundary overlay.
- **Grid Map** — the original view: trained grid anchors, district pins, optional
  grid bounds, hover and click inspection.

Both keep the boundary-corrector tile layer and the boundary overlay active.

The district boundaries are simplified from Census 2011 with Douglas–Peucker at
0.02° and committed as a 471 kB asset, so the choropleth loads without a
network round-trip.

---

## Endpoints this client calls

| Endpoint | Used by |
| --- | --- |
| `GET /api/health` | Layout / Settings |
| `GET /api/model-info` | Settings (identity only — it carries no metrics) |
| `GET /api/model-performance` | Model Scores |
| `GET /api/forecast/overview` | Overview |
| `GET /api/forecast/map` | Bust Risk Map |
| `GET /api/forecast/location` | Search, LocationAnalysis |
| `GET /api/forecast/time-series` | Time Series, LocationAnalysis |
| `GET /api/bust-risk` | Bust Detection |
| `GET /api/bust-risk/areas` | Bust Detection (clustered areas) |
| `GET /api/explanation/global` | Explainability (global table) |
| `GET /api/explanation/location` | Explainability (per-coordinate) |
| `GET /api/verification` | Verification |
| `GET /api/historical-events` | Case Archive |

`POST /api/predict` is exported from `api.ts` for direct feature-vector scoring. No
page calls it, because no page has a reason to hand-build a feature vector when the
API will derive one from a coordinate and report how it got it.

---

## Shapes worth knowing

**`/api/explanation/location`** returns one evaluation, not three. Interpolation,
scoring and attribution all run against the same feature vector, so the bars on the
page describe the number at the top of it.

```
sigmoid(base_value + Σ shap_values) = uncalibrated_probability
                                        ↓ sigmoid calibrator
                                    bust_probability
```

TreeSHAP decomposes the booster's log-odds, not the calibrator's, so the identity
that holds is against `uncalibrated_probability`. Both are returned, and the page
prints the arithmetic. A decomposition that closed against the calibrated figure
would be a false claim.

**`/api/explanation/global`** is a list of `mean_abs_shap` — a magnitude, with no
`direction` field, because mean |SHAP| cannot say which way a feature pushes. Rank
is 1..n, ordered descending.

**`/api/forecast/time-series`** returns `model_inputs` **per series point**, not
once at the top level. Lead time is itself a model input, so day 4 and day 7 are
different vectors; a single shared block would be wrong for nine of the ten points.

**`/api/model-performance`** returns `held_out_test_set` and `served_artifact` side
by side and never merges them. The first is the notebook's September 2019 evaluation
on data the model never saw. The second is what the booster this API loaded measures
on its own fitting data, and is not a generalisation score. `/api/model-info`
deliberately repeats neither, so the two cannot be read as one number.

**`/api/verification`** and **`/api/historical-events`** return `available: false`,
a reason, and `expected_record_shape`. No archive is configured in this deployment,
and an empty table would read as "nothing happened" rather than "nothing to show".

---

## Demo mode

With `VITE_API_MODE=mock` the client serves fixtures with the same shapes. A
persistent **DEMO DATA** banner sits under the header for the whole session, so no
fixture value can be mistaken for model output.

Three things report themselves unavailable in mock mode rather than substituting a
number, because they genuinely need the model: the loaded-artifact evaluation, SHAP
attribution, and model identity. The transcribed September 2019 figures stay
readable, since they are a static record rather than a live computation.

---

## Theming

Light is the default. `lib/theme.tsx` owns the toggle and persists to
`localStorage` under `karyasetu.theme`; Tailwind runs in `darkMode: 'class'` with
semantic tokens (`bg-panel`, `text-ink-muted`, `border-line`, …) resolved from CSS
variables defined in `:root` and `.dark`.

The map canvas stays dark in both themes — it is a `bg-mapBase` token, not a themed
surface, because a light basemap under dark district fills is unreadable.

---

## Notes

- Recharts `<Legend wrapperStyle={{ color }}>` does not set text fill; legend items
  inherit their series stroke colour. Axis colours must be passed explicitly.
- Lucide 0.303 exports `AlertTriangle`, not `TriangleAlert`.
- Tailwind colour keys must be quoted dashed names (`'ink-muted'`), or
  `@apply text-ink-muted` fails to resolve and PostCSS returns a 500 on
  `index.css`. If that happens the dev server is holding a stale
  `tailwind.config.js` — restart it.

---

Research prototype. Not an operational forecasting system. No government logos,
emblems or official measurements are used.