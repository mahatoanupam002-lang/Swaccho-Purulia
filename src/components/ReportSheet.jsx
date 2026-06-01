import { useEffect, useRef, useState } from 'react';
import { submitComplaint } from '../lib/complaints';
import { findWard } from '../lib/wards';
import { isConfigured } from '../lib/supabase';
import { CATEGORIES } from '../lib/i18n';

export default function ReportSheet({ lang, t, onClose, onSubmitted }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [coords, setCoords] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [category, setCategory] = useState('garbage');
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | optimizing | submitting
  const [toast, setToast] = useState(null);
  const objectUrl = useRef(null);
  const bn = lang === 'bn';
  const fontClass = bn ? 'font-bengali' : 'font-display';

  useEffect(() => {
    requestLocation();
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  function requestLocation() {
    setGpsError(null);
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation not supported on this device.');
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
      setToast({ kind: 'err', msg: t.locating });
      return;
    }
    try {
      setPhase(file ? 'optimizing' : 'submitting');
      // brief tick so the "optimizing" label is visible for large photos
      if (file) setTimeout(() => setPhase('submitting'), 250);
      const saved = await submitComplaint({ file, lat: coords.lat, lng: coords.lng, category, note });
      onSubmitted?.(saved);
      setToast({
        kind: 'ok',
        msg: saved.ward_name
          ? `${t.successIn} ${saved.ward_name}. ${t.thanks}`
          : `${t.thanks} (${t.outsideWards})`,
      });
      setTimeout(() => onClose?.(), 1300);
    } catch (err) {
      setToast({ kind: 'err', msg: err.message });
    } finally {
      setPhase('idle');
    }
  }

  const ward = coords ? findWard(coords.lat, coords.lng) : null;
  const locating = !coords && !gpsError;
  const outOfBounds = coords && !ward;
  const busy = phase !== 'idle';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={() => !busy && onClose?.()} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl px-6 pt-5 pb-10 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-2xl font-bold text-stone-900 ${fontClass}`}>{t.report}</span>
          <button onClick={() => onClose?.()} className="text-stone-400 text-xl">✕</button>
        </div>
        <div className="h-px bg-stone-100 -mx-6 mb-6" />

        {!isConfigured && (
          <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
            {t.notConfigured}
          </div>
        )}

        {locating && (
          <div className="py-10 text-center text-stone-400">{t.locating}</div>
        )}

        {outOfBounds && (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-3xl text-amber-500 mb-5">
              ⊘
            </div>
            <h3 className={`text-xl font-bold text-stone-900 mb-3 ${fontClass}`}>{t.oobTitle}</h3>
            <p className="text-stone-500 leading-relaxed mb-4">{t.oobBody}</p>
            <p className="text-sm text-stone-400 mb-7">{t.oobNote}</p>
            <button
              onClick={() => onClose?.()}
              className="px-10 py-4 rounded-2xl bg-stone-100 text-stone-700 font-semibold"
            >
              {t.gotit}
            </button>
          </div>
        )}

        {!locating && !outOfBounds && (
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-stone-500 mb-2">{t.photo}</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFile}
              className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-stone-100 file:text-stone-700"
            />
            {preview && (
              <img src={preview} alt="" className="mt-3 w-full rounded-2xl max-h-56 object-cover" />
            )}

            <label className="block text-sm font-semibold text-stone-500 mt-5 mb-2">{t.issueType}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`w-full px-4 py-3 rounded-2xl border border-stone-200 bg-white ${bn ? 'font-bengali' : ''}`}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {bn ? c.bn : c.en}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-stone-500 mt-5 mb-2">{t.note}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePlaceholder}
              className="w-full px-4 py-3 rounded-2xl border border-stone-200 min-h-[64px] resize-y"
            />

            <div className="mt-4 text-sm text-stone-500 font-mono">
              📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · {ward.ward_name}
            </div>

            <button
              type="submit"
              disabled={busy || !isConfigured}
              className="mt-5 w-full rounded-3xl bg-red-600 text-white text-lg font-bold py-4 shadow-lg active:scale-[0.98] transition disabled:opacity-50"
            >
              {phase === 'optimizing' ? t.optimizing : phase === 'submitting' ? t.submitting : t.submit}
            </button>

            {toast && (
              <div
                className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                  toast.kind === 'ok'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {toast.msg}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
