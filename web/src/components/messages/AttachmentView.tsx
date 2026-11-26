"use client";

import Image from "next/image";
import { useRef } from "react";

import { type ChatMessage } from "@/lib/api";

import { formatBytes, kindOfMime } from "./attachments";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold";

/** The file inside a bubble: photo, playable video, or a document row. */
export function AttachmentView({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const url = message.attachment_url;
  if (!url) return null;
  const kind = kindOfMime(message.attachment_type);

  if (kind === "image") return <ImageButton url={url} />;
  if (kind === "video") {
    return (
      <video controls preload="metadata" playsInline aria-label={message.attachment_name ? `Video ${message.attachment_name}` : "Video lampiran"} className="-mx-1.5 mb-1.5 max-h-60 w-[calc(100%+0.75rem)] max-w-[260px] rounded-xl bg-black">
        <source src={url} type={message.attachment_type} />
        <a href={url} target="_blank" rel="noopener noreferrer">
          Buka video
        </a>
      </video>
    );
  }
  const ext = (message.attachment_name?.split(".").pop() ?? message.attachment_type?.split("/").pop() ?? "file").slice(0, 4).toUpperCase();
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mb-1.5 flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-2 ${mine ? "bg-dc-ink-3 text-dc-on-dark" : "bg-dc-cream text-dc-ink"} ${FOCUS}`}
    >
      <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[0.62rem] font-bold ${mine ? "bg-dc-gold-antique text-dc-ink" : "bg-dc-gold/30 text-dc-clay"}`}>
        {ext}
      </span>
      <span className="min-w-0">
        <span className="block max-w-[190px] truncate text-[0.82rem] font-semibold">{message.attachment_name || "Dokumen"}</span>
        <span className={`block text-[0.7rem] ${mine ? "text-dc-on-dark/70" : "text-dc-text-3"}`}>{[formatBytes(message.attachment_size), "Buka"].filter(Boolean).join(" · ")}</span>
      </span>
    </a>
  );
}

/** A photo in the bubble. Clicking opens it large in a popup on this page (native dialog: Escape, backdrop click and the close button all dismiss it). */
function ImageButton({ url }: { url: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} aria-label="Perbesar gambar" className={`-mx-1.5 mb-1.5 block cursor-zoom-in overflow-hidden rounded-xl ${FOCUS}`}>
        <Image src={url} alt="Lampiran gambar" width={240} height={240} unoptimized className="max-h-60 w-auto max-w-full object-cover" />
      </button>
      <dialog
        ref={ref}
        aria-label="Gambar lampiran"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto max-h-[92dvh] max-w-[min(94vw,1100px)] overflow-visible bg-transparent p-0 backdrop:bg-black/75"
      >
        <form method="dialog" className="relative">
          <button type="submit" aria-label="Tutup gambar" className={`absolute -top-3 -right-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg ${FOCUS}`}>
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <Image src={url} alt="Lampiran gambar ukuran penuh" width={1600} height={1200} unoptimized className="max-h-[88dvh] w-auto max-w-full rounded-xl object-contain" />
        </form>
      </dialog>
    </>
  );
}
