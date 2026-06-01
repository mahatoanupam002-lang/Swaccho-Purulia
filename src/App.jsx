import { useCallback, useEffect, useState } from 'react';
import Header from './components/Header';
import ReportForm from './components/ReportForm';
import MapView from './components/MapView';
import Leaderboard from './components/Leaderboard';
import { fetchComplaints, subscribeToComplaints } from './lib/complaints';
import { isConfigured } from './lib/supabase';

export default function App() {
  const [tab, setTab] = useState('report');
  const [complaints, setComplaints] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [live, setLive] = useState(false);

  // Upsert a complaint by id: replace an existing row (e.g. a status update)
  // or prepend a new one. Used by both optimistic submits and realtime events,
  // so the same row never appears twice.
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

  const load = useCallback(async () => {
    try {
      setComplaints(await fetchComplaints());
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates: new/updated complaints stream in for every viewer.
  useEffect(() => {
    if (!isConfigured) return undefined;
    const unsubscribe = subscribeToComplaints({
      onInsert: (row) => {
        mergeComplaint(row);
        setLive(true);
      },
      onUpdate: mergeComplaint,
    });
    return unsubscribe;
  }, [mergeComplaint]);

  return (
    <div className="app">
      <Header tab={tab} onTab={setTab} />
      <div className="main">
        <aside className="panel">
          {tab === 'report' && <ReportForm onSubmitted={mergeComplaint} />}
          {tab === 'leaderboard' && <Leaderboard complaints={complaints} />}
          {tab === 'map' && (
            <div className="card">
              <h2 className="section">Public accountability map</h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
                Every dot is a reported civic issue, mapped to its responsible
                Purulia ward. Tap a marker for details.
              </p>
              <div style={{ fontSize: '0.84rem' }}>
                Showing <strong>{complaints.length}</strong> reports.
                {live && (
                  <span
                    title="Live updates active"
                    style={{ marginLeft: 8, color: 'var(--green)', fontWeight: 700 }}
                  >
                    ● live
                  </span>
                )}
              </div>
              {loadError && (
                <div className="toast err" style={{ marginTop: 10 }}>
                  {loadError}
                </div>
              )}
            </div>
          )}
        </aside>
        <MapView complaints={complaints} />
      </div>
    </div>
  );
}
