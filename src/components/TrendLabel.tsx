import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { Trend } from '../utils/stats';

/** Neutral wording: rising/falling is a direction, not a judgement. */
export function TrendLabel({ trend, detail }: { trend: Trend; detail?: string }) {
  if (trend === 'none') return <span className="text-sm text-muted">Not enough readings for a trend yet</span>;
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const text = trend === 'up' ? 'Rising' : trend === 'down' ? 'Falling' : 'Stable';
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Icon className="h-4 w-4 text-muted" aria-hidden />
      <span className="font-semibold">{text}</span>
      {detail && <span className="text-muted">{detail}</span>}
    </span>
  );
}
