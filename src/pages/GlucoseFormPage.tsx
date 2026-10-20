import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useRouteMember } from '../hooks/useRouteMember';
import { useLoadReading } from '../hooks/useReadingForm';
import { api, errorMessage } from '../services/api';
import { notifyDataChanged } from '../lib/dataEvents';
import type { GlucoseReadingType, GlucoseUnit } from '../types';
import { combineDateTime, toDateInput, toTimeInput } from '../utils/date';
import {
  convertGlucose,
  GLUCOSE_LIMITS,
  READING_TYPE_LABEL,
  READING_TYPES,
  roundGlucose,
} from '../utils/glucose';
import { hasErrors, validateGlucose, type Errors } from '../utils/validation';
import { ErrorBox, Field, fieldAria, PageHeader, Segmented, Spinner } from '../components/ui';
import { GlucoseBadge } from '../components/ReadingBadges';
import { FormActions } from '../components/FormActions';
import NotFoundPage from './NotFoundPage';

const loadGlucose = (id: string) => api.getGlucose(id);

/** Best guess of the reading type from the time of day. */
function guessType(d: Date): GlucoseReadingType {
  const h = d.getHours();
  if (h < 9) return 'fasting';
  if (h < 11) return 'after_breakfast';
  if (h < 13) return 'before_lunch';
  if (h < 16) return 'after_lunch';
  if (h < 19) return 'before_dinner';
  if (h < 22) return 'after_dinner';
  return 'bedtime';
}

export default function GlucoseFormPage() {
  const member = useRouteMember();
  const { readingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { reading, loading, error: loadError } = useLoadReading(readingId, member?.id, loadGlucose);

  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<GlucoseUnit>(member?.settings.glucoseUnit ?? 'mg/dL');
  const [type, setType] = useState<GlucoseReadingType>(() => guessType(new Date()));
  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [time, setTime] = useState(() => toTimeInput(new Date()));
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Errors<'value' | 'date' | 'notes'>>({});
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!reading) return;
    const d = new Date(reading.measured_at);
    setValue(String(reading.glucose_value));
    setUnit(reading.unit);
    setType(reading.reading_type);
    setDate(toDateInput(d));
    setTime(toTimeInput(d));
    setNotes(reading.notes ?? '');
  }, [reading]);

  if (!member) return <NotFoundPage message="This family member could not be found." />;
  if (loading) return <Spinner />;
  if (loadError) return <ErrorBox message={loadError} />;

  const back = () => (location.key !== 'default' ? navigate(-1) : navigate(`/member/${member.id}`));
  const num = Number(value.replace(',', '.'));
  const valid = value.trim() !== '' && Number.isFinite(num) && num >= GLUCOSE_LIMITS[unit].min && num <= GLUCOSE_LIMITS[unit].max;
  const otherUnit: GlucoseUnit = unit === 'mg/dL' ? 'mmol/L' : 'mg/dL';

  const changeUnit = (u: GlucoseUnit) => {
    if (u === unit) return;
    if (valid) setValue(String(roundGlucose(convertGlucose(num, unit, u), u)));
    setUnit(u);
  };

  const save = async (another: boolean) => {
    setSaveError(null);
    setSaved(null);
    const measuredAt = combineDateTime(date, time || '00:00');
    const errs = validateGlucose(value, unit, measuredAt, notes);
    setErrors(errs);
    if (hasErrors(errs)) {
      document.getElementById(errs.value ? 'g-value' : errs.date ? 'g-date' : 'g-notes')?.focus();
      return;
    }
    setBusy(true);
    try {
      await api.saveGlucose(
        {
          member_id: member.id,
          glucose_value: roundGlucose(num, unit),
          unit,
          reading_type: type,
          measured_at: measuredAt.toISOString(),
          notes: notes.trim() || null,
        },
        readingId,
      );
      notifyDataChanged();
      if (another) {
        setSaved(`Saved ${value} ${unit}. Enter the next reading.`);
        setValue('');
        setNotes('');
        setTime(toTimeInput(new Date()));
        document.getElementById('g-value')?.focus();
      } else {
        back();
      }
    } catch (e) {
      setSaveError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void save(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={readingId ? 'Edit blood sugar' : 'Add blood sugar'} subtitle={member.full_name} />
      <form onSubmit={onSubmit} noValidate className="card space-y-5">
        <fieldset>
          <legend className="label">Unit</legend>
          <Segmented<GlucoseUnit>
            label="Unit"
            value={unit}
            onChange={changeUnit}
            options={[
              { value: 'mg/dL', label: 'mg/dL' },
              { value: 'mmol/L', label: 'mmol/L' },
            ]}
          />
        </fieldset>

        <Field
          id="g-value"
          label={`Blood glucose (${unit})`}
          error={errors.value}
          hint={valid ? `= ${roundGlucose(convertGlucose(num, unit, otherUnit), otherUnit)} ${otherUnit}` : `Use the unit shown on your meter.`}
        >
          <input
            {...fieldAria('g-value', errors.value)}
            className="input max-w-[240px] text-2xl font-bold tabular-nums"
            inputMode="decimal"
            autoComplete="off"
            autoFocus={!readingId}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>

        <fieldset>
          <legend className="label">When was it measured?</legend>
          <div role="radiogroup" aria-label="Reading type" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {READING_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={`${type === t ? 'chip-on' : 'chip-off'} min-h-[48px] justify-center rounded-xl`}
              >
                {READING_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </fieldset>

        {valid && (
          <p className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
            <span className="text-muted">Compared with this person's targets:</span>
            <GlucoseBadge reading={{ glucose_value: num, unit, reading_type: type }} targets={member.settings.glucoseTargets} />
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field id="g-date" label="Date" error={errors.date}>
            <input {...fieldAria('g-date', errors.date)} type="date" className="input" max={toDateInput(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field id="g-time" label="Time">
            <input id="g-time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>

        <Field id="g-notes" label="Notes (optional)" error={errors.notes} hint="For example: what you ate, exercise, medicine.">
          <textarea {...fieldAria('g-notes', errors.notes)} className="input min-h-[88px]" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {saveError && <ErrorBox message={saveError} />}
        {saved && (
          <p role="status" className="flex items-center gap-2 rounded-xl bg-ok-soft p-3 text-ink">
            <CheckCircle2 className="h-5 w-5 text-ok" aria-hidden /> {saved}
          </p>
        )}

        <FormActions
          isEdit={!!readingId}
          busy={busy}
          onCancel={back}
          onSaveAnother={() => void save(true)}
          onDelete={async () => {
            try {
              await api.deleteGlucose(readingId!);
              notifyDataChanged();
              back();
            } catch (e) {
              setSaveError(errorMessage(e));
            }
          }}
        />
      </form>
    </div>
  );
}
