"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import { apiGet, ApiError, type CurrentUser } from "@/lib/api";
import { ErrorBanner, PAGE, relatif, ResultCount, RowsSkeleton, SearchField } from "../../_ui";

// Every client-vendor chat, most recently active first. Admins read them to
// follow up disputes and service quality; opening one is audit-logged.

type Chat = {
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

type Page = { items: Chat[]; total: number; page: number; page_size: number };

function lastPreview(c: Chat): string {
  if (c.messages === 0) return "Belum ada pesan";
  const who = c.last_from === "vendor" ? c.vendor_name : c.client_name;
  const body = c.last_body.trim() || (c.last_type?.startsWith("image") ? "📷 Foto" : "📎 Lampiran");
  return `${who}: ${body}`;
}

export default function AdminChatsPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminChatsContent user={user} />}
    </WithUser>
  );
}

function AdminChatsContent({ user }: { user: CurrentUser }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<{ key: "client_id" | "vendor_id"; id: string } | null>(null);
  const [data, setData] = useState<Page | null>(null);
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
      setData(await apiGet<Page>(`/api/v1/admin/chats?${params}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat percakapan.");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(q.trim(), page, filter), 250);
    return () => window.clearTimeout(t);
  }, [q, page, filter, load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const filterName =
    filter && data?.items[0] ? (filter.key === "client_id" ? data.items[0].client_name : data.items[0].vendor_name) : null;

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader
          eyebrow="Pengguna"
          title={
            <>
              Percakapan <span className="dc-em">klien dan vendor</span>
            </>
          }
          subtitle="Baca percakapan antara calon pengantin dan vendor untuk menindaklanjuti keluhan atau sengketa. Hanya baca: tanda dibaca di kedua pihak tidak berubah. Setiap percakapan yang kamu buka tercatat di audit log."
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SearchField
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            label="Cari percakapan"
            placeholder="Nama klien, email, atau nama vendor"
          />
          {data && <ResultCount shown={data.items.length} total={data.total} noun="percakapan" />}
        </div>
        {filter && (
          <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-dc-text-2">
            Hanya percakapan {filter.key === "client_id" ? "klien" : "vendor"} <strong className="text-dc-ink">{filterName ?? "ini"}</strong>
            <button
              type="button"
              onClick={() => {
                setFilter(null);
                setPage(1);
                window.history.replaceState(null, "", "/internal/admin/percakapan");
              }}
              className="inline-flex min-h-11 items-center font-semibold text-dc-clay underline underline-offset-4"
            >
              Tampilkan semua
            </button>
          </p>
        )}

        {error && <ErrorBanner message={error} onRetry={() => void load(q.trim(), page, filter)} />}
        {!data && !error && <RowsSkeleton rows={6} label="Memuat percakapan" />}
        {data && data.items.length === 0 && (
          <p className="rounded-xl border border-dashed border-dc-line-strong px-4 py-10 text-center text-sm text-dc-text-2">
            {q || filter ? "Tidak ada percakapan yang cocok." : "Belum ada percakapan antara klien dan vendor."}
          </p>
        )}
        {data && data.items.length > 0 && (
          <ul className="divide-y divide-dc-line overflow-hidden rounded-xl border border-dc-line bg-dc-white">
            {data.items.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/internal/admin/percakapan/${c.id}`}
                  className="flex flex-col gap-1 px-4 py-4 transition-colors hover:bg-dc-ivory focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dc-gold sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-dc-ink">
                      {c.client_name || c.client_email} <span className="font-normal text-dc-text-3">dengan</span> {c.vendor_name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-dc-text-2">{lastPreview(c)}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm text-dc-text-3">
                    {c.flagged > 0 && <Badge tone="danger">{c.flagged} pesan ditandai</Badge>}
                    {c.closed_at && <Badge tone="neutral">Ditutup</Badge>}
                    <span>{c.messages} pesan</span>
                    {c.last_at && <span>· {relatif(c.last_at)}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {data && pages > 1 && (
          <nav aria-label="Halaman" className="mt-4 flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Sebelumnya
            </Button>
            <span className="text-sm text-dc-text-2">
              Halaman {page} dari {pages}
            </span>
            <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Berikutnya
            </Button>
          </nav>
        )}
      </div>
    </Shell>
  );
}
