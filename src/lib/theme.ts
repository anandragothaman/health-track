import { getItem, setItem } from './storage';

export type ThemePref = 'system' | 'light' | 'dark';
export type TextSize = 'normal' | 'large';

export function getThemePref(): ThemePref {
  const v = getItem('ht-theme');
  return v === 'light' || v === 'dark' ? v : 'system';
}

export function applyTheme(pref: ThemePref) {
  setItem('ht-theme', pref);
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  window.dispatchEvent(new Event('ht-theme'));
}

export function getTextSize(): TextSize {
  return getItem('ht-text') === 'large' ? 'large' : 'normal';
}

export function applyTextSize(size: TextSize) {
  setItem('ht-text', size);
  document.documentElement.classList.toggle('text-large', size === 'large');
}

export const isDarkNow = () => document.documentElement.classList.contains('dark');
