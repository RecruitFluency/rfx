// One share button used everywhere. On phones it opens the native share sheet
// (Messages, WhatsApp, Instagram, email); elsewhere a small menu: copy link, text,
// email. The person sends it from their own phone or inbox. VEKT never messages
// anyone's contacts and never reads an address book.
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Mail, MessageSquare, Share2 } from "lucide-react";

export interface ShareProps { url: string; title: string; text: string; label?: string; className?: string; floating?: boolean; up?: boolean }

export function ShareButton({ url, title, text, label = "Share VEKT", className = "", floating, up }: ShareProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const click = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
    const data = { title, text, url };
    if (nav.share && (!nav.canShare || nav.canShare(data)) && matchMedia("(pointer: coarse)").matches) {
      try { await nav.share(data); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    setOpen((o) => !o);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); } catch { window.prompt("Copy this link", url); }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };
  const body = `${text} ${url}`;
  const item = "flex items-center gap-3 w-full px-4 min-h-[44px] text-sm text-white hover:bg-white/[0.06] text-left";

  return (
    <div ref={box} className={`relative ${open ? "z-40" : ""} ${floating ? "fixed z-30 right-4 bottom-20 sm:right-6 sm:bottom-24 no-print" : ""} ${className}`}>
      <button type="button" onClick={click} aria-haspopup="menu" aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded border text-sm font-medium transition min-h-[44px] px-4 ${floating ? "bg-vekt-black/90 backdrop-blur border-white/40 text-white hover:border-white shadow-[0_8px_24px_rgba(0,0,0,.5)]" : "border-white/25 text-white/90 hover:border-white/60 hover:text-white"}`}>
        <Share2 className="w-4 h-4" aria-hidden="true" />{label}
      </button>
      {open && (
        <div role="menu" className={`absolute ${floating ? "bottom-full mb-2 right-0" : up ? "bottom-full mb-2 left-0" : "top-full mt-2 left-0"} w-64 bg-vekt-panel border border-white/[0.16] rounded py-1 z-40`}>
          <button role="menuitem" className={item} onClick={copy}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? "Link copied" : "Copy link"}</button>
          <a role="menuitem" className={item} href={`sms:?&body=${encodeURIComponent(body)}`}><MessageSquare className="w-4 h-4" />Text it</a>
          <a role="menuitem" className={item} href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`}><Mail className="w-4 h-4" />Email it</a>
          <div className="px-4 pt-2 pb-3 text-[11px] text-vekt-grey border-t border-white/[0.08] mt-1 break-all">{url}</div>
        </div>
      )}
    </div>
  );
}
