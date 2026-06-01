// Stylized "heat" overview echoing the NammaKasa bubble-cluster look. Bubbles
// are positioned on a fixed decorative layout but sized/labelled from the real
// per-ward report counts. For a true geographic view, the "Live map" toggle
// opens the interactive MapLibre map.

const POSITIONS = [
  { x: 42, y: 14 }, { x: 30, y: 26 }, { x: 60, y: 24 }, { x: 20, y: 40 },
  { x: 54, y: 40 }, { x: 67, y: 40 }, { x: 45, y: 50 }, { x: 28, y: 52 },
  { x: 88, y: 52 }, { x: 40, y: 60 }, { x: 66, y: 60 }, { x: 18, y: 70 },
  { x: 42, y: 72 }, { x: 72, y: 72 }, { x: 62, y: 82 }, { x: 80, y: 30 },
];

export default function DecorativeMap({ wardStats, totals, t, fill = false }) {
  const top = wardStats.filter((w) => w.reports > 0).slice(0, POSITIONS.length);
  const max = top.reduce((m, w) => Math.max(m, w.reports), 1);

  const cls = fill
    ? 'absolute inset-0 overflow-hidden bg-stone-100'
    : 'relative w-full rounded-3xl overflow-hidden bg-stone-100';
  const style = fill ? undefined : { height: 520 };

  return (
    <div className={cls} style={style}>
      <div className="absolute top-4 left-4 z-10 bg-white rounded-2xl shadow px-5 py-3 flex items-center gap-4">
        <span>
          <span className="text-red-600 font-bold text-xl font-mono">{totals.unresolved}</span>{' '}
          <span className="text-stone-400 text-sm">{t.active}</span>
        </span>
        <span className="text-stone-200">|</span>
        <span>
          <span className="text-orange-600 font-bold text-xl font-mono">{totals.total}</span>{' '}
          <span className="text-stone-400 text-sm">{t.reportsCount}</span>
        </span>
      </div>

      {top.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center px-10 text-center text-stone-400">
          {t.emptyWards}
        </div>
      ) : (
        top.map((w, i) => {
          const pos = POSITIONS[i];
          const r = 28 + (w.reports / max) * 38; // radius scales with reports
          return (
            <div
              key={w.no}
              title={`${w.name}: ${w.reports} ${t.reportsLabel}`}
              className="absolute flex items-center justify-center rounded-full text-white font-bold border-2 border-white shadow-lg font-mono"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: r * 1.6,
                height: r * 1.6,
                transform: 'translate(-50%,-50%)',
                background: '#7a2222',
                fontSize: Math.max(11, r / 2.6),
              }}
            >
              {w.reports}
            </div>
          );
        })
      )}
    </div>
  );
}
