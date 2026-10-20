import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, errorMessage } from '../services/api';
import { useAuth } from './AuthContext';
import { getItem, setItem } from '../lib/storage';
import { notifyDataChanged } from '../lib/dataEvents';
import type { Family, Member, MemberInput } from '../types';

interface FamilyState {
  family: Family | null;
  members: Member[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  selected: Member | null;
  select(id: string): void;
  reload(): Promise<void>;
  addMember(input: MemberInput): Promise<Member>;
  updateMember(id: string, input: Partial<MemberInput>): Promise<Member>;
  removeMember(id: string): Promise<void>;
  setFamily(f: Family | null): void;
}

const FamilyContext = createContext<FamilyState | null>(null);
const SELECTED_KEY = 'ht-selected-member';

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => getItem(SELECTED_KEY));

  const reload = useCallback(async () => {
    if (!user) {
      setFamily(null);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const f = await api.getMyFamily();
      setFamily(f);
      setMembers(f ? await api.listMembers(f.id) : []);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setItem(SELECTED_KEY, id);
  }, []);

  const selected = members.find((m) => m.id === selectedId) ?? members[0] ?? null;

  const value = useMemo<FamilyState>(
    () => ({
      family,
      members,
      loading,
      error,
      selectedId: selected?.id ?? null,
      selected,
      select,
      reload,
      setFamily,
      async addMember(input) {
        if (!family) throw new Error('No family');
        const m = await api.createMember(family.id, input);
        setMembers((prev) => [...prev, m]);
        return m;
      },
      async updateMember(id, input) {
        const m = await api.updateMember(id, input);
        setMembers((prev) => prev.map((x) => (x.id === id ? m : x)));
        return m;
      },
      async removeMember(id) {
        await api.deleteMember(id);
        setMembers((prev) => prev.filter((x) => x.id !== id));
        notifyDataChanged();
      },
    }),
    [family, members, loading, error, selected, select, reload],
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily(): FamilyState {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily must be used inside FamilyProvider');
  return ctx;
}
