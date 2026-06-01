import { wardFeatures } from './wards';

// Severity bucket derived from the number of unresolved reports in a ward.
// Placeholder thresholds — tune for Purulia's real report volumes.
export function severityOf(unresolved) {
  if (unresolved >= 50) return 'critical';
  if (unresolved >= 25) return 'severe';
  if (unresolved >= 10) return 'moderate';
  return 'minor';
}

export const SEV_RANK = { critical: 4, severe: 3, moderate: 2, minor: 1 };

/**
 * Aggregate live complaints into per-ward stat rows, enriched with ward
 * metadata from the GeoJSON. Sorted by total reports (worst first).
 *
 * @param {Array} complaints
 * @param {{ includeEmpty?: boolean }} [opts] include wards with zero reports
 */
export function buildWardStats(complaints, { includeEmpty = false } = {}) {
  const byId = new Map();

  // Seed every known ward so metadata (name, zone, councillor) is available.
  for (const f of wardFeatures) {
    const p = f.properties;
    byId.set(p.ward_id, {
      no: p.ward_id,
      name: p.ward_name,
      zone: p.zone || '',
      councillor: p.mla || '—',
      reports: 0,
      unresolved: 0,
      resolved: 0,
    });
  }

  for (const c of complaints) {
    const id = c.ward_id ?? 'unmapped';
    let row = byId.get(id);
    if (!row) {
      row = {
        no: c.ward_id ?? '—',
        name: c.ward_name || 'Unmapped',
        zone: '',
        councillor: c.mla || '—',
        reports: 0,
        unresolved: 0,
        resolved: 0,
      };
      byId.set(id, row);
    }
    row.reports += 1;
    if (c.status === 'resolved') row.resolved += 1;
    else row.unresolved += 1;
  }

  let rows = [...byId.values()];
  if (!includeEmpty) rows = rows.filter((r) => r.reports > 0);

  for (const r of rows) {
    r.resolvedPct = r.reports ? Math.round((r.resolved / r.reports) * 100) : 0;
    r.sev = severityOf(r.unresolved);
  }

  // Most reports first; ties broken by ward number for a stable directory order.
  rows.sort((a, b) => b.reports - a.reports || (a.no || 0) - (b.no || 0));
  return rows;
}

/** Overall totals across all complaints. */
export function totals(complaints) {
  let unresolved = 0;
  let resolved = 0;
  for (const c of complaints) {
    if (c.status === 'resolved') resolved += 1;
    else unresolved += 1;
  }
  const total = unresolved + resolved;
  const rate = total ? ((resolved / total) * 100).toFixed(1) : '0.0';
  return { unresolved, resolved, total, rate };
}
