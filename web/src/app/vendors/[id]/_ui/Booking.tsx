"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

import { Shield, wdButton } from "@/components/home/ui";
import { Input } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { formatRupiah, type VendorPackage, type VendorProfile } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

import { TanggalPicker, todayIso } from "./TanggalPicker";
import { Pulse, WdButton } from "./wd";

/** "Rp8.500.000" -> "Rp8,5 jt" for the narrow mobile bar only. */
function shortRupiah(v: number): string {
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return formatRupiah(v);
}

/** The escrow path as three stations. Same wording as before the redesign,
 * so the promise reads the same before and after booking. */
export function EscrowSteps() {
  const steps = [
    { t: "Kamu bayar lewat DuaCincin", d: "DP lalu pelunasan, tidak ke rekening pribadi vendor." },
    { t: "Dana ditahan", d: "Disimpan aman selama persiapan." },
    { t: "Diteruskan ke vendor", d: "Setelah kamu mengonfirmasi acara selesai." },
  ];
  return (
    <ol className="relative grid gap-4">
      <span aria-hidden className="absolute bottom-3 left-[5px] top-3 w-px bg-wd-line-2" />
      {steps.map((s, i) => (
        <li key={s.t} className="relative flex gap-3">
          <span aria-hidden className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${i === 2 ? "bg-wd-ok" : "border-2 border-wd-accent bg-white"}`} />
          <div>
            <p className="text-sm font-semibold text-wd-ink">{s.t}</p>
            <p className="text-sm leading-relaxed text-wd-muted">{s.d}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

type Common = {
  profile: VendorProfile;
  isClient: boolean;
  checkingUser: boolean;
  starting: boolean;
  onChat: () => void;
  onBook: () => void;
  /** Login link that brings the visitor back to this profile. */
  loginHref: string;
};

const textLink =
  "-mr-2 inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-sm font-semibold text-wd-accent-ink underline-offset-4 hover:underline";

function swap(reduced: boolean | null) {
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduced ? 0 : -6 },
    transition: { duration: reduced ? 0.01 : 0.28, ease: EASE },
  } as const;
}

/** Desktop only: the sticky decision card in the right column. On phones the
 * same actions live in MobileActionBar. */
export function BookingCard({
  profile,
  isClient,
  checkingUser,
  starting,
  onChat,
  onBook,
  eventDate,
  setEventDate,
  selected,
  onClearPackage,
  onSeePackages,
  error,
  loginHref,
}: Common & {
  eventDate: string;
  setEventDate: (v: string) => void;
  selected: VendorPackage | null;
  onClearPackage: () => void;
  onSeePackages: () => void;
  error: string | null;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="rounded-[20px] border border-wd-line bg-white p-6 shadow-wd-card">
      {profile.price_min > 0 ? (
        <div>
          <p className="text-sm text-wd-muted">Mulai dari</p>
          <p className="mt-0.5 text-[1.75rem] font-semibold leading-tight tracking-tight text-wd-ink tabular-nums">{formatRupiah(profile.price_min)}</p>
          {profile.price_max > profile.price_min && <p className="mt-0.5 text-sm text-wd-muted">hingga {formatRupiah(profile.price_max)}, tergantung paket</p>}
        </div>
      ) : (
        <div>
          <p className="text-lg font-semibold text-wd-ink">Tanya harga lewat chat</p>
          <p className="mt-0.5 text-sm text-wd-muted">Vendor ini menyesuaikan harga dengan kebutuhanmu.</p>
        </div>
      )}

      <div className="my-5 h-px bg-wd-line" />

      {checkingUser ? (
        <div className="grid gap-3" aria-hidden>
          <Pulse className="h-12" />
          <Pulse className="h-12 rounded-full" />
          <Pulse className="h-12 rounded-full" />
        </div>
      ) : isClient ? (
        <div className="grid gap-4">
          <TanggalPicker label="Tanggal acara" min={todayIso()} value={eventDate} onChange={setEventDate} hint={eventDate ? undefined : "Bisa diubah lagi saat mengajukan booking."} />
          {/* The chosen package swaps in place (crossfade + slight rise) so
              picking one in the Paket section visibly lands here. */}
          <div className={`overflow-hidden rounded-[14px] px-4 py-3 transition-colors duration-300 ${selected ? "bg-wd-accent-wash ring-1 ring-wd-accent-line" : "bg-wd-paper"}`}>
            <AnimatePresence initial={false} mode="popLayout">
              {selected ? (
                <motion.div key={selected.id} {...swap(reduced)} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-wd-muted">Paket dipilih</p>
                    <p className="break-words font-semibold text-wd-ink">{selected.name}</p>
                    {selected.price > 0 && <p className="text-sm tabular-nums text-wd-text">{formatRupiah(selected.price)}</p>}
                  </div>
                  <button type="button" onClick={onClearPackage} className={`${textLink} -mt-1`}>
                    Hapus<span className="sr-only"> paket {selected.name}</span>
                  </button>
                </motion.div>
              ) : (
                <motion.div key="none" {...swap(reduced)} className="flex items-center justify-between gap-3">
                  <p className="text-sm text-wd-text">Belum memilih paket</p>
                  <button type="button" onClick={onSeePackages} className={textLink}>
                    Lihat paket
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <WdButton block onClick={onChat} loading={starting}>
            Chat dengan vendor
          </WdButton>
          <WdButton variant="outline" block onClick={onBook} aria-haspopup="dialog">
            Ajukan booking
          </WdButton>
          <p className="text-center text-xs leading-relaxed text-wd-muted">Sepakati paket dan harga lewat chat dulu. Kamu belum membayar apa pun saat mengajukan.</p>
        </div>
      ) : (
        <div>
          <p className="text-sm leading-relaxed text-wd-text">Masuk sebagai Client untuk chat dan mengajukan booking ke vendor ini.</p>
          <Link href={loginHref} className={wdButton({ className: "mt-4 w-full" })}>
            Masuk untuk chat
          </Link>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-wd-danger/[0.06] px-3 py-2 text-sm text-wd-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-3 rounded-[14px] bg-wd-accent-wash p-4">
        <Shield size={20} className="mt-0.5 shrink-0 text-wd-accent-ink" />
        <div>
          <p className="text-sm font-semibold text-wd-ink">Uangmu dijaga escrow DuaCincin</p>
          <p className="mt-0.5 text-sm leading-relaxed text-wd-text">Dana ditahan dan baru diteruskan ke vendor setelah kamu mengonfirmasi acara selesai.</p>
        </div>
      </div>
    </div>
  );
}

/** Phones and tablets: price + the actions, always under the thumb. */
export function MobileActionBar({ profile, isClient, checkingUser, starting, onChat, onBook, error, loginHref }: Common & { error: string | null }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-wd-line bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(35,31,29,0.12)] lg:hidden">
      {error && (
        <p role="alert" className="mx-auto mb-2 max-w-xl rounded-lg bg-wd-danger/[0.06] px-3 py-2 text-sm text-wd-danger">
          {error}
        </p>
      )}
      <div className="mx-auto flex max-w-xl items-center gap-2">
        <div className="min-w-0 flex-1">
          {profile.price_min > 0 ? (
            <>
              <p className="text-xs text-wd-muted">Mulai dari</p>
              <p className="truncate font-semibold tabular-nums text-wd-ink">{shortRupiah(profile.price_min)}</p>
            </>
          ) : (
            <p className="text-sm leading-tight text-wd-text">Tanya harga lewat chat</p>
          )}
        </div>
        {checkingUser ? (
          <Pulse className="h-11 w-40 rounded-full" />
        ) : isClient ? (
          <>
            <WdButton variant="outline" size="sm" onClick={onBook} aria-haspopup="dialog" aria-label="Ajukan booking">
              Booking
            </WdButton>
            <WdButton size="sm" onClick={onChat} loading={starting} aria-label="Chat dengan vendor">
              Chat vendor
            </WdButton>
          </>
        ) : (
          <Link href={loginHref} className={wdButton({ size: "sm", className: "!min-h-11" })}>
            Masuk untuk chat
          </Link>
        )}
      </div>
    </div>
  );
}

/** The booking request form, in a sheet so the profile stays in view. Same
 * fields and endpoint as before: date, package description, agreed price. */
export function BookingSheet({
  open,
  onClose,
  packages,
  eventDate,
  setEventDate,
  packageDescription,
  setPackageDescription,
  agreedPrice,
  setAgreedPrice,
  onPickPackage,
  saving,
  error,
  dateError,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  packages: VendorPackage[];
  eventDate: string;
  setEventDate: (v: string) => void;
  packageDescription: string;
  setPackageDescription: (v: string) => void;
  agreedPrice: string;
  setAgreedPrice: (v: string) => void;
  onPickPackage: (p: VendorPackage) => void;
  saving: boolean;
  error: string | null;
  dateError: string | null;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const price = Number(agreedPrice) || 0;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ajukan booking"
      description="Vendor akan mengonfirmasi sebelum kamu membayar DP."
      footer={
        <WdButton type="submit" form="booking-form" block loading={saving}>
          Kirim pengajuan booking
        </WdButton>
      }
    >
      <form id="booking-form" onSubmit={onSubmit} className="grid gap-5">
        <TanggalPicker label="Tanggal acara" min={todayIso()} value={eventDate} onChange={setEventDate} error={dateError} />

        {packages.length > 0 && (
          <fieldset>
            <legend className="text-sm font-semibold text-wd-ink">Pilih dari paket vendor</legend>
            <div className="mt-2 grid gap-2">
              {packages.map((p) => {
                const active = packageDescription === p.name;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onPickPackage(p)}
                    className={`flex min-h-12 items-center justify-between gap-3 rounded-[14px] border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent-ink ${
                      active ? "border-wd-accent-line bg-wd-accent-soft" : "border-wd-line-2 hover:border-wd-ink"
                    }`}
                  >
                    <span className="min-w-0 break-words text-sm font-semibold text-wd-ink">{p.name}</span>
                    <span className="shrink-0 text-sm tabular-nums text-wd-text">{p.price > 0 ? formatRupiah(p.price) : "Lewat chat"}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <Input label="Deskripsi paket" value={packageDescription} onChange={(e) => setPackageDescription(e.target.value)} hint="Tulis paket yang sudah kamu sepakati di chat." />
        <Input
          label="Harga disepakati (Rp)"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required
          placeholder="Contoh: 18.500.000"
          value={price > 0 ? price.toLocaleString("id-ID") : ""}
          onChange={(e) => setAgreedPrice(e.target.value.replace(/\D/g, "").replace(/^0+/, ""))}
          hint="Isi harga yang sudah kamu sepakati di chat. Harga di DuaCincin sudah termasuk biaya layanan."
        />

        <div className="rounded-[14px] bg-wd-paper p-4">
          <p className="mb-3 text-sm font-semibold text-wd-ink">Setelah vendor mengonfirmasi</p>
          <EscrowSteps />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-wd-danger/[0.06] px-3 py-2 text-sm text-wd-danger">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}
