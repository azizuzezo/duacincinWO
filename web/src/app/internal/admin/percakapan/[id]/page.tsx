"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { WithUser } from "@/components/WithUser";
import { apiGet, ApiError } from "@/lib/api";
import { ErrorBanner, jam, labelHari, RowsSkeleton, tanggalJam } from "../../../_ui";

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
        <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
          <ChatDetail id={id} />
        </Shell>
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
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-8">
      <Link
        href="/internal/admin/percakapan"
        className="-ml-1 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline"
      >
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Semua percakapan
      </Link>

      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      {!data && !error && <RowsSkeleton rows={5} label="Memuat percakapan" />}

      {c && data && (
        <section className="overflow-hidden rounded-xl border border-dc-line bg-dc-white">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-dc-line px-5 py-4">
            <div className="min-w-0">
              <h1 className="font-heading text-2xl leading-tight text-dc-ink">
                {c.client.name || c.client.email} <span className="text-dc-text-3">dengan</span> {c.vendor.name}
              </h1>
              <p className="mt-1 text-sm text-dc-text-2">
                Mulai {tanggalJam(c.created_at)} · {data.messages.length} pesan
              </p>
              <p className="mt-1 flex flex-wrap gap-x-4 text-sm">
                <Link href={`/internal/admin/klien?q=${encodeURIComponent(c.client.email)}`} className="inline-flex min-h-11 items-center font-semibold text-dc-clay underline underline-offset-4">
                  Klien: {c.client.email}
                </Link>
                <Link href={`/internal/admin/vendors/${c.vendor.id}`} className="inline-flex min-h-11 items-center font-semibold text-dc-clay underline underline-offset-4">
                  Detail vendor
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="info">Hanya baca</Badge>
              {c.closed_at && <Badge tone="neutral">Ditutup {tanggalJam(c.closed_at)}</Badge>}
            </div>
          </header>

          {data.messages.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-dc-text-2">Belum ada pesan di percakapan ini.</p>
          ) : (
            <ol className="flex flex-col gap-2 bg-dc-ivory px-3 py-4 sm:px-5">
              {data.messages.map((m, i) => {
                const day = labelHari(m.created_at);
                const showDay = i === 0 || labelHari(data.messages[i - 1].created_at) !== day;
                const vendor = m.from === "vendor";
                const isImage = !!m.attachment_url && !!m.attachment_type?.startsWith("image/");
                return (
                  <li key={m.id} className="flex flex-col">
                    {showDay && <p className="my-2 self-center rounded-full bg-dc-cream px-3 py-1 text-xs font-semibold text-dc-text-2">{day}</p>}
                    <div className={`flex max-w-[85%] flex-col ${vendor ? "items-end self-end" : "items-start self-start"}`}>
                      <span className="mb-0.5 px-1 text-xs font-semibold text-dc-text-3">{vendor ? c.vendor.name : c.client.name || "Klien"}</span>
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                          vendor ? "rounded-tr-sm bg-dc-ink text-dc-on-dark" : "rounded-tl-sm border border-dc-line bg-dc-white text-dc-ink"
                        } ${m.flagged ? "ring-2 ring-dc-danger" : ""}`}
                      >
                        {m.reply_to_body && (
                          <p className={`mb-1.5 border-l-2 pl-2 text-xs ${vendor ? "border-dc-gold/70 text-dc-on-dark/75" : "border-dc-gold text-dc-text-2"}`}>
                            {m.reply_to_body.length > 120 ? m.reply_to_body.slice(0, 120) + "…" : m.reply_to_body}
                          </p>
                        )}
                        {m.attachment_url && isImage && (
                          <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="mb-1 block overflow-hidden rounded-lg">
                            <Image src={m.attachment_url} alt="Lampiran gambar" width={240} height={240} unoptimized className="max-h-60 w-auto max-w-full object-cover" />
                          </a>
                        )}
                        {m.attachment_url && !isImage && (
                          <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="mb-1 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
                            📎 Buka lampiran
                          </a>
                        )}
                        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                      </div>
                      <span className="mt-0.5 flex items-center gap-2 px-1 text-xs text-dc-text-3">
                        {jam(m.created_at)}
                        {m.read_at && <span>· dibaca</span>}
                        {m.flagged && <span className="font-semibold text-dc-danger">· ditandai berisi kontak</span>}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
