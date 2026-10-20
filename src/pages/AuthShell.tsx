import type { ReactNode } from 'react';
import { Activity } from 'lucide-react';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 rounded-2xl bg-accent p-3 text-white dark:text-canvas">
            <Activity className="h-8 w-8" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        </div>
        <div className="card">{children}</div>
        <p className="mt-6 text-center text-sm text-muted">
          A private family tool for recording blood pressure and blood sugar. Not a medical device.
        </p>
      </div>
    </main>
  );
}
