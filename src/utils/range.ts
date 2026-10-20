import { addDays, daysBetween, endOfDay, parseDateInput, startOfDay, toDateInput } from './date';

export type RangePreset = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  preset: RangePreset;
  /** YYYY-MM-DD, only used for "custom". */
  customFrom: string;
  customTo: string;
}

export const RANGE_LABEL: Record<RangePreset, string> = {
  today: 'Today',
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  custom: 'Custom',
};

const PRESET_DAYS: Record<Exclude<RangePreset, 'custom'>, number> = { today: 1, '7d': 7, '30d': 30, '90d': 90 };

export function defaultRange(preset: RangePreset = '7d'): DateRange {
  const today = new Date();
  return { preset, customFrom: toDateInput(addDays(today, -29)), customTo: toDateInput(today) };
}

/** Resolve to concrete start/end instants (whole local days). */
export function resolveRange(r: DateRange, now = new Date()): { from: Date; to: Date; days: number } {
  if (r.preset === 'custom') {
    let a = parseDateInput(r.customFrom);
    let b = parseDateInput(r.customTo);
    if (Number.isNaN(a.getTime())) a = addDays(now, -29);
    if (Number.isNaN(b.getTime())) b = now;
    if (a > b) [a, b] = [b, a];
    const from = startOfDay(a);
    return { from, to: endOfDay(b), days: daysBetween(from, b) + 1 };
  }
  const days = PRESET_DAYS[r.preset];
  return { from: startOfDay(addDays(now, -(days - 1))), to: endOfDay(now), days };
}
