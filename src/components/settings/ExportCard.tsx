import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Printer } from 'lucide-react';
import { api, errorMessage } from '../../services/api';
import type { Member } from '../../types';
import { bpCsv, combinedCsv, downloadCsv, glucoseCsv, safeFileName } from '../../utils/csv';
import { toDateInput } from '../../utils/date';
import { ErrorBox } from '../ui';

type Kind = 'bp' | 'glucose' | 'all';

export function ExportCard({ member }: { member: Member }) {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: Kind) => {
    setBusy(kind);
    setError(null);
    try {
      const from = new Date(2000, 0, 1);
      const to = new Date(Date.now() + 86_400_000);
      const unit = member.settings.glucoseUnit;
      const name = `${safeFileName(member.full_name)}-${toDateInput(new Date())}`;
      if (kind === 'bp') downloadCsv(`${name}-blood-pressure.csv`, bpCsv(await api.listBp(member.id, from, to)));
      else if (kind === 'glucose') downloadCsv(`${name}-blood-glucose.csv`, glucoseCsv(await api.listGlucose(member.id, from, to), unit));
      else {
        const [bp, g] = await Promise.all([api.listBp(member.id, from, to), api.listGlucose(member.id, from, to)]);
        downloadCsv(`${name}-all-readings.csv`, combinedCsv(bp, g, unit));
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="card space-y-4" aria-labelledby="export-title">
      <div>
        <h2 id="export-title" className="text-lg font-bold">
          Export {member.full_name}'s readings
        </h2>
        <p className="text-sm text-muted">CSV files open in Excel, Numbers or Google Sheets. All dates are included.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" className="btn-secondary" disabled={!!busy} onClick={() => void run('bp')}>
          <Download className="h-5 w-5" aria-hidden /> {busy === 'bp' ? 'Preparing…' : 'Blood pressure CSV'}
        </button>
        <button type="button" className="btn-secondary" disabled={!!busy} onClick={() => void run('glucose')}>
          <Download className="h-5 w-5" aria-hidden /> {busy === 'glucose' ? 'Preparing…' : 'Blood sugar CSV'}
        </button>
        <button type="button" className="btn-secondary" disabled={!!busy} onClick={() => void run('all')}>
          <Download className="h-5 w-5" aria-hidden /> {busy === 'all' ? 'Preparing…' : 'All readings (one file)'}
        </button>
        <Link to={`/member/${member.id}/report`} className="btn-secondary">
          <Printer className="h-5 w-5" aria-hidden /> Printable report / PDF
        </Link>
      </div>
      {error && <ErrorBox message={error} />}
    </section>
  );
}
