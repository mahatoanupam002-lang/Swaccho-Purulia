#!/usr/bin/env node
/*
 * Import real Purulia ward boundaries into the app's expected GeoJSON shape.
 *
 * OpenStreetMap has no ward-level boundaries for Purulia, so the live data must
 * come from an official source (SUDA / WBSAC, or a digitised SUDA ward map).
 * Get that as GeoJSON (QGIS, ogr2ogr or mapshaper can convert SHP/KML → GeoJSON),
 * then run this to normalise the properties and write src/data/purulia-wards.json.
 *
 * Usage:
 *   node scripts/import-wards.mjs <input.geojson> [options]
 *
 * Options:
 *   --id-prop=<key>        source property holding the ward number   (default: tries ward_id, ward_no, WARD_NO, no)
 *   --name-prop=<key>      source property holding the ward name      (default: tries ward_name, name, WARD_NAME)
 *   --zone-prop=<key>      source property holding the zone label     (optional)
 *   --councillors=<csv>    CSV "ward,councillor[,mla,mp]" to fill officials per ward (optional)
 *   --municipality=<name>  default "Purulia Municipality"
 *   --out=<path>           output file (default: src/data/purulia-wards.json)
 *
 * Example:
 *   node scripts/import-wards.mjs suda-wards.geojson \
 *     --id-prop=WARD_NO --name-prop=WARD_NAME --councillors=councillors.csv
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--'));
const opt = Object.fromEntries(
  args.filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=')];
  })
);

if (!input) {
  console.error('Usage: node scripts/import-wards.mjs <input.geojson> [options]');
  process.exit(1);
}

const OUT = opt.out || 'src/data/purulia-wards.json';
const MUNI = opt.municipality || 'Purulia Municipality';
const ID_KEYS = opt['id-prop'] ? [opt['id-prop']] : ['ward_id', 'ward_no', 'WARD_NO', 'WARDNO', 'no', 'NO'];
const NAME_KEYS = opt['name-prop'] ? [opt['name-prop']] : ['ward_name', 'name', 'WARD_NAME', 'NAME', 'WARDNAME'];
const ZONE_KEYS = opt['zone-prop'] ? [opt['zone-prop']] : ['zone', 'ZONE'];

// Optional councillor table keyed by ward number.
const officials = new Map();
if (opt.councillors) {
  const lines = fs.readFileSync(opt.councillors, 'utf8').trim().split(/\r?\n/);
  // Skip a header row if the first cell isn't numeric.
  const start = /^\d/.test(lines[0].split(',')[0].trim()) ? 0 : 1;
  for (const line of lines.slice(start)) {
    const [ward, councillor, mla, mp] = line.split(',').map((s) => s?.trim());
    officials.set(String(ward), { councillor, mla, mp });
  }
}

const pick = (props, keys) => {
  for (const k of keys) if (props[k] != null && props[k] !== '') return props[k];
  return undefined;
};

const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
const features = (raw.type === 'FeatureCollection' ? raw.features : [raw]).filter(
  (f) => f?.geometry && /Polygon$/.test(f.geometry.type)
);

if (features.length === 0) {
  console.error('No Polygon/MultiPolygon features found in', input);
  process.exit(1);
}

let missing = 0;
const out = features.map((f, i) => {
  const p = f.properties || {};
  const wardId = Number(pick(p, ID_KEYS) ?? i + 1);
  const name = pick(p, NAME_KEYS) ?? `Ward ${wardId}`;
  const zone = pick(p, ZONE_KEYS) ?? '';
  const off = officials.get(String(wardId)) || {};
  if (!off.councillor && !off.mla) missing++;
  return {
    type: 'Feature',
    properties: {
      ward_id: wardId,
      ward_name: String(name),
      zone: String(zone),
      municipality: MUNI,
      mla: off.mla || off.councillor || null,
      mp: off.mp || null,
    },
    geometry: f.geometry,
  };
});

out.sort((a, b) => a.properties.ward_id - b.properties.ward_id);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ type: 'FeatureCollection', name: 'purulia_wards', features: out }, null, 2));

console.log(`Wrote ${out.length} ward polygons → ${OUT}`);
if (missing) console.log(`Note: ${missing} ward(s) have no councillor/MLA (pass --councillors=<csv> to fill).`);
console.log('Next: verify report → ward mapping with `npm run dev` and a test report.');
