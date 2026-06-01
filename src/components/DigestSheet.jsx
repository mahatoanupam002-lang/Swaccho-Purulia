import { useEffect, useState } from 'react';
import { subscribe, subscriberCount, isValidEmail } from '../lib/subscribers';
import { isConfigured } from '../lib/supabase';

export default function DigestSheet({ lang, t, onClose }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [count, setCount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const bn = lang === 'bn';
  const fontClass = bn ? 'font-bengali' : 'font-display';

  useEffect(() => {
    subscriberCount().then(setCount).catch(() => setCount(null));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError(t.invalidEmail);
      return;
    }
    setBusy(true);
    try {
      await subscribe(email, name);
      setDone(true);
      setTimeout(() => onClose?.(), 1400);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={() => onClose?.()} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl px-6 pt-4 pb-10 max-h-[92vh] overflow-y-auto">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-200" />
        <div className="flex items-center justify-between mb-2">
          <span className={`text-2xl font-bold text-stone-900 ${fontClass}`}>{t.digestTitle}</span>
          <button onClick={() => onClose?.()} className="text-stone-400 text-xl">✕</button>
        </div>
        <div className="h-px bg-stone-100 -mx-6 mb-6" />

        <p className="text-stone-600 leading-relaxed mb-6">{t.digestBody}</p>

        <div className="flex flex-wrap gap-2 mb-5">
          {t.digestChips.map((c) => (
            <span
              key={c}
              className="px-4 py-2 rounded-2xl bg-stone-100 text-stone-700 text-sm font-medium"
            >
              {c}
            </span>
          ))}
        </div>

        {count != null && count > 0 && (
          <div className="flex items-center gap-2 mb-6 text-stone-600">
            <span className="text-green-500 text-lg leading-none">●</span>
            <span>
              <b>{count.toLocaleString()}</b> {t.digestSubscribers}
            </span>
          </div>
        )}

        {done ? (
          <div className="rounded-2xl bg-green-50 text-green-700 px-4 py-4 text-center font-semibold">
            {t.subscribed}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-xs font-bold tracking-widest text-stone-500 mb-2">
              {t.emailLabel}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-full px-5 py-4 rounded-2xl border border-stone-300 mb-5 focus:outline-none focus:border-red-400"
            />

            <label className="block text-xs font-bold tracking-widest text-stone-500 mb-2">
              {t.nameLabel} <span className="text-stone-300">{t.nameOptional}</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full px-5 py-4 rounded-2xl border border-stone-300 mb-5 focus:outline-none focus:border-red-400"
            />

            <button
              type="submit"
              disabled={busy || !isConfigured}
              className={`w-full rounded-2xl py-4 text-white text-lg font-bold transition disabled:opacity-50 ${
                isConfigured ? 'bg-red-600 active:scale-[0.98]' : 'bg-stone-400'
              }`}
            >
              {busy ? t.subscribing : t.subscribe}
            </button>

            {!isConfigured && (
              <p className="mt-3 text-sm text-amber-600 text-center">{t.notConfigured}</p>
            )}
            {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}

            <p className="mt-4 text-center text-sm text-stone-400">{t.digestFinePrint}</p>
          </form>
        )}
      </div>
    </div>
  );
}
