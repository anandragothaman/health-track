import { useEffect, useState } from 'react';
import { api, errorMessage } from '../services/api';
import { useDataVersion } from '../lib/dataEvents';
import type { BpReading, GlucoseReading } from '../types';

interface ReadingsState {
  bp: BpReading[];
  glucose: GlucoseReading[];
  loading: boolean;
  error: string | null;
}

// Small cache so switching pages/ranges back and forth does not refetch.
// Cleared whenever data changes (see notifyDataChanged).
const cache = new Map<string, { bp: BpReading[]; glucose: GlucoseReading[] }>();
let cacheVersion = -1;

/** Loads both reading types for a member between two dates (newest first). */
export function useReadings(memberId: string | null | undefined, from: Date, to: Date): ReadingsState & { reload(): void } {
  const version = useDataVersion();
  const [nonce, setNonce] = useState(0);
  const key = memberId ? `${memberId}|${from.toISOString()}|${to.toISOString()}` : '';
  const [state, setState] = useState<ReadingsState>(() => {
    const hit = cacheVersion === version ? cache.get(key) : undefined;
    return hit ? { ...hit, loading: false, error: null } : { bp: [], glucose: [], loading: !!memberId, error: null };
  });

  useEffect(() => {
    if (!memberId) {
      setState({ bp: [], glucose: [], loading: false, error: null });
      return;
    }
    if (cacheVersion !== version) {
      cache.clear();
      cacheVersion = version;
    }
    const hit = cache.get(key);
    if (hit && nonce === 0) {
      setState({ ...hit, loading: false, error: null });
      return;
    }
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.all([api.listBp(memberId, from, to), api.listGlucose(memberId, from, to)])
      .then(([bp, glucose]) => {
        cache.set(key, { bp, glucose });
        if (active) setState({ bp, glucose, loading: false, error: null });
      })
      .catch((e) => active && setState((s) => ({ ...s, loading: false, error: errorMessage(e) })));
    return () => {
      active = false;
    };
  }, [key, version, nonce]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}
