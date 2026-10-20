import { AlertTriangle, ArrowDown, CheckCircle2, ChevronsUp, ArrowUp } from 'lucide-react';

export type Tone = 'info' | 'ok' | 'warn' | 'high' | 'crit';

const STYLES: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok border-ok/30',
  info: 'bg-info-soft text-info border-info/30',
  warn: 'bg-warn-soft text-warn border-warn/30',
  high: 'bg-high-soft text-high border-high/30',
  crit: 'bg-crit-soft text-crit border-crit/30',
};

const ICONS: Record<Tone, typeof CheckCircle2> = {
  ok: CheckCircle2,
  info: ArrowDown,
  warn: ArrowUp,
  high: ChevronsUp,
  crit: AlertTriangle,
};

/** Status is always shown with an icon and text, never colour alone. */
export function StatusBadge({ tone, label }: { tone: Tone; label: string }) {
  const Icon = ICONS[tone];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm font-semibold ${STYLES[tone]}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
