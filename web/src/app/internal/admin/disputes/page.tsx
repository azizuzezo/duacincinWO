"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdmAvatar, AdmEmpty, AdmError, AdmHead, AdmList, AdmListItem, AdmPill, AdmRowsSkeleton, AdmTabs, ADM_DANGER_BTN, ADM_FIELD, ADM_FOCUS } from "@/components/admin/admUi";
import { wdButton } from "@/components/home/ui";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, type CurrentUser, type Dispute } from "@/lib/api";
import { relatif, SANCTION_LABEL, tanggal, tanggalJam } from "../../_ui";

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

type TabKey = "open" | "resolved";

function vendorName(d: Dispute) {
  return d.vendor_business_name ?? `Vendor #${d.vendor_id.slice(0, 8)}`;
}

function sanctionTone(s: string) {
  return s === "none" ? "ok" : s === "warning" ? "gold" : "danger";
}

function AdminDisputesContent({ user }: { user: CurrentUser }) {
  const [tab, setTab] = useState<TabKey>("open");
  const [lists, setLists] = useState<{ open: Dispute[]; resolved: Dispute[] }>({ open: [], resolved: [] });
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [choice, setChoice] = useState<Sanction | null>(null);
  const [step, setStep] = useState<"case" | "confirm">("case");
  const [typed, setTyped] = useState("");
  const { show } = useToast();

  function load() {
    Promise.all([apiGet<Dispute[]>("/api/v1/admin/disputes/open"), apiGet<Dispute[]>("/api/v1/admin/disputes/resolved")])
      .then(([open, resolved]) => {
        setLists({ open: open ?? [], resolved: resolved ?? [] });
        setLoadFailed(false);
      })
      .catch((err) => {
        setLoadFailed(true);
        setError(err instanceof ApiError ? err.message : "Gagal memuat sengketa.");
      })
      .finally(() => setLoaded(true));
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const disputes = lists[tab];
  const isOpen = tab === "open";
  const active = [...lists.open, ...lists.resolved].find((d) => d.id === activeId) ?? null;
  const activeIsOpen = !!active && active.status !== "resolved" && lists.open.some((d) => d.id === active.id);
  const chosen = SANCTIONS.find((s) => s.value === choice);
  const typedOk = choice !== "terminate" || (!!active && typed.trim().toLowerCase() === vendorName(active).trim().toLowerCase());

  function openCase(id: string) {
    setActiveId(id);
    setChoice(null);
    setStep("case");
    setTyped("");
    setError(null);
  }

  function closeCase() {
    if (busy) return;
    setActiveId(null);
    setChoice(null);
    setStep("case");
    setTyped("");
  }

  async function handleResolve() {
    const d = active;
    if (!d || !choice || !typedOk) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/v1/admin/disputes/${d.id}/resolve`, { sanction: choice });
      show(`Sengketa ${vendorName(d)} diputuskan: ${SANCTION_LABEL[choice]}.`, "success");
      setActiveId(null);
      setChoice(null);
      setStep("case");
      setTyped("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyelesaikan sengketa.");
      setStep("case");
    } finally {
      setBusy(false);
    }
  }

  const modalTitle = !active ? "Detail sengketa" : step === "confirm" && chosen ? `${chosen.label} untuk ${vendorName(active)}?` : vendorName(active);

  return (
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <AdmHead
          kicker="Uang dan sengketa"
          title={
            <>
              Sengketa <em>vendor</em>
            </>
          }
          note="Laporan pelanggaran, misalnya mengajak client bertransaksi di luar DuaCincin. Baca buktinya, lalu tetapkan keputusan."
        />

        <div className="mt-8">
          <AdmTabs<TabKey>
            idBase="sengketa"
            label="Status sengketa"
            value={tab}
            onChange={(k) => {
              setError(null);
              setTab(k);
            }}
            tabs={[
              { key: "open", label: "Terbuka", count: loaded && !loadFailed ? lists.open.length : undefined, hot: true },
              { key: "resolved", label: "Selesai", count: loaded && !loadFailed ? lists.resolved.length : undefined },
            ]}
          />

          <div id="panel-sengketa" role="tabpanel" aria-labelledby={`tab-sengketa-${tab}`} className="pt-4">
            {error && !loadFailed && !active && <AdmError message={error} />}
            {!loaded ? (
              <AdmRowsSkeleton rows={3} label="Memuat sengketa" />
            ) : loadFailed ? (
              <ErrorState
                title="Sengketa belum bisa dimuat"
                onRetry={() => {
                  setError(null);
                  load();
                }}
              />
            ) : disputes.length === 0 ? (
              <AdmEmpty art={isOpen ? "clipboard" : "frame"} title={isOpen ? "Tidak ada sengketa terbuka" : "Belum ada riwayat sengketa"}>
                {isOpen ? "Laporan baru, baik dari client maupun pesan yang ditandai otomatis, akan muncul di sini." : "Sengketa yang sudah kamu putuskan tercatat di sini."}
              </AdmEmpty>
            ) : (
              <AdmList label={isOpen ? "Sengketa terbuka" : "Riwayat sengketa"}>
                {disputes.map((d) => (
                  <AdmListItem key={d.id}>
                    <button type="button" onClick={() => openCase(d.id)} className={`flex min-h-[76px] w-full items-start gap-3 px-1 py-4 text-left transition-colors hover:bg-wd-paper sm:px-3 focus-visible:-outline-offset-2 ${ADM_FOCUS}`}>
                      <AdmAvatar name={vendorName(d)} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="truncate font-semibold text-wd-ink">{vendorName(d)}</span>
                          <time dateTime={d.created_at} className="shrink-0 text-xs text-wd-muted">
                            {relatif(d.created_at)}
                          </time>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-sm leading-relaxed text-wd-text">{d.reason}</span>
                        <span className="mt-2 flex flex-wrap items-center gap-1.5">
                          <AdmPill>{d.message_id ? "Dari chat" : "Laporan client"}</AdmPill>
                          {!isOpen && d.sanction_applied && <AdmPill tone={sanctionTone(d.sanction_applied)}>{SANCTION_LABEL[d.sanction_applied] ?? d.sanction_applied}</AdmPill>}
                          <span className="text-xs font-semibold text-wd-accent-ink">{isOpen ? "Tinjau" : "Lihat"}</span>
                        </span>
                      </span>
                    </button>
                  </AdmListItem>
                ))}
              </AdmList>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={!!active}
        onClose={closeCase}
        title={modalTitle}
        description={active ? (step === "confirm" ? undefined : `Dilaporkan ${tanggalJam(active.created_at)}`) : undefined}
        size="lg"
      >
        {active && step === "case" && (
          <div className="flex flex-col gap-5">
            {error && <AdmError message={error} />}

            {/* Evidence: the server keeps the flagged chat message; the report text is what it recorded. */}
            <section aria-labelledby={`bukti-${active.id}`}>
              <h3 id={`bukti-${active.id}`} className="text-sm font-semibold text-wd-ink">
                Bukti
              </h3>
              <div className="mt-2 rounded-2xl bg-wd-accent-wash p-4">
                <p className="text-xs text-wd-muted">{active.message_id ? "Pesan chat yang ditandai otomatis" : "Isi laporan"}</p>
                <blockquote className="mt-1.5 border-l-2 border-wd-accent-deep pl-3 text-[1.05rem] leading-snug text-wd-ink">{active.reason}</blockquote>
                {active.message_id && <p className="mt-3 text-sm leading-relaxed text-wd-text">Pesan aslinya tersimpan utuh di riwayat chat vendor dan client sebagai bukti.</p>}
              </div>
            </section>

            <p className="text-sm leading-relaxed text-wd-text">
              Keputusan di sini tidak mengubah booking atau dana apa pun. Dana booking tetap ditahan Dana Aman sampai acara selesai, lalu masuk{" "}
              <Link href="/internal/admin/disbursements" className={`font-semibold text-wd-accent-ink underline underline-offset-4 ${ADM_FOCUS}`}>
                antrian pencairan
              </Link>
              .
            </p>

            {activeIsOpen ? (
              <fieldset>
                <legend className="text-sm font-semibold text-wd-ink">Keputusan</legend>
                <div className="mt-2 flex flex-col gap-2">
                  {SANCTIONS.map((s) => {
                    const on = choice === s.value;
                    return (
                      <label
                        key={s.value}
                        className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wd-ink ${
                          on ? (s.severe ? "border-wd-danger bg-wd-danger/[0.05]" : "border-wd-accent-deep bg-wd-accent-wash") : "border-wd-line bg-white hover:border-wd-line-2"
                        }`}
                      >
                        <input type="radio" name={`sanksi-${active.id}`} value={s.value} checked={on} onChange={() => setChoice(s.value)} className="mt-1 h-4 w-4 accent-wd-ink" />
                        <span>
                          <span className={`block font-semibold ${s.severe ? "text-wd-danger" : "text-wd-ink"}`}>{s.label}</span>
                          <span className="block text-sm text-wd-text">{s.effect}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={!choice}
                  onClick={() => setStep("confirm")}
                  className={`mt-4 w-full ${chosen?.severe ? ADM_DANGER_BTN : `${wdButton({ variant: "ink", size: "md" })} ${ADM_FOCUS}`}`}
                >
                  {chosen ? `Tetapkan: ${chosen.label}` : "Pilih keputusan dulu"}
                </button>
              </fieldset>
            ) : (
              <section className="flex flex-wrap items-center gap-2 border-t border-wd-line pt-4">
                <span className="text-sm text-wd-muted">Keputusan</span>
                {active.sanction_applied ? <AdmPill tone={sanctionTone(active.sanction_applied)}>{SANCTION_LABEL[active.sanction_applied] ?? active.sanction_applied}</AdmPill> : "-"}
                {active.resolved_at && <span className="text-sm text-wd-text">pada {tanggal(active.resolved_at)}</span>}
              </section>
            )}
          </div>
        )}

        {active && step === "confirm" && chosen && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) void handleResolve();
            }}
            className="flex flex-col gap-4"
          >
            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${chosen.severe ? "bg-wd-danger/[0.06] text-wd-ink" : "bg-wd-accent-wash text-wd-text"}`}>
              {chosen.effect} Vendor mendapat notifikasi dan sengketa pindah ke riwayat.
              {chosen.severe && <span className="mt-2 block font-semibold text-wd-danger">Keputusan ini tidak bisa dibatalkan dari halaman ini.</span>}
            </div>
            {choice === "terminate" && (
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-wd-ink">
                <span>
                  Ketik <em className="font-display text-base text-wd-danger">{vendorName(active)}</em> untuk melanjutkan
                </span>
                <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={ADM_FIELD} />
              </label>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setStep("case")} disabled={busy} className={`${wdButton({ variant: "outline", size: "md" })} ${ADM_FOCUS}`}>
                Kembali
              </button>
              <button type="submit" disabled={busy || !typedOk} className={chosen.severe ? ADM_DANGER_BTN : `${wdButton({ variant: "ink", size: "md" })} ${ADM_FOCUS}`}>
                {busy ? "Memproses..." : `Tetapkan: ${chosen.label}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </AdminShell>
  );
}
