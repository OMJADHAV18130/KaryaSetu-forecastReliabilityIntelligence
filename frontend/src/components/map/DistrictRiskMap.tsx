import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { interpolateReliability } from '../../data/indianDistricts';
import { getRampColor, levelFor, percent, type ReliabilityLayer } from '../../lib/riskScale';
import type { ForecastPoint } from '../../types';

/**
 * Pane that holds the district fills. It sits below the default overlay pane so
 * the Survey of India sovereign boundary vector stays drawn on top.
 * Created once per map by <MapPanes> in IndiaMap.
 */
export const DISTRICT_PANE = 'districtRisk';

interface DistrictProperties {
  district: string;
  state: string;
  code: string | null;
  stateCode: string | null;
  year: string;
  anchor: [number, number];
  value: number;
  bust_probability: number;
  confidence: number;
  level: string;
}

interface DistrictFeature {
  type: 'Feature';
  properties: DistrictProperties;
  geometry: GeoJSON.Geometry;
}

interface DistrictCollection {
  type: 'FeatureCollection';
  features: DistrictFeature[];
}

export interface DistrictRisk {
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  value: number;
  bust_probability: number;
  confidence: number;
  level: string;
}

interface DistrictRiskMapProps {
  points: ForecastPoint[];
  layer: ReliabilityLayer;
  selectedPoint?: ForecastPoint | null;
  showLabels: boolean;
  onDistrictHover?: (point: ForecastPoint) => void;
  onDistrictClick?: (point: ForecastPoint) => void;
  onRiskRanking?: (ranking: DistrictRisk[]) => void;
}

/** District boundaries are static, so they are fetched once per session. */
let districtCache: DistrictCollection | null = null;
let districtRequest: Promise<DistrictCollection> | null = null;

function loadDistricts(): Promise<DistrictCollection> {
  if (districtCache) return Promise.resolve(districtCache);
  if (!districtRequest) {
    districtRequest = fetch('/geojson/india-districts.geojson')
      .then((res) => {
        if (!res.ok) throw new Error(`District boundary request failed (${res.status})`);
        return res.json();
      })
      .then((data) => {
        districtCache = data as DistrictCollection;
        return districtCache;
      })
      .catch((err) => {
        console.warn('District boundary notice:', err);
        districtRequest = null;
        throw err;
      });
  }
  return districtRequest;
}

/** Tracks the zoom level only when it crosses an integer boundary. */
function useZoomBucket() {
  const map = useMap();
  const [zoom, setZoom] = useState(() => Math.round(map.getZoom()));

  useEffect(() => {
    const handler = () => {
      const rounded = Math.round(map.getZoom());
      setZoom((prev) => (prev === rounded ? prev : rounded));
    };
    map.on('zoomend', handler);
    return () => {
      map.off('zoomend', handler);
    };
  }, [map]);

  return zoom;
}

/** Viewport box used to decide which district labels are worth rendering. */
function useViewportBounds() {
  const map = useMap();
  const read = useCallback(
    () => {
      const b = map.getBounds();
      return `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
    },
    [map]
  );
  const [key, setKey] = useState(read);

  useEffect(() => {
    const handler = () => setKey(read());
    map.on('moveend', handler);
    map.on('zoomend', handler);
    return () => {
      map.off('moveend', handler);
      map.off('zoomend', handler);
    };
  }, [map, read]);

  return key;
}

function toPoint(props: DistrictProperties): ForecastPoint {
  return {
    latitude: props.anchor[1],
    longitude: props.anchor[0],
    bust_probability: props.bust_probability,
    confidence: props.confidence,
    confidence_level: props.level,
    region: `${props.district} District, ${props.state}`,
  };
}

export default function DistrictRiskMap({
  points,
  layer,
  selectedPoint,
  showLabels,
  onDistrictHover,
  onDistrictClick,
  onRiskRanking,
}: DistrictRiskMapProps) {
  const map = useMap();
  const zoom = useZoomBucket();
  const viewportKey = useViewportBounds();
  const [geo, setGeo] = useState<DistrictCollection | null>(districtCache);
  const labelLayer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDistricts()
      .then((data) => {
        if (!cancelled) setGeo(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Interpolate the trained grid onto every district boundary.
  const styled = useMemo<DistrictCollection | null>(() => {
    if (!geo) return null;
    return {
      type: 'FeatureCollection',
      features: geo.features.map((feature) => {
        const [lon, lat] = feature.properties.anchor;
        const interp = interpolateReliability(lat, lon, points);
        const value = layer === 'confidence' ? interp.confidence : interp.bust_probability;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            value,
            bust_probability: interp.bust_probability,
            confidence: interp.confidence,
            level: levelFor(layer === 'confidence' ? interp.confidence : interp.bust_probability),
          },
        };
      }),
    };
  }, [geo, points, layer]);

  const ranking = useMemo<DistrictRisk[]>(() => {
    if (!styled) return [];
    return styled.features
      .map((feature) => ({
        district: feature.properties.district,
        state: feature.properties.state,
        latitude: feature.properties.anchor[1],
        longitude: feature.properties.anchor[0],
        value: feature.properties.value,
        bust_probability: feature.properties.bust_probability,
        confidence: feature.properties.confidence,
        level: feature.properties.level,
      }))
      .sort((a, b) =>
        layer === 'confidence' ? a.value - b.value : b.value - a.value
      );
  }, [styled, layer]);

  useEffect(() => {
    onRiskRanking?.(ranking.slice(0, 12));
  }, [ranking, onRiskRanking]);

  // District name labels. At country zoom only the most extreme districts are
  // labelled so the map stays readable; once zoomed in, every district inside
  // the viewport is labelled.
  useEffect(() => {
    if (!styled) return;
    if (labelLayer.current) {
      map.removeLayer(labelLayer.current);
      labelLayer.current = null;
    }
    if (!showLabels) return;

    const group = L.layerGroup();
    const selectedLat = selectedPoint?.latitude;
    const selectedLon = selectedPoint?.longitude;

    const bounds = map.getBounds().pad(0.25);
    const extremes = new Set(ranking.slice(0, 40).map((r) => r.district));

    styled.features.forEach((feature) => {
      const { district, anchor, value } = feature.properties;
      const selected =
        selectedLat !== undefined &&
        selectedLon !== undefined &&
        Math.abs(anchor[1] - selectedLat) < 0.25 &&
        Math.abs(anchor[0] - selectedLon) < 0.25;

      const visible = bounds.contains(L.latLng(anchor[1], anchor[0]));
      const emphasise = zoom >= 6 ? visible : zoom >= 5 ? extremes.has(district) : false;

      if (!emphasise && !selected) return;

      const marker = L.marker([anchor[1], anchor[0]], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: 'district-label-wrapper',
          html: `<span class="district-label${selected ? ' district-label-active' : ''}">${district}<em>${percent(value)}</em></span>`,
          iconSize: [0, 0],
        }),
      });
      marker.addTo(group);
    });

    group.addTo(map);
    labelLayer.current = group;

    return () => {
      map.removeLayer(group);
      labelLayer.current = null;
    };
  }, [
    styled,
    showLabels,
    zoom,
    map,
    viewportKey,
    ranking,
    selectedPoint?.latitude,
    selectedPoint?.longitude,
  ]);

  if (!styled) return null;

  return (
    <>
      <GeoJSON
        data={styled as unknown as GeoJSON.GeoJsonObject}
        pane={DISTRICT_PANE}
        style={(feature) => {
          const props = (feature?.properties ?? {}) as Partial<DistrictProperties>;
          const value = props.value ?? 0;
          const isSelected =
            selectedPoint !== undefined &&
            selectedPoint !== null &&
            props.anchor !== undefined &&
            Math.abs(props.anchor[1] - selectedPoint.latitude) < 0.25 &&
            Math.abs(props.anchor[0] - selectedPoint.longitude) < 0.25;

          return {
            pane: DISTRICT_PANE,
            fillColor: getRampColor(value, layer),
            fillOpacity: isSelected ? 0.95 : 0.82,
            color: isSelected ? '#38bdf8' : 'rgba(15, 23, 42, 0.55)',
            weight: isSelected ? 2 : 0.4,
          };
        }}
        onEachFeature={(feature, lyr) => {
          const props = (feature.properties ?? {}) as Partial<DistrictProperties>;
          const point = toPoint(props as DistrictProperties);

          lyr.bindTooltip(
            `<div class="district-tip">
               <b>${props.district} District</b>
               <span>${props.state}</span>
               <div class="district-tip-grid">
                 <div><label>Bust Risk</label><b class="tip-bust">${percent(props.bust_probability ?? 0)}</b></div>
                 <div><label>Confidence</label><b class="tip-conf">${percent(props.confidence ?? 0)}</b></div>
                 <div><label>Level</label><b>${props.level}</b></div>
               </div>
               <em>Interpolated from the trained 5.625&deg; model grid</em>
             </div>`,
            { sticky: true, direction: 'top', opacity: 1 }
          );

          lyr.on({
            mouseover: () => {
              const path = lyr as L.Path;
              path.setStyle({ weight: 2, color: '#e2e8f0', fillOpacity: 0.95 });
              path.bringToFront();
              onDistrictHover?.(point);
            },
            mouseout: () => {
              const path = lyr as L.Path;
              const value = props.value ?? 0;
              path.setStyle({
                weight: 1,
                color: 'rgba(15, 23, 42, 0.55)',
                fillColor: getRampColor(value, layer),
                fillOpacity: 0.82,
              });
            },
            click: () => onDistrictClick?.(point),
          });
        }}
      />
    </>
  );
}