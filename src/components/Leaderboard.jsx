import { buildLeaderboard } from '../lib/complaints';

export default function Leaderboard({ complaints }) {
  const rows = buildLeaderboard(complaints);

  return (
    <div>
      <h2 className="section">Ward accountability leaderboard</h2>
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 0 }}>
        Wards ranked by number of reported civic issues. Higher = needs more
        attention.
      </p>

      {rows.length === 0 ? (
        <div className="empty">No reports yet. Be the first to report an issue.</div>
      ) : (
        rows.map((r, i) => (
          <div className="lb-row" key={r.ward_id ?? `unmapped-${i}`}>
            <div className="lb-rank">{i + 1}</div>
            <div className="lb-body">
              <div className="name">{r.ward_name}</div>
              <div className="sub">
                {r.open} open · {r.resolved} resolved
                {r.mla ? ` · MLA: ${r.mla}` : ''}
              </div>
            </div>
            <div className="lb-count">
              <div className="num">{r.total}</div>
              <div className="lbl">reports</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
