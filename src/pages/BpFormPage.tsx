import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useRouteMember } from '../hooks/useRouteMember';
import { useLoadReading } from '../hooks/useReadingForm';
import { api, errorMessage } from '../services/api';
import { notifyDataChanged } from '../lib/dataEvents';
import type { BpSession } from '../types';
import { combineDateTime, sessionForTime, toDateInput, toTimeInput } from '../utils/date';
import { SESSION_LABEL, SESSIONS } from '../utils/bp';
import { hasErrors, validateBp, type BpFormValues, type Errors } from '../utils/validation';
import { ErrorBox, Field, fieldAria, PageHeader, Segmented, Spinner } from '../components/ui';
import { BpBadge } from '../components/ReadingBadges';
import { FormActions } from '../components/FormActions';
import NotFoundPage from './NotFoundPage';

const loadBp = (id: string) => api.getBp(id);

function emptyValues(): BpFormValues {
  const now = new Date();
  return { systolic: '', diastolic: '', heartRate: '', date: toDateInput(now), time: toTimeInput(now), notes: '' };
}

export default function BpFormPage() {
  const member = useRouteMember();
  const { readingId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { reading, loading, error: loadError } = useLoadReading(readingId, member?.id, loadBp);

  const [v, setV] = useState<BpFormValues>(emptyValues);
  const [session, setSession] = useState<BpSession>(() => {
    const p = params.get('session') as BpSession | null;
    return p && SESSIONS.includes(p) ? p : sessionForTime(new Date());
  });
  const [errors, setErrors] = useState<Errors<keyof BpFormValues>>({});
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!reading) return;
    const d = new Date(reading.measured_at);
    setV({
      systolic: String(reading.systolic),
      diastolic: String(reading.diastolic),
      heartRate: reading.heart_rate != null ? String(reading.heart_rate) : '',
      date: toDateInput(d),
      time: toTimeInput(d),
      notes: reading.notes ?? '',
    });
    setSession(reading.session);
  }, [reading]);

  if (!member) return <NotFoundPage message="This family member could not be found." />;
  if (loading) return <Spinner />;
  if (loadError) return <ErrorBox message={loadError} />;

  const set = (k: keyof BpFormValues) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }));
  const back = () => (location.key !== 'default' ? navigate(-1) : navigate(`/member/${member.id}`));

  const save = async (another: boolean) => {
    setSaveError(null);
    setSaved(null);
    const measuredAt = combineDateTime(v.date, v.time || '00:00');
    const errs = validateBp(v, measuredAt);
    setErrors(errs);
    if (hasErrors(errs)) {
      document.getElementById(Object.keys(errs)[0] === 'date' ? 'bp-date' : `bp-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await api.saveBp(
        {
          member_id: member.id,
          systolic: Number(v.systolic),
          diastolic: Number(v.diastolic),
          heart_rate: v.heartRate.trim() ? Number(v.heartRate) : null,
          session,
          measured_at: measuredAt.toISOString(),
          notes: v.notes.trim() || null,
        },
        readingId,
      );
      notifyDataChanged();
      if (another) {
        setSaved(`Saved ${v.systolic}/${v.diastolic}. Enter the next reading.`);
        const now = new Date();
        setV({ ...emptyValues(), date: v.date, time: toTimeInput(now) });
        document.getElementById('bp-systolic')?.focus();
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

  const sys = Number(v.systolic);
  const dia = Number(v.diastolic);
  const preview = sys >= 50 && dia >= 30 && sys > dia;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={readingId ? 'Edit blood pressure' : 'Add blood pressure'} subtitle={member.full_name} />
      <form onSubmit={onSubmit} noValidate className="card space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field id="bp-systolic" label="Systolic (top number)" error={errors.systolic} hint="mmHg">
            <input
              {...fieldAria('bp-systolic', errors.systolic)}
              className="input text-2xl font-bold tabular-nums"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              autoFocus={!readingId}
              value={v.systolic}
              onChange={set('systolic')}
            />
          </Field>
          <Field id="bp-diastolic" label="Diastolic (bottom number)" error={errors.diastolic} hint="mmHg">
            <input
              {...fieldAria('bp-diastolic', errors.diastolic)}
              className="input text-2xl font-bold tabular-nums"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={v.diastolic}
              onChange={set('diastolic')}
            />
          </Field>
        </div>

        {preview && (
          <p className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
            <span className="text-muted">Category:</span>
            <BpBadge sys={sys} dia={dia} thresholds={member.settings.bpThresholds} />
          </p>
        )}

        <Field id="bp-heartRate" label="Heart rate (optional)" error={errors.heartRate} hint="Beats per minute">
          <input
            {...fieldAria('bp-heartRate', errors.heartRate)}
            className="input max-w-[200px] text-xl tabular-nums"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={v.heartRate}
            onChange={set('heartRate')}
          />
        </Field>

        <fieldset>
          <legend className="label">Session</legend>
          <Segmented<BpSession>
            label="Session"
            value={session}
            onChange={setSession}
            options={SESSIONS.map((s) => ({ value: s, label: SESSION_LABEL[s] }))}
          />
          <p className="mt-1 text-sm text-muted">You can record more than one reading in the same session.</p>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <Field id="bp-date" label="Date" error={errors.date}>
            <input {...fieldAria('bp-date', errors.date)} type="date" className="input" max={toDateInput(new Date())} value={v.date} onChange={set('date')} />
          </Field>
          <Field id="bp-time" label="Time">
            <input id="bp-time" type="time" className="input" value={v.time} onChange={set('time')} />
          </Field>
        </div>

        <Field id="bp-notes" label="Notes (optional)" error={errors.notes} hint="For example: after a walk, missed medicine, felt dizzy.">
          <textarea {...fieldAria('bp-notes', errors.notes)} className="input min-h-[88px]" maxLength={500} value={v.notes} onChange={set('notes')} />
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
              await api.deleteBp(readingId!);
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
