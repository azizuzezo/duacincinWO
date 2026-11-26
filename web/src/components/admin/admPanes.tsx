"use client";

// Inbox panes for the admin console: the conversation list that sits beside
// an open thread. AdmChatsPane lists every client-vendor chat (read-only for
// admins, searchable, paged by the server); AdmConvPane lists the admin's own
// vendor chats or the consultation inbox.
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { ConversationAvatar, describeConversation } from "@/components/ConversationList";
import { ClientArt } from "@/components/home/ClientArt";
import { apiGet, ApiError, type Conversation } from "@/lib/api";
import { relatif } from "@/app/internal/_ui";

import { ADM_FOCUS, AdmAvatar, AdmEmpty, AdmError, AdmPill, AdmRowsSkeleton, AdmSearch } from "./admUi";

/* -------------------------------------------------------- client-vendor chats */

export type AdmChat = {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  vendor_id: string;
  vendor_name: string;
  created_at: string;
  closed_at?: string;
  messages: number;
  flagged: number;
  last_body: string;
  last_type?: string;
  last_at?: string;
  last_from?: "client" | "vendor";
};

type ChatPage = { items: AdmChat[]; total: number; page: number; page_size: number };

function lastPreview(c: AdmChat): string {
  if (c.messages === 0) return "Belum ada pesan";
  const who = c.last_from === "vendor" ? c.vendor_name : c.client_name;
  const body = c.last_body.trim() || (c.last_type?.startsWith("image") ? "Foto" : "Lampiran");
  return `${who}: ${body}`;
}

export function AdmChatsPane({ activeId, className = "" }: { activeId?: string; className?: string }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<{ key: "client_id" | "vendor_id"; id: string } | null>(null);
  const [data, setData] = useState<ChatPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ?client=<id> or ?vendor=<id> narrows to one person (from the client list
  // or a vendor's detail page).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const client = p.get("client");
    const vendor = p.get("vendor");
    queueMicrotask(() => {
      if (client) setFilter({ key: "client_id", id: client });
      else if (vendor) setFilter({ key: "vendor_id", id: vendor });
    });
  }, []);

  const load = useCallback(async (query: string, p: number, f: typeof filter) => {
    setError(null);
    try {
      const params = new URLSearchParams({ q: query, page: String(p) });
      if (f) params.set(f.key, f.id);
      setData(await apiGet<ChatPage>(`/api/v1/admin/chats?${params}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat percakapan.");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(q.trim(), page, filter), 250);
    return () => window.clearTimeout(t);
  }, [q, page, filter, load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const filterName = filter && data?.items[0] ? (filter.key === "client_id" ? data.items[0].client_name : data.items[0].vendor_name) : null;

  return (
    <aside aria-label="Semua percakapan" className={`flex min-h-0 flex-col ${className}`}>
      <div className="flex flex-col gap-2 pb-3">
        <AdmSearch
          id="adm-chat-cari"
          label="Cari percakapan"
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Nama klien, email, atau vendor"
        />
        {data && (
          <p className="px-1 text-sm text-wd-muted" role="status">
            {data.total > data.items.length ? `${data.items.length} dari ${data.total} percakapan` : `${data.total} percakapan`}
          </p>
        )}
        {filter && (
          <p className="flex flex-wrap items-center gap-x-2 px-1 text-sm text-wd-text">
            Hanya {filter.key === "client_id" ? "klien" : "vendor"} <strong className="text-wd-ink">{filterName ?? "ini"}</strong>
            <button
              type="button"
              onClick={() => {
                setFilter(null);
                setPage(1);
                window.history.replaceState(null, "", "/internal/admin/percakapan");
              }}
              className={`inline-flex min-h-11 items-center font-semibold text-wd-accent-ink underline underline-offset-4 ${ADM_FOCUS}`}
            >
              Tampilkan semua
            </button>
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && <AdmError message={error} onRetry={() => void load(q.trim(), page, filter)} />}
        {!data && !error && <AdmRowsSkeleton rows={5} label="Memuat percakapan" />}
        {data && data.items.length === 0 && <AdmEmpty art="bubble">{q || filter ? "Tidak ada percakapan yang cocok." : "Belum ada percakapan antara klien dan vendor."}</AdmEmpty>}
        {data && data.items.length > 0 && (
          <ul aria-label="Daftar percakapan" className="border-t border-wd-line">
            {data.items.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id} className="border-b border-wd-line">
                  <Link
                    href={`/internal/admin/percakapan/${c.id}`}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[72px] items-center gap-3 px-2 py-3 transition-colors focus-visible:-outline-offset-2 ${ADM_FOCUS} ${active ? "bg-wd-accent-wash" : "hover:bg-wd-paper"}`}
                  >
                    <AdmAvatar name={c.client_name || c.client_email} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold text-wd-ink">
                          {c.client_name || c.client_email} <span className="font-normal text-wd-muted">dengan</span> {c.vendor_name}
                        </span>
                        {c.last_at && <time dateTime={c.last_at} className="shrink-0 text-xs text-wd-muted">{relatif(c.last_at)}</time>}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-wd-text">{lastPreview(c)}</span>
                      {(c.flagged > 0 || c.closed_at) && (
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          {c.flagged > 0 && <AdmPill tone="danger">{c.flagged} pesan ditandai</AdmPill>}
                          {c.closed_at && <AdmPill>Ditutup</AdmPill>}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {data && pages > 1 && (
          <nav aria-label="Halaman" className="mt-3 flex items-center justify-between gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-wd-ink hover:bg-wd-paper disabled:opacity-40 ${ADM_FOCUS}`}>
              Sebelumnya
            </button>
            <span className="text-sm text-wd-text">
              {page} / {pages}
            </span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-wd-ink hover:bg-wd-paper disabled:opacity-40 ${ADM_FOCUS}`}>
              Berikutnya
            </button>
          </nav>
        )}
      </div>
    </aside>
  );
}

/* ----------------------------------------------- admin's own chats, consultations */

export function AdmConvPane({
  userId,
  basePath,
  type,
  activeId,
  searchPlaceholder,
  emptyText,
  className = "",
}: {
  userId: string;
  basePath: string;
  type: Conversation["type"];
  activeId?: string;
  searchPlaceholder: string;
  emptyText: ReactNode;
  className?: string;
}) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  function load() {
    setState("loading");
    apiGet<Conversation[]>(`/api/v1/conversations?type=${type}`)
      .then((c) => {
        setItems(c ?? []);
        setState("ready");
      })
      .catch((err) => {
        setMessage(err instanceof ApiError ? err.message : "Percakapan belum bisa dimuat.");
        setState("error");
      });
  }

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = query.trim().toLowerCase();
  const shown = items.filter((c) => !q || describeConversation(c, userId).name.toLowerCase().includes(q));

  return (
    <aside aria-label="Semua percakapan" className={`flex min-h-0 flex-col ${className}`}>
      {state === "ready" && items.length > 0 && (
        <div className="pb-3">
          <AdmSearch id={`adm-conv-cari-${type}`} label="Cari percakapan" value={query} onChange={setQuery} placeholder={searchPlaceholder} />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {state === "loading" && <AdmRowsSkeleton rows={4} label="Memuat percakapan" />}
        {state === "error" && <AdmError message={message} onRetry={load} />}
        {state === "ready" && items.length === 0 && <AdmEmpty art="bubble">{emptyText}</AdmEmpty>}
        {state === "ready" && items.length > 0 && shown.length === 0 && (
          <p role="status" className="border-t border-wd-line px-2 py-8 text-center text-sm text-wd-text">
            Tidak ada percakapan yang cocok.
          </p>
        )}
        {state === "ready" && shown.length > 0 && (
          <ul aria-label="Daftar percakapan" className="border-t border-wd-line">
            {shown.map((c) => {
              const d = describeConversation(c, userId);
              const active = c.id === activeId;
              return (
                <li key={c.id} className="border-b border-wd-line">
                  <Link
                    href={`${basePath}/${c.id}`}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[72px] items-center gap-3 px-2 py-3 transition-colors focus-visible:-outline-offset-2 ${ADM_FOCUS} ${active ? "bg-wd-accent-wash" : "hover:bg-wd-paper"}`}
                  >
                    <ConversationAvatar name={d.name} consult={d.consult} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-wd-ink">{d.name}</span>
                      <span className="block truncate text-sm text-wd-text">{d.role}</span>
                    </span>
                    {c.closed_at && <AdmPill>Ditutup</AdmPill>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

/** Right pane of a list page before a thread is picked (desktop only). */
export function AdmPickPane({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="hidden flex-col items-center justify-center rounded-[22px] bg-wd-accent-wash px-8 text-center md:flex">
      <span aria-hidden className="block h-28 w-28">
        <ClientArt kind="bubble" />
      </span>
      <p className="wd-display mt-4 text-[1.9rem] leading-tight">{title}</p>
      <div className="mt-2 max-w-sm text-sm leading-relaxed text-wd-text">{children}</div>
    </div>
  );
}

export const ADM_SPLIT = "md:grid md:h-[calc(100dvh-13rem)] md:min-h-[520px] md:grid-cols-[320px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[360px_minmax(0,1fr)]";
