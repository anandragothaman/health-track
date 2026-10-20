import { Activity, AlertTriangle } from 'lucide-react';
import type { BpReading, Member } from '../types';
import { averageBp, inRange, trend } from '../utils/stats';
import { addDays, endOfDay, formatRelative, isSameDay, startOfDay } from '../utils/date';
import { classifyBp, PLANNED_SESSIONS } from '../utils/bp';
import { BpBadge } from './ReadingBadges';
import { TrendLabel } from './TrendLabel';

/** `readings` must cover at least the last 30 days. */
export function BpSummaryCard({ member, readings, now }: { member: Member; readings: BpReading[]; now: Date }) {
  const t = member.settings.bpThresholds;
  const latest = readings[0];
  const today = readings.filter((r) => isSameDay(new Date(r.measured_at), now));
  const todayAvg = averageBp(today);
  const weekAvg = averageBp(inRange(readings, startOfDay(addDays(now, -6)), endOfDay(now)));
  const monthAvg = averageBp(inRange(readings, startOfDay(addDays(now, -29)), endOfDay(now)));
  const sessionsDone = new Set(today.map((r) => r.session).filter((s) => PLANNED_SESSIONS.includes(s))).size;
  const sysTrend = trend(readings, (r) => r.systolic, 7, 3, now);
  const diaTrend = trend(readings, (r) => r.diastolic, 7, 3, now);

  return (
    <section className="card" aria-labelledby="bp-summary-title">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-lg bg-primary-soft p-2 text-primary">
          <Activity className="h-5 w-5" aria-hidden />
        </span>
        <h2 id="bp-summary-title" className="text-lg font-bold">
          Blood pressure
        </h2>
      </div>

      {latest ? (
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm text-muted">Latest reading</p>
            <p className="text-4xl font-bold tabular-nums tracking-tight">
              {latest.systolic}/{latest.diastolic}
              <span className="ml-1 text-base font-medium text-muted">mmHg</span>
            </p>
            <p className="text-sm text-muted">
              {formatRelative(latest.measured_at)}
              {latest.heart_rate != null && ` · ${latest.heart_rate} BPM`}
            </p>
          </div>
          <BpBadge sys={latest.systolic} dia={latest.diastolic} thresholds={t} />
        </div>
      ) : (
        <p className="text-muted">No readings yet.</p>
      )}

      {latest && classifyBp(latest.systolic, latest.diastolic, t) === 'severe' && (
        <p className="mt-3 flex gap-2 rounded-xl bg-crit-soft p-3 text-sm text-ink">
          <AlertTriangle className="h-4 w-4 shrink-0 text-crit" aria-hidden />
          The American Heart Association advises waiting a few minutes and measuring again. If readings stay this high,
          contact a healthcare professional.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line/60 pt-4 text-center">
        <Stat label="Today avg" value={todayAvg ? `${todayAvg.systolic}/${todayAvg.diastolic}` : '—'} />
        <Stat label="7-day avg" value={weekAvg ? `${weekAvg.systolic}/${weekAvg.diastolic}` : '—'} />
        <Stat label="30-day avg" value={monthAvg ? `${monthAvg.systolic}/${monthAvg.diastolic}` : '—'} />
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          <strong className="tabular-nums">{sessionsDone} of 3</strong> planned sessions today
          {today.length > sessionsDone && <span className="text-muted"> · {today.length} readings</span>}
        </span>
        <span className="flex flex-col items-end gap-0.5">
          <span className="text-xs text-muted">7-day trend vs previous 7 days</span>
          <span className="flex flex-wrap justify-end gap-x-3">
            <span className="text-muted">Sys</span>
            <TrendLabel trend={sysTrend.trend} />
            <span className="text-muted">Dia</span>
            <TrendLabel trend={diaTrend.trend} />
          </span>
        </span>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-lg font-bold tabular-nums">{value}</dd>
    </div>
  );
}
