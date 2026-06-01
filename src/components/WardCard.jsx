import { useState } from 'react';

export default function WardCard({ ward, t }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-stone-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 py-5 text-left"
      >
        <div className="w-14 h-14 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-lg font-bold text-stone-800 font-mono shrink-0">
          {ward.reports}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-stone-900 font-display truncate">
              {ward.name}
            </span>
            {ward.zone && (
              <span className="text-xs text-stone-400 font-mono shrink-0">{ward.zone}</span>
            )}
            <span className="text-xs text-stone-400 font-mono shrink-0">#{ward.no}</span>
          </div>
          <div className="text-sm text-stone-500 mt-0.5 truncate">
            {ward.unresolved} {t.unresolvedLabel} · {ward.councillor}
          </div>
        </div>
        <span className={`text-stone-300 transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {open && (
        <div className="pb-5 pl-[4.5rem] pr-2 -mt-1">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Stat n={ward.reports} label={t.reportsWord} />
            <Stat n={ward.unresolved} label={t.open} color="text-red-600" />
            <Stat n={`${ward.resolvedPct}%`} label={t.resolvedLabel} color="text-green-600" />
          </div>
          <div className="text-sm text-stone-500">
            <span className="font-semibold text-stone-600">{t.councillorLabel}:</span>{' '}
            {ward.councillor}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ n, label, color = 'text-stone-800' }) {
  return (
    <div className="rounded-xl bg-stone-50 border border-stone-100 py-3 text-center">
      <div className={`text-lg font-bold font-mono ${color}`}>{n}</div>
      <div className="text-[10px] font-semibold tracking-widest text-stone-400 uppercase">
        {label}
      </div>
    </div>
  );
}
