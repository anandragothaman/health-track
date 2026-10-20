import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Without Supabase settings the app runs in a local, browser-only demo mode. */
export const isDemo = !url || !anonKey;

export const supabase: SupabaseClient | null = isDemo
  ? null
  : createClient(url!, anonKey!, {
      auth: {
        // PKCE returns "?code=" instead of "#access_token=", which works with HashRouter.
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

/** Absolute URL of the app root (used for email confirmation / password reset links). */
export function appUrl(): string {
  return window.location.origin + import.meta.env.BASE_URL;
}
