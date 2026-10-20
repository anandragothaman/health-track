import type { BpThresholds, GlucoseReading, GlucoseTargets } from '../types';
import { BP_CATEGORY_LABEL, BP_CATEGORY_TONE, classifyBp } from '../utils/bp';
import { classifyGlucose, GLUCOSE_STATUS_LABEL, GLUCOSE_STATUS_TONE, toMgdl } from '../utils/glucose';
import { StatusBadge } from './StatusBadge';

export function BpBadge({ sys, dia, thresholds }: { sys: number; dia: number; thresholds: BpThresholds }) {
  const cat = classifyBp(sys, dia, thresholds);
  return <StatusBadge tone={BP_CATEGORY_TONE[cat]} label={BP_CATEGORY_LABEL[cat]} />;
}

export function GlucoseBadge({ reading, targets }: { reading: Pick<GlucoseReading, 'glucose_value' | 'unit' | 'reading_type'>; targets: GlucoseTargets }) {
  const s = classifyGlucose(toMgdl(reading.glucose_value, reading.unit), reading.reading_type, targets);
  return <StatusBadge tone={GLUCOSE_STATUS_TONE[s]} label={GLUCOSE_STATUS_LABEL[s]} />;
}
