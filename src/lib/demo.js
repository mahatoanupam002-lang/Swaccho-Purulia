import { wardFeatures } from './wards';

// Sample complaints for previewing a populated UI without a live backend.
// Activated only via the `?demo=1` URL param — never used in normal operation.

function centroid(feature) {
  const ring = feature.geometry.coordinates[0];
  let x = 0;
  let y = 0;
  for (const [lng, lat] of ring) {
    x += lng;
    y += lat;
  }
  return { lng: x / ring.length, lat: y / ring.length };
}

const CATEGORIES = ['garbage', 'drain', 'water', 'road', 'streetlight', 'other'];

export function demoComplaints() {
  const out = [];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  wardFeatures.forEach((f, i) => {
    const p = f.properties;
    const c = centroid(f);
    // Decreasing report counts so the leaderboard has a clear ranking.
    const count = Math.max(0, 14 - i + Math.floor(rnd() * 4));
    for (let n = 0; n < count; n++) {
      const resolved = rnd() < 0.18;
      out.push({
        id: `demo-${p.ward_id}-${n}`,
        created_at: new Date(Date.now() - n * 36e5).toISOString(),
        latitude: c.lat + (rnd() - 0.5) * 0.004,
        longitude: c.lng + (rnd() - 0.5) * 0.004,
        category: CATEGORIES[Math.floor(rnd() * CATEGORIES.length)],
        note: null,
        ward_id: p.ward_id,
        ward_name: p.ward_name,
        mla: p.mla,
        mp: p.mp,
        status: resolved ? 'resolved' : 'reported',
      });
    }
  });
  return out;
}

export const isDemo = () =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('demo');
