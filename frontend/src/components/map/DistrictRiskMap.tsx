import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  getRampColor,
  inModelDomain,
  levelFor,
  percent,
  type ReliabilityLayer,
} from '../../lib/riskScale';
import { useCoordinateScores } from '../../hooks';
import type { ForecastPoint, ScoredCoordinate } from '../../types';

/**
 * Pane that holds the district fills. It sits below the default overlay pane so
 * the sovereign boundary vector stays drawn on top.
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
  /** Present only once the backend has scored this anchor. */
  value?: number;
  bust_probability?: number;
  confidence?: number;
  level?: string;
  /** Distance from the nearest reference cell, reported by the backend. */
  sourceDistanceKm?: number;
  /** Anchor sits outside the domain the model was trained on. */
  outOfDomain?: boolean;
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
  sourceDistanceKm: number;
}

interface DistrictRiskMapProps {
  day: number;
  layer: ReliabilityLayer;
  selectedPoint?: ForecastPoint | null;
  showLabels: boolean;
  onDistrictHover?: (point: ForecastPoint) => void;
  onDistrictClick?: (point: ForecastPoint) => void;
  onRiskRanking?: (ranking: DistrictRisk[]) => void;
}

/**
 * The committed boundary file also carries one state-wide polygon per state,
 * named "<State> (unnamed tract)". They are not districts: sampled against the
 * rest of the file, every one of them fully contains that state's real named
 * districts. Leaving them in the layer is what made the tooltip flip between a
 * district and what looked like a state, because the SVG renderer stacks
 * features in array order and the hovered shape was whichever of the two
 * happened to be drawn last. They are dropped here so the layer contains
 * districts and nothing else.
 */
const UNNAMED_TRACT = /\(unnamed tract\)\s*$/i;

function isRealDistrict(feature: DistrictFeature): boolean {
  return !UNNAMED_TRACT.test(feature.properties.district ?? '');
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
        const collection = data as DistrictCollection;
        districtCache = {
          type: 'FeatureCollection',
          features: collection.features.filter(isRealDistrict),
        };
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

/** Lookup key for a scored coordinate, matched to the 4 dp the backend returns. */
function scoreKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
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
    bust_probability: props.bust_probability ?? 0,
    confidence: props.confidence ?? 0,
    confidence_level: props.level ?? 'UNKNOWN',
    region: `${props.district} District, ${props.state}`,
  };
}

export default function DistrictRiskMap({
  day,
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

  // Every district anchor, sent once per lead day. The backend scores each one
  // with the trained booster.
  //
  // Anchors south of 8N are held back: the model was not trained there, so the
  // batch endpoint refuses them, and asking anyway would turn one island into a
  // rejected request for all 722 others. Those districts are marked
  // out-of-domain and report that, which is the honest reason.
  const { anchors, outOfDomain } = useMemo(() => {
    const inside: { latitude: number; longitude: number }[] = [];
    const outside = new Set<string>();
    for (const feature of geo?.features ?? []) {
      const [lon, lat] = feature.properties.anchor;
      if (inModelDomain(lat, lon)) {
        inside.push({ latitude: lat, longitude: lon });
      } else {
        outside.add(scoreKey(lat, lon));
      }
    }
    return { anchors: inside, outOfDomain: outside };
  }, [geo]);

  const scores = useCoordinateScores(day, anchors, geo !== null);

  // Keyed on the coordinate the backend reports. Both sides round to 4 dp before
  // comparing, so a district goes missing only if the model truly did not score
  // it, never over a floating-point formatting difference.
  const scored = useMemo(() => {
    const index = new Map<string, ScoredCoordinate>();
    for (const result of scores.data?.results ?? []) {
      index.set(scoreKey(result.latitude, result.longitude), result);
    }
    return index;
  }, [scores.data]);

  // Attach each district its own model evaluation. A district the backend did
  // not return keeps no value at all: it is drawn as "no data" and left out of
  // the ranking, rather than borrowing the nearest scored district's number.
  const styled = useMemo<DistrictCollection | null>(() => {
    if (!geo) return null;
    return {
      type: 'FeatureCollection',
      features: geo.features.map((feature) => {
        const [lon, lat] = feature.properties.anchor;
        const outside = outOfDomain.has(scoreKey(lat, lon));
        const hit = scored.get(scoreKey(lat, lon));
        if (!hit) {
          return {
            ...feature,
            properties: {
              ...feature.properties,
              value: undefined,
              outOfDomain: outside,
            },
          };
        }
        const value = layer === 'confidence' ? hit.confidence : hit.bust_probability;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            value,
            bust_probability: hit.bust_probability,
            confidence: hit.confidence,
            level: levelFor(value),
            sourceDistanceKm: hit.derivation?.distance_km ?? 0,
          },
        };
      }),
    };
  }, [geo, scored, layer, outOfDomain]);

  const ranking = useMemo<DistrictRisk[]>(() => {
    if (!styled) return [];
    return styled.features
      .filter((feature) => feature.properties.value !== undefined)
      .map((feature) => ({
        district: feature.properties.district,
        state: feature.properties.state,
        latitude: feature.properties.anchor[1],
        longitude: feature.properties.anchor[0],
        value: feature.properties.value as number,
        bust_probability: feature.properties.bust_probability as number,
        confidence: feature.properties.confidence as number,
        level: feature.properties.level as string,
        sourceDistanceKm: feature.properties.sourceDistanceKm as number,
      }))
      .sort((a, b) =>
        layer === 'confidence' ? a.value - b.value : b.value - a.value
      );
  }, [styled, layer]);

  useEffect(() => {
    onRiskRanking?.(ranking.slice(0, 12));
  }, [ranking, onRiskRanking]);

  // District name labels. At country zoom only the most extreme districts are
  // labelled so the map stays readable; once zoomed in, every scored district
  // inside the viewport is labelled.
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
      // An unscored district gets no label, so the map never pairs a number
      // with a place the model did not evaluate.
      if (value === undefined) return;

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

  // A cheap fingerprint of the current scores, so the layer is rebuilt when the
  // numbers change rather than when the component merely re-renders.
  const firstScoredKey = ranking.length > 0 ? `${ranking[0].latitude},${ranking[0].longitude}` : '';
  const firstScoredValue = ranking.length > 0 ? ranking[0].value : 0;

  if (!styled) return null;

  const hasValues = ranking.length > 0;

  // While the scores are in flight the collection still exists but every value
  // is undefined, which the style function paints as the neutral "no data"
  // fill. Waiting to mount the layer avoids flashing 723 grey districts, which
  // reads as "everywhere has no data" rather than "still loading".
  if (!hasValues && scores.isPending) return null;

  return (
    <>
      <GeoJSON
        // Keying on the fill version forces a full remount when the values
        // change. react-leaflet applies `style` only when a feature is first
        // drawn, so reusing the layer would leave last render's colours on
        // screen after the day or layer changed.
        key={`${day}-${layer}-${hasValues}-${scored.size}-${firstScoredValue}-${firstScoredKey}`}
        data={styled as unknown as GeoJSON.GeoJsonObject}
        pane={DISTRICT_PANE}
        style={(feature) => {
          const props = (feature?.properties ?? {}) as Partial<DistrictProperties>;

          // No value from the model: neutral fill, no border emphasis, and the
          // tooltip says so. Inventing a shade here would be indistinguishable
          // from a scored district.
          if (props.value === undefined) {
            return {
              pane: DISTRICT_PANE,
              fillColor: '#94a3b8',
              fillOpacity: 0.18,
              color: 'rgba(100, 116, 139, 0.5)',
              weight: 0.4,
              dashArray: '2, 2',
            };
          }

          const value = props.value;
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
          const scoredHere = props.value !== undefined;

          lyr.bindTooltip(
            scoredHere
              ? `<div class="district-tip">
                 <b>${props.district} District</b>
                 <span>${props.state}</span>
                 <div class="district-tip-grid">
                   <div><label>Bust Risk</label><b class="tip-bust">${percent(props.bust_probability ?? 0)}</b></div>
                   <div><label>Confidence</label><b class="tip-conf">${percent(props.confidence ?? 0)}</b></div>
                   <div><label>Level</label><b>${props.level}</b></div>
                 </div>
                 <em>Scored by the trained model at this district anchor${(props.sourceDistanceKm ?? 0) > 0 ? `, ${props.sourceDistanceKm} km from the nearest reference cell` : ''}</em>
               </div>`
              : `<div class="district-tip">
                 <b>${props.district} District</b>
                 <span>${props.state}</span>
                 <div class="district-tip-grid">
                   <div><label>Bust Risk</label><b>DATA NOT AVAILABLE</b></div>
                 </div>
                 <em>${
                   props.outOfDomain
                     ? 'Outside the domain the model was trained on'
                     : 'The model returned no evaluation for this anchor'
                 }</em>
               </div>`,
            { sticky: true, direction: 'top', opacity: 1 }
          );

          // Only district features get handlers, and only within this pane, so a
          // hover can never resolve to a state-shaped polygon or a boundary
          // outline. The highlight is a stroke change rather than a reorder, so
          // hovering cannot change which shape sits on top of its neighbours.
          lyr.on({
            mouseover: () => {
              if (!scoredHere) return;
              (lyr as L.Path).setStyle({ weight: 2, color: '#e2e8f0', fillOpacity: 0.95 });
              onDistrictHover?.(toPoint(props as DistrictProperties));
            },
            mouseout: () => {
              const path = lyr as L.Path;
              if (scoredHere) {
                path.setStyle({
                  weight: 1,
                  color: 'rgba(15, 23, 42, 0.55)',
                  fillColor: getRampColor(props.value ?? 0, layer),
                  fillOpacity: 0.82,
                });
              } else {
                path.setStyle({
                  fillColor: '#94a3b8',
                  fillOpacity: 0.18,
                  color: 'rgba(100, 116, 139, 0.5)',
                  weight: 0.4,
                });
              }
            },
            click: () => {
              if (scoredHere) onDistrictClick?.(toPoint(props as DistrictProperties));
            },
          });
        }}
      />

      {!hasValues && !scores.isPending && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 z-[1000] flex justify-center px-3">
          <p className="rounded-md border border-amber-300 bg-panel/95 px-3 py-2 text-[11.5px] font-medium text-ink shadow-lift backdrop-blur-md dark:border-amber-500/40">
            DATA NOT AVAILABLE &mdash; the trained model returned no district
            evaluations.
          </p>
        </div>
      )}
    </>
  );
}