import { Check, Clock, Minus } from 'lucide-react';
import type { BpReading, BpSession, Member } from '../types';
import { PLANNED_SESSIONS, SESSION_LABEL } from '../utils/bp';
import { addDays, formatClock, formatTime, formatWeekday, isSameDay, toDateInput } from '../utils/date';

/**
 * Today's three planned sessions plus a 7-day completion grid.
 * Missing sessions are shown in neutral grey ("Not recorded") — never as alarms.
 */
export function SessionTracker({ member, readings, now }: { member: Member; readings: BpReading[]; now: Date }) {
  const times = member.settings.reminderTimes;
  const byDay = new Map<string, Map<BpSession, BpReading>>();
  for (const r of readings) {
    const key = toDateInput(new Date(r.measured_at));
    const m = byDay.get(key) ?? new Map<BpSession, BpReading>();
    // readings are newest first; keep the earliest per session for "done at"
    m.set(r.session, r);
    byDay.set(key, m);
  }
  const today = byDay.get(toDateInput(now));
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const days = Array.from({ length: 7 }, (_, i) => addDays(now, i - 6));

  return (
    <section className="card" aria-labelledby="sessions-title">
      <h2 id="sessions-title" className="text-lg font-bold">
        Today's blood pressure sessions
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {PLANNED_SESSIONS.map((s, i) => {
          const done = today?.get(s);
          const [h, m] = times[i].split(':').map(Number);
          const passed = nowMin >= h * 60 + m;
          return (
            <li
              key={s}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                done ? 'border-ok/40 bg-ok-soft' : 'border-line bg-subtle'
              }`}
            >
              {done ? (
                <Check className="h-5 w-5 text-ok" aria-hidden />
              ) : passed ? (
                <Minus className="h-5 w-5 text-muted" aria-hidden />
              ) : (
                <Clock className="h-5 w-5 text-muted" aria-hidden />
              )}
              <div>
                <p className="font-semibold">{SESSION_LABEL[s]}</p>
                <p className="text-sm text-muted">
                  {done
                    ? `Recorded ${formatTime(done.measured_at)}`
                    : passed
                      ? `Not recorded yet (planned ${formatClock(times[i])})`
                      : `Planned ${formatClock(times[i])}`}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <h3 className="mt-5 text-sm font-semibold text-muted">Last 7 days</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[320px] text-center text-sm">
          <caption className="sr-only">Planned blood pressure sessions recorded in the last 7 days</caption>
          <thead>
            <tr>
              <th scope="col" className="py-1 text-left font-medium text-muted">
                Session
              </th>
              {days.map((d) => (
                <th key={d.toISOString()} scope="col" className="py-1 font-medium text-muted">
                  {isSameDay(d, now) ? 'Today' : formatWeekday(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLANNED_SESSIONS.map((s, i) => (
              <tr key={s}>
                <th scope="row" className="py-1 text-left font-medium">
                  {SESSION_LABEL[s]}
                </th>
                {days.map((d) => {
                  const done = byDay.get(toDateInput(d))?.has(s);
                  const [h, m] = times[i].split(':').map(Number);
                  const future = isSameDay(d, now) && nowMin < h * 60 + m;
                  return (
                    <td key={d.toISOString()} className="py-1">
                      {done ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ok-soft text-ok">
                          <Check className="h-4 w-4" aria-hidden />
                          <span className="sr-only">Recorded</span>
                        </span>
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-subtle text-muted">
                          {future ? <Clock className="h-3.5 w-3.5" aria-hidden /> : <Minus className="h-4 w-4" aria-hidden />}
                          <span className="sr-only">{future ? 'Upcoming' : 'Not recorded'}</span>
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
