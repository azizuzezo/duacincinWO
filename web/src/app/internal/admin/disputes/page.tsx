"use client";

import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ADMIN_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, type CurrentUser, type Dispute } from "@/lib/api";
import { ConfirmDialog, ErrorBanner, Monogram, PAGE, QueueItem, relatif, RowsSkeleton, SANCTION_LABEL, tanggal, tanggalJam, useMediaQuery } from "../../_ui";

export default function AdminDisputesPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <AdminDisputesContent user={user} />}
    </WithUser>
  );
}

type Sanction = "none" | "warning" | "suspend" | "terminate";

// The ladder mirrors what the server does on resolve (PRD §11.1): warning and
// "none" only record the decision; suspend and terminate change the account.
const SANCTIONS: { value: Sanction; label: string; effect: string; severe: boolean }[] = [
  { value: "none", label: SANCTION_LABEL.none, effect: "Laporan ditutup tanpa sanksi. Akun vendor tidak berubah.", severe: false },
  { value: "warning", label: SANCTION_LABEL.warning, effect: "Dicatat sebagai peringatan. Akun vendor tetap aktif.", severe: false },
  { value: "suspend", label: SANCTION_LABEL.suspend, effect: "Vendor tidak bisa masuk ke akunnya selama 30 hari.", severe: true },
  { value: "terminate", label: SANCTION_LABEL.terminate, effect: "Akun vendor diputus permanen dan tidak bisa masuk lagi.", severe: true },
];

function vendorName(d: Dispute) {
  return d.vendor_business_name ?? `Vendor #${d.vendor_id.slice(0, 8)}`;
}

function AdminDisputesContent({ user }: { user: CurrentUser }) {
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loadedTab, setLoadedTab] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [choice, setChoice] = useState<Sanction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const { show } = useToast();

  function load() {
    apiGet<Dispute[]>(`/api/v1/admin/disputes/${tab === "open" ? "open" : "resolved"}`)
      .then((data) => {
        setDisputes(data ?? []);
        setLoadFailed(false);
      })
      .catch((err) => {
        setLoadFailed(true);
        setError(err instanceof ApiError ? err.message : "Gagal memuat sengketa.");
      })
      .finally(() => setLoadedTab(tab));
  }

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleResolve() {
    const d = disputes.find((x) => x.id === activeId);
    if (!d || !choice) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/v1/admin/disputes/${d.id}/resolve`, { sanction: choice });
      show(`Sengketa ${vendorName(d)} diputuskan: ${SANCTION_LABEL[choice]}.`, "success");
      setConfirmOpen(false);
      setSheetOpen(false);
      setActiveId(null);
      setChoice(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyelesaikan sengketa.");
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function select(id: string) {
    setActiveId(id);
    setChoice(null);
    if (!desktop) setSheetOpen(true);
  }

  const loading = loadedTab !== tab;
  const isOpen = tab === "open";
  // On desktop the first case is open by default so the pane is never blank.
  const active = disputes.find((d) => d.id === activeId) ?? (desktop ? disputes[0] : undefined);
  const chosen = SANCTIONS.find((s) => s.value === choice);

  const caseView = active ? (
    <CaseView
      d={active}
      isOpen={isOpen}
      choice={choice}
      onChoose={setChoice}
      onDecide={() => {
        setActiveId(active.id);
        setConfirmOpen(true);
      }}
    />
  ) : null;

  return (
    <Shell user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className={PAGE}>
        <PageHeader
          eyebrow="Uang dan sengketa"
          title={
            <>
              Sengketa <span className="dc-em">vendor</span>
            </>
          }
          subtitle="Laporan pelanggaran, misalnya mengajak client bertransaksi di luar DuaCincin. Baca buktinya, lalu tetapkan keputusan."
        />

        <Tabs
          idBase="sengketa"
          label="Status sengketa"
          value={tab}
          onChange={(id) => {
            setError(null);
            setActiveId(null);
            setChoice(null);
            setTab(id as "open" | "resolved");
          }}
          items={[
            { id: "open", label: "Terbuka", count: loadedTab === "open" && !loadFailed ? disputes.length : undefined },
            { id: "resolved", label: "Riwayat" },
          ]}
        />

        <TabPanel idBase="sengketa" id={tab} value={tab} className="mt-6">
          {error && !loadFailed && <ErrorBanner message={error} />}
          {loading ? (
            <RowsSkeleton rows={3} label="Memuat sengketa" />
          ) : loadFailed ? (
            <ErrorState title="Sengketa belum bisa dimuat" onRetry={() => { setError(null); load(); }} />
          ) : disputes.length === 0 ? (
            <EmptyState
              title={isOpen ? "Tidak ada sengketa terbuka" : "Belum ada riwayat sengketa"}
              body={isOpen ? "Laporan baru dari sistem atau client akan muncul di sini." : "Sengketa yang sudah kamu putuskan tercatat di sini."}
            />
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
              <ul className="flex flex-col gap-2" aria-label={isOpen ? "Sengketa terbuka" : "Riwayat sengketa"}>
                <AnimatePresence initial={false}>
                {disputes.map((d, i) => {
                  const selected = desktop && active?.id === d.id;
                  return (
                    <QueueItem key={d.id} index={i}>
                      <button
                        type="button"
                        onClick={() => select(d.id)}
                        aria-current={selected ? "true" : undefined}
                        className={`flex w-full items-start gap-3 rounded-xl border px-4 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
                          selected ? "border-dc-ink bg-dc-white" : "border-dc-line bg-dc-white hover:border-dc-line-strong"
                        }`}
                      >
                        <Monogram name={vendorName(d)} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="truncate font-semibold text-dc-ink">{vendorName(d)}</span>
                            <time dateTime={d.created_at} className="shrink-0 text-xs text-dc-text-3">
                              {relatif(d.created_at)}
                            </time>
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-sm text-dc-text-2">{d.reason}</span>
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            {d.message_id && <Badge tone="neutral">Dari chat</Badge>}
                            {!isOpen && d.sanction_applied && <Badge tone={sanctionTone(d.sanction_applied)}>{SANCTION_LABEL[d.sanction_applied] ?? d.sanction_applied}</Badge>}
                          </span>
                        </span>
                      </button>
                    </QueueItem>
                  );
                })}
                </AnimatePresence>
              </ul>

              {desktop && <div className="sticky top-6">{caseView}</div>}
            </div>
          )}
        </TabPanel>
      </div>

      {!desktop && (
        <Sheet open={sheetOpen && !!active} onClose={() => setSheetOpen(false)} title="Detail sengketa" description={active ? vendorName(active) : undefined}>
          {caseView}
        </Sheet>
      )}

      <ConfirmDialog
        open={confirmOpen && !!active && !!chosen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleResolve}
        busy={busy}
        tone={chosen?.severe ? "danger" : "primary"}
        title={chosen ? `${chosen.label} untuk ${active ? vendorName(active) : "vendor"}?` : "Tetapkan keputusan"}
        consequence={
          <>
            {chosen?.effect} Vendor mendapat notifikasi dan sengketa pindah ke riwayat.
            {chosen?.severe && <span className="mt-2 block font-semibold text-dc-danger">Keputusan ini tidak bisa dibatalkan dari halaman ini.</span>}
          </>
        }
        confirmLabel={chosen ? `Tetapkan: ${chosen.label}` : "Tetapkan"}
        typeToConfirm={choice === "terminate" && active ? vendorName(active) : undefined}
      />
    </Shell>
  );
}

function sanctionTone(s: string) {
  return s === "none" ? "success" : s === "warning" ? "gold" : "danger";
}

function CaseView({
  d,
  isOpen,
  choice,
  onChoose,
  onDecide,
}: {
  d: Dispute;
  isOpen: boolean;
  choice: Sanction | null;
  onChoose: (s: Sanction) => void;
  onDecide: () => void;
}) {
  return (
    <article aria-label={`Kasus ${vendorName(d)}`} className="flex flex-col gap-5 lg:rounded-xl lg:border lg:border-dc-line lg:bg-dc-white lg:p-6">
      <header className="hidden items-center gap-4 lg:flex">
        <Monogram name={vendorName(d)} size="lg" />
        <div className="min-w-0">
          <h2 className="font-heading text-3xl leading-tight text-dc-ink">{vendorName(d)}</h2>
          <p className="text-sm text-dc-text-3">Dilaporkan {tanggalJam(d.created_at)}</p>
        </div>
      </header>
      <p className="text-sm text-dc-text-3 lg:hidden">Dilaporkan {tanggalJam(d.created_at)}</p>

      {/* Evidence: the server keeps the flagged chat message; the report text is what it recorded. */}
      <section aria-labelledby={`bukti-${d.id}`}>
        <h3 id={`bukti-${d.id}`} className="text-sm font-semibold text-dc-ink">
          Bukti
        </h3>
        <div className="mt-2 rounded-lg border border-dc-line bg-dc-ivory p-4">
          <p className="text-xs text-dc-text-3">{d.message_id ? "Catatan sistem atas pesan chat yang ditandai" : "Isi laporan"}</p>
          <blockquote className="mt-1.5 border-l-2 border-dc-gold pl-3 font-heading text-xl italic leading-snug text-dc-ink">{d.reason}</blockquote>
          {d.message_id && (
            <p className="mt-3 text-sm leading-relaxed text-dc-text-2">
              Pesan aslinya tersimpan utuh di riwayat chat vendor dan client sebagai bukti.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby={`dana-${d.id}`}>
        <h3 id={`dana-${d.id}`} className="text-sm font-semibold text-dc-ink">
          Posisi dana
        </h3>
        <div className="mt-2 rounded-lg bg-dc-cream p-4 text-sm leading-relaxed text-dc-text-2">
          Keputusan di sini tidak mengubah booking atau dana apa pun. Dana booking tetap mengikuti escrow: ditahan sampai acara selesai, lalu masuk{" "}
          <Link href="/internal/admin/disbursements" className="font-semibold text-dc-clay underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold">
            antrian pencairan
          </Link>
          .
        </div>
      </section>

      {isOpen ? (
        <fieldset>
          <legend className="text-sm font-semibold text-dc-ink">Keputusan</legend>
          <div className="mt-2 flex flex-col gap-2">
            {SANCTIONS.map((s) => {
              const on = choice === s.value;
              return (
                <label
                  key={s.value}
                  className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-dc-gold ${
                    on ? (s.severe ? "border-dc-danger bg-dc-danger/[0.05]" : "border-dc-ink bg-dc-white") : "border-dc-line bg-dc-white hover:border-dc-line-strong"
                  }`}
                >
                  <input type="radio" name={`sanksi-${d.id}`} value={s.value} checked={on} onChange={() => onChoose(s.value)} className="mt-1 h-4 w-4 accent-dc-ink" />
                  <span>
                    <span className={`block font-semibold ${s.severe ? "text-dc-danger" : "text-dc-ink"}`}>{s.label}</span>
                    <span className="block text-sm text-dc-text-2">{s.effect}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <Button className="mt-4 w-full" onClick={onDecide} disabled={!choice} variant={SANCTIONS.find((s) => s.value === choice)?.severe ? "danger" : "primary"}>
            {choice ? `Tetapkan: ${SANCTION_LABEL[choice]}` : "Pilih keputusan dulu"}
          </Button>
        </fieldset>
      ) : (
        <section className="rounded-lg border border-dc-line p-4">
          <p className="text-sm text-dc-text-3">Keputusan</p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            {d.sanction_applied ? <Badge tone={sanctionTone(d.sanction_applied)}>{SANCTION_LABEL[d.sanction_applied] ?? d.sanction_applied}</Badge> : "-"}
            {d.resolved_at && <span className="text-sm text-dc-text-2">pada {tanggal(d.resolved_at)}</span>}
          </p>
        </section>
      )}
    </article>
  );
}
