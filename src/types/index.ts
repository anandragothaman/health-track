export type Role = 'owner' | 'member';
export type Gender = 'female' | 'male' | 'other' | 'prefer_not_to_say';
export type BpSession = 'morning' | 'afternoon' | 'evening' | 'other';
export type GlucoseUnit = 'mg/dL' | 'mmol/L';
export type GlucoseReadingType =
  | 'fasting'
  | 'before_breakfast'
  | 'after_breakfast'
  | 'before_lunch'
  | 'after_lunch'
  | 'before_dinner'
  | 'after_dinner'
  | 'bedtime'
  | 'random';

/** Target-range contexts. Each reading type maps to one of these. */
export type GlucoseContext = 'fasting' | 'beforeMeal' | 'afterMeal' | 'bedtime' | 'random';
export type GlucosePreset = 'ada' | 'nondiabetic' | 'custom';

export interface Family {
  id: string;
  name: string;
  invite_code: string | null;
  role: Role;
}

export interface FamilyAccess {
  id: string;
  family_id: string;
  auth_user_id: string;
  role: Role;
  email: string | null;
  created_at: string;
}

export interface Range {
  low: number;
  high: number;
}

/** All glucose limits are stored in mg/dL and converted for display. */
export interface GlucoseTargets {
  hypo: number;
  fasting: Range;
  beforeMeal: Range;
  afterMeal: Range;
  bedtime: Range;
  random: Range;
}

export interface BpThresholds {
  elevatedSys: number;
  stage1Sys: number;
  stage1Dia: number;
  stage2Sys: number;
  stage2Dia: number;
  severeSys: number;
  severeDia: number;
  lowSys: number;
  lowDia: number;
}

export interface MemberSettings {
  glucoseUnit: GlucoseUnit;
  glucosePreset: GlucosePreset;
  glucoseTargets: GlucoseTargets;
  bpThresholds: BpThresholds;
  reminderTimes: [string, string, string];
  remindersEnabled: boolean;
}

export interface Member {
  id: string;
  family_id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: Gender | null;
  avatar_color: string;
  settings: MemberSettings;
  created_at: string;
}

export interface MemberInput {
  full_name: string;
  date_of_birth: string | null;
  gender: Gender | null;
  avatar_color: string;
  settings?: MemberSettings;
}

export interface BpReading {
  id: string;
  member_id: string;
  systolic: number;
  diastolic: number;
  heart_rate: number | null;
  session: BpSession;
  measured_at: string;
  notes: string | null;
  created_at: string;
}

export type BpInput = Omit<BpReading, 'id' | 'created_at'>;

export interface GlucoseReading {
  id: string;
  member_id: string;
  glucose_value: number;
  unit: GlucoseUnit;
  reading_type: GlucoseReadingType;
  measured_at: string;
  notes: string | null;
  created_at: string;
}

export type GlucoseInput = Omit<GlucoseReading, 'id' | 'created_at'>;

export interface OverviewRow {
  member_id: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  bp_heart_rate: number | null;
  bp_measured_at: string | null;
  glucose_value: number | null;
  glucose_unit: GlucoseUnit | null;
  glucose_reading_type: GlucoseReadingType | null;
  glucose_measured_at: string | null;
  sessions_today: number;
}
