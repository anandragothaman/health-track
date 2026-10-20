import { Link } from 'react-router-dom';
import { Activity, Droplet, Pencil } from 'lucide-react';
import type { BpReading, GlucoseReading, Member } from '../types';
import { formatRelative } from '../utils/date';
import { SESSION_LABEL } from '../utils/bp';
import { formatGlucose, READING_TYPE_LABEL, toMgdl } from '../utils/glucose';
import { BpBadge, GlucoseBadge } from './ReadingBadges';
import { EmptyState } from './ui';

type Item = { kind: 'bp'; r: BpReading } | { kind: 'glucose'; r: GlucoseReading };

export function RecentReadings({ member, bp, glucose, limit = 6 }: { member: Member; bp: BpReading[]; glucose: GlucoseReading[]; limit?: number }) {
  const items: Item[] = [
    ...bp.slice(0, limit).map((r) => ({ kind: 'bp' as const, r })),
    ...glucose.slice(0, limit).map((r) => ({ kind: 'glucose' as const, r })),
  ]
    .sort((a, b) => b.r.measured_at.localeCompare(a.r.measured_at))
    .slice(0, limit);

  return (
    <section className="card" aria-labelledby="recent-title">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="recent-title" className="text-lg font-bold">
          Recent readings
        </h2>
        <Link to={`/member/${member.id}/history`} className="btn-ghost min-h-[40px] text-sm">
          View all
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState title="No readings yet">Use the buttons above to add the first reading.</EmptyState>
      ) : (
        <ul className="divide-y divide-line/60">
          {items.map((it) => (
            <li key={it.r.id} className="flex items-center gap-3 py-3">
              {it.kind === 'bp' ? (
                <Activity className="h-5 w-5 shrink-0 text-primary" aria-label="Blood pressure" />
              ) : (
                <Droplet className="h-5 w-5 shrink-0 text-accent" aria-label="Blood sugar" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold tabular-nums">
                  {it.kind === 'bp'
                    ? `${it.r.systolic}/${it.r.diastolic} mmHg`
                    : `${formatGlucose(toMgdl(it.r.glucose_value, it.r.unit), member.settings.glucoseUnit)} ${member.settings.glucoseUnit}`}
                  <span className="ml-2 font-normal text-muted">
                    {it.kind === 'bp' ? SESSION_LABEL[it.r.session] : READING_TYPE_LABEL[it.r.reading_type]}
                  </span>
                </p>
                <p className="text-sm text-muted">{formatRelative(it.r.measured_at)}</p>
              </div>
              <div className="hidden sm:block">
                {it.kind === 'bp' ? (
                  <BpBadge sys={it.r.systolic} dia={it.r.diastolic} thresholds={member.settings.bpThresholds} />
                ) : (
                  <GlucoseBadge reading={it.r} targets={member.settings.glucoseTargets} />
                )}
              </div>
              <Link
                to={`/member/${member.id}/${it.kind}/${it.r.id}/edit`}
                className="btn-ghost h-11 w-11 p-0"
                aria-label="Edit reading"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
