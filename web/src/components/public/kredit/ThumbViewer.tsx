"use client";

import Image from "next/image";
import { useRef } from "react";

/** A credit's thumbnail that opens the picture larger in a native modal
 * dialog (focus stays inside, Escape and the close button shut it, focus
 * returns to the thumbnail). Purpose: on a credits page the reader has to
 * tell which picture a credit belongs to; an 96px crop is not always enough. */
export function ThumbViewer({ src, title, caption }: { src: string; title: string; caption: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dlg.current?.showModal()}
        aria-label={`Perbesar gambar: ${caption}`}
        className="group relative block h-20 w-20 shrink-0 cursor-zoom-in overflow-hidden rounded-[12px] bg-wd-blush sm:h-24 sm:w-24"
      >
        <Image src={src} alt="" fill sizes="96px" className="object-cover object-[50%_25%] transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        <span aria-hidden className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-wd-ink opacity-0 shadow-wd-card transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4-4M11 8.5v5M8.5 11h5" />
          </svg>
        </span>
      </button>
      <dialog
        ref={dlg}
        aria-label={caption}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[min(92vw,880px)] overflow-hidden rounded-[22px] bg-white p-0 shadow-wd-pop backdrop:bg-wd-ink/70 open:animate-[wd-dlg_300ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:open:animate-none"
      >
        <style>{"@keyframes wd-dlg{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}"}</style>
        <div className="relative aspect-[3/2] bg-wd-blush">
          <Image src={src} alt={caption} fill sizes="(min-width: 900px) 880px, 92vw" className="object-contain" />
        </div>
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="font-semibold text-wd-ink">{caption}</p>
            <p className="mt-0.5 text-sm text-wd-muted">{title}</p>
          </div>
          <form method="dialog">
            <button type="submit" className="inline-flex min-h-11 items-center rounded-full border border-wd-line-2 px-5 text-sm font-semibold text-wd-ink transition-colors hover:border-wd-ink">
              Tutup
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
