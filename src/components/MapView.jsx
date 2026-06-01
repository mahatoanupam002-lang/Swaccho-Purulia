import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { wardGeoJSON } from '../lib/wards';

const PURULIA_CENTER = [86.365, 23.332];

const CATEGORY_COLOR = {
  garbage: '#137a3f',
  drain: '#1d6ee8',
  water: '#0aa3c2',
  road: '#9a5b00',
  streetlight: '#e8a317',
  other: '#7a4fd6',
};

// Free OpenStreetMap raster style for MapLibre (no API key required).
const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export default function MapView({ complaints, fill = false }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Initialise the map once.
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: PURULIA_CENTER,
      zoom: 13,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right'
    );

    map.on('load', () => {
      map.addSource('wards', { type: 'geojson', data: wardGeoJSON });
      map.addLayer({
        id: 'ward-fill',
        type: 'fill',
        source: 'wards',
        paint: { 'fill-color': '#137a3f', 'fill-opacity': 0.05 },
      });
      map.addLayer({
        id: 'ward-outline',
        type: 'line',
        source: 'wards',
        paint: { 'line-color': '#137a3f', 'line-width': 1, 'line-opacity': 0.4 },
      });
      map.addLayer({
        id: 'ward-label',
        type: 'symbol',
        source: 'wards',
        layout: {
          'text-field': ['get', 'ward_name'],
          'text-size': 11,
        },
        paint: { 'text-color': '#0d5c2f', 'text-halo-color': '#fff', 'text-halo-width': 1.2 },
      });
    });

    mapRef.current = map;
    return () => map.remove();
  }, []);

  // Re-render complaint markers whenever the data changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const c of complaints) {
      if (c.latitude == null || c.longitude == null) continue;
      const el = document.createElement('div');
      const color = CATEGORY_COLOR[c.category] || CATEGORY_COLOR.other;
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);cursor:pointer;`;

      const when = c.created_at ? new Date(c.created_at).toLocaleString() : '';
      const img = c.photo_url
        ? `<img src="${c.photo_url}" alt="issue" />`
        : '';
      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(`
        <strong>${(c.category || 'issue').toUpperCase()}</strong>
        <div>${c.ward_name || 'Unmapped ward'}</div>
        ${c.mla ? `<div style="color:#5d6b63">MLA: ${c.mla}</div>` : ''}
        ${c.note ? `<div style="margin-top:4px">${c.note}</div>` : ''}
        <div style="color:#5d6b63;margin-top:4px">${when}</div>
        ${img}
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([c.longitude, c.latitude])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [complaints]);

  if (fill) {
    return <div ref={containerRef} className="absolute inset-0" />;
  }
  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-stone-200" style={{ height: 520 }}>
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
