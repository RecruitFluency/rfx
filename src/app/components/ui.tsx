import React from 'react';
import { Loader2, AlertTriangle, Inbox } from 'lucide-react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-400 mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin text-[#FF0000]" />
      {label ?? 'Loading…'}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 bg-[#2a1515] border border-[#5c1f1f] text-red-300 rounded-xl p-4 text-sm">
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="w-10 h-10 text-gray-600 mb-3" />
      <p className="text-gray-300 font-medium">{title}</p>
      {hint && <p className="text-gray-500 text-sm mt-1 max-w-md">{hint}</p>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-900/40 text-green-400 border-green-800',
    inactive: 'bg-gray-800 text-gray-400 border-gray-700',
    completed: 'bg-green-900/40 text-green-400 border-green-800',
    needs_review: 'bg-amber-900/40 text-amber-400 border-amber-800',
    processing: 'bg-blue-900/40 text-blue-400 border-blue-800',
    uploading: 'bg-blue-900/40 text-blue-400 border-blue-800',
    failed: 'bg-red-900/40 text-red-400 border-red-800',
    pending: 'bg-amber-900/40 text-amber-400 border-amber-800',
    approved: 'bg-green-900/40 text-green-400 border-green-800',
    rejected: 'bg-gray-800 text-gray-400 border-gray-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] ?? styles.inactive}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
