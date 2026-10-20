import { useEffect, useState } from 'react';
import { isDarkNow } from '../lib/theme';

/** Tracks the active colour scheme so charts can pick matching colours. */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(isDarkNow);
  useEffect(() => {
    const update = () => setDark(isDarkNow());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    window.addEventListener('ht-theme', update);
    mq.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('ht-theme', update);
      mq.removeEventListener?.('change', update);
    };
  }, []);
  return dark;
}
