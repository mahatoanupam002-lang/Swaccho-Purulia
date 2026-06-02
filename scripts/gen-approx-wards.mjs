#!/usr/bin/env node
/*
 * Generate an APPROXIMATE Purulia ward boundary GeoJSON from the SUDA
 * "Land Use Map of Purulia Municipality" (1:16,000).
 *
 * ⚠️  NOT survey-accurate. The official map is a low-resolution raster with no
 * coordinate graticule, so this cannot be georeferenced precisely. Instead we:
 *   1. read each ward's APPROXIMATE relative position from the map (by eye),
 *   2. anchor them to real coordinates (town centre / Saheb Bandh lake),
 *   3. build a contiguous Voronoi tessellation and clip it to an approximate
 *      (convex) municipal outline.
 * The result has the correct ward count and roughly correct relative layout —
 * good enough to demo ward attribution, but replace it with the official
 * shapefile (via `npm run import-wards`) before any real use.
 *
 *   node scripts/gen-approx-wards.mjs
 */
import fs from 'node:fs';
import { Delaunay } from 'd3-delaunay';

// Anchor + extent (degrees). Town node 23.3292,86.3672; municipality ~5 km wide.
const C = { lng: 86.3672, lat: 23.3300 };
const W = 0.052; // lng span  (~5.0 km)
const H = 0.046; // lat span  (~5.1 km)

// Approximate relative ward positions read off the SUDA map.
// x: 0 (west) → 1 (east);  y: 0 (north) → 1 (south).
const WARD_XY = {
  21: [0.50, 0.08], 2: [0.20, 0.22], 3: [0.40, 0.24], 18: [0.55, 0.28],
  1: [0.12, 0.40], 16: [0.82, 0.34], 20: [0.43, 0.40], 19: [0.55, 0.42],
  4: [0.16, 0.54], 15: [0.40, 0.52], 13: [0.47, 0.50], 14: [0.50, 0.56],
  5: [0.34, 0.63], 10: [0.46, 0.63], 11: [0.72, 0.62], 12: [0.62, 0.74],
  17: [0.50, 0.72], 6: [0.20, 0.72], 7: [0.33, 0.77], 8: [0.43, 0.82],
  9: [0.52, 0.83], 22: [0.66, 0.20], 23: [0.30, 0.66],
};

const NAMES = {
  1: 'Ward 1', 2: 'Ward 2', 3: 'Ward 3', 4: 'Ward 4', 5: 'Ward 5',
  6: 'Ward 6', 7: 'Ward 7', 8: 'Ward 8', 9: 'Ward 9', 10: 'Ward 10',
  11: 'Ward 11', 12: 'Ward 12', 13: 'Ward 13', 14: 'Ward 14', 15: 'Ward 15',
  16: 'Ward 16', 17: 'Ward 17', 18: 'Ward 18', 19: 'Ward 19', 20: 'Ward 20',
  21: 'Ward 21', 22: 'Ward 22', 23: 'Ward 23',
};

const MLA = 'Sudip Kumar Mukherjee';
const MP = 'Jyotirmay Singh Mahato';

const toLngLat = ([x, y]) => [C.lng + (x - 0.5) * W, C.lat + (0.5 - y) * H];

// Approximate convex municipal outline (octagon) around the centre.
const rx = W * 0.52;
const ry = H * 0.52;
const OUTLINE = [
  [-0.55, -0.10], [-0.32, -0.46], [0.10, -0.55], [0.50, -0.40],
  [0.58, 0.02], [0.40, 0.48], [-0.05, 0.56], [-0.45, 0.40],
].map(([dx, dy]) => [C.lng + dx * 2 * rx, C.lat + dy * 2 * ry]);

// Sutherland–Hodgman clip of a polygon against a convex clip polygon (CCW).
function clip(subject, clipPoly) {
  let output = subject;
  for (let i = 0; i < clipPoly.length; i++) {
    const A = clipPoly[i];
    const B = clipPoly[(i + 1) % clipPoly.length];
    const input = output;
    output = [];
    const inside = (p) => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]) >= 0;
    const intersect = (p, q) => {
      const a1 = B[1] - A[1], b1 = A[0] - B[0], c1 = a1 * A[0] + b1 * A[1];
      const a2 = q[1] - p[1], b2 = p[0] - q[0], c2 = a2 * p[0] + b2 * p[1];
      const d = a1 * b2 - a2 * b1;
      return [(b2 * c1 - b1 * c2) / d, (a1 * c2 - a2 * c1) / d];
    };
    for (let j = 0; j < input.length; j++) {
      const cur = input[j];
      const prev = input[(j + input.length - 1) % input.length];
      const curIn = inside(cur);
      const prevIn = inside(prev);
      if (curIn) {
        if (!prevIn) output.push(intersect(prev, cur));
        output.push(cur);
      } else if (prevIn) {
        output.push(intersect(prev, cur));
      }
    }
    if (output.length === 0) break;
  }
  return output;
}

const ids = Object.keys(WARD_XY).map(Number).sort((a, b) => a - b);
const points = ids.map((id) => toLngLat(WARD_XY[id]));

const xs = OUTLINE.map((p) => p[0]);
const ys = OUTLINE.map((p) => p[1]);
const bounds = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];

const delaunay = Delaunay.from(points);
const voronoi = delaunay.voronoi(bounds);

const features = ids.map((id, i) => {
  const cell = voronoi.cellPolygon(i); // [[x,y],...] closed ring
  let ring = clip(cell.slice(0, -1), OUTLINE);
  if (ring.length < 3) ring = cell.slice(0, -1);
  ring = ring.map(([lng, lat]) => [Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
  ring.push(ring[0]); // close
  return {
    type: 'Feature',
    properties: {
      ward_id: id,
      ward_name: NAMES[id],
      municipality: 'Purulia Municipality',
      mla: MLA,
      mp: MP,
      approximate: true,
    },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
});

const fc = {
  type: 'FeatureCollection',
  name: 'purulia_wards_approximate',
  note: 'APPROXIMATE — estimated from the SUDA 1:16,000 land-use map, not survey-accurate. Replace with the official shapefile via `npm run import-wards`.',
  features,
};

fs.writeFileSync('src/data/purulia-wards.json', JSON.stringify(fc, null, 2));
console.log(`Wrote ${features.length} approximate ward polygons.`);
