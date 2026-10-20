import { isDemo } from '../lib/supabase';
import type {
  BpInput,
  BpReading,
  Family,
  FamilyAccess,
  GlucoseInput,
  GlucoseReading,
  Member,
  MemberInput,
  OverviewRow,
} from '../types';
import { demoApi } from './demoApi';
import { supabaseApi } from './supabaseApi';

export interface Api {
  getMyFamily(): Promise<Family | null>;
  createFamily(name: string): Promise<void>;
  joinFamily(code: string): Promise<void>;
  renameFamily(familyId: string, name: string): Promise<void>;
  setInviteCode(familyId: string, enabled: boolean): Promise<string | null>;
  listAccess(familyId: string): Promise<FamilyAccess[]>;
  removeAccess(accessId: string): Promise<void>;

  listMembers(familyId: string): Promise<Member[]>;
  createMember(familyId: string, input: MemberInput): Promise<Member>;
  updateMember(id: string, input: Partial<MemberInput>): Promise<Member>;
  deleteMember(id: string): Promise<void>;

  listBp(memberId: string, from: Date, to: Date): Promise<BpReading[]>;
  getBp(id: string): Promise<BpReading | null>;
  saveBp(input: BpInput, id?: string): Promise<BpReading>;
  deleteBp(id: string): Promise<void>;

  listGlucose(memberId: string, from: Date, to: Date): Promise<GlucoseReading[]>;
  getGlucose(id: string): Promise<GlucoseReading | null>;
  saveGlucose(input: GlucoseInput, id?: string): Promise<GlucoseReading>;
  deleteGlucose(id: string): Promise<void>;

  getOverview(familyId: string, dayStart: Date, dayEnd: Date): Promise<OverviewRow[]>;
}

export const api: Api = isDemo ? demoApi : supabaseApi;

/** Turn Supabase / Postgres errors into short, friendly messages. */
export function errorMessage(err: unknown): string {
  const msg =
    err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : String(err);
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Cannot reach the server. Check your internet connection and try again.';
  if (/JWT|session.*expired|not authenticated/i.test(msg)) return 'Your session has expired. Please sign in again.';
  if (/row-level security|permission denied/i.test(msg)) return 'You do not have permission to do that.';
  if (/check constraint/i.test(msg)) return 'One of the values is outside the allowed range.';
  return msg || 'Something went wrong.';
}
