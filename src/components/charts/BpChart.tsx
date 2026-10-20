import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { Activity } from 'lucide-react';
import type { BpReading, BpThresholds } from '../../types';
import { averageBp, groupBy } from '../../utils/stats';
import { formatDate, formatDateTime, formatShortDate, formatTime, parseDateInput } from '../../utils/date';
import { SESSION_LABEL } from '../../utils/bp';
import { chartColors, DAY_MS, niceScale, timeTicks } from './chartTheme';
import { LegendItem, TooltipBox, TooltipRow } from './ChartTooltip';
import { useIsDark } from '../../hooks/useIsDark';
import { EmptyState, Segmented } from '../ui';

interface Point {
  t: number;
  systolic: number;
  diastolic: number;
  heartRate: number | null;
  /** Individual reading: session label. Average: number of readings. */
  session?: string;
  count?: number;
}

interface Props {
  readings: BpReading[];
  from: Date;
  to: Date;
  days: number;
  thresholds: BpThresholds;
}

type Mode = 'readings' | 'daily';

export function BpChart({ readings, from, to, days, thresholds }: Props) {
  const dark = useIsDark();
  const c = chartColors(dark);
  const [modeChoice, setModeChoice] = useState<Mode | null>(null);
  const [showRef, setShowRef] = useState(true);
  const [showHr, setShowHr] = useState(false);
  const mode: Mode = modeChoice ?? (days <= 14 ? 'readings' : 'daily');

  const points = useMemo<Point[]>(() => {
    if (mode === 'readings') {
      return readings
        .map((r) => ({
          t: new Date(r.measured_at).getTime(),
          systolic: r.systolic,
          diastolic: r.diastolic,
          heartRate: r.heart_rate,
          session: SESSION_LABEL[r.session],
        }))
        .sort((a, b) => a.t - b.t);
    }
    return [...groupBy(readings, 'day').entries()].map(([day, rows]) => {
      const avg = averageBp(rows)!;
      return {
        t: parseDateInput(day).getTime() + DAY_MS / 2,
        systolic: avg.systolic,
        diastolic: avg.diastolic,
        heartRate: avg.heartRate,
        count: avg.count,
      };
    });
  }, [readings, mode]);

  const domain: [number, number] = [from.getTime(), to.getTime()];
  const ticks = timeTicks(domain[0], domain[1], 7, mode === 'daily');
  const singleDay = days <= 1;
  const tickFmt = (t: number) => (singleDay ? formatTime(t) : formatShortDate(t));
  const hasHr = points.some((p) => p.heartRate != null);
  const refs = showRef ? [thresholds.stage1Sys, thresholds.stage1Dia] : [];
  const y = niceScale(
    Math.min(...points.map((p) => p.diastolic), ...refs) - 5,
    Math.max(...points.map((p) => p.systolic), ...refs) + 5,
    [10, 20, 40],
  );
  const hrValues = points.filter((p) => p.heartRate != null).map((p) => p.heartRate as number);
  const yHr = niceScale(Math.min(...hrValues) - 3, Math.max(...hrValues) + 3, [5, 10, 20]);

  if (readings.length === 0) {
    return (
      <EmptyState icon={<Activity className="h-8 w-8" />} title="No blood pressure readings in this period">
        Add a reading or choose a longer date range to see the chart.
      </EmptyState>
    );
  }

  const renderTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as Point;
    const title = p.count != null ? `${formatDate(p.t)} · average of ${p.count}` : `${formatDateTime(p.t)} · ${p.session}`;
    return (
      <TooltipBox title={title}>
        <TooltipRow color={c.systolic} label="Systolic" value={`${p.systolic} mmHg`} />
        <TooltipRow color={c.diastolic} dashed label="Diastolic" value={`${p.diastolic} mmHg`} />
        {p.heartRate != null && <TooltipRow label="Heart rate" value={`${p.heartRate} BPM`} />}
      </TooltipBox>
    );
  };

  const xAxis = (
    <XAxis
      dataKey="t"
      type="number"
      scale="time"
      domain={domain}
      ticks={ticks}
      tickFormatter={tickFmt}
      stroke={c.axis}
      tick={{ fontSize: 12, fill: c.axis }}
      tickLine={false}
      axisLine={{ stroke: c.grid }}
      minTickGap={16}
    />
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4" aria-hidden>
          <LegendItem color={c.systolic} label="Systolic (top number)" />
          <LegendItem color={c.diastolic} dashed label="Diastolic (bottom number)" />
        </div>
        <Segmented<Mode>
          label="Chart detail"
          value={mode}
          onChange={setModeChoice}
          options={[
            { value: 'readings', label: 'Each reading' },
            { value: 'daily', label: 'Daily average' },
          ]}
        />
      </div>

      <p className="sr-only">
        Blood pressure chart with {readings.length} readings between {formatDate(from)} and {formatDate(to)}. A table of
        the same readings is available on the History page.
      </p>

      <div className="h-64 sm:h-80" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={c.grid} vertical={false} />
            {xAxis}
            <YAxis
              domain={y.domain}
              ticks={y.ticks}
              tick={{ fontSize: 12, fill: c.axis }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            {showRef && (
              <>
                <ReferenceLine
                  y={thresholds.stage1Sys}
                  stroke={c.ref}
                  strokeDasharray="2 4"
                  label={{ value: `${thresholds.stage1Sys} systolic`, position: 'insideTopRight', fill: c.axis, fontSize: 11 }}
                />
                <ReferenceLine
                  y={thresholds.stage1Dia}
                  stroke={c.ref}
                  strokeDasharray="2 4"
                  label={{ value: `${thresholds.stage1Dia} diastolic`, position: 'insideBottomRight', fill: c.axis, fontSize: 11 }}
                />
              </>
            )}
            <Tooltip content={renderTooltip} cursor={{ stroke: c.axis, strokeDasharray: '3 3' }} />
            <Line
              type="monotone"
              dataKey="systolic"
              stroke={c.systolic}
              strokeWidth={2}
              dot={{ r: 3.5, fill: c.systolic, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="diastolic"
              stroke={c.diastolic}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3.5, fill: c.diastolic, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2">
          <input type="checkbox" className="h-5 w-5 accent-primary" checked={showRef} onChange={(e) => setShowRef(e.target.checked)} />
          Reference lines ({thresholds.stage1Sys}/{thresholds.stage1Dia} mmHg, start of high blood pressure stage 1)
        </label>
        {hasHr && (
          <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2">
            <input type="checkbox" className="h-5 w-5 accent-primary" checked={showHr} onChange={(e) => setShowHr(e.target.checked)} />
            Show heart rate chart
          </label>
        )}
      </div>

      {showHr && hasHr && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">Heart rate (BPM)</h3>
          <div className="h-44" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points.filter((p) => p.heartRate != null)} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid stroke={c.grid} vertical={false} />
                {xAxis}
                <YAxis
                  domain={yHr.domain}
                  ticks={yHr.ticks}
                  tick={{ fontSize: 12, fill: c.axis }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip content={renderTooltip} cursor={{ stroke: c.axis, strokeDasharray: '3 3' }} />
                <Line
                  type="monotone"
                  dataKey="heartRate"
                  stroke={c.third}
                  strokeWidth={2}
                  dot={{ r: 3, fill: c.third, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
