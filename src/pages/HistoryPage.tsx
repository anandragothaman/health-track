import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Activity, ArrowDownUp, Download, Droplet, Pencil, Search, Trash2 } from 'lucide-react';
import { useRouteMember } from '../hooks/useRouteMember';
import { useReadings } from '../hooks/useReadings';
import { api, errorMessage } from '../services/api';
import { notifyDataChanged } from '../lib/dataEvents';
import type { BpSession, GlucoseReading, GlucoseReadingType } from '../types';
import { addDays, endOfDay, formatDate, formatTime, parseDateInput, startOfDay, toDateInput } from '../utils/date';
import { SESSION_LABEL, SESSIONS } from '../utils/bp';
import { formatGlucose, READING_TYPE_LABEL, READING_TYPES, toMgdl } from '../utils/glucose';
import { averageBp, averageGlucoseMgdl } from '../utils/stats';
import { bpCsv, downloadCsv, glucoseCsv, safeFileName } from '../utils/csv';
import { MemberSwitcher } from '../components/MemberSwitcher';
import { BpBadge, GlucoseBadge } from '../components/ReadingBadges';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState, ErrorBox, PageHeader, Segmented, Spinner } from '../components/ui';
import NotFoundPage from './NotFoundPage';

type Tab = 'bp' | 'glucose';

export default function HistoryPage() {
  const member = useRouteMember();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'glucose' ? 'glucose' : 'bp';
  const [fromStr, setFromStr] = useState(() => toDateInput(addDays(new Date(), -29)));
  const [toStr, setToStr] = useState(() => toDateInput(new Date()));
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [newestFirst, setNewestFirst] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<{ kind: Tab; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const from = useMemo(() => startOfDay(parseDateInput(fromStr || toDateInput(addDays(new Date(), -29)))), [fromStr]);
  const to = useMemo(() => endOfDay(parseDateInput(toStr || toDateInput(new Date()))), [toStr]);
  const { bp, glucose, loading, error, reload } = useReadings(member?.id, from, to);

  const q = query.trim().toLowerCase();
  const order = <T extends { measured_at: string }>(rows: T[]) =>
    newestFirst ? rows : [...rows].reverse();

  const bpRows = useMemo(
    () =>
      order(
        bp.filter(
          (r) =>
            (typeFilter === 'all' || r.session === typeFilter) &&
            (!q || (r.notes ?? '').toLowerCase().includes(q) || `${r.systolic}/${r.diastolic}`.includes(q)),
        ),
      ),
    [bp, typeFilter, q, newestFirst],
  );
  const glucoseRows = useMemo(
    () =>
      order(
        glucose.filter(
          (r) =>
            (typeFilter === 'all' || r.reading_type === typeFilter) &&
            (!q || (r.notes ?? '').toLowerCase().includes(q) || String(r.glucose_value).includes(q)),
        ),
      ),
    [glucose, typeFilter, q, newestFirst],
  );

  if (!member) return <NotFoundPage message="This family member could not be found." />;
  const unit = member.settings.glucoseUnit;

  const switchTab = (t: Tab) => {
    setTypeFilter('all');
    setParams(t === 'glucose' ? { tab: 'glucose' } : {}, { replace: true });
  };

  const exportCsv = () => {
    const base = `${safeFileName(member.full_name)}-${fromStr}-to-${toStr}`;
    if (tab === 'bp') downloadCsv(`${base}-blood-pressure.csv`, bpCsv(bpRows));
    else downloadCsv(`${base}-blood-glucose.csv`, glucoseCsv(glucoseRows, unit));
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      if (pendingDelete.kind === 'bp') await api.deleteBp(pendingDelete.id);
      else await api.deleteGlucose(pendingDelete.id);
      notifyDataChanged();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const rows = tab === 'bp' ? bpRows : glucoseRows;
  const bpAvg = tab === 'bp' ? averageBp(bpRows) : null;
  const gAvg = tab === 'glucose' ? averageGlucoseMgdl(glucoseRows) : null;

  return (
    <>
      <MemberSwitcher />
      <PageHeader
        title="Reading history"
        subtitle={member.full_name}
        actions={
          <button type="button" className="btn-secondary" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="h-5 w-5" aria-hidden /> Export CSV
          </button>
        }
      />

      <div className="card mb-5 space-y-4">
        <Segmented<Tab>
          label="Reading kind"
          value={tab}
          onChange={switchTab}
          options={[
            { value: 'bp', label: 'Blood pressure' },
            { value: 'glucose', label: 'Blood sugar' },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="label">From</span>
            <input type="date" className="input" value={fromStr} max={toStr} onChange={(e) => setFromStr(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="label">To</span>
            <input type="date" className="input" value={toStr} min={fromStr} max={toDateInput(new Date())} onChange={(e) => setToStr(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="label">{tab === 'bp' ? 'Session' : 'Reading type'}</span>
            <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All</option>
              {tab === 'bp'
                ? SESSIONS.map((s) => (
                    <option key={s} value={s}>
                      {SESSION_LABEL[s as BpSession]}
                    </option>
                  ))
                : READING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {READING_TYPE_LABEL[t as GlucoseReadingType]}
                    </option>
                  ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="label">Search</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input type="search" className="input pl-9" placeholder="Notes or value" value={query} onChange={(e) => setQuery(e.target.value)} />
            </span>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted" aria-live="polite">
            {rows.length} readings
            {bpAvg && ` · average ${bpAvg.systolic}/${bpAvg.diastolic} mmHg`}
            {gAvg != null && ` · average ${formatGlucose(gAvg, unit)} ${unit}`}
          </p>
          <button type="button" className="btn-ghost min-h-[40px] text-sm" onClick={() => setNewestFirst((v) => !v)}>
            <ArrowDownUp className="h-4 w-4" aria-hidden /> {newestFirst ? 'Newest first' : 'Oldest first'}
          </button>
        </div>
      </div>

      {(error || actionError) && (
        <div className="mb-4">
          <ErrorBox message={(error || actionError)!} onRetry={error ? reload : undefined} />
        </div>
      )}

      {loading && rows.length === 0 ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={tab === 'bp' ? <Activity className="h-8 w-8" /> : <Droplet className="h-8 w-8" />}
          title="No readings match these filters"
        >
          Try a wider date range or clear the search.
        </EmptyState>
      ) : (
        <ul className="card divide-y divide-line/60 p-0 sm:p-0">
          {tab === 'bp'
            ? bpRows.map((r) => (
                <HistoryRow
                  key={r.id}
                  date={r.measured_at}
                  main={`${r.systolic}/${r.diastolic} mmHg`}
                  extra={r.heart_rate != null ? `${r.heart_rate} BPM` : undefined}
                  type={SESSION_LABEL[r.session]}
                  notes={r.notes}
                  badge={<BpBadge sys={r.systolic} dia={r.diastolic} thresholds={member.settings.bpThresholds} />}
                  editTo={`/member/${member.id}/bp/${r.id}/edit`}
                  onDelete={() => setPendingDelete({ kind: 'bp', id: r.id })}
                />
              ))
            : glucoseRows.map((r: GlucoseReading) => (
                <HistoryRow
                  key={r.id}
                  date={r.measured_at}
                  main={`${formatGlucose(toMgdl(r.glucose_value, r.unit), unit)} ${unit}`}
                  extra={r.unit !== unit ? `entered as ${r.glucose_value} ${r.unit}` : undefined}
                  type={READING_TYPE_LABEL[r.reading_type]}
                  notes={r.notes}
                  badge={<GlucoseBadge reading={r} targets={member.settings.glucoseTargets} />}
                  editTo={`/member/${member.id}/glucose/${r.id}/edit`}
                  onDelete={() => setPendingDelete({ kind: 'glucose', id: r.id })}
                />
              ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this reading?"
        confirmLabel="Delete reading"
        danger
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      >
        This cannot be undone.
      </ConfirmDialog>
    </>
  );
}

interface RowProps {
  date: string;
  main: string;
  extra?: string;
  type: string;
  notes: string | null;
  badge: ReactNode;
  editTo: string;
  onDelete(): void;
}

function HistoryRow({ date, main, extra, type, notes, badge, editTo, onDelete }: RowProps) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
      <div className="w-28 shrink-0">
        <p className="font-semibold">{formatDate(date)}</p>
        <p className="text-sm text-muted">{formatTime(date)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold tabular-nums">
          {main}
          {extra && <span className="ml-2 text-sm font-normal text-muted">{extra}</span>}
        </p>
        <p className="text-sm text-muted">{type}</p>
        {notes && <p className="mt-1 break-words text-sm">{notes}</p>}
      </div>
      <div className="flex items-center gap-1">
        {badge}
        <Link to={editTo} className="btn-ghost h-11 w-11 p-0" aria-label={`Edit reading from ${formatDate(date)} ${formatTime(date)}`}>
          <Pencil className="h-4 w-4" aria-hidden />
        </Link>
        <button type="button" className="btn-ghost h-11 w-11 p-0 hover:text-crit" aria-label={`Delete reading from ${formatDate(date)} ${formatTime(date)}`} onClick={onDelete}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}
