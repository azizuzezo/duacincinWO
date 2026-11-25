"use client";

import { useEffect, useRef, useState } from "react";

/** Share a page: the phone's own share sheet where there is one (Web Share
 * API), otherwise the link is copied. Purpose: articles get passed to a
 * partner or family in WhatsApp; one tap instead of copying the address. */
export function ShareButton({
  path,
  title,
  className = "",
  variant = "icon",
}: {
  /** Site path, e.g. /artikel/slug. */
  path: string;
  title: string;
  className?: string;
  /** "icon": round icon button (on cards); "pill": icon + "Bagikan". */
  variant?: "icon" | "pill";
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function share() {
    const url = `${window.location.origin}${path}`;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: nothing else to do; the address bar still has it.
    }
  }

  const icon = copied ? (
    <svg aria-hidden width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5 9-10" />
    </svg>
  ) : (
    <svg aria-hidden width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" />
    </svg>
  );

  return (
    <>
      <button
        type="button"
        onClick={share}
        aria-label={variant === "icon" ? `Bagikan: ${title}` : undefined}
        className={
          variant === "icon"
            ? `inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-wd-card transition-[color,transform] duration-300 hover:text-wd-accent-ink active:scale-95 ${copied ? "text-wd-ok" : "text-wd-ink"} ${className}`
            : `inline-flex min-h-11 items-center gap-2 rounded-full border border-wd-line-2 bg-white px-4 text-sm font-semibold transition-colors hover:border-wd-ink active:scale-[0.98] ${copied ? "text-wd-ok" : "text-wd-ink"} ${className}`
        }
      >
        {icon}
        {variant === "pill" && <span>{copied ? "Tautan tersalin" : "Bagikan"}</span>}
      </button>
      <span className="sr-only" role="status">
        {copied ? "Tautan tersalin" : ""}
      </span>
    </>
  );
}
