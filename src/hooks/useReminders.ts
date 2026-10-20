import { useEffect, useMemo, useRef, useState } from 'react';
import type { BpReading, BpSession, Member } from '../types';
import { PLANNED_SESSIONS, SESSION_LABEL } from '../utils/bp';
import { formatClock, isSameDay, toDateInput } from '../utils/date';

export interface DueReminder {
  key: string;
  session: BpSession;
  time: string;
  message: string;
}

const DISMISS_KEY = 'ht-dismissed-reminders';

function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(DISMISS_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * In-app reminders: a planned session is "due" once its reminder time has passed
 * today and no reading has been recorded for it. Works only while the app is open.
 * If the browser has granted notification permission, a system notification is shown once.
 */
export function useReminders(member: Member | null, todayBp: BpReading[], now: Date) {
  const [dismissed, setDismissed] = useState(loadDismissed);
  const notified = useRef(new Set<string>());

  const due = useMemo<DueReminder[]>(() => {
    if (!member || !member.settings.remindersEnabled) return [];
    const done = new Set(todayBp.filter((r) => isSameDay(new Date(r.measured_at), now)).map((r) => r.session));
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const day = toDateInput(now);
    return PLANNED_SESSIONS.flatMap((session, i) => {
      const time = member.settings.reminderTimes[i];
      const key = `${member.id}|${day}|${session}`;
      if (done.has(session) || nowMin < minutesOf(time) || dismissed.has(key)) return [];
      return [{
        key,
        session,
        time,
        message: `${SESSION_LABEL[session]} blood pressure reading for ${member.full_name} (planned ${formatClock(time)}) has not been recorded yet.`,
      }];
    });
  }, [member, todayBp, now, dismissed]);

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    for (const r of due) {
      if (notified.current.has(r.key)) continue;
      notified.current.add(r.key);
      try {
        new Notification('Blood pressure reminder', { body: r.message, tag: r.key });
      } catch {
        /* some mobile browsers only allow notifications from a service worker */
      }
    }
  }, [due]);

  const dismiss = (key: string) => {
    setDismissed((prev) => {
      const next = new Set(prev).add(key);
      try {
        sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return { due, dismiss };
}
