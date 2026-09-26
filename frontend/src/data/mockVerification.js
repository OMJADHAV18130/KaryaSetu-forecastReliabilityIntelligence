// MOCK VERIFICATION DATA — DEMO ONLY
export const MOCK_VERIFICATION = {
  _isMock: true,
  events: [
    {
      id: 'monsoon-dep-jul25',
      name: 'Monsoon Depression — July 2025',
      region: 'Central India',
      variable: 'Precipitation',
      forecastDate: '2025-07-10',
      leadTimes: ['D1','D2','D3','D4','D5','D6','D7'],
      errorByDay: [
        { day: 'D1', rmse: 8.2,  bias: -1.2, mae: 6.1  },
        { day: 'D2', rmse: 12.4, bias: -2.8, mae: 9.8  },
        { day: 'D3', rmse: 24.1, bias: -6.1, mae: 18.9 },
        { day: 'D4', rmse: 48.7, bias: -12.3,mae: 38.2 },
        { day: 'D5', rmse: 61.3, bias: -15.7,mae: 49.6 },
        { day: 'D6', rmse: 55.8, bias: -14.1,mae: 44.3 },
        { day: 'D7', rmse: 41.2, bias: -10.2,mae: 33.1 },
      ],
      // Mock spatial data — encoded as region intensity values
      forecastIntensity: { low: 35, mid: 70, high: 115 },
      observedIntensity:  { low: 40, mid: 90, high: 142 },
    },
    {
      id: 'cyclone-jun24',
      name: 'Cyclone Track — June 2024',
      region: 'Gujarat Coast',
      variable: 'Wind',
      forecastDate: '2024-06-10',
      leadTimes: ['D1','D2','D3','D4','D5'],
      errorByDay: [
        { day: 'D1', rmse: 4.1,  bias: -0.8, mae: 3.2  },
        { day: 'D2', rmse: 9.3,  bias: -2.1, mae: 7.4  },
        { day: 'D3', rmse: 19.8, bias: -5.6, mae: 15.3 },
        { day: 'D4', rmse: 31.4, bias: -8.9, mae: 24.7 },
        { day: 'D5', rmse: 27.2, bias: -7.3, mae: 21.1 },
      ],
      forecastIntensity: { low: 25, mid: 55, high: 90 },
      observedIntensity:  { low: 30, mid: 72, high: 115 },
    },
  ],
};
