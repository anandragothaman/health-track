import type { BpThresholds, GlucoseTargets, MemberSettings, Range } from '../types';
import { DEFAULT_BP_THRESHOLDS } from './bp';
import { GLUCOSE_PRESETS } from './glucose';

export const DEFAULT_SETTINGS: MemberSettings = {
  glucoseUnit: 'mg/dL',
  glucosePreset: 'ada',
  glucoseTargets: GLUCOSE_PRESETS.ada.targets,
  bpThresholds: DEFAULT_BP_THRESHOLDS,
  reminderTimes: ['08:00', '14:00', '20:00'],
  remindersEnabled: true,
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isTime = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

function mergeRange(raw: unknown, fallback: Range): Range {
  const r = (raw ?? {}) as Partial<Range>;
  return { low: isNum(r.low) ? r.low : fallback.low, high: isNum(r.high) ? r.high : fallback.high };
}

/** Accepts whatever is stored in the jsonb column and returns a complete, valid settings object. */
export function normalizeSettings(raw: unknown): MemberSettings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const preset =
    s.glucosePreset === 'nondiabetic' || s.glucosePreset === 'custom' || s.glucosePreset === 'ada'
      ? s.glucosePreset
      : DEFAULT_SETTINGS.glucosePreset;

  let glucoseTargets: GlucoseTargets;
  if (preset === 'custom') {
    const g = (s.glucoseTargets ?? {}) as Record<string, unknown>;
    const base = GLUCOSE_PRESETS.ada.targets;
    glucoseTargets = {
      hypo: isNum(g.hypo) ? g.hypo : base.hypo,
      fasting: mergeRange(g.fasting, base.fasting),
      beforeMeal: mergeRange(g.beforeMeal, base.beforeMeal),
      afterMeal: mergeRange(g.afterMeal, base.afterMeal),
      bedtime: mergeRange(g.bedtime, base.bedtime),
      random: mergeRange(g.random, base.random),
    };
  } else {
    glucoseTargets = GLUCOSE_PRESETS[preset].targets;
  }

  const b = (s.bpThresholds ?? {}) as Record<string, unknown>;
  const bpThresholds = Object.fromEntries(
    Object.entries(DEFAULT_BP_THRESHOLDS).map(([k, v]) => [k, isNum(b[k]) ? b[k] : v]),
  ) as unknown as BpThresholds;

  const times = Array.isArray(s.reminderTimes) ? s.reminderTimes : [];
  const reminderTimes = DEFAULT_SETTINGS.reminderTimes.map((d, i) => (isTime(times[i]) ? times[i] : d)) as [
    string,
    string,
    string,
  ];

  return {
    glucoseUnit: s.glucoseUnit === 'mmol/L' ? 'mmol/L' : 'mg/dL',
    glucosePreset: preset,
    glucoseTargets,
    bpThresholds,
    reminderTimes,
    remindersEnabled: typeof s.remindersEnabled === 'boolean' ? s.remindersEnabled : true,
  };
}

export const AVATAR_COLORS: Record<string, string> = {
  teal: 'bg-teal-600',
  blue: 'bg-blue-600',
  violet: 'bg-violet-600',
  rose: 'bg-rose-600',
  amber: 'bg-amber-600',
  emerald: 'bg-emerald-600',
  slate: 'bg-slate-600',
};
