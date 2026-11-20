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
import { ErrorBanner, Monogram, PAGE, ResultCount, RowsSkeleton, SearchField, tanggal } from "../../_ui";

// Klien terdaftar: every couple's account, with the WhatsApp number only
// admins may see, and shortcuts to their chats and to a WhatsApp message.

type Client = {
  id: string;
  full_name: string;
  email: string;
  account_status: string;
  created_at: string;
  whatsapp: string;
  whatsapp_status: "verified" | "pending" | "none";
  conversations: number;
  bookings: number;
};

type Page = { items: Client[]; total: number; page: number; page_size: number };

const WA_BADGE: Record<Client["whatsapp_status"], { tone: "success" | "gold" | "neutral"; label: string }> = {
  verified: { tone: "success", label: "WA terverifikasi" },
  pending: { tone: "gold", label: "WA belum verifikasi" },
  none: { tone: "neutral", label: "Belum isi WA" },
};

export default function AdminClientsPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminClientsContent user={user} />}
    </WithUser>
  );
}

function AdminClientsContent({ user }: { user: CurrentUser }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  // ?q= (e.g. from a chat's "Klien: email" link) starts with that search.
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) queueMicrotask(() => setQ(initial));
  }, []);
  const [data, setData] = useState<Page | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (query: string, p: number) => {
    setError(null);
    try {
      setData(await apiGet<Page>(`/api/v1/admin/clients?${new URLSearchParams({ q: query, page: String(p) })}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar klien.");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(q.trim(), page), 250);
    return () => window.clearTimeout(t);
  }, [q, page, load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader
          eyebrow="Pengguna"
          title={
            <>
              Klien <span className="dc-em">terdaftar</span>
            </>
          }
          subtitle="Semua akun calon pengantin. Nomor WhatsApp hanya terlihat oleh admin."
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SearchField
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            label="Cari klien"
            placeholder="Nama, email, atau nomor WA"
          />
          {data && <ResultCount shown={data.items.length} total={data.total} noun="klien" />}
        </div>

        {error && <ErrorBanner message={error} onRetry={() => void load(q.trim(), page)} />}
        {!data && !error && <RowsSkeleton rows={6} label="Memuat klien" />}
        {data && data.items.length === 0 && (
          <p className="rounded-xl border border-dashed border-dc-line-strong px-4 py-10 text-center text-sm text-dc-text-2">
            {q ? "Tidak ada klien yang cocok dengan pencarian." : "Belum ada klien yang mendaftar."}
          </p>
        )}
        {data && data.items.length > 0 && (
          <ul className="divide-y divide-dc-line overflow-hidden rounded-xl border border-dc-line bg-dc-white">
            {data.items.map((c) => {
              const wa = WA_BADGE[c.whatsapp_status];
              return (
                <li key={c.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Monogram name={c.full_name || c.email} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-dc-ink">
                        {c.full_name || "(tanpa nama)"}
                        {c.account_status !== "active" && (
                          <Badge tone="danger" className="ml-2">
                            {c.account_status === "suspended" ? "Ditangguhkan" : "Diputus"}
                          </Badge>
                        )}
                      </p>
                      <p className="truncate text-sm text-dc-text-2">{c.email}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-dc-text-2">
                        <Badge tone={wa.tone}>{wa.label}</Badge>
                        {c.whatsapp && <span className="whitespace-nowrap">{c.whatsapp}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dc-text-2 sm:justify-end">
                    <span>Daftar {tanggal(c.created_at)}</span>
                    <span>{c.bookings} booking</span>
                    <Link
                      href={`/internal/admin/percakapan?client=${c.id}`}
                      className="inline-flex min-h-11 items-center font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink"
                    >
                      {c.conversations} percakapan
                    </Link>
                    {c.whatsapp_status === "verified" && (
                      <Link
                        href={`/internal/admin/whatsapp?user=${c.id}`}
                        className="inline-flex min-h-11 items-center font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink"
                      >
                        Kirim WhatsApp
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
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
