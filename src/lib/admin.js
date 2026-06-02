import { supabase, isConfigured } from './supabase';

/** Current auth session (or null). */
export async function getSession() {
  if (!isConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Subscribe to auth state changes. Returns an unsubscribe function. */
export function onAuthChange(cb) {
  if (!isConfigured) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/** Send a magic-link sign-in email, returning the user to the admin panel. */
export async function signInWithEmail(email) {
  if (!isConfigured) throw new Error('Supabase is not configured.');
  const redirect = `${window.location.origin}${window.location.pathname}?admin=1`;
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: redirect },
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  if (isConfigured) await supabase.auth.signOut();
}

/** Whether the signed-in user is on the admin allowlist. */
export async function checkIsAdmin() {
  if (!isConfigured) return false;
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return Boolean(data);
}

/** Update a complaint's status (admin only — enforced by RLS). */
export async function updateComplaintStatus(id, status) {
  if (!isConfigured) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase
    .from('complaints')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export const isAdminRoute = () =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('admin');
