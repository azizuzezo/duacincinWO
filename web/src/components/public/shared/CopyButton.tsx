"use client";

import { useEffect, useRef, useState } from "react";

// Copies a link to a section (`hash`) or a plain value (`value`, e.g. an NIB).
// Purpose: legal sections, article headings and FAQ answers get quoted and
// shared; a registration number gets pasted into a government lookup. The
// icon turns into a check for 2s and a polite live region says it worked.

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older or locked-down browsers: a hidden textarea and execCommand.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const done = document.execCommand("copy");
    ta.remove();
    return done;
  }
}

export function CopyButton({
  hash,
  value,
  label,
  className = "",
  showText = false,
}: {
  /** Section id: copies the page URL with #hash. */
  hash?: string;
  /** Plain text to copy instead of a link. */
  value?: string;
  /** Accessible name, e.g. "Salin tautan ke bagian Akun". */
  label: string;
  className?: string;
  /** Show "Salin" / "Tersalin" next to the icon. */
  showText?: boolean;
}) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    const text = value ?? `${window.location.origin}${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ""}`;
    const done = await writeClipboard(text);
    if (done && hash) window.history.replaceState(null, "", `#${hash}`);
    setState(done ? "done" : "fail");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2000);
  }

  const kind = value ? "Nilai" : "Tautan";
  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-[background-color,color,opacity] duration-300 hover:bg-wd-blush hover:text-wd-ink active:scale-95 ${
          state === "done" ? "text-wd-ok" : "text-wd-muted"
        } ${showText ? "px-3" : ""} ${className}`}
      >
        {state === "done" ? (
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5 9-10" />
          </svg>
        ) : value ? (
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2.5" />
            <path d="M5 15V6a2 2 0 0 1 2-2h8" />
          </svg>
        ) : (
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
            <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
          </svg>
        )}
        {showText && <span aria-hidden>{state === "done" ? "Tersalin" : "Salin"}</span>}
      </button>
      <span className="sr-only" role="status">
        {state === "done" ? `${kind} tersalin` : state === "fail" ? `${kind} belum bisa disalin` : ""}
      </span>
    </>
  );
}
