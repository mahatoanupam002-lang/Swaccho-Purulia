export default function WardBar({ rank, ward, maxReports, t }) {
  const pct = maxReports ? (ward.reports / maxReports) * 100 : 0;
  const topThree = rank <= 3;
  return (
    <div className="py-5 border-b border-stone-100">
      <div className="flex items-baseline gap-4">
        <span
          className={`text-lg font-bold w-5 font-mono ${
            topThree ? 'text-red-600' : 'text-stone-300'
          }`}
        >
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-stone-900 font-display truncate">
              {ward.name}
            </span>
            <span className="text-xs text-stone-400 font-mono shrink-0">#{ward.no}</span>
          </div>
        </div>
        <span className="text-xl font-bold text-stone-700 font-mono">{ward.unresolved}</span>
      </div>
      <div className="mt-3 ml-9 h-1.5 rounded-full bg-stone-100 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: topThree ? '#c2410c' : '#d6d3d1' }}
        />
      </div>
      <div className="mt-2 ml-9 text-xs text-stone-400 font-mono">
        {ward.reports} {t.reportsLabel} · {ward.resolvedPct}% {t.resolvedLabel}
        {ward.councillor && ward.councillor !== '—' ? ` · ${ward.councillor}` : ''}
      </div>
    </div>
  );
}
