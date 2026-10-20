import { useFamily } from '../contexts/FamilyContext';
import { isDemo } from '../lib/supabase';
import { resetDemoData } from '../services/demoApi';
import { MemberSwitcher } from '../components/MemberSwitcher';
import { MemberSettingsCard } from '../components/settings/MemberSettingsCard';
import { ExportCard } from '../components/settings/ExportCard';
import { FamilyAccessCard } from '../components/settings/FamilyAccessCard';
import { AppearanceCard } from '../components/settings/AppearanceCard';
import { EmptyState, PageHeader } from '../components/ui';
import { Disclaimer } from '../components/Disclaimer';

export default function SettingsPage() {
  const { selected } = useFamily();
  return (
    <>
      <PageHeader title="Settings & export" subtitle="Per-person targets, reminders, exports and family access." />
      <MemberSwitcher />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          {selected ? (
            <>
              <MemberSettingsCard key={selected.id} member={selected} />
              <ExportCard member={selected} />
            </>
          ) : (
            <EmptyState title="Add a family member first">Settings and exports are per person.</EmptyState>
          )}
        </div>
        <div className="space-y-5">
          <AppearanceCard />
          <FamilyAccessCard />
          {isDemo && (
            <section className="card space-y-2">
              <h2 className="text-lg font-bold">Demo data</h2>
              <p className="text-sm text-muted">Restore the original sample family and readings in this browser.</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  resetDemoData();
                  window.location.reload();
                }}
              >
                Reset demo data
              </button>
            </section>
          )}
          <Disclaimer />
        </div>
      </div>
    </>
  );
}
