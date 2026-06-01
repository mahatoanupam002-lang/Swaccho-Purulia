import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchComplaints, subscribeToComplaints } from './lib/complaints';
import { isConfigured } from './lib/supabase';
import { buildWardStats, totals as computeTotals } from './lib/wardStats';
import { STR } from './lib/i18n';
import Dropdown from './components/Dropdown';
import StatCard from './components/StatCard';
import WardBar from './components/WardBar';
import DecorativeMap from './components/DecorativeMap';
import MapView from './components/MapView';
import ReportSheet from './components/ReportSheet';

const SEV_KEYS = ['minor', 'moderate', 'severe', 'critical'];

export default function App() {
  const [lang, setLang] = useState('en');
  const [view, setView] = useState('list'); // list | map
  const [mapMode, setMapMode] = useState('overview'); // overview | interactive
  const [sevIdx, setSevIdx] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [showBanner, setShowBanner] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [live, setLive] = useState(false);

  const t = STR[lang];
  const bn = lang === 'bn';

  const mergeComplaint = useCallback((row) => {
    if (!row?.id) return;
    setComplaints((prev) => {
      const idx = prev.findIndex((c) => c.id === row.id);
      if (idx === -1) return [row, ...prev];
      const next = prev.slice();
      next[idx] = { ...next[idx], ...row };
      return next;
    });
  }, []);

  useEffect(() => {
    fetchComplaints().then(setComplaints).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isConfigured) return undefined;
    return subscribeToComplaints({
      onInsert: (row) => {
        mergeComplaint(row);
        setLive(true);
      },
      onUpdate: mergeComplaint,
    });
  }, [mergeComplaint]);

  const totals = useMemo(() => computeTotals(complaints), [complaints]);
  const wardStats = useMemo(() => buildWardStats(complaints), [complaints]);

  const filtered = useMemo(() => {
    let rows = wardStats;
    if (sevIdx > 0) rows = rows.filter((r) => r.sev === SEV_KEYS[sevIdx - 1]);
    if (statusIdx === 1) rows = rows.filter((r) => r.unresolved > 0);
    if (statusIdx === 2) rows = rows.filter((r) => r.resolved > 0);
    return rows;
  }, [wardStats, sevIdx, statusIdx]);

  const maxReports = useMemo(
    () => wardStats.reduce((m, w) => Math.max(m, w.reports), 0),
    [wardStats]
  );

  return (
    <div className="min-h-screen w-full flex justify-center bg-stone-50 font-body">
      <div className={`w-full max-w-md bg-white min-h-screen relative pb-28 ${bn ? 'font-bengali' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-8 pb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight font-display">
              <span className="text-stone-900">Swaccho</span>
              <span className="text-red-600"> পুরুলিয়া</span>
            </span>
            <span className="text-xs text-stone-300 font-mono">v1.0.0</span>
          </div>
          <div className="flex items-center gap-3">
            {live && (
              <span className="text-green-600 text-xs font-bold" title="Live updates">
                ● {t.live}
              </span>
            )}
            <button
              onClick={() => setLang(bn ? 'en' : 'bn')}
              className={`px-4 py-2 rounded-2xl bg-white border border-stone-200 text-sm font-semibold shadow-sm ${
                bn ? 'font-body' : 'font-bengali'
              }`}
            >
              {bn ? 'English' : 'বাংলা'}
            </button>
          </div>
        </div>

        {/* Banner */}
        {showBanner && (
          <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
            <span className="text-red-500">✉</span>
            <span className="text-sm text-stone-600 flex-1">
              <b className="text-red-600">{t.tagline}</b>
            </span>
            <button onClick={() => setShowBanner(false)} className="text-stone-300 text-lg">
              ✕
            </button>
          </div>
        )}

        {/* Filters + view toggle */}
        <div className="flex items-center gap-3 px-4 mb-5">
          <Dropdown
            options={t.sevOpts}
            value={t.sevOpts[sevIdx]}
            onChange={(v) => setSevIdx(Math.max(0, t.sevOpts.indexOf(v)))}
            bengali={bn}
          />
          <Dropdown
            options={t.statusOpts}
            value={t.statusOpts[statusIdx]}
            onChange={(v) => setStatusIdx(Math.max(0, t.statusOpts.indexOf(v)))}
            bengali={bn}
          />
          <div className="ml-auto flex rounded-2xl bg-stone-100 p-1">
            <button
              onClick={() => setView('map')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                view === 'map' ? 'bg-white shadow text-stone-900' : 'text-stone-400'
              }`}
            >
              {t.map}
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                view === 'list' ? 'bg-white shadow text-stone-900' : 'text-stone-400'
              }`}
            >
              {t.list}
            </button>
          </div>
        </div>

        {view === 'map' ? (
          <div className="px-4">
            {/* overview / interactive toggle */}
            <div className="flex rounded-2xl bg-stone-100 p-1 mb-3 w-fit">
              <button
                onClick={() => setMapMode('overview')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  mapMode === 'overview' ? 'bg-white shadow text-stone-900' : 'text-stone-400'
                }`}
              >
                {t.overview}
              </button>
              <button
                onClick={() => setMapMode('interactive')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  mapMode === 'interactive' ? 'bg-white shadow text-stone-900' : 'text-stone-400'
                }`}
              >
                {t.interactive}
              </button>
            </div>
            {mapMode === 'overview' ? (
              <DecorativeMap wardStats={wardStats} totals={totals} t={t} />
            ) : (
              <MapView complaints={complaints} />
            )}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex gap-3 px-4 mb-7">
              <StatCard
                value={totals.unresolved.toLocaleString()}
                label={t.unresolved}
                color="text-red-600"
                bg="bg-red-50"
                border="border border-red-100"
              />
              <StatCard
                value={totals.resolved.toLocaleString()}
                label={t.resolved}
                color="text-green-600"
                bg="bg-green-50"
                border="border border-green-100"
              />
              <StatCard
                value={`${totals.rate}%`}
                label={t.rate}
                color="text-stone-800"
                bg="bg-stone-50"
                border="border border-stone-100"
              />
            </div>

            {/* Worst wards leaderboard */}
            <div className="px-5">
              <div className="text-xs font-bold tracking-widest text-stone-400 mb-2">{t.worst}</div>
              {!isConfigured ? (
                <div className="py-10 text-center text-stone-400 text-sm">{t.notConfigured}</div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-stone-400 text-sm">{t.emptyWards}</div>
              ) : (
                filtered.map((w, i) => (
                  <WardBar key={w.no} rank={i + 1} ward={w} maxReports={maxReports} t={t} />
                ))
              )}
            </div>
          </>
        )}

        {/* Report CTA */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-5 pt-4 bg-gradient-to-t from-white via-white to-transparent">
          <div className="flex gap-3">
            <button
              onClick={() => setShowReport(true)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-3xl bg-red-600 text-white text-lg font-bold py-5 shadow-lg active:scale-[0.98] transition ${
                bn ? 'font-bengali' : 'font-display'
              }`}
            >
              <span className="text-2xl leading-none">+</span> {t.report}
            </button>
            <div className="w-20 rounded-3xl bg-red-50 border border-red-100 flex flex-col items-center justify-center text-red-600">
              <span className="text-xl">▥</span>
              <span className="text-sm font-bold font-mono">{totals.unresolved}</span>
            </div>
          </div>
        </div>

        {showReport && (
          <ReportSheet
            lang={lang}
            t={t}
            onClose={() => setShowReport(false)}
            onSubmitted={mergeComplaint}
          />
        )}
      </div>
    </div>
  );
}
