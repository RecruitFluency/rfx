// VEKT portal UI kit. Brand rules: black/white/grey, Matte Green only for the
// one primary action on a screen (black text on green), 4px corners, no pills,
// no glows, no red.
import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Inbox, AlertCircle, X } from 'lucide-react';
import type { InvitationStatus } from '../lib/types';
import { statusLabel, statusTone, type Tone } from '../lib/format';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const buttonClass: Record<ButtonVariant, string> = {
  primary: 'bg-vekt-green text-vekt-black hover:brightness-95 disabled:opacity-40',
  secondary: 'border border-white/40 text-white hover:bg-white/5 disabled:opacity-40',
  ghost: 'text-vekt-grey hover:text-white disabled:opacity-40',
};

export function Button({
  variant = 'secondary', className = '', children, loading, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded px-4 min-h-[44px] text-sm font-medium transition
                  disabled:cursor-not-allowed ${buttonClass[variant]} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonLink({ to, variant = 'secondary', children, className = '' }:
  { to: string; variant?: ButtonVariant; children: React.ReactNode; className?: string }) {
  return (
    <Link to={to} className={`inline-flex items-center justify-center gap-2 rounded px-4 min-h-[44px] text-sm font-medium transition ${buttonClass[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }:
  { eyebrow?: string; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 mb-10">
      <div className="min-w-0">
        {eyebrow && <div className="vekt-label mb-3">{eyebrow}</div>}
        <h1 className="vekt-display text-[40px] sm:text-[52px] text-white">{title}</h1>
        {subtitle && <p className="text-vekt-grey mt-3 max-w-2xl font-light">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`bg-vekt-panel border border-white/[0.08] rounded-lg ${className}`}>{children}</section>;
}

export function PanelTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/[0.08]">
      <h2 className="vekt-label">{children}</h2>
      {action}
    </div>
  );
}

export function Field({ label, hint, children, className = '' }:
  { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="vekt-label">{label}</span>
      {children}
      {hint && <span className="text-xs text-vekt-grey">{hint}</span>}
    </label>
  );
}

const inputBase = 'w-full bg-vekt-black border border-white/[0.16] rounded px-3 min-h-[44px] text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/60';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...rest }, ref) {
    return <input ref={ref} {...rest} className={`${inputBase} ${className}`} />;
  });

export function Select({ className = '', children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} className={`${inputBase} ${className}`}>{children}</select>;
}

export function Textarea({ className = '', ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${inputBase} py-3 min-h-[96px] ${className}`} />;
}

const toneClass: Record<Tone, string> = {
  done: 'bg-white text-vekt-black border-white',
  progress: 'border-white/50 text-white',
  neutral: 'border-white/15 text-vekt-grey',
  warn: 'border-dashed border-white/50 text-white',
  bad: 'border-white/15 bg-white/[0.06] text-vekt-grey line-through decoration-white/30',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded border px-2 py-0.5 font-geist-mono text-[11px] uppercase tracking-[0.08em] ${toneClass[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: InvitationStatus }) {
  return <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>;
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-vekt-grey">
      <Loader2 className="w-5 h-5 animate-spin" /> <span className="vekt-label">{label}</span>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 border border-white/30 rounded p-4 text-sm text-white">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Inbox className="w-8 h-8 text-white/20 mb-4" />
      <p className="text-white">{title}</p>
      {hint && <p className="text-vekt-grey text-sm mt-2 max-w-md">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="vekt-label">{label}</span>
      <span className="vekt-display text-[44px] text-white">{value}</span>
      {sub && <span className="text-xs text-vekt-grey">{sub}</span>}
    </div>
  );
}

export function Drawer({ open, onClose, title, children, footer }:
  { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-[640px] h-full bg-vekt-black border-l border-white/[0.1] flex flex-col">
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-white/[0.08]">
          <h2 className="vekt-display text-[28px] text-white">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 text-vekt-grey hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-white/[0.08] bg-vekt-black">{footer}</div>}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }:
  { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input type="checkbox" className="mt-1 w-4 h-4 accent-white" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="text-sm text-white">{label}</span>
        {hint && <span className="block text-xs text-vekt-grey mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }:
  { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="self-start inline-flex flex-wrap border border-white/[0.16] rounded overflow-hidden">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-4 min-h-[40px] text-sm ${value === o.value ? 'bg-white text-vekt-black' : 'text-vekt-grey hover:text-white'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

export const th = 'vekt-label font-normal px-4 py-3 border-b border-white/[0.08] whitespace-nowrap';
export const td = 'px-4 py-3 border-b border-white/[0.06] align-top';
