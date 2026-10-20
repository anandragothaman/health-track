import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { Droplet } from 'lucide-react';
import type { GlucoseReading, GlucoseTargets, GlucoseUnit } from '../../types';
import { averageGlucoseMgdl, groupBy, type Bucket } from '../../utils/stats';
import {
  classifyGlucose,
  CONTEXT_LABEL,
  fromMgdl,
  GLUCOSE_FILTER_LABEL,
  GLUCOSE_STATUS_LABEL,
  matchesFilter,
  READING_TYPE_LABEL,
  roundGlucose,
  toMgdl,
  type GlucoseFilter,
} from '../../utils/glucose';
import { formatDate, formatDateTime, formatMonth, formatShortDate, formatTime, parseDateInput } from '../../utils/date';
import { chartColors, DAY_MS, niceScale, timeTicks } from './chartTheme';
import { TooltipBox, TooltipRow } from './ChartTooltip';
import { useIsDark } from '../../hooks/useIsDark';
import { EmptyState, Segmented } from '../ui';

type Mode = 'readings' | Bucket;

interface Point {
  t: number;
  value: number;
  label: string;
  count?: number;
  status?: string;
}

interface Props {
  readings: GlucoseReading[];
  from: Date;
  to: Date;
  days: number;
  unit: GlucoseUnit;
  targets: GlucoseTargets;
}

const MODE_LABEL: Record<Mode, string> = { readings: 'Each reading', day: 'Daily', week: 'Weekly', month: 'Monthly' };

export function GlucoseChart({ readings, from, to, days, unit, targets }: Props) {
  const dark = useIsDark();
  const c = chartColors(dark);
  const [filter, setFilter] = useState<GlucoseFilter>('all');
  const [modeChoice, setModeChoice] = useState<Mode | null>(null);
  const [showTarget, setShowTarget] = useState(true);
  const mode: Mode = modeChoice ?? (days <= 14 ? 'readings' : 'day');

  const filtered = useMemo(() => readings.filter((r) => matchesFilter(r.reading_type, filter)), [readings, filter]);

  const points = useMemo<Point[]>(() => {
    const show = (mgdl: number) => roundGlucose(fromMgdl(mgdl, unit), unit);
    if (mode === 'readings') {
      return filtered
        .map((r) => {
          const mgdl = toMgdl(r.glucose_value, r.unit);
          return {
            t: new Date(r.measured_at).getTime(),
            value: show(mgdl),
            label: READING_TYPE_LABEL[r.reading_type],
            status: GLUCOSE_STATUS_LABEL[classifyGlucose(mgdl, r.reading_type, targets)],
          };
        })
        .sort((a, b) => a.t - b.t);
    }
    return [...groupBy(filtered, mode).entries()].map(([key, rows]) => {
      const start = parseDateInput(key);
      return {
        t: start.getTime() + (mode === 'day' ? DAY_MS / 2 : 0),
        value: show(averageGlucoseMgdl(rows)!),
        label: mode === 'day' ? formatDate(start) : mode === 'week' ? `Week of ${formatShortDate(start)}` : formatMonth(start),
        count: rows.length,
      };
    });
  }, [filtered, mode, unit, targets]);

  const domain: [number, number] = [from.getTime(), to.getTime()];
  const ticks = timeTicks(domain[0], domain[1], 7, mode === 'day');
  const tickFmt = (t: number) => (days <= 1 ? formatTime(t) : formatShortDate(t));
  const band = filter === 'all' ? null : targets[filter];
  const d = (mgdl: number) => roundGlucose(fromMgdl(mgdl, unit), unit);
  const values = points.map((p) => p.value);
  const pad = unit === 'mg/dL' ? 5 : 0.3;
  const y = niceScale(
    Math.min(...values, showTarget ? d(targets.hypo) : Infinity, showTarget && band ? d(band.low) : Infinity) - pad,
    Math.max(...values, showTarget && band ? d(band.high) : -Infinity) + pad,
    unit === 'mg/dL' ? [10, 20, 25, 50, 100] : [0.5, 1, 2, 5],
  );

  const renderTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as Point;
    const title = p.count != null ? `${p.label} · average of ${p.count}` : `${formatDateTime(p.t)}`;
    return (
      <TooltipBox title={title}>
        <TooltipRow color={c.third} label={p.count != null ? 'Average' : p.label} value={`${p.value} ${unit}`} />
        {p.status && <p className="mt-1 text-muted">{p.status}</p>}
      </TooltipBox>
    );
  };

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3">
        <Segmented<GlucoseFilter>
          label="Reading type"
          value={filter}
          onChange={setFilter}
          options={(['all', 'fasting', 'beforeMeal', 'afterMeal'] as GlucoseFilter[]).map((f) => ({
            value: f,
            label: GLUCOSE_FILTER_LABEL[f],
          }))}
        />
        <Segmented<Mode>
          label="Chart detail"
          value={mode}
          onChange={setModeChoice}
          options={(['readings', 'day', 'week', 'month'] as Mode[]).map((m) => ({ value: m, label: MODE_LABEL[m] }))}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Droplet className="h-8 w-8" />} title="No glucose readings for this selection">
          Add a reading, choose another reading type, or pick a longer date range.
        </EmptyState>
      ) : (
        <>
          <p className="mb-1 text-sm text-muted">
            Blood glucose in <strong className="text-ink">{unit}</strong>
            {mode !== 'readings' && ` · ${MODE_LABEL[mode].toLowerCase()} averages`}
          </p>
          <p className="sr-only">
            Glucose chart with {filtered.length} readings between {formatDate(from)} and {formatDate(to)}. A table is
            available on the History page.
          </p>
          <div className="h-64 sm:h-80" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid stroke={c.grid} vertical={false} />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={domain}
                  ticks={ticks}
                  tickFormatter={tickFmt}
                  tick={{ fontSize: 12, fill: c.axis }}
                  tickLine={false}
                  axisLine={{ stroke: c.grid }}
                  minTickGap={16}
                />
                <YAxis
                  domain={y.domain}
                  ticks={y.ticks}
                  tickFormatter={(v: number) => (unit === 'mg/dL' ? String(Math.round(v)) : v.toFixed(1))}
                  tick={{ fontSize: 12, fill: c.axis }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                {showTarget && band && (
                  <ReferenceArea y1={d(band.low)} y2={d(band.high)} fill={c.band} fillOpacity={0.1} stroke="none" />
                )}
                {showTarget && (
                  <ReferenceLine
                    y={d(targets.hypo)}
                    stroke={c.ref}
                    strokeDasharray="2 4"
                    label={{ value: `Low: below ${d(targets.hypo)}`, position: 'insideBottomRight', fill: c.axis, fontSize: 11 }}
                  />
                )}
                <Tooltip content={renderTooltip} cursor={{ stroke: c.axis, strokeDasharray: '3 3' }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={c.third}
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: c.third, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <label className="mt-3 inline-flex min-h-[40px] cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={showTarget}
              onChange={(e) => setShowTarget(e.target.checked)}
            />
            {band
              ? `Show target range for ${CONTEXT_LABEL[filter as Exclude<GlucoseFilter, 'all'>].toLowerCase()} (${d(band.low)}–${d(band.high)} ${unit})`
              : `Show low-glucose line (${d(targets.hypo)} ${unit}). Pick a reading type to see its target band.`}
          </label>
        </>
      )}
    </div>
  );
}
