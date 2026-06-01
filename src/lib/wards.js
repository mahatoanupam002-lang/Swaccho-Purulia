import wardData from '../data/purulia-wards.json';

export const wardFeatures = wardData.features;
export const wardGeoJSON = wardData;

/**
 * Ray-casting point-in-polygon test for a single linear ring.
 * @param {[number, number]} point - [lng, lat]
 * @param {Array<[number, number]>} ring - array of [lng, lat] vertices
 */
function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Point-in-polygon supporting holes (outer ring minus inner rings).
 * @param {[number, number]} point - [lng, lat]
 * @param {Array<Array<[number, number]>>} polygon - GeoJSON Polygon coordinates
 */
function pointInPolygon(point, polygon) {
  if (!pointInRing(point, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(point, polygon[i])) return false; // inside a hole
  }
  return true;
}

/**
 * Identify which Purulia ward a GPS coordinate falls into.
 *
 * This mirrors NammaKasa's "spatial mapping" step: the submitted coordinates
 * are tested against the ward boundary GeoJSON to find the responsible ward,
 * MLA and MP.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {object|null} ward properties, or null if outside all wards
 */
export function findWard(lat, lng) {
  const point = [lng, lat];
  for (const feature of wardFeatures) {
    const { type, coordinates } = feature.geometry;
    if (type === 'Polygon') {
      if (pointInPolygon(point, coordinates)) return feature.properties;
    } else if (type === 'MultiPolygon') {
      for (const poly of coordinates) {
        if (pointInPolygon(point, poly)) return feature.properties;
      }
    }
  }
  return null;
}
