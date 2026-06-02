import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'complaint-photos';

// When env vars are missing we still want the app to render (e.g. for a quick
// UI preview) instead of crashing on import. `isConfigured` lets the UI show a
// friendly setup banner and fall back gracefully.
export const isConfigured = Boolean(url && anonKey);

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      // Sessions persist so the admin magic-link sign-in survives the redirect.
      // Anonymous reporting is unaffected — it just uses the anon role.
      auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true },
    })
  : null;
