// ============================================================
// MOCK DATA — DEMO ONLY. Not real NCMRWF data.
// _isMock: true on all exports
// ============================================================

export const _isMock = true;

const DAY_LABELS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10'];

// Confidence degrades with lead time
const baseConfidence = [94, 91, 86, 73, 52, 41, 38, 35, 32, 29];
const baseBustRisk   = [4,  7,  12, 24, 43, 57, 61, 64, 67, 69];

// Indian states with region codes matching GeoJSON NAME_1 field
export const INDIAN_REGIONS = [
  { id: 'maharashtra',    name: 'Maharashtra',    code: 'MH', lat: 19.7515, lon: 75.7139 },
  { id: 'gujarat',        name: 'Gujarat',         code: 'GJ', lat: 22.2587, lon: 71.1924 },
  { id: 'rajasthan',      name: 'Rajasthan',       code: 'RJ', lat: 27.0238, lon: 74.2179 },
  { id: 'odisha',         name: 'Odisha',          code: 'OD', lat: 20.9517, lon: 85.0985 },
  { id: 'andhra-pradesh', name: 'Andhra Pradesh',  code: 'AP', lat: 15.9129, lon: 79.7400 },
  { id: 'telangana',      name: 'Telangana',       code: 'TG', lat: 18.1124, lon: 79.0193 },
  { id: 'karnataka',      name: 'Karnataka',       code: 'KA', lat: 15.3173, lon: 75.7139 },
  { id: 'kerala',         name: 'Kerala',          code: 'KL', lat: 10.8505, lon: 76.2711 },
  { id: 'tamil-nadu',     name: 'Tamil Nadu',      code: 'TN', lat: 11.1271, lon: 78.6569 },
  { id: 'madhya-pradesh', name: 'Madhya Pradesh',  code: 'MP', lat: 22.9734, lon: 78.6569 },
  { id: 'chhattisgarh',   name: 'Chhattisgarh',   code: 'CG', lat: 21.2787, lon: 81.8661 },
  { id: 'jharkhand',      name: 'Jharkhand',       code: 'JH', lat: 23.6102, lon: 85.2799 },
  { id: 'west-bengal',    name: 'West Bengal',     code: 'WB', lat: 22.9868, lon: 87.8550 },
  { id: 'bihar',          name: 'Bihar',           code: 'BR', lat: 25.0961, lon: 85.3131 },
  { id: 'uttar-pradesh',  name: 'Uttar Pradesh',   code: 'UP', lat: 26.8467, lon: 80.9462 },
  { id: 'uttarakhand',    name: 'Uttarakhand',     code: 'UK', lat: 30.0668, lon: 79.0193 },
  { id: 'himachal-pradesh', name: 'Himachal Pradesh', code: 'HP', lat: 31.1048, lon: 77.1734 },
  { id: 'punjab',         name: 'Punjab',          code: 'PB', lat: 31.1471, lon: 75.3412 },
  { id: 'haryana',        name: 'Haryana',         code: 'HR', lat: 29.0588, lon: 76.0856 },
  { id: 'delhi',          name: 'Delhi',           code: 'DL', lat: 28.7041, lon: 77.1025 },
  { id: 'assam',          name: 'Assam',           code: 'AS', lat: 26.2006, lon: 92.9376 },
  { id: 'meghalaya',      name: 'Meghalaya',       code: 'ML', lat: 25.4670, lon: 91.3662 },
  { id: 'nagaland',       name: 'Nagaland',        code: 'NL', lat: 26.1584, lon: 94.5624 },
  { id: 'manipur',        name: 'Manipur',         code: 'MN', lat: 24.6637, lon: 93.9063 },
  { id: 'mizoram',        name: 'Mizoram',         code: 'MZ', lat: 23.1645, lon: 92.9376 },
  { id: 'tripura',        name: 'Tripura',         code: 'TR', lat: 23.9408, lon: 91.9882 },
  { id: 'arunachal',      name: 'Arunachal Pradesh', code: 'AR', lat: 28.2180, lon: 94.7278 },
  { id: 'sikkim',         name: 'Sikkim',          code: 'SK', lat: 27.5330, lon: 88.5122 },
  { id: 'goa',            name: 'Goa',             code: 'GA', lat: 15.2993, lon: 74.1240 },
  { id: 'jammu-kashmir',  name: 'Jammu & Kashmir', code: 'JK', lat: 33.7782, lon: 74.8762 },
  { id: 'ladakh',         name: 'Ladakh',          code: 'LA', lat: 34.1526, lon: 77.5771 },
];

// Bust probabilities per region per day — deterministic seeded variation
function seedRisk(regionIdx, dayIdx) {
  const base = baseBustRisk[dayIdx];
  const offset = ((regionIdx * 7 + dayIdx * 3) % 21) - 10;
  return Math.max(2, Math.min(95, base + offset));
}

function seedConf(regionIdx, dayIdx) {
  const base = baseConfidence[dayIdx];
  const offset = (((regionIdx * 5 + dayIdx * 2) % 19) - 9);
  return Math.max(5, Math.min(99, base + offset));
}

function severity(bustProb) {
  if (bustProb >= 65) return 'HIGH';
  if (bustProb >= 40) return 'MEDIUM';
  return 'LOW';
}

function featureFactors(regionIdx, dayIdx) {
  const base = {
    ensembleSpread:    Math.min(95, 40 + seedRisk(regionIdx, dayIdx) * 0.7),
    historicalError:   Math.min(90, 35 + seedRisk(regionIdx, dayIdx) * 0.6),
    patternSimilarity: Math.min(85, 30 + seedRisk(regionIdx, dayIdx) * 0.55),
    leadTimeEffect:    Math.min(80, 20 + dayIdx * 7),
  };
  return base;
}

export const MOCK_REGIONS_FULL = INDIAN_REGIONS.map((region, rIdx) => ({
  ...region,
  _isMock: true,
  days: Object.fromEntries(
    DAY_LABELS.map((day, dIdx) => {
      const bp = seedRisk(rIdx, dIdx);
      const cf = seedConf(rIdx, dIdx);
      return [day, {
        bustProbability: bp,
        confidence: cf,
        severity: severity(bp),
        variable: ['Precipitation', 'Temperature', 'Wind', 'Pressure'][rIdx % 4],
        ...featureFactors(rIdx, dIdx),
        forecastValue: (Math.random() * 50 + 10).toFixed(1),
        observedValue: null, // future verification
      }];
    })
  ),
}));

export const MOCK_OVERVIEW = {
  _isMock: true,
  forecastConfidence: 62,
  bustRisk: 31,
  highRiskRegions: 8,
  regionsMonitored: 30,
  forecastCycle: '00 UTC',
  forecastDate: '2025-07-15',
  model: 'GFS + NCMRWF-UMD',
  lastUpdated: '2025-07-15 06:30 UTC',
  systemStatus: 'OPERATIONAL',
  nationalTimeline: DAY_LABELS.map((day, i) => ({
    day,
    confidence: baseConfidence[i],
    bustRisk: baseBustRisk[i],
  })),
};

export const MOCK_BUST_DETECTION = MOCK_REGIONS_FULL
  .flatMap(region =>
    DAY_LABELS.map((day, dIdx) => ({
      regionId: region.id,
      regionName: region.name,
      day,
      bustProbability: region.days[day].bustProbability,
      confidence: region.days[day].confidence,
      severity: region.days[day].severity,
      variable: region.days[day].variable,
      ensembleSpread: region.days[day].ensembleSpread,
    }))
  )
  .filter(r => r.bustProbability >= 40)
  .sort((a, b) => b.bustProbability - a.bustProbability)
  .slice(0, 50);
