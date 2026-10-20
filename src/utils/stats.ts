import type { BpReading, GlucoseReading, GlucoseUnit } from '../types';
import { addDays, startOfDay, startOfMonth, startOfWeek, toDateInput } from './date';
import { toMgdl } from './glucose';

export type Bucket = 'day' | 'week' | 'month';

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function inRange<T extends { measured_at: string }>(rows: T[], from: Date, to: Date): T[] {
  const a = from.getTime();
  const b = to.getTime();
  return rows.filter((r) => {
    const t = new Date(r.measured_at).getTime();
    return t >= a && t <= b;
  });
}

export interface BpAverage {
  systolic: number;
  diastolic: number;
  heartRate: number | null;
  count: number;
}

/** Systolic and diastolic are always averaged separately. */
export function averageBp(rows: BpReading[]): BpAverage | null {
  if (rows.length === 0) return null;
  const hr = rows.filter((r) => r.heart_rate != null).map((r) => r.heart_rate as number);
  return {
    systolic: Math.round(mean(rows.map((r) => r.systolic))!),
    diastolic: Math.round(mean(rows.map((r) => r.diastolic))!),
    heartRate: hr.length ? Math.round(mean(hr)!) : null,
    count: rows.length,
  };
}

export function averageGlucoseMgdl(rows: GlucoseReading[]): number | null {
  return mean(rows.map((r) => toMgdl(r.glucose_value, r.unit)));
}

function bucketStart(d: Date, bucket: Bucket): Date {
  if (bucket === 'week') return startOfWeek(d);
  if (bucket === 'month') return startOfMonth(d);
  return startOfDay(d);
}

/** Group rows into day/week/month buckets keyed by the bucket's start date. */
export function groupBy<T extends { measured_at: string }>(rows: T[], bucket: Bucket): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const key = toDateInput(bucketStart(new Date(r.measured_at), bucket));
    const list = map.get(key);
    if (list) list.push(r);
    else map.set(key, [r]);
  }
  return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export type Trend = 'up' | 'down' | 'stable' | 'none';

/**
 * Compares the mean of the last `days` days with the `days` before that.
 * `tolerance` is the change considered "stable" (same unit as the values).
 */
export function trend<T extends { measured_at: string }>(
  rows: T[],
  value: (r: T) => number,
  days: number,
  tolerance: number,
  now = new Date(),
): { trend: Trend; recent: number | null; previous: number | null } {
  const recentFrom = addDays(startOfDay(now), -(days - 1));
  const prevFrom = addDays(recentFrom, -days);
  const recent = mean(rows.filter((r) => new Date(r.measured_at) >= recentFrom).map(value));
  const previous = mean(
    rows
      .filter((r) => {
        const t = new Date(r.measured_at);
        return t >= prevFrom && t < recentFrom;
      })
      .map(value),
  );
  if (recent == null || previous == null) return { trend: 'none', recent, previous };
  const diff = recent - previous;
  return { trend: Math.abs(diff) <= tolerance ? 'stable' : diff > 0 ? 'up' : 'down', recent, previous };
}

export const glucoseTolerance = (unit: GlucoseUnit) => (unit === 'mg/dL' ? 5 : 0.3);
