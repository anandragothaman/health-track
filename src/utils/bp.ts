import type { BpSession, BpThresholds } from '../types';

/**
 * Default categories from the 2017 ACC/AHA High Blood Pressure Guideline
 * (categories retained in the 2025 AHA/ACC guideline), and the commonly used
 * "low blood pressure" reference of below 90/60 mmHg (NHLBI).
 * They are editable per person because individual targets vary.
 */
export const DEFAULT_BP_THRESHOLDS: BpThresholds = {
  elevatedSys: 120,
  stage1Sys: 130,
  stage1Dia: 80,
  stage2Sys: 140,
  stage2Dia: 90,
  severeSys: 180,
  severeDia: 120,
  lowSys: 90,
  lowDia: 60,
};

export const BP_SOURCES = [
  {
    label: '2017 ACC/AHA Guideline for High Blood Pressure in Adults (categories retained in the 2025 AHA/ACC guideline)',
    url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings',
  },
  {
    label: 'NHLBI — Low Blood Pressure (below 90/60 mmHg)',
    url: 'https://www.nhlbi.nih.gov/health/low-blood-pressure',
  },
];

export type BpCategory = 'low' | 'normal' | 'elevated' | 'stage1' | 'stage2' | 'severe';

export const BP_CATEGORY_LABEL: Record<BpCategory, string> = {
  low: 'Low',
  normal: 'Normal',
  elevated: 'Elevated',
  stage1: 'High – Stage 1',
  stage2: 'High – Stage 2',
  severe: 'Very high',
};

/** Tone keys map to the status colour tokens in the theme. */
export const BP_CATEGORY_TONE: Record<BpCategory, 'info' | 'ok' | 'warn' | 'high' | 'crit'> = {
  low: 'info',
  normal: 'ok',
  elevated: 'warn',
  stage1: 'high',
  stage2: 'high',
  severe: 'crit',
};

export function classifyBp(sys: number, dia: number, t: BpThresholds): BpCategory {
  if (sys > t.severeSys || dia > t.severeDia) return 'severe';
  if (sys >= t.stage2Sys || dia >= t.stage2Dia) return 'stage2';
  if (sys >= t.stage1Sys || dia >= t.stage1Dia) return 'stage1';
  if (sys >= t.elevatedSys) return 'elevated';
  if (sys < t.lowSys || dia < t.lowDia) return 'low';
  return 'normal';
}

export function describeBpThresholds(t: BpThresholds): Record<BpCategory, string> {
  return {
    low: `Below ${t.lowSys} systolic or below ${t.lowDia} diastolic`,
    normal: `Below ${t.elevatedSys} systolic and below ${t.stage1Dia} diastolic`,
    elevated: `${t.elevatedSys}–${t.stage1Sys - 1} systolic and below ${t.stage1Dia} diastolic`,
    stage1: `${t.stage1Sys}–${t.stage2Sys - 1} systolic or ${t.stage1Dia}–${t.stage2Dia - 1} diastolic`,
    stage2: `${t.stage2Sys} or higher systolic or ${t.stage2Dia} or higher diastolic`,
    severe: `Above ${t.severeSys} systolic and/or above ${t.severeDia} diastolic`,
  };
}

export const SESSIONS: BpSession[] = ['morning', 'afternoon', 'evening', 'other'];
export const PLANNED_SESSIONS: BpSession[] = ['morning', 'afternoon', 'evening'];

export const SESSION_LABEL: Record<BpSession, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  other: 'Additional',
};
