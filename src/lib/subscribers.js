import { supabase, isConfigured } from './supabase';

/**
 * Add a weekly-digest subscriber. Duplicate emails are treated as success
 * (the address is already on the list).
 */
export async function subscribe(email, name) {
  if (!isConfigured) {
    throw new Error('Supabase is not configured.');
  }
  const { error } = await supabase
    .from('subscribers')
    .insert({ email: email.trim().toLowerCase(), name: name?.trim() || null });

  if (error && !/duplicate|unique|already exists/i.test(error.message)) {
    throw new Error(error.message);
  }
}

/** Public subscriber count via the security-definer RPC (emails stay private). */
export async function subscriberCount() {
  if (!isConfigured) return 0;
  const { data, error } = await supabase.rpc('subscriber_count');
  if (error) return 0;
  return Number(data) || 0;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
