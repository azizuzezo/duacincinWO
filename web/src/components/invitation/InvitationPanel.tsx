"use client";

import Link from "next/link";
import { useState } from "react";

import { FOCUS } from "@/app/client/_ui";
import { ClientArt } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Field";
import { CountUp, FadeIn, GrowX, SuccessPop } from "@/components/ui/Motion";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

import { InvitationPreview } from "./InvitationPreview";
import { packageLabel, useInvitationLink, type InvitationStatus } from "./useInvitationLink";

const FILLED = [
  { title: "Tanggal dan tempat", body: "Dari pengaturan RSVP atau booking vendor kamu." },
  { title: "Daftar tamu", body: "Semua tamu di Tamu & RSVP, lengkap dengan nomor WhatsApp." },
  { title: "Nama kalian", body: "Isi di bawah kalau mau, atau lengkapi nanti di editor." },
];

const AFTER = [
  "Tab baru terbuka di DuaCincin Digital Invitation dan kamu langsung masuk dengan akun ini.",
  "Data pernikahan sudah terisi. Pilih tema, foto, dan paket di sana.",
  "Jawaban RSVP tamu kembali tampil di halaman ini.",
];

const btn = (variant: Parameters<typeof wdButton>[0] extends infer P ? (P extends { variant?: infer V } ? V : never) : never, size: "sm" | "md" | "lg" = "md", extra = "") =>
  `${wdButton({ variant, size })} ${FOCUS} ${extra}`;

/** Full /client/undangan content: explains, links, and shows status. */
export function InvitationPanel() {
  const link = useInvitationLink();
  const { state, reload } = link;

  if (state.kind === "loading") {
    return (
      <SkeletonGroup label="Memuat status undangan" className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-14 w-4/5 rounded-lg" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-4 h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-[480px] rounded-[24px]" />
      </SkeletonGroup>
    );
  }
  if (state.kind === "unavailable") {
    return (
      <EmptyState
        title="Digital Invitation segera hadir"
        body="Sebentar lagi kamu bisa membuat Digital Invitation langsung dari data pernikahan di sini."
        actionHref="/client/wedding-planner/guests"
        actionLabel="Rapikan daftar tamu dulu"
      />
    );
  }
  if (state.kind === "error") {
    return <ErrorState title="Status undangan belum termuat" body={state.message} onRetry={() => void reload()} />;
  }
  return state.status.linked ? <Linked status={state.status} link={link} /> : <NotLinked link={link} />;
}

type LinkApi = ReturnType<typeof useInvitationLink>;

function Check() {
  return (
    <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-wd-accent-soft text-wd-accent-ink">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

function NotLinked({ link }: { link: LinkApi }) {
  const { show } = useToast();
  const [bride, setBride] = useState("");
  const [groom, setGroom] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const err = await link.open({ bride, groom });
    if (err) setError(err);
    else show("Undangan dibuka di tab baru. Kembali ke sini kapan saja untuk melihat RSVP.", "success");
  };

  return (
    <div className="grid gap-x-14 gap-y-10 pb-24 md:pb-0 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="min-w-0">
        <p className="wd-kicker">Digital Invitation</p>
        <h2 className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
          Undangan kalian, <em>sudah setengah jadi.</em>
        </h2>
        <p className="mt-3 max-w-xl text-[1.02rem] leading-relaxed text-wd-text">
          Data pernikahan yang kalian susun di sini langsung mengisi DuaCincin Digital Invitation. Kalian tinggal memilih tema dan foto.
        </p>

        <ul className="mt-6 max-w-xl border-t border-wd-line">
          {FILLED.map((f) => (
            <li key={f.title} className="flex gap-3 border-b border-wd-line py-3.5">
              <Check />
              <p className="leading-snug text-wd-text">
                <span className="font-semibold text-wd-ink">{f.title}.</span> {f.body}
              </p>
            </li>
          ))}
        </ul>

        <form id="undangan-form" onSubmit={submit} noValidate className="mt-10 max-w-xl">
          <h3 className="wd-title text-[1.5rem] leading-tight">Nama di undangan</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-wd-text">
            Nama mempelai belum tersimpan di DuaCincin WO. Isi sekarang dan lihat langsung di contoh undangan, atau kosongkan dan lengkapi nanti.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input label="Nama mempelai wanita" optional value={bride} maxLength={120} autoComplete="off" onChange={(e) => setBride(e.target.value)} />
            <Input label="Nama mempelai pria" optional value={groom} maxLength={120} autoComplete="off" onChange={(e) => setGroom(e.target.value)} />
          </div>
          <div aria-live="polite" className="mt-4 hidden md:block">
            {error && <p className="text-sm font-medium text-wd-danger">{error}</p>}
          </div>
          <button type="submit" disabled={link.opening} aria-busy={link.opening} className={btn("gold", "lg", "mt-3 hidden md:inline-flex")}>
            {link.opening ? "Membuka..." : "Buat Digital Invitation"}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-wd-muted">
            Terbuka di tab baru. Paket undangan dibayar di DuaCincin Digital Invitation, terpisah dari booking vendor.
          </p>
        </form>

        <div className="mt-10 max-w-xl">
          <h3 className="wd-title text-[1.25rem]">Setelah tombol ditekan</h3>
          <ol className="mt-2 border-t border-wd-line">
            {AFTER.map((a, i) => (
              <li key={a} className="flex items-baseline gap-4 border-b border-wd-line py-3">
                <span aria-hidden className="wd-display w-5 shrink-0 text-[1.4rem] italic leading-none text-wd-accent-ink">
                  {i + 1}
                </span>
                <span className="sr-only">Langkah {i + 1}: </span>
                <span className="text-sm leading-relaxed text-wd-text">{a}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* The preview is the focal point: a soft gold panel sets it apart from the form. */}
      <div className="rounded-[28px] bg-wd-accent-wash px-4 py-7 sm:px-8 lg:sticky lg:top-24">
        <InvitationPreview bride={bride} groom={groom} />
      </div>

      {/* Mobile: the one action stays reachable at the bottom edge. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-wd-line bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:hidden">
        <div aria-live="polite">{error && <p className="mx-auto mb-2 max-w-md text-sm font-medium text-wd-danger">{error}</p>}</div>
        <button type="submit" form="undangan-form" disabled={link.opening} aria-busy={link.opening} className={btn("gold", "md", "mx-auto flex w-full max-w-md")}>
          {link.opening ? "Membuka..." : "Buat Digital Invitation"}
        </button>
      </div>
    </div>
  );
}

function Linked({ status, link }: { status: InvitationStatus; link: LinkApi }) {
  const { show } = useToast();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const openEditor = async () => {
    setMessage(null);
    const err = await link.open();
    if (err) setMessage({ tone: "error", text: err });
  };

  const sync = async () => {
    setMessage(null);
    const res = await link.syncGuests();
    if ("error" in res) setMessage({ tone: "error", text: res.error });
    else setMessage({ tone: "ok", text: res.added > 0 ? `${res.added} tamu baru masuk ke undangan.` : "Semua tamu sudah ada di undangan." });
  };

  const copy = async () => {
    if (!status.url) return;
    try {
      await navigator.clipboard.writeText(status.url);
      show("Link undangan disalin.", "success");
    } catch {
      show("Link belum bisa disalin. Tekan lama pada link untuk menyalin.", "danger");
    }
  };

  const paid = !!status.package_type && status.package_type !== "demo";
  const { hadir, tidak, ragu } = status.rsvp;
  const answered = hadir + tidak + ragu;
  const shareText = status.url ? `https://wa.me/?text=${encodeURIComponent(`Dengan penuh syukur kami mengundang Anda. Buka undangan kami di sini: ${status.url}`)}` : "";

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="terhubung" className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_200px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="wd-kicker">Digital Invitation</p>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${paid ? "bg-wd-accent text-wd-ink" : "bg-wd-accent-soft text-wd-accent-ink"}`}>
              {packageLabel(status.package_type)}
            </span>
          </div>
          <h2 id="terhubung" className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
            Undangan kalian <em>sudah terhubung.</em>
          </h2>
          <p className="mt-3 max-w-lg text-[1.02rem] leading-relaxed text-wd-text">Ubah tema, foto, dan detail acara di editor. RSVP tamu terkumpul di sini.</p>

          <div className="mt-6 max-w-2xl rounded-[24px] bg-wd-accent-wash p-5 sm:p-6">
            {status.url ? (
              <>
                <p className="text-sm font-semibold text-wd-accent-ink">Link untuk tamu</p>
                <p className="wd-display mt-1 break-all text-[1.3rem] leading-snug">{status.url.replace(/^https?:\/\//, "")}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={copy} className={btn("ink", "sm")}>
                    Salin link
                  </button>
                  <a href={shareText} target="_blank" rel="noopener noreferrer" className={btn("outline", "sm")}>
                    Bagikan lewat WhatsApp
                  </a>
                  <a href={status.url} target="_blank" rel="noopener noreferrer" className={btn("outline", "sm")}>
                    Lihat undangan
                  </a>
                </div>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-wd-text">Undangan belum punya alamat sendiri. Atur alamatnya di editor, lalu link untuk tamu muncul di sini.</p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={openEditor} disabled={link.opening} aria-busy={link.opening} className={btn("gold", "md")}>
              {link.opening ? "Membuka..." : "Buka editor undangan"}
            </button>
            <button type="button" onClick={sync} disabled={link.syncing} aria-busy={link.syncing} className={btn("outline", "md")}>
              {link.syncing ? "Mengirim..." : "Kirim ulang daftar tamu"}
            </button>
          </div>
          <div aria-live="polite" className="mt-3">
            {message && (
              <p className={`flex items-center gap-3 text-sm font-medium ${message.tone === "ok" ? "text-wd-ok" : "text-wd-danger"}`}>
                {message.tone === "ok" && <SuccessPop key={message.text} tone="success" className="shrink-0" />}
                {message.text}
              </p>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-wd-muted">Tamu yang sudah ada di undangan tidak akan dobel.</p>
        </div>
        <div className="hidden aspect-square w-full max-w-[200px] justify-self-center rounded-[28px] bg-wd-accent-wash p-7 lg:block">
          <ClientArt kind="envelope" />
        </div>
      </section>

      <FadeIn delay={0.08}>
        <section aria-labelledby="rsvp-heading" className="grid gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
          <div>
            <h2 id="rsvp-heading" className="wd-title text-[clamp(1.55rem,2.6vw,2.05rem)] leading-tight">
              Jawaban <em>RSVP</em>
            </h2>
            {answered === 0 ? (
              <p className="mt-2 max-w-md leading-relaxed text-wd-text">Belum ada tamu yang menjawab. Bagikan link undangan, jawaban mereka muncul di sini.</p>
            ) : (
              <>
                <p className="mt-4 flex items-baseline gap-3">
                  <span className="wd-display text-[clamp(3rem,6vw,4.4rem)] leading-none tabular-nums">
                    <CountUp value={hadir} />
                  </span>
                  <span className="text-wd-text">akan hadir</span>
                </p>
                <div aria-hidden className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-wd-blush">
                  <GrowX className="flex h-full w-full">
                    <span className="h-full bg-wd-accent-deep" style={{ width: `${(hadir / answered) * 100}%` }} />
                    <span className="h-full bg-wd-line-2" style={{ width: `${(ragu / answered) * 100}%` }} />
                    <span className="h-full bg-wd-muted" style={{ width: `${(tidak / answered) * 100}%` }} />
                  </GrowX>
                </div>
              </>
            )}
            <dl className="mt-6 grid grid-cols-3 divide-x divide-wd-line border-t border-wd-line pt-5">
              {[
                { label: "Hadir", value: hadir, dot: "bg-wd-accent-deep" },
                { label: "Masih ragu", value: ragu, dot: "bg-wd-line-2" },
                { label: "Tidak hadir", value: tidak, dot: "bg-wd-muted" },
              ].map((r, i) => (
                <div key={r.label} className={i > 0 ? "pl-4 sm:pl-6" : "pr-4"}>
                  <dt className="flex items-center gap-2 text-sm text-wd-text">
                    <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${r.dot}`} />
                    {r.label}
                  </dt>
                  <dd className="wd-display mt-1 text-[1.7rem] tabular-nums">
                    <CountUp value={r.value} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="border-t border-wd-line pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p className="text-sm font-semibold text-wd-text">Tamu di undangan</p>
            <p className="wd-display mt-1 text-[3.2rem] leading-none tabular-nums">
              <CountUp value={status.guests} />
            </p>
            <p className="mt-3 text-sm leading-relaxed text-wd-text">
              Tambah tamu di{" "}
              <Link href="/client/wedding-planner/guests" className={`font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink ${FOCUS}`}>
                Tamu &amp; RSVP
              </Link>
              , lalu kirim ulang daftar tamu.
            </p>
          </div>
        </section>
      </FadeIn>
    </div>
  );
}
