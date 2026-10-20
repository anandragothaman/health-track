import type { GlucoseUnit } from '../types';
import { GLUCOSE_LIMITS } from './glucose';

export type Errors<K extends string> = Partial<Record<K, string>>;

/** Readings may be back-dated, but not more than 10 minutes into the future. */
export function validateMeasuredAt(d: Date): string | undefined {
  if (Number.isNaN(d.getTime())) return 'Enter a valid date and time.';
  if (d.getTime() > Date.now() + 10 * 60_000) return 'Date and time cannot be in the future.';
  if (d.getFullYear() < 1990) return 'Date looks too far in the past.';
  return undefined;
}

function intInRange(raw: string, min: number, max: number, label: string): string | undefined {
  if (raw.trim() === '') return `${label} is required.`;
  const n = Number(raw);
  if (!Number.isInteger(n)) return `${label} must be a whole number.`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
  return undefined;
}

export interface BpFormValues {
  systolic: string;
  diastolic: string;
  heartRate: string;
  date: string;
  time: string;
  notes: string;
}

export function validateBp(v: BpFormValues, measuredAt: Date): Errors<keyof BpFormValues> {
  const e: Errors<keyof BpFormValues> = {};
  e.systolic = intInRange(v.systolic, 50, 300, 'Systolic');
  e.diastolic = intInRange(v.diastolic, 30, 200, 'Diastolic');
  if (!e.systolic && !e.diastolic && Number(v.systolic) <= Number(v.diastolic)) {
    e.diastolic = 'Diastolic (bottom number) must be lower than systolic (top number).';
  }
  if (v.heartRate.trim() !== '') e.heartRate = intInRange(v.heartRate, 20, 250, 'Heart rate');
  e.date = validateMeasuredAt(measuredAt);
  if (v.notes.length > 500) e.notes = 'Notes can be at most 500 characters.';
  return clean(e);
}

export function validateGlucose(raw: string, unit: GlucoseUnit, measuredAt: Date, notes: string) {
  const e: Errors<'value' | 'date' | 'notes'> = {};
  const { min, max } = GLUCOSE_LIMITS[unit];
  const n = Number(raw.replace(',', '.'));
  if (raw.trim() === '') e.value = 'Glucose value is required.';
  else if (!Number.isFinite(n)) e.value = 'Enter a number.';
  else if (n < min || n > max) e.value = `Value must be between ${min} and ${max} ${unit}.`;
  e.date = validateMeasuredAt(measuredAt);
  if (notes.length > 500) e.notes = 'Notes can be at most 500 characters.';
  return clean(e);
}

function clean<T extends Record<string, string | undefined>>(e: T): T {
  Object.keys(e).forEach((k) => e[k] === undefined && delete e[k]);
  return e;
}

export const hasErrors = (e: object) => Object.keys(e).length > 0;
