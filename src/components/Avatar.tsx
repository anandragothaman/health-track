import { AVATAR_COLORS } from '../utils/settings';

export function initials(name: string): string {
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function Avatar({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'h-8 w-8 text-sm' : size === 'lg' ? 'h-14 w-14 text-xl' : 'h-11 w-11 text-base';
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${dims} ${
        AVATAR_COLORS[color] ?? AVATAR_COLORS.teal
      }`}
    >
      {initials(name)}
    </span>
  );
}
