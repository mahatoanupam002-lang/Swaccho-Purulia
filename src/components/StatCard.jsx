export default function StatCard({ value, label, color, bg, border }) {
  return (
    <div className={`flex-1 rounded-3xl px-4 py-6 text-center ${bg} ${border}`}>
      <div className={`text-3xl font-bold tracking-tight font-mono ${color}`}>{value}</div>
      <div className="mt-2 text-[11px] font-semibold tracking-widest text-stone-500">
        {label}
      </div>
    </div>
  );
}
