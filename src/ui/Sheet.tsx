import { useEffect, useRef, type ReactNode } from 'react';
import { Close } from './icons.tsx';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current!; if (!d.open) d.showModal(); }, []);
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="sheet-body">
        <header className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Close /></button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

export function Choice<T extends string | number>({ label, value, options, onChange }:
  { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="choice">
      <legend>{label}</legend>
      <div className="chips">
        {options.map((o) => (
          <button key={String(o.value)} type="button" className={`chip${o.value === value ? ' is-on' : ''}`} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span><b>{label}</b>{hint && <small>{hint}</small>}</span>
      <input type="checkbox" role="switch" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
