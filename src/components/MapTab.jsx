import { useState } from 'react';
import MapView from './MapView';
import DecorativeMap from './DecorativeMap';
import StatCard from './StatCard';
import WardBar from './WardBar';

// NammaKasa-style Map view: a base map with a stats + worst-wards leaderboard
// sheet overlaid on top. A small toggle switches the base between the real
// interactive "Live map" and the stylized "Overview" bubbles.
export default function MapTab({ complaints, wardStats, totals, maxReports, t }) {
  const [base, setBase] = useState('overview'); // overview | live

  return (
    <div className="px-4">
      <div className="relative rounded-3xl overflow-hidden border border-stone-200" style={{ height: '78vh' }}>
        {/* base map */}
        {base === 'live' ? (
          <MapView complaints={complaints} fill />
        ) : (
          <DecorativeMap wardStats={wardStats} totals={totals} t={t} fill />
        )}

        {/* base toggle */}
        <div className="absolute top-3 right-3 z-20 flex rounded-2xl bg-white/90 backdrop-blur p-1 shadow">
          <button
            onClick={() => setBase('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
              base === 'overview' ? 'bg-stone-900 text-white' : 'text-stone-500'
            }`}
          >
            {t.overview}
          </button>
          <button
            onClick={() => setBase('live')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
              base === 'live' ? 'bg-stone-900 text-white' : 'text-stone-500'
            }`}
          >
            {t.interactive}
          </button>
        </div>

        {/* overlay sheet: stats + leaderboard */}
        <div className="absolute bottom-0 inset-x-0 z-10 bg-white rounded-t-3xl shadow-2xl px-5 pt-3 pb-6 overflow-y-auto" style={{ maxHeight: '62%' }}>
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-200" />
          <div className="flex gap-3 mb-6">
            <StatCard value={totals.unresolved.toLocaleString()} label={t.unresolved} color="text-red-600" bg="bg-red-50" border="border border-red-100" />
            <StatCard value={totals.resolved.toLocaleString()} label={t.resolved} color="text-green-600" bg="bg-green-50" border="border border-green-100" />
            <StatCard value={`${totals.rate}%`} label={t.rate} color="text-stone-800" bg="bg-stone-50" border="border border-stone-100" />
          </div>

          <div className="text-xs font-bold tracking-widest text-stone-400 mb-1">{t.worst}</div>
          {wardStats.filter((w) => w.reports > 0).length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-sm">{t.emptyWards}</div>
          ) : (
            wardStats
              .filter((w) => w.reports > 0)
              .map((w, i) => (
                <WardBar key={w.no} rank={i + 1} ward={w} maxReports={maxReports} t={t} />
              ))
          )}
        </div>
      </div>
    </div>
  );
}
