// Layout for athletes, parents and club directors: no navigation, no login.
export function PublicFrame({ children, footer }: { children: React.ReactNode; footer?: string }) {
  return (
    <div className="min-h-screen">
      <header className="px-4 sm:px-8 h-16 flex items-center border-b border-white/[0.08]">
        <img src="/lockup-white.svg" alt="VEKT" className="h-5 w-auto" />
      </header>
      <main className="px-4 sm:px-8 py-10 sm:py-14 max-w-3xl mx-auto">{children}</main>
      <footer className="px-4 sm:px-8 pb-12 max-w-3xl mx-auto text-xs text-vekt-grey font-light">
        {footer ?? "VEKT is a recruiting fit tool. What you share here goes only to the program that invited you. VEKT never promises an offer, a roster spot or a scholarship."}
      </footer>
    </div>
  );
}

/** Save draft / submit bar, pinned to the bottom on phones. */
export function SaveBar({ onSave, onSubmit, busy, note, submitLabel }: { onSave: () => void; onSubmit: () => void; busy: string | null; note: string | null; submitLabel: string }) {
  return (
    <div className="sticky bottom-0 mt-12 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-vekt-black/95 border-t border-white/[0.1]">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onSubmit} disabled={!!busy}
          className="flex-1 sm:flex-none min-h-[44px] px-5 rounded bg-vekt-green text-vekt-black text-sm font-medium disabled:opacity-50">{busy === "submit" ? "Sending..." : submitLabel}</button>
        <button type="button" onClick={onSave} disabled={!!busy}
          className="min-h-[44px] px-4 rounded border border-white/40 text-white text-sm disabled:opacity-50">{busy === "save" ? "Saving..." : <><span className="sm:hidden">Save</span><span className="hidden sm:inline">Save and finish later</span></>}</button>
      </div>
      {note && <p className="text-xs text-vekt-grey mt-2">{note}</p>}
    </div>
  );
}
