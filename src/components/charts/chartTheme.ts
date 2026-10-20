// Series colours validated for colour-vision deficiency separation and contrast
// against the light (#fcfcfb-ish) and dark (#111827) chart surfaces.
export function chartColors(dark: boolean) {
  return dark
    ? { systolic: '#3b82f6', diastolic: '#ea580c', third: '#0d9488', grid: '#374151', axis: '#9ca3af', ref: '#f87171', band: '#14b8a6' }
    : { systolic: '#1d4ed8', diastolic: '#c2410c', third: '#0d9488', grid: '#e2e8f0', axis: '#475569', ref: '#b91c1c', band: '#0d9488' };
}

export const DAY_MS = 86_400_000;

/** Tick positions; `center` puts multi-day ticks at noon to line up with daily-average points. */
export function timeTicks(from: number, to: number, maxTicks: number, center = false): number[] {
  const span = to - from;
  if (span <= DAY_MS * 1.01) {
    // Every 3 or 6 hours within a single day.
    const step = (maxTicks >= 8 ? 3 : 6) * 3_600_000;
    const ticks: number[] = [];
    for (let t = from; t <= to; t += step) ticks.push(t);
    return ticks;
  }
  const days = Math.round(span / DAY_MS);
  const stepDays = Math.max(1, Math.ceil(days / maxTicks));
  const ticks: number[] = [];
  for (let t = from; t <= to; t += stepDays * DAY_MS) ticks.push(center ? t + DAY_MS / 2 : t);
  return ticks;
}

/** Evenly spaced "nice" Y-axis ticks covering [min, max] with at most ~6 steps. */
export function niceScale(min: number, max: number, steps: number[]): { domain: [number, number]; ticks: number[] } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { domain: [0, 1], ticks: [0, 1] };
  const step = steps.find((s) => (max - min) / s <= 6) ?? steps[steps.length - 1];
  const lo = Math.max(0, Math.floor(min / step) * step);
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 1000; t += step) ticks.push(Math.round(t * 100) / 100);
  return { domain: [lo, hi], ticks };
}
