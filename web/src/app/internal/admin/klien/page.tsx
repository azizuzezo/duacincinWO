"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { VA_BTN_OUTLINE, VA_FOCUS, VaAlert, VaAvatar, VaEmpty, VaHeader, VaList, VaPill, VaRow, VaSearch, VaSkeleton, type VaTone } from "@/components/admin/VaKit";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { WithUser } from "@/components/WithUser";
import { apiGet, ApiError, type CurrentUser } from "@/lib/api";
import { tanggal } from "../../_ui";

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

const WA_BADGE: Record<Client["whatsapp_status"], { tone: VaTone; label: string }> = {
  verified: { tone: "ok", label: "WA terverifikasi" },
  pending: { tone: "warn", label: "WA belum verifikasi" },
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
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <VaHeader
          kicker="Pengguna"
          title={
            <>
              Klien <em>terdaftar</em>
            </>
          }
          sub="Semua akun calon pengantin. Nomor WhatsApp hanya terlihat oleh admin."
        />

        <div className="mb-3 mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
          <VaSearch
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            label="Cari klien"
            placeholder="Nama, email, atau nomor WA"
          />
          {data && (
            <p className="text-sm text-wd-muted" aria-live="polite">
              {data.items.length === data.total ? `${data.total} klien` : `${data.items.length} dari ${data.total} klien`}
            </p>
          )}
        </div>

        {error && <VaAlert message={error} onRetry={() => void load(q.trim(), page)} />}
        {!data && !error && <VaSkeleton rows={6} label="Memuat klien" />}
        {data && data.items.length === 0 && (
          <VaEmpty art="people" title={q ? "Tidak ada yang cocok" : "Belum ada klien"}>
            {q ? "Tidak ada klien yang cocok dengan pencarian." : "Belum ada klien yang mendaftar."}
          </VaEmpty>
        )}
        {data && data.items.length > 0 && (
          <VaList>
            {data.items.map((c) => {
              const wa = WA_BADGE[c.whatsapp_status];
              return (
                <VaRow key={c.id}>
                  <div className="flex flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:px-2">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <VaAvatar name={c.full_name || c.email} />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-wd-ink">
                          <span className="break-words">{c.full_name || "(tanpa nama)"}</span>
                          {c.account_status !== "active" && <VaPill tone="danger">{c.account_status === "suspended" ? "Ditangguhkan" : "Diputus"}</VaPill>}
                        </p>
                        <p className="truncate text-sm text-wd-text">{c.email}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-wd-text">
                          <VaPill tone={wa.tone}>{wa.label}</VaPill>
                          {c.whatsapp && <span className="whitespace-nowrap">{c.whatsapp}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-14 text-sm text-wd-text sm:justify-end sm:pl-0">
                      <span>Daftar {tanggal(c.created_at)}</span>
                      <span>{c.bookings} booking</span>
                      <Link href={`/internal/admin/percakapan?client=${c.id}`} className={`inline-flex min-h-11 items-center font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink ${VA_FOCUS}`}>
                        {c.conversations} percakapan
                      </Link>
                      {c.whatsapp_status === "verified" && (
                        <Link href={`/internal/admin/whatsapp?user=${c.id}`} className={`inline-flex min-h-11 items-center font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink ${VA_FOCUS}`}>
                          Kirim WhatsApp
                        </Link>
                      )}
                    </div>
                  </div>
                </VaRow>
              );
            })}
          </VaList>
        )}

        {data && pages > 1 && (
          <nav aria-label="Halaman" className="mt-5 flex items-center justify-between gap-3">
            <button type="button" className={VA_BTN_OUTLINE} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Sebelumnya
            </button>
            <span className="text-sm text-wd-text">
              Halaman {page} dari {pages}
            </span>
            <button type="button" className={VA_BTN_OUTLINE} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Berikutnya
            </button>
          </nav>
        )}
      </div>
    </AdminShell>
  );
}
