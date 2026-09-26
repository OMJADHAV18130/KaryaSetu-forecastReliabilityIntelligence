import { useEffect, useRef, useState } from 'react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import clsx from 'clsx';

// India bounding box
const INDIA_BOUNDS = [[5.5, 66.0], [38.5, 98.5]];

// Official India-map blue for states with no reliability data
const INDIA_BLUE       = '#1a5eb8';
const INDIA_BLUE_HOVER = '#1248a0';
const INDIA_BORDER     = '#0d3480';

// ── Reliability color scales (applied when data is present) ──────────────
function getConfidenceColor(v) {
  if (v >= 80) return '#10b981';
  if (v >= 60) return '#34d399';
  if (v >= 40) return '#fbbf24';
  if (v >= 20) return '#f97316';
  return '#ef4444';
}

function getBustColor(v) {
  if (v >= 75) return '#dc2626';
  if (v >= 55) return '#ea580c';
  if (v >= 35) return '#d97706';
  if (v >= 15) return '#16a34a';
  return '#059669';
}

function getReliabilityColor(layer, regionData) {
  if (!regionData) return null; // use India-map blue
  return layer === 'Confidence'
    ? getConfidenceColor(regionData.confidence)
    : getBustColor(regionData.bustProbability);
}

// ── GeoJSON NAME_1 → our region ID ──────────────────────────────────────
const NAME_MAP = {
  'Maharashtra':        'maharashtra',
  'Gujarat':            'gujarat',
  'Rajasthan':          'rajasthan',
  'Odisha':             'odisha',
  'Andhra Pradesh':     'andhra-pradesh',
  'Telangana':          'telangana',
  'Karnataka':          'karnataka',
  'Kerala':             'kerala',
  'Tamil Nadu':         'tamil-nadu',
  'Madhya Pradesh':     'madhya-pradesh',
  'Chhattisgarh':       'chhattisgarh',
  'Jharkhand':          'jharkhand',
  'West Bengal':        'west-bengal',
  'Bihar':              'bihar',
  'Uttar Pradesh':      'uttar-pradesh',
  'Uttarakhand':        'uttarakhand',
  'Himachal Pradesh':   'himachal-pradesh',
  'Punjab':             'punjab',
  'Haryana':            'haryana',
  'Delhi':              'delhi',
  'Assam':              'assam',
  'Meghalaya':          'meghalaya',
  'Nagaland':           'nagaland',
  'Manipur':            'manipur',
  'Mizoram':            'mizoram',
  'Tripura':            'tripura',
  'Arunachal Pradesh':  'arunachal',
  'Sikkim':             'sikkim',
  'Goa':                'goa',
  'Jammu & Kashmir':    'jammu-kashmir',
  'Jammu and Kashmir':  'jammu-kashmir',
  'Ladakh':             'ladakh',
};

// ── Reset-view control (inside MapContainer) ─────────────────────────────
function ResetViewControl() {
  const map = useMap();
  return (
    <div
      className="leaflet-bottom leaflet-right"
      style={{ zIndex: 400, marginBottom: '34px', marginRight: '8px' }}
    >
      <div className="leaflet-control">
        <button
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#2563eb',
            fontSize: '11px',
            fontWeight: '600',
            padding: '5px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            fontFamily: 'Inter, sans-serif',
          }}
          onClick={() => map.fitBounds(INDIA_BOUNDS, { padding: [16, 16] })}
          title="Reset to India view"
        >
          Reset View
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function ForecastMap({
  mapData = [],
  layer = 'Bust Probability',
  onRegionClick,
  selectedRegion,
  className = '',
}) {
  const [geoJson, setGeoJson] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const geoJsonRef = useRef();

  useEffect(() => {
    fetch('/geojson/india-states.geojson')
      .then(r => r.json())
      .then(setGeoJson)
      .catch(err => console.warn('GeoJSON load failed', err));
  }, []);

  const dataMap = {};
  mapData.forEach(r => { dataMap[r.id] = r; });

  function styleFeature(feature) {
    const name       = feature.properties?.ST_NM || feature.properties?.NAME_1 || feature.properties?.name || '';
    const id         = NAME_MAP[name];
    const rd         = dataMap[id];
    const isSelected = id === selectedRegion;
    const isHovered  = id === hoveredId;

    // Reliability color if data exists, else official India blue
    const reliabilityColor = getReliabilityColor(layer, rd);
    const fillColor = reliabilityColor ?? INDIA_BLUE;

    return {
      fillColor,
      fillOpacity: isSelected ? 0.95 : isHovered ? 0.85 : reliabilityColor ? 0.82 : 0.88,
      color:       isSelected ? '#ffffff' : INDIA_BORDER,
      weight:      isSelected ? 2.5 : isHovered ? 1.8 : 1.2,
    };
  }

  function onEachFeature(feature, leafletLayer) {
    const name = feature.properties?.ST_NM || feature.properties?.NAME_1 || feature.properties?.name || '';
    const id   = NAME_MAP[name];
    const rd   = dataMap[id];

    leafletLayer.on({
      mouseover: e => {
        setHoveredId(id);
        e.target.setStyle({
          fillOpacity: 0.90,
          weight: 2,
          color: '#ffffff',
        });
        const bp = rd?.bustProbability ?? '—';
        const cf = rd?.confidence ?? '—';
        e.target.bindTooltip(
          `<div style="font-family:Inter,sans-serif;font-size:12px;line-height:1.7;padding:2px 0">
            <b style="color:#1a3a6b;font-size:13px">${name}</b><br/>
            <span style="color:#dc2626">● Bust Risk: <b>${bp !== '—' ? bp + '%' : '—'}</b></span><br/>
            <span style="color:#059669">● Confidence: <b>${cf !== '—' ? cf + '%' : '—'}</b></span>
           </div>`,
          { sticky: true }
        ).openTooltip();
      },
      mouseout: e => {
        setHoveredId(null);
        if (geoJsonRef.current) geoJsonRef.current.resetStyle(e.target);
      },
      click: () => {
        if (rd) onRegionClick?.(id);
      },
    });
  }

  return (
    <div className={clsx('relative rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-50', className)}>
      <MapContainer
        center={[22.5, 82.5]}
        zoom={5}
        minZoom={4}
        maxZoom={9}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        // Light clean background
        style={{ width: '100%', height: '100%', background: '#eef2f6' }}
        zoomControl={true}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        {geoJson ? (
          <GeoJSON
            key={`${layer}-${selectedRegion}-${mapData.length}`}
            data={geoJson}
            style={styleFeature}
            onEachFeature={onEachFeature}
            ref={geoJsonRef}
          />
        ) : (
          <MapLoadingOverlay />
        )}

        <ResetViewControl />
      </MapContainer>

      {/* Demo badge */}
      <div className="absolute bottom-3 left-3 z-[400]">
        <span
          style={{
            background: 'rgba(26,94,184,0.12)',
            border: '1px solid rgba(26,94,184,0.35)',
            color: '#1a5eb8',
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '4px',
            fontFamily: 'Inter,sans-serif',
          }}
        >
          DEMO DATA — Not real NCMRWF output
        </span>
      </div>
    </div>
  );
}

function MapLoadingOverlay() {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 300, background: '#d6e4f7',
      }}
    >
      <span style={{ color: '#1a5eb8', fontSize: '14px', fontFamily: 'Inter,sans-serif' }}>
        Loading India map…
      </span>
    </div>
  );
}
