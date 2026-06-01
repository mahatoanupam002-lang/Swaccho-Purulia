import { useState } from 'react';

export default function Dropdown({ options, value, onChange, bengali }) {
  const [open, setOpen] = useState(false);
  const family = bengali ? 'font-bengali' : 'font-body';
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-stone-200 text-stone-800 text-sm font-medium shadow-sm ${family}`}
      >
        {value}
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-44 rounded-2xl bg-white border border-stone-200 shadow-xl overflow-hidden">
          {options.map((opt, i) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`block w-full text-left px-5 py-4 text-base ${family} ${
                i === 0 || opt === value ? 'text-red-600 font-semibold' : 'text-stone-700'
              } hover:bg-stone-50`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
