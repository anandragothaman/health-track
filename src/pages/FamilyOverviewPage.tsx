import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ChevronRight, Droplet, UserPlus, Users } from 'lucide-react';
import { useFamily } from '../contexts/FamilyContext';
import { api, errorMessage } from '../services/api';
import { useDataVersion } from '../lib/dataEvents';
import { useNow } from '../hooks/useNow';
import type { OverviewRow } from '../types';
import { Avatar } from '../components/Avatar';
import { BpBadge, GlucoseBadge } from '../components/ReadingBadges';
import { EmptyState, ErrorBox, PageHeader, Spinner } from '../components/ui';
import { Disclaimer } from '../components/Disclaimer';
import { ageFromDob, endOfDay, formatRelative, startOfDay, toDateInput } from '../utils/date';
import { formatGlucose, READING_TYPE_LABEL, toMgdl } from '../utils/glucose';

export default function FamilyOverviewPage() {
  const { family, members, select } = useFamily();
  const version = useDataVersion();
  const now = useNow();
  const today = toDateInput(now);
  const [rows, setRows] = useState<Map<string, OverviewRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!family) return;
    let active = true;
    setError(null);
    api
      .getOverview(family.id, startOfDay(now), endOfDay(now))
      .then((r) => active && setRows(new Map(r.map((x) => [x.member_id, x]))))
      .catch((e) => active && setError(errorMessage(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // Refetch when data changes, the family changes, or the calendar day rolls over.
  }, [family, version, today, nonce, members.length]);

  return (
    <>
      <PageHeader
        title="Family overview"
        subtitle="Latest readings for everyone. Tap a person to open their dashboard."
        actions={
          <Link to="/profiles?new=1" className="btn-secondary">
            <UserPlus className="h-5 w-5" aria-hidden /> Add person
          </Link>
        }
      />
      {error && <ErrorBox message={error} onRetry={() => setNonce((n) => n + 1)} />}
      {loading && rows.size === 0 && !error ? (
        <Spinner />
      ) : members.length === 0 ? (
        <EmptyState icon={<Users className="h-10 w-10" />} title="No family members yet">
          <p>Add a profile for each person whose readings you want to track.</p>
          <Link to="/profiles?new=1" className="btn-primary mt-4">
            <UserPlus className="h-5 w-5" aria-hidden /> Add first person
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {members.map((m) => {
            const r = rows.get(m.id);
            const age = ageFromDob(m.date_of_birth);
            const last = [r?.bp_measured_at, r?.glucose_measured_at].filter(Boolean).sort().pop();
            return (
              <li key={m.id}>
                <Link
                  to={`/member/${m.id}`}
                  onClick={() => select(m.id)}
                  className="card flex h-full flex-col gap-4 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={m.full_name} color={m.avatar_color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-bold">{m.full_name}</p>
                      <p className="text-sm text-muted">
                        {last ? `Last recorded ${formatRelative(last)}` : 'No readings yet'}
                        {age != null && ` · ${age} yrs`}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted" aria-hidden />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-subtle p-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                        <Activity className="h-4 w-4 text-primary" aria-hidden /> Blood pressure
                      </p>
                      {r?.bp_systolic != null && r.bp_diastolic != null ? (
                        <>
                          <p className="mt-1 text-2xl font-bold tabular-nums">
                            {r.bp_systolic}/{r.bp_diastolic}
                          </p>
                          <BpBadge sys={r.bp_systolic} dia={r.bp_diastolic} thresholds={m.settings.bpThresholds} />
                        </>
                      ) : (
                        <p className="mt-1 text-muted">—</p>
                      )}
                    </div>
                    <div className="rounded-xl bg-subtle p-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                        <Droplet className="h-4 w-4 text-accent" aria-hidden /> Blood sugar
                      </p>
                      {r?.glucose_value != null && r.glucose_unit && r.glucose_reading_type ? (
                        <>
                          <p className="mt-1 text-2xl font-bold tabular-nums">
                            {formatGlucose(toMgdl(r.glucose_value, r.glucose_unit), m.settings.glucoseUnit)}
                            <span className="ml-1 text-xs font-medium text-muted">{m.settings.glucoseUnit}</span>
                          </p>
                          <p className="mb-1 text-xs text-muted">{READING_TYPE_LABEL[r.glucose_reading_type]}</p>
                          <GlucoseBadge
                            reading={{ glucose_value: r.glucose_value, unit: r.glucose_unit, reading_type: r.glucose_reading_type }}
                            targets={m.settings.glucoseTargets}
                          />
                        </>
                      ) : (
                        <p className="mt-1 text-muted">—</p>
                      )}
                    </div>
                  </div>

                  <SessionDots done={r?.sessions_today ?? 0} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Disclaimer className="mt-8" />
    </>
  );
}

function SessionDots({ done }: { done: number }) {
  return (
    <p className="flex items-center gap-2 text-sm">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-3 w-3 rounded-full ${i < done ? 'bg-ok' : 'border border-line bg-subtle'}`} />
        ))}
      </span>
      <span>
        <strong>{done} of 3</strong> blood pressure sessions today
      </span>
    </p>
  );
}
