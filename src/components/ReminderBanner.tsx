import { Link } from 'react-router-dom';
import { BellRing, X } from 'lucide-react';
import { useFamily } from '../contexts/FamilyContext';
import { useReadings } from '../hooks/useReadings';
import { useReminders } from '../hooks/useReminders';
import { useNow } from '../hooks/useNow';
import { endOfDay, startOfDay } from '../utils/date';

export function ReminderBanner() {
  const { selected } = useFamily();
  const now = useNow(30_000);
  const from = startOfDay(now);
  const { bp, loading } = useReadings(selected?.id, from, endOfDay(now));
  const { due, dismiss } = useReminders(loading ? null : selected, bp, now);
  if (!selected || due.length === 0) return null;
  const r = due[due.length - 1];

  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-info/30 bg-info-soft p-3 sm:p-4">
      <BellRing className="h-5 w-5 shrink-0 text-info" aria-hidden />
      <p className="min-w-0 flex-1 text-ink">{r.message}</p>
      <div className="flex gap-2">
        <Link to={`/member/${selected.id}/bp/new?session=${r.session}`} className="btn-primary min-h-[40px] py-1 text-sm">
          Add now
        </Link>
        <button
          type="button"
          className="btn-ghost h-10 w-10 p-0"
          aria-label="Dismiss reminder"
          onClick={() => due.forEach((d) => dismiss(d.key))}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
