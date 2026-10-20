import { useEffect, useState } from 'react';
import { errorMessage } from '../services/api';

/** Loads an existing reading for edit pages; `id` undefined means "new". */
export function useLoadReading<T extends { member_id: string }>(
  id: string | undefined,
  memberId: string | undefined,
  load: (id: string) => Promise<T | null>,
) {
  const [reading, setReading] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    load(id)
      .then((r) => {
        if (!active) return;
        if (!r || r.member_id !== memberId) setError('This reading could not be found.');
        else setReading(r);
      })
      .catch((e) => active && setError(errorMessage(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, memberId, load]);

  return { reading, loading, error };
}
