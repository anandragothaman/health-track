import type { BpReading, GlucoseReading, GlucoseUnit } from '../types';
import { SESSION_LABEL } from './bp';
import { convertGlucose, READING_TYPE_LABEL, roundGlucose } from './glucose';
import { toDateInput, toTimeInput } from './date';

function cell(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  // Quote when needed and neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

export function bpCsv(rows: BpReading[]): string {
  return toCsv(
    ['Date', 'Time', 'Session', 'Systolic (mmHg)', 'Diastolic (mmHg)', 'Heart rate (BPM)', 'Notes'],
    rows.map((r) => {
      const d = new Date(r.measured_at);
      return [toDateInput(d), toTimeInput(d), SESSION_LABEL[r.session], r.systolic, r.diastolic, r.heart_rate, r.notes];
    }),
  );
}

export function glucoseCsv(rows: GlucoseReading[], displayUnit: GlucoseUnit): string {
  const other: GlucoseUnit = displayUnit === 'mg/dL' ? 'mmol/L' : 'mg/dL';
  return toCsv(
    ['Date', 'Time', 'Reading type', 'Value as entered', 'Unit as entered', `Value (${displayUnit})`, `Value (${other})`, 'Notes'],
    rows.map((r) => {
      const d = new Date(r.measured_at);
      return [
        toDateInput(d),
        toTimeInput(d),
        READING_TYPE_LABEL[r.reading_type],
        r.glucose_value,
        r.unit,
        roundGlucose(convertGlucose(r.glucose_value, r.unit, displayUnit), displayUnit),
        roundGlucose(convertGlucose(r.glucose_value, r.unit, other), other),
        r.notes,
      ];
    }),
  );
}

/** Single file with both reading types, for "download everything for this person". */
export function combinedCsv(bp: BpReading[], glucose: GlucoseReading[], unit: GlucoseUnit): string {
  type Row = { at: string; cells: unknown[] };
  const rows: Row[] = [
    ...bp.map((r) => ({
      at: r.measured_at,
      cells: ['Blood pressure', SESSION_LABEL[r.session], r.systolic, r.diastolic, r.heart_rate, '', '', r.notes],
    })),
    ...glucose.map((r) => ({
      at: r.measured_at,
      cells: [
        'Blood glucose',
        READING_TYPE_LABEL[r.reading_type],
        '',
        '',
        '',
        roundGlucose(convertGlucose(r.glucose_value, r.unit, unit), unit),
        unit,
        r.notes,
      ],
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return toCsv(
    ['Date', 'Time', 'Measurement', 'Session / type', 'Systolic (mmHg)', 'Diastolic (mmHg)', 'Heart rate (BPM)', 'Glucose', 'Glucose unit', 'Notes'],
    rows.map((r) => {
      const d = new Date(r.at);
      return [toDateInput(d), toTimeInput(d), ...r.cells];
    }),
  );
}

export function downloadCsv(filename: string, csv: string) {
  // BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFileName(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'member';
}
