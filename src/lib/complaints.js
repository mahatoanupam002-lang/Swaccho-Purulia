import { supabase, BUCKET, isConfigured } from './supabase';
import { findWard } from './wards';

const TABLE = 'complaints';

/**
 * Upload a photo to Supabase Storage and return its public URL.
 */
async function uploadPhoto(file) {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });

  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Anonymous submission flow:
 *  1. upload image to Storage
 *  2. resolve ward / MLA / MP from GPS coordinates
 *  3. insert the mapped complaint row
 *
 * @param {{ file: File, lat: number, lng: number, category?: string, note?: string }} input
 */
export async function submitComplaint({ file, lat, lng, category, note }) {
  if (!isConfigured) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_* env vars.');
  }

  const photoUrl = file ? await uploadPhoto(file) : null;
  const ward = findWard(lat, lng);

  const row = {
    photo_url: photoUrl,
    latitude: lat,
    longitude: lng,
    category: category || 'garbage',
    note: note || null,
    ward_id: ward?.ward_id ?? null,
    ward_name: ward?.ward_name ?? null,
    mla: ward?.mla ?? null,
    mp: ward?.mp ?? null,
    status: 'reported',
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`Could not save complaint: ${error.message}`);
  return data;
}

/**
 * Fetch the most recent complaints for the public accountability map.
 */
export async function fetchComplaints({ limit = 500 } = {}) {
  if (!isConfigured) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Could not load complaints: ${error.message}`);
  return data || [];
}

/**
 * Aggregate complaints into a per-ward leaderboard (most reported first).
 */
export function buildLeaderboard(complaints) {
  const byWard = new Map();
  for (const c of complaints) {
    const key = c.ward_id ?? 'unmapped';
    const entry = byWard.get(key) || {
      ward_id: c.ward_id,
      ward_name: c.ward_name || 'Unmapped',
      mla: c.mla,
      mp: c.mp,
      total: 0,
      open: 0,
      resolved: 0,
    };
    entry.total += 1;
    if (c.status === 'resolved') entry.resolved += 1;
    else entry.open += 1;
    byWard.set(key, entry);
  }
  return [...byWard.values()].sort((a, b) => b.total - a.total);
}
