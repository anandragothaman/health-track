import { Droplet } from 'lucide-react';
import type { GlucoseReading, Member } from '../types';
import { averageGlucoseMgdl, glucoseTolerance, inRange, trend } from '../utils/stats';
import { formatDate, formatRelative } from '../utils/date';
import { formatGlucose, fromMgdl, READING_TYPE_LABEL, toMgdl } from '../utils/glucose';
import { GLUCOSE_PRESETS } from '../utils/glucose';
import { GlucoseBadge } from './ReadingBadges';
import { TrendLabel } from './TrendLabel';

interface Props {
  member: Member;
  /** Readings covering at least the last 14 days and the selected period. */
  readings: GlucoseReading[];
  period: { from: Date; to: Date };
  now: Date;
}

export function GlucoseSummaryCard({ member, readings, period, now }: Props) {
  const { glucoseUnit: unit, glucoseTargets: targets, glucosePreset } = member.settings;
  const latest = readings[0];
  const inPeriod = inRange(readings, period.from, period.to);
  const avg = averageGlucoseMgdl(inPeriod);
  const tr = trend(readings, (r) => fromMgdl(toMgdl(r.glucose_value, r.unit), unit), 7, glucoseTolerance(unit), now);

  return (
    <section className="card" aria-labelledby="glucose-summary-title">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-lg bg-accent-soft p-2 text-accent">
          <Droplet className="h-5 w-5" aria-hidden />
        </span>
        <h2 id="glucose-summary-title" className="text-lg font-bold">
          Blood sugar
        </h2>
      </div>

      {latest ? (
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm text-muted">Latest reading</p>
            <p className="text-4xl font-bold tabular-nums tracking-tight">
              {formatGlucose(toMgdl(latest.glucose_value, latest.unit), unit)}
              <span className="ml-1 text-base font-medium text-muted">{unit}</span>
            </p>
            <p className="text-sm text-muted">
              {READING_TYPE_LABEL[latest.reading_type]} · {formatRelative(latest.measured_at)}
            </p>
          </div>
          <GlucoseBadge reading={latest} targets={targets} />
        </div>
      ) : (
        <p className="text-muted">No readings yet.</p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line/60 pt-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Average, selected period</dt>
          <dd className="text-lg font-bold tabular-nums">
            {avg != null ? `${formatGlucose(avg, unit)} ${unit}` : '—'}
          </dd>
          <dd className="text-xs text-muted">
            {inPeriod.length} readings · {formatDate(period.from)} – {formatDate(period.to)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">7-day trend</dt>
          <dd className="mt-1">
            <TrendLabel trend={tr.trend} />
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted">
        Targets: {glucosePreset === 'custom' ? 'custom targets' : GLUCOSE_PRESETS[glucosePreset].label}. Change in Settings.
      </p>
    </section>
  );
}
