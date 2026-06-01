import { useEffect, useRef, useState } from 'react';
import { SOCIAL_LINKS } from '../lib/i18n';

export default function SocialMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Social links"
        className="text-red-500 text-2xl leading-none"
      >
        ◎
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl bg-white border border-stone-200 shadow-xl overflow-hidden">
          {SOCIAL_LINKS.map((s) => (
            <a
              key={s.href}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-4 text-stone-700 hover:bg-stone-50 font-mono text-sm"
            >
              <span className="text-lg w-5 text-center">{s.icon}</span>
              {s.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
