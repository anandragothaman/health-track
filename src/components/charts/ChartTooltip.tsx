import type { ReactNode } from 'react';

export function TooltipBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink shadow-lg">
      <p className="mb-1 font-semibold">{title}</p>
      {children}
    </div>
  );
}

export function TooltipRow({ color, dashed, label, value }: { color?: string; dashed?: boolean; label: string; value: string }) {
  return (
    <p className="flex items-center gap-2">
      {color && (
        <span
          aria-hidden
          className="inline-block h-0 w-4 border-t-2"
          style={{ borderColor: color, borderStyle: dashed ? 'dashed' : 'solid' }}
        />
      )}
      <span className="text-muted">{label}</span>
      <span className="ml-auto pl-3 font-semibold tabular-nums">{value}</span>
    </p>
  );
}

/** HTML legend so the text uses ink colours and line styles are visible. */
export function LegendItem({ color, dashed, label }: { color: string; dashed?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span
        aria-hidden
        className="inline-block h-0 w-6 border-t-[3px]"
        style={{ borderColor: color, borderStyle: dashed ? 'dashed' : 'solid' }}
      />
      {label}
    </span>
  );
}
