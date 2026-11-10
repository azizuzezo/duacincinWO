"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Field";
import { CountUp, FadeIn, GrowX, SuccessPop } from "@/components/ui/Motion";
import { Rings } from "@/components/ui/Rings";
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
  "Tab baru terbuka di DuaCincin Undangan dan kamu langsung masuk dengan akun ini.",
  "Data pernikahan sudah terisi. Pilih tema, foto, dan paket di sana.",
  "Jawaban RSVP tamu kembali tampil di halaman ini.",
];

/** Full /client/undangan content: explains, links, and shows status. */
export function InvitationPanel() {
  const link = useInvitationLink();
  const { state, reload } = link;

  if (state.kind === "loading") {
    return (
      <SkeletonGroup label="Memuat status undangan" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-14 w-4/5 rounded-lg" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-4 h-64 rounded-xl" />
        </div>
        <Skeleton className="h-[480px] rounded-[28px]" />
      </SkeletonGroup>
    );
  }
  if (state.kind === "unavailable") {
    return (
      <EmptyState
        title="Undangan digital segera hadir"
        body="Sebentar lagi kamu bisa membuat undangan digital langsung dari data pernikahan di sini."
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
    <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dc-gold/20 text-dc-clay">
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
    <div className="grid gap-x-12 gap-y-8 pb-24 md:pb-0 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="min-w-0 animate-fade-up lg:col-start-1 lg:row-start-1">
        <p className="dc-eyebrow mb-3">DuaCincin Undangan</p>
        <h2 className="max-w-xl font-heading text-[2.4rem] leading-[1.04] text-dc-ink sm:text-[3.2rem]">
          Undangan kalian, <em className="dc-em">sudah setengah jadi.</em>
        </h2>
        <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-dc-text-2">
          Data pernikahan yang kalian susun di sini langsung mengisi undangan digital di DuaCincin Undangan. Kalian tinggal memilih tema dan foto.
        </p>
      </div>

      {/* The preview is the focal point: a stage behind it sets it apart from the form. */}
      <div className="relative overflow-hidden rounded-2xl bg-dc-cream px-4 py-7 sm:px-8 lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <Rings className="pointer-events-none absolute -left-24 -top-16 h-72 w-[28rem] opacity-40" strokeWidth={0.5} />
        <div className="relative">
          <InvitationPreview bride={bride} groom={groom} />
        </div>
      </div>

      <div className="min-w-0 lg:col-start-1 lg:row-start-2">

        <ul className="flex max-w-xl flex-col gap-4">
          {FILLED.map((f) => (
            <li key={f.title} className="flex gap-3">
              <Check />
              <p className="leading-relaxed text-dc-text-2">
                <span className="font-semibold text-dc-ink">{f.title}.</span> {f.body}
              </p>
            </li>
          ))}
        </ul>

        <Card className="mt-8 p-5 sm:p-7">
          <form id="undangan-form" onSubmit={submit} noValidate>
            <h3 className="font-heading text-[1.75rem] leading-tight text-dc-ink">Nama di undangan</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-dc-text-2">
              Nama mempelai belum tersimpan di DuaCincin WO. Isi sekarang dan lihat langsung di contoh undangan, atau kosongkan dan lengkapi nanti.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input label="Nama mempelai wanita" optional value={bride} maxLength={120} autoComplete="off" onChange={(e) => setBride(e.target.value)} />
              <Input label="Nama mempelai pria" optional value={groom} maxLength={120} autoComplete="off" onChange={(e) => setGroom(e.target.value)} />
            </div>
            <div aria-live="polite" className="mt-4 hidden md:block">
              {error && <p className="text-sm font-medium text-dc-danger">{error}</p>}
            </div>
            <Button type="submit" variant="gold" size="lg" loading={link.opening} className="mt-2 hidden md:inline-flex">
              Buat undangan digital
            </Button>
            <p className="mt-3 text-xs leading-relaxed text-dc-text-3">
              Terbuka di tab baru. Paket undangan dibayar di DuaCincin Undangan, terpisah dari booking vendor.
            </p>
          </form>
        </Card>

        <div className="mt-8 max-w-xl">
          <p className="font-heading text-xl text-dc-ink">Setelah tombol ditekan</p>
          <ol className="mt-3 flex flex-col border-l border-dc-gold/50 pl-5">
            {AFTER.map((a, i) => (
              <li key={a} className="relative py-1.5 text-sm leading-relaxed text-dc-text-2">
                <span aria-hidden className="absolute -left-[25px] top-3 h-2 w-2 rounded-full bg-dc-gold" />
                <span className="sr-only">Langkah {i + 1}: </span>
                {a}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Mobile: the one action stays reachable above the bottom tab bar. */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-dc-line bg-dc-ivory/95 px-4 py-3 md:hidden">
        <div aria-live="polite">{error && <p className="mx-auto mb-2 max-w-md text-sm font-medium text-dc-danger">{error}</p>}</div>
        <Button type="submit" form="undangan-form" variant="gold" block loading={link.opening} className="mx-auto max-w-md">
          Buat undangan digital
        </Button>
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
    <div className="flex flex-col gap-8">
      {/* The one ink block of the page: the invitation itself, with its link. */}
      <Card tone="ink" className="relative overflow-hidden p-6 sm:p-9">
        <Rings className="pointer-events-none absolute -right-16 -top-10 h-64 w-96 opacity-25" stroke="var(--dc-gold-antique)" strokeWidth={0.6} />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="dc-eyebrow is-light mb-3">Undangan digital</p>
            <h2 className="font-heading text-[2.2rem] leading-[1.05] sm:text-[2.8rem]">
              Undangan kalian <em className="dc-em-light">sudah terhubung.</em>
            </h2>
            <p className="mt-2 max-w-lg leading-relaxed text-dc-on-dark/80">Ubah tema, foto, dan detail acara di editor. RSVP tamu terkumpul di sini.</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold ${paid ? "bg-dc-gold-antique text-dc-ink" : "border border-dc-on-dark/30 text-dc-on-dark"}`}>
            {packageLabel(status.package_type)}
          </span>
        </div>

        <div className="relative mt-7 rounded-xl border border-dc-on-dark/15 bg-dc-ink-2 p-4 sm:p-5">
          {status.url ? (
            <>
              <p className="text-sm font-semibold text-dc-gold-antique">Link untuk tamu</p>
              <p className="mt-1 break-all font-heading text-[1.35rem] leading-snug text-dc-on-dark">{status.url.replace(/^https?:\/\//, "")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="light" size="sm" onClick={copy}>
                  Salin link
                </Button>
                <a href={shareText} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "ghostLight", size: "sm" })}>
                  Bagikan lewat WhatsApp
                </a>
                <a href={status.url} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "ghostLight", size: "sm" })}>
                  Lihat undangan
                </a>
              </div>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-dc-on-dark/80">
              Undangan belum punya alamat sendiri. Atur alamatnya di editor, lalu link untuk tamu muncul di sini.
            </p>
          )}
        </div>

        <div className="relative mt-7 flex flex-wrap gap-2">
          <Button variant="gold" loading={link.opening} onClick={openEditor}>
            Buka editor undangan
          </Button>
          <Button variant="ghostLight" loading={link.syncing} onClick={sync}>
            Kirim ulang daftar tamu
          </Button>
        </div>
        <div aria-live="polite" className="relative mt-3">
          {message && (
            <p className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${message.tone === "ok" ? "bg-dc-on-dark text-dc-success" : "bg-dc-on-dark text-dc-danger"}`}>
              {message.tone === "ok" && <SuccessPop key={message.text} tone="success" className="shrink-0" />}
              {message.text}
            </p>
          )}
        </div>
        <p className="relative mt-1 text-xs leading-relaxed text-dc-on-dark/75">Tamu yang sudah ada di undangan tidak akan dobel.</p>
      </Card>

      <FadeIn delay={0.08}>
      <section aria-labelledby="rsvp-heading" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="p-6 sm:p-8">
          <h2 id="rsvp-heading" className="font-heading text-[1.9rem] leading-tight text-dc-ink">
            Jawaban RSVP
          </h2>
          {answered === 0 ? (
            <p className="mt-2 max-w-md leading-relaxed text-dc-text-2">
              Belum ada tamu yang menjawab. Bagikan link undangan, jawaban mereka muncul di sini.
            </p>
          ) : (
            <>
              <p className="mt-4 flex items-baseline gap-3">
                <span className="font-heading text-[4rem] font-semibold leading-none text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">
                  <CountUp value={hadir} />
                </span>
                <span className="text-dc-text-2">akan hadir</span>
              </p>
              <div aria-hidden className="mt-5 h-3 w-full overflow-hidden rounded-full bg-dc-cream">
                <GrowX className="flex h-full w-full">
                  <span className="h-full bg-dc-gold" style={{ width: `${(hadir / answered) * 100}%` }} />
                  <span className="h-full bg-dc-line-strong" style={{ width: `${(ragu / answered) * 100}%` }} />
                  <span className="h-full bg-dc-text-3" style={{ width: `${(tidak / answered) * 100}%` }} />
                </GrowX>
              </div>
            </>
          )}
          <dl className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: "Hadir", value: hadir, dot: "bg-dc-gold" },
              { label: "Masih ragu", value: ragu, dot: "bg-dc-line-strong" },
              { label: "Tidak hadir", value: tidak, dot: "bg-dc-text-3" },
            ].map((r) => (
              <div key={r.label} className="rounded-lg bg-dc-cream px-3 py-3">
                <dt className="flex items-center gap-2 text-sm text-dc-text-2">
                  <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${r.dot}`} />
                  {r.label}
                </dt>
                <dd className="mt-1 font-heading text-[1.9rem] font-semibold leading-none text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">
                  <CountUp value={r.value} />
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card tone="paper" className="flex flex-col justify-between gap-4 p-6">
          <div>
            <p className="text-sm font-semibold text-dc-text-2">Tamu di undangan</p>
            <p className="mt-1 font-heading text-[3.2rem] font-semibold leading-none text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">
              <CountUp value={status.guests} />
            </p>
          </div>
          <p className="text-sm leading-relaxed text-dc-text-2">
            Tambah tamu di <Link href="/client/wedding-planner/guests" className="font-semibold text-dc-clay underline underline-offset-4">Tamu &amp; RSVP</Link>, lalu kirim ulang daftar tamu.
          </p>
        </Card>
      </section>
      </FadeIn>
    </div>
  );
}
