import { useEffect, useRef, useState } from 'react';
import { submitComplaint } from '../lib/complaints';
import { findWard } from '../lib/wards';
import { isConfigured } from '../lib/supabase';

const CATEGORIES = [
  { value: 'garbage', label: '🗑️ Garbage / dumping' },
  { value: 'drain', label: '🌊 Blocked drain / sewage' },
  { value: 'water', label: '💧 Water logging' },
  { value: 'road', label: '🛣️ Road / pothole' },
  { value: 'streetlight', label: '💡 Street light' },
  { value: 'other', label: '📌 Other civic issue' },
];

export default function ReportForm({ onSubmitted }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [coords, setCoords] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [category, setCategory] = useState('garbage');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const objectUrl = useRef(null);

  // Grab live GPS as soon as the form mounts (NammaKasa-style auto-capture).
  useEffect(() => {
    requestLocation();
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  function requestLocation() {
    setGpsError(null);
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setGpsError(err.message || 'Could not read location.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(f);
    setFile(f);
    setPreview(objectUrl.current);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setToast(null);
    if (!coords) {
      setToast({ kind: 'err', msg: 'Location not available yet — tap "Use my location".' });
      return;
    }
    setBusy(true);
    try {
      const saved = await submitComplaint({
        file,
        lat: coords.lat,
        lng: coords.lng,
        category,
        note,
      });
      setToast({
        kind: 'ok',
        msg: saved.ward_name
          ? `Reported in ${saved.ward_name}. Thank you!`
          : 'Report submitted. (Outside mapped wards.)',
      });
      // reset
      setFile(null);
      setPreview(null);
      setNote('');
      onSubmitted?.(saved);
    } catch (err) {
      setToast({ kind: 'err', msg: err.message });
    } finally {
      setBusy(false);
    }
  }

  const ward = coords ? findWard(coords.lat, coords.lng) : null;

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2 className="section">Report a civic issue</h2>

      {!isConfigured && (
        <div className="banner">
          Supabase isn't configured yet. Copy <code>.env.example</code> to{' '}
          <code>.env.local</code> and add your project URL & anon key to enable
          submissions.
        </div>
      )}

      <label htmlFor="photo">Photo</label>
      <input
        id="photo"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
      />
      {preview && <img className="preview" src={preview} alt="Selected issue" />}

      <label htmlFor="category">Issue type</label>
      <select
        id="category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <label htmlFor="note">Note (optional)</label>
      <textarea
        id="note"
        value={note}
        placeholder="Landmark, how long it's been there, etc."
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="gps">
        {coords ? (
          <span>
            📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            {ward ? ` · ${ward.ward_name}` : ' · outside mapped wards'}
          </span>
        ) : gpsError ? (
          <span style={{ color: 'var(--red)' }}>⚠️ {gpsError}</span>
        ) : (
          <span>Locating…</span>
        )}
      </div>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ marginTop: 8 }}
        onClick={requestLocation}
      >
        Use my location
      </button>

      <button
        className="btn btn-primary"
        style={{ marginTop: 10 }}
        type="submit"
        disabled={busy || !isConfigured}
      >
        {busy ? 'Submitting…' : 'Submit report'}
      </button>

      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}
    </form>
  );
}
