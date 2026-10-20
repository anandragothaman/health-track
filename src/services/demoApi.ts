// Browser-only demo backend used when Supabase is not configured.
// Data lives in this browser's localStorage and never leaves the device.
import type { Api } from './api';
import type {
  BpReading,
  BpSession,
  FamilyAccess,
  GlucoseReading,
  GlucoseReadingType,
  GlucoseUnit,
  Member,
  OverviewRow,
} from '../types';
import { getItem, setItem } from '../lib/storage';
import { normalizeSettings } from '../utils/settings';
import { addDays, startOfDay } from '../utils/date';
import { PLANNED_SESSIONS } from '../utils/bp';

const KEY = 'ht-demo-v1';
const FAMILY_ID = 'demo-family';

interface Store {
  familyName: string;
  inviteCode: string | null;
  members: Member[];
  bp: BpReading[];
  glucose: GlucoseReading[];
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function makeSeed(): Store {
  const rand = seeded(42);
  const r = (min: number, span: number) => Math.round(min + rand() * span);
  const now = new Date();
  const created = addDays(now, -60).toISOString();
  const member = (id: string, full_name: string, dob: string, gender: Member['gender'], color: string, settings: object): Member => ({
    id, family_id: FAMILY_ID, full_name, date_of_birth: dob, gender, avatar_color: color,
    settings: normalizeSettings(settings), created_at: created,
  });
  const members = [
    member('demo-ravi', 'Ravi Kumar', '1958-04-12', 'male', 'blue', { glucosePreset: 'ada' }),
    member('demo-meena', 'Meena Kumar', '1962-09-30', 'female', 'teal', { glucosePreset: 'nondiabetic' }),
    member('demo-arjun', 'Arjun Kumar', '1990-01-15', 'male', 'violet', { glucosePreset: 'nondiabetic', glucoseUnit: 'mmol/L' }),
  ];
  const bp: BpReading[] = [];
  const glucose: GlucoseReading[] = [];
  const at = (day: Date, h: number, m: number) => {
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const addBp = (member_id: string, when: Date, session: BpSession, sys: number, dia: number, hr: number) => {
    if (when > now) return;
    bp.push({ id: uid(), member_id, systolic: sys, diastolic: dia, heart_rate: hr, session,
      measured_at: when.toISOString(), notes: null, created_at: when.toISOString() });
  };
  const addG = (member_id: string, when: Date, type: GlucoseReadingType, value: number, unit: GlucoseUnit) => {
    if (when > now) return;
    glucose.push({ id: uid(), member_id, glucose_value: value, unit, reading_type: type,
      measured_at: when.toISOString(), notes: null, created_at: when.toISOString() });
  };

  for (let d = 0; d < 45; d++) {
    const day = addDays(startOfDay(now), -d);
    if (d % 9 !== 4) addBp('demo-ravi', at(day, 7, 50 + r(0, 9)), 'morning', r(132, 14), r(82, 8), r(68, 10));
    if (d % 5 !== 2) addBp('demo-ravi', at(day, 14, r(0, 50)), 'afternoon', r(126, 12), r(79, 8), r(72, 10));
    addBp('demo-ravi', at(day, 20, r(0, 45)), 'evening', r(128, 14), r(80, 9), r(66, 8));
    addG('demo-ravi', at(day, 7, 15), 'fasting', r(110, 35), 'mg/dL');
    addG('demo-ravi', at(day, 14, 30), 'after_lunch', r(145, 55), 'mg/dL');
    addG('demo-ravi', at(day, 22, 0), 'bedtime', r(120, 40), 'mg/dL');

    addBp('demo-meena', at(day, 8, r(0, 30)), 'morning', r(112, 12), r(70, 8), r(70, 8));
    addBp('demo-meena', at(day, 19, 30 + r(0, 25)), 'evening', r(114, 10), r(72, 6), r(74, 8));
    if (d % 3 === 0) addG('demo-meena', at(day, 7, 30), 'fasting', r(84, 14), 'mg/dL');

    if (d % 4 === 0) {
      addBp('demo-arjun', at(day, 9, 0), 'morning', r(118, 10), r(74, 8), r(62, 10));
      addG('demo-arjun', at(day, 8, 30), 'before_breakfast', Math.round((4.6 + rand()) * 10) / 10, 'mmol/L');
      addG('demo-arjun', at(day, 21, 0), 'after_dinner', Math.round((5.5 + rand() * 1.8) * 10) / 10, 'mmol/L');
    }
  }
  return { familyName: 'Kumar Family (demo)', inviteCode: 'DEMO00000000', members, bp, glucose };
}

let store: Store | null = null;

function load(): Store {
  if (store) return store;
  const raw = getItem(KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Store;
      parsed.members = parsed.members.map((m) => ({ ...m, settings: normalizeSettings(m.settings) }));
      store = parsed;
      return store;
    } catch {
      /* fall through to a fresh seed */
    }
  }
  store = makeSeed();
  save();
  return store;
}

function save() {
  if (store) setItem(KEY, JSON.stringify(store));
}

// Simulate a little latency so loading states are exercised, but keep it snappy.
const tick = <T>(v: T) => new Promise<T>((res) => setTimeout(() => res(JSON.parse(JSON.stringify(v)) as T), 60));

const between = <T extends { measured_at: string; member_id: string }>(rows: T[], memberId: string, from: Date, to: Date) =>
  rows
    .filter((r) => r.member_id === memberId && r.measured_at >= from.toISOString() && r.measured_at <= to.toISOString())
    .sort((a, b) => b.measured_at.localeCompare(a.measured_at));

function notFound(): never {
  throw new Error('Record not found');
}

export function resetDemoData() {
  store = makeSeed();
  save();
}

export const demoApi: Api = {
  async getMyFamily() {
    const s = load();
    return tick({ id: FAMILY_ID, name: s.familyName, invite_code: s.inviteCode, role: 'owner' as const });
  },
  async createFamily() {},
  async joinFamily() {},
  async renameFamily(_id, name) {
    load().familyName = name;
    save();
  },
  async setInviteCode(_id, enabled) {
    const s = load();
    s.inviteCode = enabled ? uid().replace(/-/g, '').slice(0, 12).toUpperCase() : null;
    save();
    return s.inviteCode;
  },
  async listAccess() {
    const row: FamilyAccess = {
      id: 'demo-access', family_id: FAMILY_ID, auth_user_id: 'demo-user', role: 'owner',
      email: 'demo@example.com', created_at: new Date().toISOString(),
    };
    return tick([row]);
  },
  async removeAccess() {},

  async listMembers() {
    return tick(load().members);
  },
  async createMember(familyId, input) {
    const m: Member = {
      id: uid(), family_id: familyId, ...input, settings: normalizeSettings(input.settings),
      created_at: new Date().toISOString(),
    };
    load().members.push(m);
    save();
    return tick(m);
  },
  async updateMember(id, input) {
    const s = load();
    const m = s.members.find((x) => x.id === id) ?? notFound();
    Object.assign(m, input, input.settings ? { settings: normalizeSettings(input.settings) } : {});
    save();
    return tick(m);
  },
  async deleteMember(id) {
    const s = load();
    s.members = s.members.filter((m) => m.id !== id);
    s.bp = s.bp.filter((r) => r.member_id !== id);
    s.glucose = s.glucose.filter((r) => r.member_id !== id);
    save();
  },

  async listBp(memberId, from, to) {
    return tick(between(load().bp, memberId, from, to));
  },
  async getBp(id) {
    return tick(load().bp.find((r) => r.id === id) ?? null);
  },
  async saveBp(input, id) {
    const s = load();
    let row: BpReading;
    if (id) {
      row = s.bp.find((r) => r.id === id) ?? notFound();
      Object.assign(row, input);
    } else {
      row = { ...input, id: uid(), created_at: new Date().toISOString() };
      s.bp.push(row);
    }
    save();
    return tick(row);
  },
  async deleteBp(id) {
    const s = load();
    s.bp = s.bp.filter((r) => r.id !== id);
    save();
  },

  async listGlucose(memberId, from, to) {
    return tick(between(load().glucose, memberId, from, to));
  },
  async getGlucose(id) {
    return tick(load().glucose.find((r) => r.id === id) ?? null);
  },
  async saveGlucose(input, id) {
    const s = load();
    let row: GlucoseReading;
    if (id) {
      row = s.glucose.find((r) => r.id === id) ?? notFound();
      Object.assign(row, input);
    } else {
      row = { ...input, id: uid(), created_at: new Date().toISOString() };
      s.glucose.push(row);
    }
    save();
    return tick(row);
  },
  async deleteGlucose(id) {
    const s = load();
    s.glucose = s.glucose.filter((r) => r.id !== id);
    save();
  },

  async getOverview(_familyId, dayStart, dayEnd) {
    const s = load();
    const latest = <T extends { member_id: string; measured_at: string }>(rows: T[], id: string) =>
      rows.filter((r) => r.member_id === id).sort((a, b) => b.measured_at.localeCompare(a.measured_at))[0];
    const rows: OverviewRow[] = s.members.map((m) => {
      const b = latest(s.bp, m.id);
      const g = latest(s.glucose, m.id);
      const today = new Set(
        s.bp
          .filter((r) => r.member_id === m.id && PLANNED_SESSIONS.includes(r.session))
          .filter((r) => new Date(r.measured_at) >= dayStart && new Date(r.measured_at) < dayEnd)
          .map((r) => r.session),
      );
      return {
        member_id: m.id,
        bp_systolic: b?.systolic ?? null,
        bp_diastolic: b?.diastolic ?? null,
        bp_heart_rate: b?.heart_rate ?? null,
        bp_measured_at: b?.measured_at ?? null,
        glucose_value: g?.glucose_value ?? null,
        glucose_unit: g?.unit ?? null,
        glucose_reading_type: g?.reading_type ?? null,
        glucose_measured_at: g?.measured_at ?? null,
        sessions_today: today.size,
      };
    });
    return tick(rows);
  },
};
