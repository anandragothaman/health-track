import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Droplet, FileText, Plus } from 'lucide-react';
import { useRouteMember } from '../hooks/useRouteMember';
import { useReadings } from '../hooks/useReadings';
import { useNow } from '../hooks/useNow';
import { MemberSwitcher } from '../components/MemberSwitcher';
import { BpSummaryCard } from '../components/BpSummaryCard';
import { GlucoseSummaryCard } from '../components/GlucoseSummaryCard';
import { SessionTracker } from '../components/SessionTracker';
import { RecentReadings } from '../components/RecentReadings';
import { RangePicker } from '../components/RangePicker';
import { BpChart } from '../components/charts/BpChart';
import { GlucoseChart } from '../components/charts/GlucoseChart';
import { Disclaimer } from '../components/Disclaimer';
import { ErrorBox, PageHeader, Spinner } from '../components/ui';
import { defaultRange, resolveRange, type DateRange } from '../utils/range';
import { addDays, endOfDay, startOfDay, toDateInput } from '../utils/date';
import { inRange } from '../utils/stats';
import NotFoundPage from './NotFoundPage';

export default function DashboardPage() {
  const member = useRouteMember();
  const now = useNow();
  const [range, setRange] = useState<DateRange>(() => defaultRange('7d'));
  const today = toDateInput(now);

  // One fetch covers both the selected range and the 30-day summaries.
  const { from, to, days } = useMemo(() => resolveRange(range), [range, today]);
  const fetchFrom = useMemo(() => {
    const min30 = startOfDay(addDays(new Date(), -29));
    return from < min30 ? from : min30;
  }, [from, today]);
  const fetchTo = useMemo(() => endOfDay(new Date()), [today]);
  const { bp, glucose, loading, error, reload } = useReadings(member?.id, fetchFrom, to > fetchTo ? to : fetchTo);

  const bpInRange = useMemo(() => inRange(bp, from, to), [bp, from, to]);
  const glucoseInRange = useMemo(() => inRange(glucose, from, to), [glucose, from, to]);

  if (!member) return <NotFoundPage message="This family member could not be found." />;

  return (
    <>
      <MemberSwitcher />
      <PageHeader
        title={member.full_name}
        subtitle="Health dashboard"
        actions={
          <Link to={`/member/${member.id}/report`} className="btn-secondary">
            <FileText className="h-5 w-5" aria-hidden /> Report
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link to={`/member/${member.id}/bp/new`} className="btn-primary min-h-[60px] text-lg">
          <Plus className="h-6 w-6" aria-hidden /> Add Blood Pressure
        </Link>
        <Link to={`/member/${member.id}/glucose/new`} className="btn-accent min-h-[60px] text-lg">
          <Plus className="h-6 w-6" aria-hidden /> Add Blood Sugar
        </Link>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBox message={error} onRetry={reload} />
        </div>
      )}

      {loading && bp.length === 0 && glucose.length === 0 ? (
        <Spinner label="Loading readings…" />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <BpSummaryCard member={member} readings={bp} now={now} />
            <GlucoseSummaryCard member={member} readings={glucose} period={{ from, to }} now={now} />
          </div>

          <SessionTracker member={member} readings={bp} now={now} />

          <section className="card" aria-labelledby="charts-title">
            <div className="mb-4 flex flex-col gap-3">
              <h2 id="charts-title" className="text-lg font-bold">
                Charts
              </h2>
              <RangePicker value={range} onChange={setRange} />
            </div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Activity className="h-5 w-5 text-primary" aria-hidden /> Blood pressure (mmHg)
            </h3>
            <BpChart readings={bpInRange} from={from} to={to} days={days} thresholds={member.settings.bpThresholds} />
            <hr className="my-6 border-line/60" />
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Droplet className="h-5 w-5 text-accent" aria-hidden /> Blood sugar
            </h3>
            <GlucoseChart
              readings={glucoseInRange}
              from={from}
              to={to}
              days={days}
              unit={member.settings.glucoseUnit}
              targets={member.settings.glucoseTargets}
            />
          </section>

          <RecentReadings member={member} bp={bp} glucose={glucose} />
          <Disclaimer />
        </div>
      )}
    </>
  );
}
