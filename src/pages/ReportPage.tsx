import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { useRouteMember } from '../hooks/useRouteMember';
import { useReadings } from '../hooks/useReadings';
import { RangePicker } from '../components/RangePicker';
import { ErrorBox, Spinner } from '../components/ui';
import { Disclaimer } from '../components/Disclaimer';
import { defaultRange, resolveRange, type DateRange } from '../utils/range';
import { ageFromDob, formatDate, formatDateTime, formatShortDate, parseDateInput } from '../utils/date';
import { averageBp, averageGlucoseMgdl, groupBy } from '../utils/stats';
import { BP_CATEGORY_LABEL, classifyBp, SESSION_LABEL, type BpCategory } from '../utils/bp';
import {
  classifyGlucose,
  CONTEXT_LABEL,
  contextForType,
  formatGlucose,
  GLUCOSE_PRESETS,
  GLUCOSE_STATUS_LABEL,
  READING_TYPE_LABEL,
  toMgdl,
} from '../utils/glucose';
import type { GlucoseContext } from '../types';
import NotFoundPage from './NotFoundPage';

const CATS: BpCategory[] = ['low', 'normal', 'elevated', 'stage1', 'stage2', 'severe'];
const CONTEXTS: GlucoseContext[] = ['fasting', 'beforeMeal', 'afterMeal', 'bedtime', 'random'];
// Print-safe colours (same hues as the on-screen light theme).
const C = { sys: '#1d4ed8', dia: '#c2410c', glu: '#0d9488', grid: '#e2e8f0', axis: '#475569' };

export default function ReportPage() {
  const member = useRouteMember();
  const [range, setRange] = useState<DateRange>(() => defaultRange('30d'));
  const { from, to } = useMemo(() => resolveRange(range), [range]);
  const { bp, glucose, loading, error, reload } = useReadings(member?.id, from, to);

  if (!member) return <NotFoundPage message="This family member could not be found." />;
  const { glucoseUnit: unit, glucoseTargets: targets, bpThresholds, glucosePreset } = member.settings;

  const bpAvg = averageBp(bp);
  const catCounts = CATS.map((c) => ({ c, n: bp.filter((r) => classifyBp(r.systolic, r.diastolic, bpThresholds) === c).length }));
  const bpDaily = [...groupBy(bp, 'day').entries()].map(([d, rows]) => ({ t: parseDateInput(d).getTime(), ...averageBp(rows)! }));
  const gDaily = [...groupBy(glucose, 'day').entries()].map(([d, rows]) => ({
    t: parseDateInput(d).getTime(),
    v: Number(formatGlucose(averageGlucoseMgdl(rows)!, unit)),
  }));
  const age = ageFromDob(member.date_of_birth);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={`/member/${member.id}`} className="btn-ghost">
          <ArrowLeft className="h-5 w-5" aria-hidden /> Back to dashboard
        </Link>
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          <Printer className="h-5 w-5" aria-hidden /> Print / Save as PDF
        </button>
      </div>
      <div className="card mb-5 print:hidden">
        <p className="label">Report period</p>
        <RangePicker value={range} onChange={setRange} />
        <p className="mt-2 text-sm text-muted">In the print dialog choose “Save as PDF” to keep a copy.</p>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading ? (
        <Spinner />
      ) : (
        <article className="space-y-6 bg-surface p-1 print:bg-white">
          <header className="border-b border-line pb-4">
            <h1 className="text-2xl font-bold">Health readings report</h1>
            <p className="text-lg font-semibold">{member.full_name}</p>
            <p className="text-sm text-muted">
              {member.date_of_birth && `Date of birth ${formatDate(member.date_of_birth + 'T00:00:00')}${age != null ? ` (age ${age})` : ''} · `}
              Period {formatDate(from)} – {formatDate(to)} · Generated {formatDateTime(new Date())}
            </p>
          </header>

          <section>
            <h2 className="mb-2 text-lg font-bold">Blood pressure</h2>
            {bp.length === 0 ? (
              <p className="text-muted">No blood pressure readings in this period.</p>
            ) : (
              <>
                <p>
                  {bp.length} readings · average <strong>{bpAvg!.systolic}/{bpAvg!.diastolic} mmHg</strong>
                  {bpAvg!.heartRate != null && ` · average heart rate ${bpAvg!.heartRate} BPM`}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {catCounts.filter((x) => x.n > 0).map((x) => `${BP_CATEGORY_LABEL[x.c]}: ${x.n}`).join(' · ')}
                </p>
                {bpDaily.length > 1 && (
                  <div className="mt-3 overflow-x-auto">
                    <p className="text-sm font-semibold">Daily averages (mmHg) — solid: systolic, dashed: diastolic</p>
                    <LineChart width={680} height={200} data={bpDaily} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid stroke={C.grid} vertical={false} />
                      <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={formatShortDate} tick={{ fontSize: 11, fill: C.axis }} />
                      <YAxis tick={{ fontSize: 11, fill: C.axis }} domain={['dataMin - 10', 'dataMax + 10']} />
                      <Line dataKey="systolic" stroke={C.sys} strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line dataKey="diastolic" stroke={C.dia} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </div>
                )}
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="py-1">Date & time</th>
                      <th className="py-1">Session</th>
                      <th className="py-1">BP (mmHg)</th>
                      <th className="py-1">HR</th>
                      <th className="py-1">Category</th>
                      <th className="py-1">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bp.map((r) => (
                      <tr key={r.id} className="border-b border-line/50 align-top">
                        <td className="py-1 pr-2">{formatDateTime(r.measured_at)}</td>
                        <td className="py-1 pr-2">{SESSION_LABEL[r.session]}</td>
                        <td className="py-1 pr-2 font-semibold tabular-nums">{r.systolic}/{r.diastolic}</td>
                        <td className="py-1 pr-2 tabular-nums">{r.heart_rate ?? ''}</td>
                        <td className="py-1 pr-2">{BP_CATEGORY_LABEL[classifyBp(r.systolic, r.diastolic, bpThresholds)]}</td>
                        <td className="py-1">{r.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>

          <section style={{ breakBefore: 'auto' }}>
            <h2 className="mb-2 text-lg font-bold">Blood sugar ({unit})</h2>
            <p className="mb-2 text-sm text-muted">
              Targets used: {glucosePreset === 'custom' ? 'custom targets' : GLUCOSE_PRESETS[glucosePreset].label}.
            </p>
            {glucose.length === 0 ? (
              <p className="text-muted">No blood sugar readings in this period.</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="py-1">Reading type</th>
                      <th className="py-1">Target</th>
                      <th className="py-1">Readings</th>
                      <th className="py-1">Average</th>
                      <th className="py-1">In target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CONTEXTS.map((c) => {
                      const rows = glucose.filter((r) => contextForType(r.reading_type) === c);
                      if (rows.length === 0) return null;
                      const inT = rows.filter((r) => classifyGlucose(toMgdl(r.glucose_value, r.unit), r.reading_type, targets) === 'in').length;
                      return (
                        <tr key={c} className="border-b border-line/50">
                          <td className="py-1 pr-2">{CONTEXT_LABEL[c]}</td>
                          <td className="py-1 pr-2 tabular-nums">
                            {formatGlucose(targets[c].low, unit)}–{formatGlucose(targets[c].high, unit)}
                          </td>
                          <td className="py-1 pr-2 tabular-nums">{rows.length}</td>
                          <td className="py-1 pr-2 font-semibold tabular-nums">{formatGlucose(averageGlucoseMgdl(rows)!, unit)}</td>
                          <td className="py-1 tabular-nums">
                            {inT} ({Math.round((inT / rows.length) * 100)}%)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {gDaily.length > 1 && (
                  <div className="mt-3 overflow-x-auto">
                    <p className="text-sm font-semibold">Daily average ({unit}, all reading types)</p>
                    <LineChart width={680} height={180} data={gDaily} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid stroke={C.grid} vertical={false} />
                      <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={formatShortDate} tick={{ fontSize: 11, fill: C.axis }} />
                      <YAxis tick={{ fontSize: 11, fill: C.axis }} domain={[0, (max: number) => Math.ceil(max * 1.15)]} />
                      <Line dataKey="v" stroke={C.glu} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </div>
                )}
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="py-1">Date & time</th>
                      <th className="py-1">Type</th>
                      <th className="py-1">Value ({unit})</th>
                      <th className="py-1">Compared with target</th>
                      <th className="py-1">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {glucose.map((r) => {
                      const mgdl = toMgdl(r.glucose_value, r.unit);
                      return (
                        <tr key={r.id} className="border-b border-line/50 align-top">
                          <td className="py-1 pr-2">{formatDateTime(r.measured_at)}</td>
                          <td className="py-1 pr-2">{READING_TYPE_LABEL[r.reading_type]}</td>
                          <td className="py-1 pr-2 font-semibold tabular-nums">{formatGlucose(mgdl, unit)}</td>
                          <td className="py-1 pr-2">{GLUCOSE_STATUS_LABEL[classifyGlucose(mgdl, r.reading_type, targets)]}</td>
                          <td className="py-1">{r.notes}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </section>

          <Disclaimer />
        </article>
      )}
    </div>
  );
}
