import type { ReactNode } from 'react';
import { LEVEL_TONE, levelFor, type ReliabilityLevel } from '../lib/riskScale';

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="border-b border-line bg-panel px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-0.5 max-w-3xl text-[13px] leading-relaxed text-ink-muted">
            {description}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

interface ReliabilityBadgeProps {
  value: number;
  /** Which quantity the level is derived from. Thresholds are identical. */
  basedOn?: 'confidence' | 'bust_probability';
  className?: string;
}

/**
 * The HIGH / MODERATE / LOW tag, cut at 0.70 and 0.40 exactly as specified.
 * The headline number is always bust probability, because that is what the
 * model predicts; confidence is shown as its complement.
 */
export function ReliabilityBadge({
  value,
  basedOn = 'confidence',
  className = '',
}: ReliabilityBadgeProps) {
  const level: ReliabilityLevel = levelFor(value);
  return (
    <span className={`chip border ${LEVEL_TONE[level].chip} ${className}`}>
      {level} {basedOn === 'confidence' ? 'CONFIDENCE' : 'RISK'}
    </span>
  );
}

/** Big bust-probability / confidence pair used on the detail panels. */
export function ProbabilityStat({
  bustProbability,
  confidence,
}: {
  bustProbability: number;
  confidence: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-md border border-line bg-raised px-3 py-2.5 text-center">
        <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">
          Bust probability
        </span>
        <span className="mt-0.5 block font-mono text-2xl font-bold tabular-nums text-risk-high">
          {(bustProbability * 100).toFixed(1)}%
        </span>
      </div>
      <div className="rounded-md border border-line bg-raised px-3 py-2.5 text-center">
        <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">
          Confidence (1 − bust)
        </span>
        <span className="mt-0.5 block font-mono text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {(confidence * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      {label}
    </div>
  );
}

export function UnavailableBlock({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-sunken px-4 py-6 text-center">
      <p className="text-sm font-semibold text-ink">DATA NOT AVAILABLE</p>
      <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-ink-muted">
        {message}
      </p>
    </div>
  );
}
