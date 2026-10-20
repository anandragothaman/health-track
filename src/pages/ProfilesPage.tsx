import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { useFamily } from '../contexts/FamilyContext';
import { errorMessage } from '../services/api';
import type { Gender, GlucosePreset, Member } from '../types';
import { Avatar } from '../components/Avatar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState, ErrorBox, Field, fieldAria, PageHeader } from '../components/ui';
import { ageFromDob, formatDate, toDateInput } from '../utils/date';
import { AVATAR_COLORS, DEFAULT_SETTINGS, normalizeSettings } from '../utils/settings';
import { GLUCOSE_PRESETS } from '../utils/glucose';

const GENDER_LABEL: Record<Gender, string> = {
  female: 'Female',
  male: 'Male',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

export default function ProfilesPage() {
  const { members, addMember, updateMember, removeMember } = useFamily();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Member | 'new' | null>(params.get('new') ? 'new' : null);
  const [toDelete, setToDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('new')) setParams({}, { replace: true });
  }, [params, setParams]);

  const doDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await removeMember(toDelete.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Family profiles"
        subtitle="Each person has their own readings, units and target ranges."
        actions={
          editing === null && (
            <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
              <UserPlus className="h-5 w-5" aria-hidden /> Add person
            </button>
          )
        }
      />
      {error && (
        <div className="mb-4">
          <ErrorBox message={error} />
        </div>
      )}

      {editing !== null && (
        <ProfileForm
          member={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={async (input) => {
            if (editing === 'new') await addMember(input);
            else await updateMember(editing.id, input);
            setEditing(null);
          }}
        />
      )}

      {members.length === 0 && editing === null ? (
        <EmptyState icon={<UserPlus className="h-10 w-10" />} title="No profiles yet">
          Add the first family member to start recording readings.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {members.map((m) => {
            const age = ageFromDob(m.date_of_birth);
            return (
              <li key={m.id} className="card flex items-center gap-3">
                <Avatar name={m.full_name} color={m.avatar_color} />
                <div className="min-w-0 flex-1">
                  <Link to={`/member/${m.id}`} className="block truncate text-lg font-bold hover:underline">
                    {m.full_name}
                  </Link>
                  <p className="text-sm text-muted">
                    {[
                      m.date_of_birth && `Born ${formatDate(m.date_of_birth + 'T00:00:00')}${age != null ? ` (${age})` : ''}`,
                      m.gender && GENDER_LABEL[m.gender],
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'No details added'}
                  </p>
                </div>
                <button type="button" className="btn-ghost h-11 w-11 p-0" aria-label={`Edit ${m.full_name}`} onClick={() => setEditing(m)}>
                  <Pencil className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  className="btn-ghost h-11 w-11 p-0 hover:text-crit"
                  aria-label={`Delete ${m.full_name}`}
                  onClick={() => setToDelete(m)}
                >
                  <Trash2 className="h-5 w-5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete ${toDelete?.full_name ?? 'profile'}?`}
        confirmLabel="Delete profile and readings"
        danger
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={doDelete}
      >
        This permanently deletes the profile and <strong>all of their blood pressure and blood sugar readings</strong>.
        Consider exporting a CSV from Settings first.
      </ConfirmDialog>
    </>
  );
}

interface FormProps {
  member: Member | null;
  onCancel(): void;
  onSave(input: { full_name: string; date_of_birth: string | null; gender: Gender | null; avatar_color: string; settings?: Member['settings'] }): Promise<void>;
}

function ProfileForm({ member, onCancel, onSave }: FormProps) {
  const [name, setName] = useState(member?.full_name ?? '');
  const [dob, setDob] = useState(member?.date_of_birth ?? '');
  const [gender, setGender] = useState<Gender | ''>(member?.gender ?? '');
  const [color, setColor] = useState(member?.avatar_color ?? 'teal');
  const [preset, setPreset] = useState<GlucosePreset | ''>(member ? member.settings.glucosePreset : '');
  const [errors, setErrors] = useState<{ name?: string; dob?: string; preset?: string }>({});
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = 'Please enter a name.';
    else if (name.trim().length > 80) errs.name = 'Name can be at most 80 characters.';
    if (dob && (dob > toDateInput(new Date()) || dob < '1900-01-01')) errs.dob = 'Enter a valid date of birth.';
    if (!member && !preset) errs.preset = 'Choose which glucose targets to start with (you can change them later).';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setSaveError(null);
    try {
      await onSave({
        full_name: name.trim(),
        date_of_birth: dob || null,
        gender: gender || null,
        avatar_color: color,
        ...(member ? {} : { settings: normalizeSettings({ ...DEFAULT_SETTINGS, glucosePreset: preset }) }),
      });
    } catch (err) {
      setSaveError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="card mb-6 space-y-4" aria-labelledby="profile-form-title">
      <h2 id="profile-form-title" className="text-lg font-bold">
        {member ? `Edit ${member.full_name}` : 'Add family member'}
      </h2>
      <Field id="p-name" label="Full name" error={errors.name}>
        <input {...fieldAria('p-name', errors.name)} className="input" maxLength={80} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="p-dob" label="Date of birth (optional)" error={errors.dob}>
          <input {...fieldAria('p-dob', errors.dob)} type="date" className="input" max={toDateInput(new Date())} value={dob} onChange={(e) => setDob(e.target.value)} />
        </Field>
        <Field id="p-gender" label="Gender (optional)">
          <select id="p-gender" className="input" value={gender} onChange={(e) => setGender(e.target.value as Gender | '')}>
            <option value="">Not specified</option>
            {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => (
              <option key={g} value={g}>
                {GENDER_LABEL[g]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset>
        <legend className="label">Avatar colour</legend>
        <div className="flex flex-wrap items-center gap-2">
          {Object.keys(AVATAR_COLORS).map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={`rounded-full p-0.5 ${color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''}`}
            >
              <Avatar name={name || '?'} color={c} />
            </button>
          ))}
        </div>
      </fieldset>
      {!member && (
        <Field id="p-preset" label="Blood sugar targets" error={errors.preset} hint="Targets differ from person to person. You can set exact numbers later in Settings.">
          <select {...fieldAria('p-preset', errors.preset)} className="input" value={preset} onChange={(e) => setPreset(e.target.value as GlucosePreset)}>
            <option value="">Choose…</option>
            <option value="ada">{GLUCOSE_PRESETS.ada.label}</option>
            <option value="nondiabetic">{GLUCOSE_PRESETS.nondiabetic.label}</option>
            <option value="custom">Custom (start from ADA values and edit in Settings)</option>
          </select>
        </Field>
      )}
      {saveError && <ErrorBox message={saveError} />}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : member ? 'Save changes' : 'Add person'}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
