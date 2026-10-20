import type { BpSession } from '../types';

const DAY_MS = 86_400_000;

type DateLike = Date | string | number;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Local calendar date as YYYY-MM-DD (used for <input type="date"> and grouping). */
export function toDateInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function toTimeInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Parse YYYY-MM-DD as a local date (new Date('2024-01-01') would be UTC). */
export function parseDateInput(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function combineDateTime(date: string, time: string): Date {
  const [h, min] = time.split(':').map(Number);
  const d = parseDateInput(date);
  d.setHours(h, min, 0, 0);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

/** Monday-based week start. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7;
  return addDays(x, -dow);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const shortDateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });

export const formatDate = (d: DateLike) => dateFmt.format(new Date(d));
export const formatShortDate = (d: DateLike) => shortDateFmt.format(new Date(d));
export const formatTime = (d: DateLike) => timeFmt.format(new Date(d));
export const formatWeekday = (d: DateLike) => weekdayFmt.format(new Date(d));
export const formatMonth = (d: DateLike) => monthFmt.format(new Date(d));
export const formatDateTime = (d: DateLike) => `${formatDate(d)}, ${formatTime(d)}`;

/** "Today, 8:15 AM" / "Yesterday, ..." / "12 Mar 2025, ..." */
export function formatRelative(d: DateLike): string {
  const date = new Date(d);
  const diff = daysBetween(date, new Date());
  if (diff === 0) return `Today, ${formatTime(date)}`;
  if (diff === 1) return `Yesterday, ${formatTime(date)}`;
  return formatDateTime(date);
}

/** Format "HH:MM" (24h) in the user's locale. */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return formatTime(d);
}

export function sessionForTime(d: Date): BpSession {
  const h = d.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const b = parseDateInput(dob);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
}
