import { useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { errorMessage } from '../../services/api';
import type { BpThresholds, GlucoseContext, GlucosePreset, GlucoseTargets, GlucoseUnit, Member, MemberSettings } from '../../types';
import { CONTEXT_LABEL, fromMgdl, GLUCOSE_PRESETS, GLUCOSE_SOURCES, roundGlucose, toMgdl } from '../../utils/glucose';
import { BP_CATEGORY_LABEL, BP_SOURCES, DEFAULT_BP_THRESHOLDS, describeBpThresholds, PLANNED_SESSIONS, SESSION_LABEL } from '../../utils/bp';
import { normalizeSettings } from '../../utils/settings';
import { ErrorBox, Segmented } from '../ui';

const CONTEXTS: GlucoseContext[] = ['fasting', 'beforeMeal', 'afterMeal', 'bedtime', 'random'];

/** Draft glucose targets are edited as strings in the display unit. */
type DraftTargets = { hypo: string } & Record<GlucoseContext, { low: string; high: string }>;

function toDraft(t: GlucoseTargets, unit: GlucoseUnit): DraftTargets {
  const f = (v: number) => String(roundGlucose(fromMgdl(v, unit), unit));
  const d = { hypo: f(t.hypo) } as DraftTargets;
  for (const c of CONTEXTS) d[c] = { low: f(t[c].low), high: f(t[c].high) };
  return d;
}

function fromDraft(d: DraftTargets, unit: GlucoseUnit): GlucoseTargets | string {
  const n = (s: string) => toMgdl(Number(s.replace(',', '.')), unit);
  const t = { hypo: n(d.hypo) } as GlucoseTargets;
  if (!Number.isFinite(t.hypo) || t.hypo <= 0) return 'Enter a valid low-glucose value.';
  for (const c of CONTEXTS) {
    const low = n(d[c].low);
    const high = n(d[c].high);
    if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high <= low)
      return `${CONTEXT_LABEL[c]}: the upper value must be higher than the lower value.`;
    t[c] = { low: Math.round(low * 10) / 10, high: Math.round(high * 10) / 10 };
  }
  return t;
}

const BP_FIELDS: { key: keyof BpThresholds; label: string }[] = [
  { key: 'lowSys', label: 'Low: systolic below' },
  { key: 'lowDia', label: 'Low: diastolic below' },
  { key: 'elevatedSys', label: 'Elevated: systolic from' },
  { key: 'stage1Sys', label: 'Stage 1: systolic from' },
  { key: 'stage1Dia', label: 'Stage 1: diastolic from' },
  { key: 'stage2Sys', label: 'Stage 2: systolic from' },
  { key: 'stage2Dia', label: 'Stage 2: diastolic from' },
  { key: 'severeSys', label: 'Very high: systolic above' },
  { key: 'severeDia', label: 'Very high: diastolic above' },
];

/** Render with key={member.id} so the form resets when switching person. */
export function MemberSettingsCard({ member }: { member: Member }) {
  const { updateMember } = useFamily();
  const s = member.settings;
  const [unit, setUnit] = useState<GlucoseUnit>(s.glucoseUnit);
  const [preset, setPreset] = useState<GlucosePreset>(s.glucosePreset);
  const [draft, setDraft] = useState<DraftTargets>(() => toDraft(s.glucoseTargets, s.glucoseUnit));
  const [bp, setBp] = useState<Record<keyof BpThresholds, string>>(() => strMap(s.bpThresholds));
  const [times, setTimes] = useState<[string, string, string]>(s.reminderTimes);
  const [remindersOn, setRemindersOn] = useState(s.remindersEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [perm, setPerm] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

  const changeUnit = (u: GlucoseUnit) => {
    const t = fromDraft(draft, unit);
    if (typeof t !== 'string') setDraft(toDraft(t, u));
    setUnit(u);
  };

  const changePreset = (p: GlucosePreset) => {
    if (p !== 'custom') setDraft(toDraft(GLUCOSE_PRESETS[p].targets, unit));
    setPreset(p);
  };

  const save = async () => {
    setError(null);
    setSaved(false);
    const targets = preset === 'custom' ? fromDraft(draft, unit) : GLUCOSE_PRESETS[preset].targets;
    if (typeof targets === 'string') return setError(targets);
    const thresholds = Object.fromEntries(Object.entries(bp).map(([k, v]) => [k, Number(v)])) as unknown as BpThresholds;
    if (Object.values(thresholds).some((v) => !Number.isInteger(v) || v < 30 || v > 300))
      return setError('Blood pressure thresholds must be whole numbers between 30 and 300.');
    if (!(thresholds.elevatedSys < thresholds.stage1Sys && thresholds.stage1Sys < thresholds.stage2Sys && thresholds.stage2Sys < thresholds.severeSys))
      return setError('Systolic thresholds must increase: elevated < stage 1 < stage 2 < very high.');
    if (!(thresholds.stage1Dia < thresholds.stage2Dia && thresholds.stage2Dia < thresholds.severeDia))
      return setError('Diastolic thresholds must increase: stage 1 < stage 2 < very high.');

    const settings: MemberSettings = normalizeSettings({
      glucoseUnit: unit,
      glucosePreset: preset,
      glucoseTargets: targets,
      bpThresholds: thresholds,
      reminderTimes: times,
      remindersEnabled: remindersOn,
    });
    setBusy(true);
    try {
      await updateMember(member.id, { settings });
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const desc = describeBpThresholds(
    Object.fromEntries(Object.entries(bp).map(([k, v]) => [k, Number(v) || 0])) as unknown as BpThresholds,
  );

  return (
    <section className="card space-y-6" aria-labelledby="ms-title">
      <h2 id="ms-title" className="text-lg font-bold">
        Settings for {member.full_name}
      </h2>

      <div>
        <h3 className="label">Blood sugar display unit</h3>
        <Segmented<GlucoseUnit>
          label="Blood sugar display unit"
          value={unit}
          onChange={changeUnit}
          options={[
            { value: 'mg/dL', label: 'mg/dL' },
            { value: 'mmol/L', label: 'mmol/L' },
          ]}
        />
        <p className="mt-1 text-sm text-muted">Readings keep the unit they were entered in and are converted for display (1 mmol/L = 18.016 mg/dL).</p>
      </div>

      <div>
        <h3 className="label">Blood sugar target ranges</h3>
        <select className="input" aria-label="Target preset" value={preset} onChange={(e) => changePreset(e.target.value as GlucosePreset)}>
          <option value="ada">{GLUCOSE_PRESETS.ada.label}</option>
          <option value="nondiabetic">{GLUCOSE_PRESETS.nondiabetic.label}</option>
          <option value="custom">Custom targets (for example, set by a clinician)</option>
        </select>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[360px] text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 font-medium">Reading type</th>
                <th className="py-1 font-medium">From ({unit})</th>
                <th className="py-1 font-medium">To ({unit})</th>
              </tr>
            </thead>
            <tbody>
              {CONTEXTS.map((c) => (
                <tr key={c}>
                  <th scope="row" className="py-1 pr-2 text-left font-medium">
                    {CONTEXT_LABEL[c]}
                  </th>
                  {(['low', 'high'] as const).map((k) => (
                    <td key={k} className="py-1 pr-2">
                      <input
                        className="input min-h-[40px] max-w-[110px] py-1 tabular-nums"
                        inputMode="decimal"
                        aria-label={`${CONTEXT_LABEL[c]} ${k === 'low' ? 'lower' : 'upper'} target`}
                        disabled={preset !== 'custom'}
                        value={draft[c][k]}
                        onChange={(e) => setDraft((d) => ({ ...d, [c]: { ...d[c], [k]: e.target.value } }))}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row" className="py-1 pr-2 text-left font-medium">
                  “Low” below
                </th>
                <td className="py-1 pr-2" colSpan={2}>
                  <input
                    className="input min-h-[40px] max-w-[110px] py-1 tabular-nums"
                    inputMode="decimal"
                    aria-label="Low glucose threshold"
                    disabled={preset !== 'custom'}
                    value={draft.hypo}
                    onChange={(e) => setDraft((d) => ({ ...d, hypo: e.target.value }))}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {preset !== 'custom' && <p className="mt-1 text-sm text-muted">Choose “Custom targets” to edit these numbers.</p>}
      </div>

      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer font-semibold">Blood pressure categories (advanced)</summary>
        <p className="mt-2 text-sm text-muted">
          Defaults follow the ACC/AHA adult categories. Change them only if a healthcare professional has given this
          person different targets.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BP_FIELDS.map((f) => (
            <label key={f.key} className="text-sm">
              <span className="mb-1 block font-medium">{f.label}</span>
              <input
                className="input min-h-[40px] py-1 tabular-nums"
                inputMode="numeric"
                value={bp[f.key]}
                onChange={(e) => setBp((b) => ({ ...b, [f.key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {(Object.keys(desc) as (keyof typeof desc)[]).map((k) => (
            <li key={k}>
              <strong>{BP_CATEGORY_LABEL[k]}:</strong> <span className="text-muted">{desc[k]} mmHg</span>
            </li>
          ))}
        </ul>
        <button type="button" className="btn-ghost mt-2 text-sm" onClick={() => setBp(strMap(DEFAULT_BP_THRESHOLDS))}>
          Restore defaults
        </button>
      </details>

      <div>
        <h3 className="label">Daily blood pressure reminders</h3>
        <label className="mb-3 inline-flex min-h-[44px] cursor-pointer items-center gap-2">
          <input type="checkbox" className="h-5 w-5 accent-primary" checked={remindersOn} onChange={(e) => setRemindersOn(e.target.checked)} />
          Show reminders while the app is open
        </label>
        <div className="grid grid-cols-3 gap-3">
          {PLANNED_SESSIONS.map((sess, i) => (
            <label key={sess} className="text-sm">
              <span className="mb-1 block font-medium">{SESSION_LABEL[sess]}</span>
              <input
                type="time"
                className="input"
                value={times[i]}
                onChange={(e) =>
                  setTimes((t) => {
                    const next = [...t] as [string, string, string];
                    next[i] = e.target.value || t[i];
                    return next;
                  })
                }
              />
            </label>
          ))}
        </div>
        {perm !== 'unsupported' && perm !== 'granted' && (
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={() => void Notification.requestPermission().then(setPerm)}
            disabled={perm === 'denied'}
          >
            <Bell className="h-5 w-5" aria-hidden />
            {perm === 'denied' ? 'Notifications blocked in browser settings' : 'Also allow system notifications'}
          </button>
        )}
        <p className="mt-2 text-sm text-muted">
          Reminders appear inside the app (and as a system notification if allowed) only while the app is open. No push
          service is used.
        </p>
      </div>

      {error && <ErrorBox message={error} />}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={() => void save()} disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </button>
        {saved && (
          <span role="status" className="flex items-center gap-1 text-ok">
            <CheckCircle2 className="h-5 w-5" aria-hidden /> Saved
          </span>
        )}
      </div>

      <div className="border-t border-line/60 pt-4 text-sm text-muted">
        <p className="font-semibold text-ink">Sources for default ranges</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {[...BP_SOURCES, ...GLUCOSE_SOURCES].map((src) => (
            <li key={src.url}>
              <a href={src.url} target="_blank" rel="noreferrer noopener" className="underline hover:text-ink">
                {src.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2">Individual targets vary with age, pregnancy, medicines and other conditions — use the targets agreed with your healthcare professional.</p>
      </div>
    </section>
  );
}

function strMap(t: BpThresholds): Record<keyof BpThresholds, string> {
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, String(v)])) as Record<keyof BpThresholds, string>;
}
