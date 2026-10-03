import { Info } from 'lucide-react';
import type { InputDerivation } from '../types';

interface ModelInputTableProps {
  inputs: Record<string, number>;
  derivation?: InputDerivation;
}

/**
 * The driver values the booster reads, in the units the training data used.
 *
 * Latitude and longitude are not listed here because the caller already names
 * the coordinate on screen, so restating them would add a row that says
 * nothing the reader cannot see. Display units are the ones a forecaster would
 * expect, so each row names both the variable and its unit.
 */
const ROWS: { key: string; label: string; unit: string; digits: number }[] = [
  { key: 'total_precipitation_24hr', label: '24h total precipitation', unit: 'm', digits: 4 },
  { key: '2m_temperature', label: '2 m temperature', unit: '°C', digits: 1 },
  { key: 'mean_sea_level_pressure', label: 'Mean sea-level pressure', unit: 'hPa', digits: 1 },
  { key: '10m_u_component_of_wind', label: '10 m U wind', unit: 'm/s', digits: 1 },
  { key: '10m_v_component_of_wind', label: '10 m V wind', unit: 'm/s', digits: 1 },
  { key: 'specific_humidity_850', label: 'Specific humidity @ 850 hPa', unit: 'kg/kg', digits: 4 },
  { key: 'geopotential_500', label: 'Geopotential @ 500 hPa', unit: 'm', digits: 0 },
  { key: 'vertical_velocity_500', label: 'Vertical velocity @ 500 hPa', unit: 'Pa/s', digits: 2 },
  { key: 'bust_pattern_similarity', label: 'Bust pattern similarity', unit: '0–1', digits: 2 },
];

export default function ModelInputTable({ inputs, derivation }: ModelInputTableProps) {
  const rows = ROWS.filter((r) => typeof inputs?.[r.key] === 'number');

  return (
    <div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Model input</th>
              <th scope="col" className="text-right">Value</th>
              <th scope="col" className="text-right">Unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td className="text-right font-mono tabular-nums">
                  {inputs[row.key].toFixed(row.digits)}
                </td>
                <td className="text-right text-ink-muted">{row.unit}</td>
              </tr>
            ))}
            <tr>
              <td>Lead time</td>
              <td className="text-right font-mono tabular-nums">
                {Math.round(inputs.lead_hours ?? 0)}
              </td>
              <td className="text-right text-ink-muted">
                h (Day {Math.round((inputs.lead_hours ?? 0) / 24)})
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {derivation && (
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-muted">
          <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <span>
            This prototype has no live numerical weather prediction feed. The nine
            meteorological drivers above were interpolated by inverse distance from
            the {derivation.neighbour_count} nearest cells of the trained reference
            grid (nearest {derivation.source_cell}, {derivation.distance_km} km away).
            The bust probability is a single evaluation of the trained model on those
            values.
          </span>
        </p>
      )}
    </div>
  );
}
