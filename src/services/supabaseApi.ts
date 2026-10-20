import type { Api } from './api';
import { requireSupabase } from '../lib/supabase';
import { normalizeSettings } from '../utils/settings';
import type { BpReading, FamilyAccess, GlucoseReading, Member, OverviewRow } from '../types';

const db = () => requireSupabase();

const MEMBER_COLS = 'id,family_id,full_name,date_of_birth,gender,avatar_color,settings,created_at';
const BP_COLS = 'id,member_id,systolic,diastolic,heart_rate,session,measured_at,notes,created_at';
const GLUCOSE_COLS = 'id,member_id,glucose_value,unit,reading_type,measured_at,notes,created_at';

function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

/** For .single() queries: a missing row is an error. */
function one(res: { data: unknown; error: unknown }): Record<string, unknown> {
  const row = check(res);
  if (!row) throw new Error('Record not found');
  return row as Record<string, unknown>;
}

const toMember = (row: Record<string, unknown>): Member =>
  ({ ...row, settings: normalizeSettings(row.settings) }) as Member;

const toGlucose = (row: Record<string, unknown>): GlucoseReading =>
  ({ ...row, glucose_value: Number(row.glucose_value) }) as GlucoseReading;

async function currentUserId(): Promise<string> {
  const { data } = await db().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Not authenticated');
  return id;
}

export const supabaseApi: Api = {
  async getMyFamily() {
    const uid = await currentUserId();
    const rows = check(
      await db()
        .from('family_access')
        .select('role, families(id,name,invite_code)')
        .eq('auth_user_id', uid)
        .order('created_at')
        .limit(1),
    ) as unknown as { role: 'owner' | 'member'; families: { id: string; name: string; invite_code: string | null } }[];
    const row = rows[0];
    return row?.families ? { ...row.families, role: row.role } : null;
  },

  async createFamily(name) {
    check(await db().rpc('create_family', { p_name: name }));
  },

  async joinFamily(code) {
    check(await db().rpc('join_family', { p_code: code }));
  },

  async renameFamily(familyId, name) {
    check(await db().from('families').update({ name }).eq('id', familyId));
  },

  async setInviteCode(familyId, enabled) {
    return check(await db().rpc('set_invite_code', { p_family_id: familyId, p_enabled: enabled })) as string | null;
  },

  async listAccess(familyId) {
    return check(
      await db().from('family_access').select('*').eq('family_id', familyId).order('created_at'),
    ) as FamilyAccess[];
  },

  async removeAccess(accessId) {
    check(await db().from('family_access').delete().eq('id', accessId));
  },

  async listMembers(familyId) {
    const rows = check(
      await db().from('family_members').select(MEMBER_COLS).eq('family_id', familyId).order('created_at'),
    );
    return (rows ?? []).map(toMember);
  },

  async createMember(familyId, input) {
    const row = one(
      await db()
        .from('family_members')
        .insert({ ...input, family_id: familyId })
        .select(MEMBER_COLS)
        .single(),
    );
    return toMember(row);
  },

  async updateMember(id, input) {
    const row = one(await db().from('family_members').update(input).eq('id', id).select(MEMBER_COLS).single());
    return toMember(row);
  },

  async deleteMember(id) {
    check(await db().from('family_members').delete().eq('id', id));
  },

  async listBp(memberId, from, to) {
    return check(
      await db()
        .from('blood_pressure_readings')
        .select(BP_COLS)
        .eq('member_id', memberId)
        .gte('measured_at', from.toISOString())
        .lte('measured_at', to.toISOString())
        .order('measured_at', { ascending: false })
        .limit(5000),
    ) as BpReading[];
  },

  async getBp(id) {
    return check(await db().from('blood_pressure_readings').select(BP_COLS).eq('id', id).maybeSingle()) as BpReading | null;
  },

  async saveBp(input, id) {
    const q = id
      ? db().from('blood_pressure_readings').update(input).eq('id', id)
      : db().from('blood_pressure_readings').insert(input);
    return check(await q.select(BP_COLS).single()) as BpReading;
  },

  async deleteBp(id) {
    check(await db().from('blood_pressure_readings').delete().eq('id', id));
  },

  async listGlucose(memberId, from, to) {
    const rows = check(
      await db()
        .from('blood_glucose_readings')
        .select(GLUCOSE_COLS)
        .eq('member_id', memberId)
        .gte('measured_at', from.toISOString())
        .lte('measured_at', to.toISOString())
        .order('measured_at', { ascending: false })
        .limit(5000),
    );
    return (rows ?? []).map(toGlucose);
  },

  async getGlucose(id) {
    const row = check(await db().from('blood_glucose_readings').select(GLUCOSE_COLS).eq('id', id).maybeSingle());
    return row ? toGlucose(row) : null;
  },

  async saveGlucose(input, id) {
    const q = id
      ? db().from('blood_glucose_readings').update(input).eq('id', id)
      : db().from('blood_glucose_readings').insert(input);
    return toGlucose(one(await q.select(GLUCOSE_COLS).single()));
  },

  async deleteGlucose(id) {
    check(await db().from('blood_glucose_readings').delete().eq('id', id));
  },

  async getOverview(familyId, dayStart, dayEnd) {
    const rows = check(
      await db().rpc('get_family_overview', {
        p_family_id: familyId,
        p_day_start: dayStart.toISOString(),
        p_day_end: dayEnd.toISOString(),
      }),
    ) as OverviewRow[];
    return (rows ?? []).map((r) => ({
      ...r,
      glucose_value: r.glucose_value == null ? null : Number(r.glucose_value),
    }));
  },
};
