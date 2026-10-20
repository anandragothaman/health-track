import type {
  GlucoseContext,
  GlucosePreset,
  GlucoseReadingType,
  GlucoseTargets,
  GlucoseUnit,
} from '../types';

/** 1 mmol/L of glucose (C6H12O6, molar mass 180.16 g/mol) = 18.016 mg/dL. */
export const MGDL_PER_MMOL = 18.016;

export function toMgdl(value: number, unit: GlucoseUnit): number {
  return unit === 'mg/dL' ? value : value * MGDL_PER_MMOL;
}

export function fromMgdl(mgdl: number, unit: GlucoseUnit): number {
  return unit === 'mg/dL' ? mgdl : mgdl / MGDL_PER_MMOL;
}

export function convertGlucose(value: number, from: GlucoseUnit, to: GlucoseUnit): number {
  return from === to ? value : fromMgdl(toMgdl(value, from), to);
}

/** mg/dL shown as whole numbers, mmol/L to one decimal place. */
export function roundGlucose(value: number, unit: GlucoseUnit): number {
  return unit === 'mg/dL' ? Math.round(value) : Math.round(value * 10) / 10;
}

export function formatGlucose(mgdl: number, unit: GlucoseUnit): string {
  const v = roundGlucose(fromMgdl(mgdl, unit), unit);
  return unit === 'mg/dL' ? String(v) : v.toFixed(1);
}

export const READING_TYPES: GlucoseReadingType[] = [
  'fasting',
  'before_breakfast',
  'after_breakfast',
  'before_lunch',
  'after_lunch',
  'before_dinner',
  'after_dinner',
  'bedtime',
  'random',
];

export const READING_TYPE_LABEL: Record<GlucoseReadingType, string> = {
  fasting: 'Fasting',
  before_breakfast: 'Before breakfast',
  after_breakfast: 'After breakfast',
  before_lunch: 'Before lunch',
  after_lunch: 'After lunch',
  before_dinner: 'Before dinner',
  after_dinner: 'After dinner',
  bedtime: 'Bedtime',
  random: 'Random',
};

export function contextForType(t: GlucoseReadingType): GlucoseContext {
  if (t === 'fasting') return 'fasting';
  if (t.startsWith('before_')) return 'beforeMeal';
  if (t.startsWith('after_')) return 'afterMeal';
  return t === 'bedtime' ? 'bedtime' : 'random';
}

export const CONTEXT_LABEL: Record<GlucoseContext, string> = {
  fasting: 'Fasting',
  beforeMeal: 'Before meals',
  afterMeal: 'After meals (1–2 h)',
  bedtime: 'Bedtime',
  random: 'Random',
};

export type GlucoseFilter = 'all' | 'fasting' | 'beforeMeal' | 'afterMeal';

export const GLUCOSE_FILTER_LABEL: Record<GlucoseFilter, string> = {
  all: 'All readings',
  fasting: 'Fasting',
  beforeMeal: 'Before meal',
  afterMeal: 'After meal',
};

export function matchesFilter(t: GlucoseReadingType, f: GlucoseFilter): boolean {
  return f === 'all' || contextForType(t) === f;
}

/**
 * Presets (mg/dL). Sources:
 *  - ADA Standards of Care in Diabetes, Section 6 (Glycemic Goals): pre-meal 80–130,
 *    peak post-meal below 180 for many non-pregnant adults with diabetes; level 1
 *    hypoglycaemia below 70.
 *  - International Consensus on Time in Range (Battelino et al., Diabetes Care 2019):
 *    target range 70–180 (used here for bedtime / random readings).
 *  - ADA diagnostic criteria (Section 2): fasting below 100 and 2-hour OGTT below 140
 *    are the normal reference values for people without diabetes.
 */
export const GLUCOSE_PRESETS: Record<Exclude<GlucosePreset, 'custom'>, { label: string; targets: GlucoseTargets }> = {
  ada: {
    label: 'ADA general targets for adults with diabetes',
    targets: {
      hypo: 70,
      fasting: { low: 80, high: 130 },
      beforeMeal: { low: 80, high: 130 },
      afterMeal: { low: 70, high: 180 },
      bedtime: { low: 70, high: 180 },
      random: { low: 70, high: 180 },
    },
  },
  nondiabetic: {
    label: 'Typical reference ranges for people without diabetes',
    targets: {
      hypo: 70,
      fasting: { low: 70, high: 99 },
      beforeMeal: { low: 70, high: 99 },
      afterMeal: { low: 70, high: 140 },
      bedtime: { low: 70, high: 140 },
      random: { low: 70, high: 140 },
    },
  },
};

export const GLUCOSE_SOURCES = [
  {
    label: 'ADA Standards of Care in Diabetes — Glycemic Goals and Hypoglycemia',
    url: 'https://diabetesjournals.org/care/issue/48/Supplement_1',
  },
  {
    label: 'International Consensus on Time in Range (Diabetes Care, 2019)',
    url: 'https://diabetesjournals.org/care/article/42/8/1593/36184',
  },
  {
    label: 'ADA — Diabetes diagnosis criteria (fasting < 100 mg/dL and 2-hour < 140 mg/dL are typical without diabetes)',
    url: 'https://diabetes.org/about-diabetes/diagnosis',
  },
];

export type GlucoseStatus = 'low' | 'below' | 'in' | 'above';

export const GLUCOSE_STATUS_LABEL: Record<GlucoseStatus, string> = {
  low: 'Low',
  below: 'Below target',
  in: 'In target',
  above: 'Above target',
};

export const GLUCOSE_STATUS_TONE: Record<GlucoseStatus, 'info' | 'ok' | 'warn' | 'high' | 'crit'> = {
  low: 'crit',
  below: 'info',
  in: 'ok',
  above: 'high',
};

export function classifyGlucose(mgdl: number, type: GlucoseReadingType, t: GlucoseTargets): GlucoseStatus {
  const r = t[contextForType(type)];
  if (mgdl < t.hypo) return 'low';
  if (mgdl < r.low) return 'below';
  if (mgdl > r.high) return 'above';
  return 'in';
}

/** Validation limits per unit (match the database check constraints). */
export const GLUCOSE_LIMITS: Record<GlucoseUnit, { min: number; max: number; step: number }> = {
  'mg/dL': { min: 10, max: 1000, step: 1 },
  'mmol/L': { min: 0.5, max: 55.5, step: 0.1 },
};
