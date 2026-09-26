// MOCK EXPLANATIONS — DEMO ONLY. Signals grounded in measurable model features.
// No LLM-generated meteorological causes.

export const MOCK_EXPLANATIONS = {
  'maharashtra': {
    _isMock: true,
    region: 'Maharashtra',
    day: 'D5',
    reliability: 'LOW',
    bustProbability: 78,
    confidence: 22,
    severity: 'HIGH',
    variable: 'Precipitation',
    signals: [
      {
        id: 'ensemble-spread',
        rank: 1,
        label: 'High ensemble disagreement',
        detail: 'Ensemble spread for 24-hour precipitation exceeds the 90th percentile climatological threshold for this region and season.',
        contribution: 86,
        evidenceType: 'ENSEMBLE_METRIC',
      },
      {
        id: 'historical-error',
        rank: 2,
        label: 'Similar historical patterns produced larger-than-normal errors',
        detail: '14 of 18 analogous synoptic patterns in the 2015–2024 archive showed D5 precipitation forecast errors exceeding 40mm over Maharashtra.',
        contribution: 79,
        evidenceType: 'HISTORICAL_ANALOG',
      },
      {
        id: 'pattern-change',
        rank: 3,
        label: 'Rapid change in precipitation pattern',
        detail: 'Pattern similarity index between D4 and D5 forecast fields is below the stability threshold, indicating high forecast evolution.',
        contribution: 71,
        evidenceType: 'PATTERN_METRIC',
      },
      {
        id: 'lead-time',
        rank: 4,
        label: 'Forecast error historically increases at this lead time',
        detail: 'Climatological RMSE for Day 5 precipitation over Maharashtra is 2.3× the Day 3 value based on 2019–2024 verification data.',
        contribution: 63,
        evidenceType: 'CLIMATOLOGICAL_STAT',
      },
    ],
    historicalEvidence: [
      { event: 'Monsoon Depression — July 2025', day: 'D5', forecastError: 79, aiRisk: 74 },
      { event: 'Heavy Rainfall — August 2024', day: 'D4', forecastError: 68, aiRisk: 72 },
    ],
  },
  'gujarat': {
    _isMock: true,
    region: 'Gujarat',
    day: 'D4',
    reliability: 'LOW',
    bustProbability: 71,
    confidence: 29,
    severity: 'HIGH',
    variable: 'Wind',
    signals: [
      {
        id: 'ensemble-spread',
        rank: 1,
        label: 'High ensemble disagreement in wind speed',
        detail: 'Inter-member standard deviation for 10m wind speed at D4 is 6.2 m/s, exceeding the 85th percentile threshold.',
        contribution: 82,
        evidenceType: 'ENSEMBLE_METRIC',
      },
      {
        id: 'cyclone-track',
        rank: 2,
        label: 'Cyclone track uncertainty within ensemble',
        detail: 'Track spread in the ensemble exceeds 200 km at 96h, which is associated with higher landfall intensity forecast errors historically.',
        contribution: 76,
        evidenceType: 'HISTORICAL_ANALOG',
      },
      {
        id: 'lead-time',
        rank: 3,
        label: 'Elevated error rate at D4 for cyclonic systems',
        detail: 'D4 wind speed RMSE for cyclone cases is 3.1× the D2 value in the 2018–2024 hindcast archive.',
        contribution: 64,
        evidenceType: 'CLIMATOLOGICAL_STAT',
      },
    ],
    historicalEvidence: [
      { event: 'Cyclone Track — June 2024', day: 'D4', forecastError: 67, aiRisk: 78 },
    ],
  },
  'odisha': {
    _isMock: true,
    region: 'Odisha',
    day: 'D6',
    reliability: 'MODERATE',
    bustProbability: 67,
    confidence: 33,
    severity: 'MEDIUM',
    variable: 'Precipitation',
    signals: [
      {
        id: 'ensemble-spread',
        rank: 1,
        label: 'Moderate ensemble disagreement',
        detail: 'Ensemble spread is at the 75th percentile threshold for this region at D6.',
        contribution: 70,
        evidenceType: 'ENSEMBLE_METRIC',
      },
      {
        id: 'lead-time',
        rank: 2,
        label: 'Climatological error increase at D6',
        detail: 'D6 precipitation RMSE is 2.7× D3 for Bay of Bengal depression cases.',
        contribution: 65,
        evidenceType: 'CLIMATOLOGICAL_STAT',
      },
      {
        id: 'pattern-change',
        rank: 3,
        label: 'Pattern evolution rate above normal',
        detail: 'Forecast field correlation between D5 and D6 is below 0.7, indicating instability in the prediction.',
        contribution: 58,
        evidenceType: 'PATTERN_METRIC',
      },
    ],
    historicalEvidence: [
      { event: 'Monsoon Depression — July 2025', day: 'D6', forecastError: 71, aiRisk: 70 },
    ],
  },
};

// Default explanation for regions not explicitly defined
export function getExplanationForRegion(regionId, day, bustProbability, confidence) {
  if (MOCK_EXPLANATIONS[regionId]) return MOCK_EXPLANATIONS[regionId];

  const bp = bustProbability || 55;
  const cf = confidence || 45;
  const reliability = bp >= 65 ? 'LOW' : bp >= 40 ? 'MODERATE' : 'HIGH';

  return {
    _isMock: true,
    region: regionId,
    day: day || 'D5',
    reliability,
    bustProbability: bp,
    confidence: cf,
    severity: bp >= 65 ? 'HIGH' : bp >= 40 ? 'MEDIUM' : 'LOW',
    variable: 'Precipitation',
    signals: [
      {
        id: 'ensemble-spread',
        rank: 1,
        label: 'Elevated ensemble spread detected',
        detail: `Ensemble standard deviation for the ${day} forecast exceeds the climatological 80th percentile for this region.`,
        contribution: Math.round(bp * 0.95),
        evidenceType: 'ENSEMBLE_METRIC',
      },
      {
        id: 'historical-error',
        rank: 2,
        label: 'Historical analogs show elevated error rates',
        detail: 'Pattern-matched cases in the 2015–2024 archive show above-normal forecast errors at this lead time.',
        contribution: Math.round(bp * 0.82),
        evidenceType: 'HISTORICAL_ANALOG',
      },
      {
        id: 'lead-time',
        rank: 3,
        label: `Climatological error increase at ${day}`,
        detail: 'RMSE increases non-linearly beyond Day 4 for this region based on archive verification.',
        contribution: Math.round(bp * 0.70),
        evidenceType: 'CLIMATOLOGICAL_STAT',
      },
    ],
    historicalEvidence: [],
  };
}
