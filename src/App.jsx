import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchComplaints, subscribeToComplaints } from './lib/complaints';
import { isConfigured } from './lib/supabase';
import { demoComplaints, isDemo } from './lib/demo';
import { isAdminRoute } from './lib/admin';
import AdminPanel from './components/AdminPanel';
import { buildWardStats, totals as computeTotals } from './lib/wardStats';
import { STR } from './lib/i18n';
import Dropdown from './components/Dropdown';
import WardCard from './components/WardCard';
import MapTab from './components/MapTab';
import ReportSheet from './components/ReportSheet';
import DigestSheet from './components/DigestSheet';
import SocialMenu from './components/SocialMenu';

const SEV_KEYS = ['minor', 'moderate', 'severe', 'critical'];

export default function App() {
  if (isAdminRoute()) return <AdminPanel />;
  return <Dashboard />;
}

function Dashboard() {
  const [lang, setLang] = useState('en');
  const [view, setView] = useState('list'); // list | map
  const [sevIdx, setSevIdx] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [showBanner, setShowBanner] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [showDigest, setShowDigest] = useState(false);
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

  const demo = isDemo();

  useEffect(() => {
    if (demo) {
      setComplaints(demoComplaints());
      return;
    }
    fetchComplaints().then(setComplaints).catch(() => {});
  }, [demo]);

  useEffect(() => {
    if (!isConfigured || demo) return undefined;
    return subscribeToComplaints({
      onInsert: (row) => {
        mergeComplaint(row);
        setLive(true);
      },
      onUpdate: mergeComplaint,
    });
  }, [mergeComplaint, demo]);

  const totals = useMemo(() => computeTotals(complaints), [complaints]);
  // Include every ward so the List tab is a full ward directory.
  const wardStats = useMemo(
    () => buildWardStats(complaints, { includeEmpty: true }),
    [complaints]
  );
  const maxReports = useMemo(
    () => wardStats.reduce((m, w) => Math.max(m, w.reports), 0),
    [wardStats]
  );

  const filtered = useMemo(() => {
    let rows = wardStats;
    if (sevIdx > 0) rows = rows.filter((r) => r.sev === SEV_KEYS[sevIdx - 1] && r.reports > 0);
    if (statusIdx === 1) rows = rows.filter((r) => r.unresolved > 0);
    if (statusIdx === 2) rows = rows.filter((r) => r.resolved > 0);
    return rows;
  }, [wardStats, sevIdx, statusIdx]);

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
            {live && (
              <span className="text-green-600 text-xs font-bold" title="Live updates">
                ● {t.live}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(bn ? 'en' : 'bn')}
              className={`px-4 py-2 rounded-2xl bg-white border border-stone-200 text-sm font-semibold shadow-sm ${
                bn ? 'font-body' : 'font-bengali'
              }`}
            >
              {bn ? 'English' : 'বাংলা'}
            </button>
            <SocialMenu />
          </div>
        </div>

        {/* Banner → opens weekly digest */}
        {showBanner && (
          <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
            <button
              onClick={() => setShowDigest(true)}
              className="flex items-center gap-3 flex-1 text-left"
            >
              <span className="text-red-500">✉</span>
              <span className="text-sm text-stone-600">
                <b className="text-red-600">{t.tagline}</b>
              </span>
            </button>
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
          <MapTab
            complaints={complaints}
            wardStats={wardStats}
            totals={totals}
            maxReports={maxReports}
            t={t}
          />
        ) : (
          <div className="px-5">
            {!isConfigured && complaints.length === 0 ? (
              <div className="py-10 text-center text-stone-400 text-sm">{t.notConfigured}</div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-stone-400 text-sm">{t.emptyWards}</div>
            ) : (
              filtered.map((w) => <WardCard key={w.no} ward={w} t={t} />)
            )}
          </div>
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
          <ReportSheet lang={lang} t={t} onClose={() => setShowReport(false)} onSubmitted={mergeComplaint} />
        )}
        {showDigest && <DigestSheet lang={lang} t={t} onClose={() => setShowDigest(false)} />}
      </div>
    </div>
  );
}
