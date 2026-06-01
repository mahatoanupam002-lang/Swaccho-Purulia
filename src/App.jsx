import { useCallback, useEffect, useState } from 'react';
import Header from './components/Header';
import ReportForm from './components/ReportForm';
import MapView from './components/MapView';
import Leaderboard from './components/Leaderboard';
import { fetchComplaints } from './lib/complaints';

export default function App() {
  const [tab, setTab] = useState('report');
  const [complaints, setComplaints] = useState([]);
  const [loadError, setLoadError] = useState(null);

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

  // Refresh the list/map when a new report is submitted.
  const handleSubmitted = useCallback(
    (saved) => {
      setComplaints((prev) => [saved, ...prev]);
      load();
    },
    [load]
  );

  return (
    <div className="app">
      <Header tab={tab} onTab={setTab} />
      <div className="main">
        <aside className="panel">
          {tab === 'report' && <ReportForm onSubmitted={handleSubmitted} />}
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
