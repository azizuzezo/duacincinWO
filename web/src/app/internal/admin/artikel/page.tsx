"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdmDialog, AdmHeader, Chips, ListSkeleton, Pill, SearchBox } from "@/components/admin/adm";
import { ClientArt } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiDelete, apiGet, apiPost, ApiError, type AdminArticleSummary, type CurrentUser } from "@/lib/api";
import { relatif } from "../../_ui";

export default function AdminArtikelPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminArtikelContent user={user} />}
    </WithUser>
  );
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";

function AdminArtikelContent({ user }: { user: CurrentUser }) {
  const toast = useToast();
  const [items, setItems] = useState<AdminArticleSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<"all" | "published" | "draft">("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminArticleSummary | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    apiGet<AdminArticleSummary[]>("/api/v1/admin/articles")
      .then((d) => setItems(d ?? []))
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const counts = useMemo(() => ({ all: items?.length ?? 0, published: items?.filter((a) => a.status === "published").length ?? 0, draft: items?.filter((a) => a.status === "draft").length ?? 0 }), [items]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (items ?? []).filter((a) => (tab === "all" || a.status === tab) && (!needle || `${a.title} ${a.topic} ${a.slug}`.toLowerCase().includes(needle)));
  }, [items, tab, q]);

  async function setStatus(a: AdminArticleSummary, publish: boolean) {
    setBusy(a.id);
    try {
      const updated = await apiPost<AdminArticleSummary>(`/api/v1/admin/articles/${a.id}/${publish ? "publish" : "unpublish"}`, {});
      setItems((cur) => (cur ?? []).map((x) => (x.id === a.id ? { ...x, ...updated } : x)));
      toast.show(publish ? "Artikel terbit. Muncul di situs dalam beberapa menit." : "Artikel ditarik dari terbit.", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Belum berhasil. Coba lagi sebentar.", "danger");
    } finally {
      setBusy(null);
    }
  }

  async function remove(a: AdminArticleSummary) {
    setBusy(a.id);
    try {
      await apiDelete(`/api/v1/admin/articles/${a.id}`);
      setItems((cur) => (cur ?? []).filter((x) => x.id !== a.id));
      setToDelete(null);
      toast.show("Artikel dihapus.", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Artikel belum bisa dihapus.", "danger");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <AdmHeader
          kicker="Layanan"
          title={
            <>
              Artikel <em>situs</em>
            </>
          }
          sub="Tulis dan atur artikel di halaman Artikel DuaCincin. Artikel lama yang ada di kode tetap tampil dan tidak diatur dari sini."
          action={
            <Link href="/internal/admin/artikel/baru" className={`${wdButton({ variant: "gold", size: "md" })} ${FOCUS}`}>
              Tulis artikel
            </Link>
          }
        />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Chips
            label="Status artikel"
            value={tab}
            onChange={(id) => setTab(id as typeof tab)}
            items={[
              { id: "all", label: "Semua", count: counts.all },
              { id: "published", label: "Terbit", count: counts.published },
              { id: "draft", label: "Draf", count: counts.draft },
            ]}
          />
          <div className="w-full sm:w-72">
            <SearchBox value={q} onChange={setQ} label="Cari artikel" placeholder="Cari judul atau topik" />
          </div>
        </div>

        <div className="mt-4">
          {failed ? (
            <p role="alert" className="border-t border-wd-line py-8 text-sm text-wd-danger">
              Daftar artikel belum bisa dimuat.{" "}
              <button type="button" onClick={load} className={`font-semibold underline underline-offset-4 ${FOCUS}`}>
                Coba lagi
              </button>
            </p>
          ) : items === null ? (
            <ListSkeleton label="Memuat artikel" />
          ) : shown.length === 0 ? (
            <div className="flex items-center gap-4 border-t border-wd-line py-8">
              <span aria-hidden className="h-16 w-16 shrink-0 rounded-2xl bg-wd-accent-wash p-3">
                <ClientArt kind="clipboard" />
              </span>
              <p className="text-wd-text">{items.length === 0 ? "Belum ada artikel yang kamu tulis. Mulai dari tombol Tulis artikel." : "Tidak ada artikel yang cocok."}</p>
            </div>
          ) : (
            <ul className="border-t border-wd-line">
              {shown.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-wd-line px-1 py-4">
                  <Link href={`/internal/admin/artikel/${a.id}`} aria-label={`Edit ${a.title}`} className={`relative block h-[60px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-wd-blush ${FOCUS}`}>
                    {a.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded cover, any storage host
                      <img src={a.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span aria-hidden className="flex h-full items-center justify-center p-3">
                        <ClientArt kind="frame" />
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link href={`/internal/admin/artikel/${a.id}`} className={`wd-title text-[1.15rem] leading-snug hover:text-wd-accent-ink ${FOCUS}`}>
                        {a.title || "Tanpa judul"}
                      </Link>
                      <Pill tone={a.status === "published" ? "gold" : "plain"}>{a.status === "published" ? "Terbit" : "Draf"}</Pill>
                    </p>
                    <p className="mt-0.5 text-sm text-wd-text">
                      {[a.topic, `${a.reading_minutes} menit baca`, `diubah ${relatif(a.updated_at)}`].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-xs text-wd-muted">/artikel/{a.slug}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.status === "published" && (
                      <Link href={`/artikel/${a.slug}`} target="_blank" rel="noopener noreferrer" className={`${wdButton({ variant: "outline", size: "sm" })} ${FOCUS}`}>
                        Lihat
                      </Link>
                    )}
                    <Link href={`/internal/admin/artikel/${a.id}`} className={`${wdButton({ variant: "outline", size: "sm" })} ${FOCUS}`}>
                      Edit
                    </Link>
                    <button type="button" onClick={() => void setStatus(a, a.status !== "published")} disabled={busy === a.id} aria-busy={busy === a.id} className={`${wdButton({ variant: a.status === "published" ? "outline" : "gold", size: "sm" })} ${FOCUS}`}>
                      {a.status === "published" ? "Tarik" : "Terbitkan"}
                    </button>
                    <button type="button" onClick={() => setToDelete(a)} disabled={busy === a.id} aria-label={`Hapus ${a.title}`} className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-wd-danger transition-colors hover:bg-wd-blush ${FOCUS}`}>
                      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {toDelete && (
        <AdmDialog
          title="Hapus artikel ini?"
          note="Artikel hilang dari situs dan dari daftar ini. Foto yang sudah diunggah tetap tersimpan."
          onClose={() => setToDelete(null)}
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setToDelete(null)} className={`${wdButton({ variant: "outline", size: "md" })} ${FOCUS}`}>
                Batal
              </button>
              <button type="button" onClick={() => void remove(toDelete)} disabled={busy === toDelete.id} aria-busy={busy === toDelete.id} className={`inline-flex min-h-12 items-center justify-center rounded-full bg-wd-danger px-6 font-semibold text-white ${FOCUS}`}>
                {busy === toDelete.id ? "Menghapus..." : "Ya, hapus"}
              </button>
            </div>
          }
        >
          <p className="font-semibold text-wd-ink">{toDelete.title}</p>
        </AdmDialog>
      )}
    </AdminShell>
  );
}
