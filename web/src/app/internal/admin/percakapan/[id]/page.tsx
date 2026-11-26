"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState } from "react";

import { AdmChatsPane } from "@/components/admin/admPanes";
import { ADM_FOCUS, AdmError, AdmPill, AdmRowsSkeleton } from "@/components/admin/admUi";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { WithUser } from "@/components/WithUser";
import { apiGet, ApiError } from "@/lib/api";
import { jam, labelHari, tanggalJam } from "../../../_ui";

// One client-vendor chat, read-only for an admin: client on the left,
// vendor on the right, flagged messages marked. Nothing here sends or
// marks anything read.

type Message = {
  id: string;
  from: "client" | "vendor" | "other";
  body: string;
  flagged: boolean;
  attachment_url?: string;
  attachment_type?: string;
  reply_to_body?: string;
  created_at: string;
  read_at?: string;
};

type Detail = {
  conversation: {
    id: string;
    created_at: string;
    closed_at?: string | null;
    client: { id: string; name: string; email: string };
    vendor: { id: string; name: string };
  };
  messages: Message[];
};

export default function AdminChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => (
        <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
          <div className="wd-container py-4 sm:py-6 md:py-8">
            <div className="md:grid md:h-[calc(100dvh-13rem)] md:min-h-[520px] md:grid-cols-[320px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
              <AdmChatsPane activeId={id} className="hidden md:flex" />
              <ChatDetail id={id} />
            </div>
          </div>
        </AdminShell>
      )}
    </WithUser>
  );
}

function ChatDetail({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setData(await apiGet<Detail>(`/api/v1/admin/chats/${id}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat percakapan.");
    }
  }
  useEffect(() => {
    queueMicrotask(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const c = data?.conversation;

  return (
    <section aria-label="Percakapan" className="flex min-h-0 flex-col md:overflow-hidden md:rounded-[22px] md:ring-1 md:ring-wd-line md:shadow-wd-card">
      <Link href="/internal/admin/percakapan" className={`-ml-1 mb-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-wd-accent-ink md:hidden ${ADM_FOCUS}`}>
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Semua percakapan
      </Link>

      {error && <AdmError message={error} onRetry={() => void load()} />}
      {!data && !error && <AdmRowsSkeleton rows={5} label="Memuat percakapan" />}

      {c && data && (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-wd-line bg-white px-1 pb-4 md:px-6 md:pt-5">
            <div className="min-w-0">
              <h1 className="wd-title text-[1.3rem] leading-tight sm:text-[1.5rem]">
                {c.client.name || c.client.email} <em>dengan</em> {c.vendor.name}
              </h1>
              <p className="mt-1 text-sm text-wd-text">
                Mulai {tanggalJam(c.created_at)}, {data.messages.length} pesan
              </p>
              <p className="flex flex-wrap gap-x-5 text-sm">
                <Link href={`/internal/admin/klien?q=${encodeURIComponent(c.client.email)}`} className={`inline-flex min-h-11 items-center font-semibold text-wd-accent-ink underline underline-offset-4 ${ADM_FOCUS}`}>
                  Klien: {c.client.email}
                </Link>
                <Link href={`/internal/admin/vendors/${c.vendor.id}`} className={`inline-flex min-h-11 items-center font-semibold text-wd-accent-ink underline underline-offset-4 ${ADM_FOCUS}`}>
                  Detail vendor
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdmPill tone="gold">Hanya baca</AdmPill>
              {c.closed_at && <AdmPill>Ditutup {tanggalJam(c.closed_at)}</AdmPill>}
            </div>
          </header>

          {data.messages.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-wd-text">Belum ada pesan di percakapan ini.</p>
          ) : (
            <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-wd-paper px-3 py-4 sm:px-6">
              {data.messages.map((m, i) => {
                const day = labelHari(m.created_at);
                const showDay = i === 0 || labelHari(data.messages[i - 1].created_at) !== day;
                const vendor = m.from === "vendor";
                const isImage = !!m.attachment_url && !!m.attachment_type?.startsWith("image/");
                return (
                  <li key={m.id} className="flex flex-col">
                    {showDay && <p className="my-2 self-center rounded-full bg-wd-blush px-3 py-1 text-xs font-semibold text-wd-text">{day}</p>}
                    <div className={`flex max-w-[85%] flex-col ${vendor ? "items-end self-end" : "items-start self-start"}`}>
                      <span className="mb-0.5 px-1 text-xs font-semibold text-wd-muted">{vendor ? c.vendor.name : c.client.name || "Klien"}</span>
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed text-wd-ink ${vendor ? "rounded-tr-sm bg-wd-accent-soft" : "rounded-tl-sm bg-white ring-1 ring-wd-line"} ${m.flagged ? "ring-2 ring-wd-danger" : ""}`}
                      >
                        {m.reply_to_body && (
                          <p className="mb-1.5 border-l-2 border-wd-accent-line pl-2 text-xs text-wd-text">{m.reply_to_body.length > 120 ? m.reply_to_body.slice(0, 120) + "…" : m.reply_to_body}</p>
                        )}
                        {m.attachment_url && isImage && (
                          <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className={`mb-1 block overflow-hidden rounded-lg ${ADM_FOCUS}`}>
                            <Image src={m.attachment_url} alt="Lampiran gambar" width={240} height={240} unoptimized className="max-h-60 w-auto max-w-full object-cover" />
                          </a>
                        )}
                        {m.attachment_url && !isImage && (
                          <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className={`mb-1 inline-flex min-h-11 items-center font-semibold underline underline-offset-4 ${ADM_FOCUS}`}>
                            Buka lampiran
                          </a>
                        )}
                        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                      </div>
                      <span className="mt-0.5 flex items-center gap-2 px-1 text-xs text-wd-muted">
                        {jam(m.created_at)}
                        {m.read_at && <span>dibaca</span>}
                        {m.flagged && <span className="font-semibold text-wd-danger">ditandai berisi kontak</span>}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
