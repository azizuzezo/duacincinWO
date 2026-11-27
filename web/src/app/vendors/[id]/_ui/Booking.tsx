"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

import { Shield, wdButton } from "@/components/home/ui";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
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

/** One line under the date field: where the date came from, or why it cannot be used. */
export function dateHint(eventDate: string, weddingDate: string | undefined, unavailable: Record<string, "booked" | "blocked"> | undefined): string | undefined {
  if (weddingDate && unavailable?.[weddingDate] && !eventDate) return "Vendor ini tidak tersedia di tanggal nikahmu. Pilih tanggal lain, atau chat vendor dulu.";
  if (weddingDate && eventDate === weddingDate) return "Terisi dari tanggal nikahmu. Bisa kamu ubah.";
  if (!eventDate) return "Bisa diubah lagi saat mengajukan booking.";
  return undefined;
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
  unavailable,
  weddingDate,
}: Common & {
  unavailable?: Record<string, "booked" | "blocked">;
  weddingDate?: string;
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
          <TanggalPicker
            label="Tanggal acara"
            min={todayIso()}
            value={eventDate}
            onChange={setEventDate}
            unavailable={unavailable}
            marked={weddingDate}
            hint={dateHint(eventDate, weddingDate, unavailable)}
          />
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
          <p className="text-sm font-semibold text-wd-ink">Uangmu dijaga Dana Aman DuaCincin</p>
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

/** The booking request form, as a centered dialog so the profile stays in
 * view behind it. Same fields and endpoint as always (date, package
 * description, agreed price), but picking a package fills the price for the
 * couple, and a live summary shows what DP and pelunasan will be. */
export function BookingDialog({
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
  unavailable,
  weddingDate,
}: {
  unavailable?: Record<string, "booked" | "blocked">;
  weddingDate?: string;
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
  const picked = packages.find((p) => p.name === packageDescription) ?? null;
  // "Paket lain" is the way out when nothing fits, and the only mode when the vendor lists no packages.
  const [otherChosen, setOtherChosen] = useState(false);
  const other = packages.length === 0 || otherChosen;
  // A package with no listed price ("Lewat chat") still needs the agreed price typed in.
  const needsPrice = other || (picked !== null && picked.price <= 0);
  const dp = Math.round(price * 0.3);

  function chooseOther() {
    setOtherChosen(true);
    setPackageDescription("");
    setAgreedPrice("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Ajukan booking"
      description="Vendor mengonfirmasi dulu. Kamu belum membayar apa pun sekarang."
    >
      <form id="booking-form" onSubmit={onSubmit} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem] md:gap-8">
        <div className="grid content-start gap-6">
          <TanggalPicker label="Tanggal acara" min={todayIso()} value={eventDate} onChange={setEventDate} error={dateError} unavailable={unavailable} marked={weddingDate} hint={dateHint(eventDate, weddingDate, unavailable)} />

          <fieldset>
            <legend className="text-sm font-semibold text-wd-ink">Paket</legend>
            <div className="mt-2 grid gap-2">
              {packages.map((p) => {
                const checked = !other && picked?.id === p.id;
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-wd-line-2 px-4 py-3 transition-colors hover:border-wd-ink has-[:checked]:border-wd-accent-line has-[:checked]:bg-wd-accent-wash has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wd-accent-ink"
                  >
                    <input
                      type="radio"
                      name="booking-package"
                      className="peer sr-only"
                      checked={checked}
                      onChange={() => {
                        setOtherChosen(false);
                        onPickPackage(p);
                      }}
                    />
                    <RadioDot />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="break-words text-sm font-semibold text-wd-ink">{p.name}</span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-wd-ink">{p.price > 0 ? formatRupiah(p.price) : "Lewat chat"}</span>
                      </span>
                      {p.description && <span className="mt-0.5 line-clamp-2 block text-sm leading-relaxed text-wd-muted">{p.description}</span>}
                    </span>
                  </label>
                );
              })}
              {packages.length > 0 && (
                <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-dashed border-wd-line-2 px-4 py-3 transition-colors hover:border-wd-ink has-[:checked]:border-solid has-[:checked]:border-wd-accent-line has-[:checked]:bg-wd-accent-wash has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wd-accent-ink">
                  <input type="radio" name="booking-package" className="peer sr-only" checked={other} onChange={chooseOther} />
                  <RadioDot />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-wd-ink">Paket lain</span>
                    <span className="block text-sm leading-relaxed text-wd-muted">Sesuai yang sudah kamu sepakati di chat.</span>
                  </span>
                </label>
              )}
            </div>
          </fieldset>

          {other && <Input label="Nama atau isi paket" value={packageDescription} onChange={(e) => setPackageDescription(e.target.value)} placeholder="Contoh: Paket Akad + Resepsi, 300 tamu" />}
          {needsPrice && (
            <Input
              label="Harga yang disepakati (Rp)"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Contoh: 18.500.000"
              value={price > 0 ? price.toLocaleString("id-ID") : ""}
              onChange={(e) => setAgreedPrice(e.target.value.replace(/\D/g, "").replace(/^0+/, ""))}
              hint="Sudah termasuk biaya layanan DuaCincin."
            />
          )}
        </div>

        <aside className="grid content-start gap-4 self-start rounded-[16px] bg-wd-paper p-5 md:sticky md:top-0">
          <p className="text-sm font-semibold text-wd-ink">Ringkasan</p>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-wd-muted">Total</dt>
              <dd className="font-semibold tabular-nums text-wd-ink">{price > 0 ? formatRupiah(price) : "Belum dipilih"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-wd-muted">DP 30%</dt>
              <dd className="tabular-nums text-wd-text">{price > 0 ? formatRupiah(dp) : "-"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-wd-muted">Pelunasan</dt>
              <dd className="tabular-nums text-wd-text">{price > 0 ? formatRupiah(price - dp) : "-"}</dd>
            </div>
          </dl>
          <div className="h-px bg-wd-line" />
          <EscrowSteps />

          {error && (
            <p role="alert" className="rounded-lg bg-wd-danger/[0.06] px-3 py-2 text-sm text-wd-danger">
              {error}
            </p>
          )}
          <div>
            <WdButton type="submit" block loading={saving} disabled={price <= 0}>
              Kirim pengajuan
            </WdButton>
            {price <= 0 && <p className="mt-2 text-center text-xs text-wd-muted">Pilih paket atau isi harga untuk lanjut.</p>}
          </div>
        </aside>
      </form>
    </Modal>
  );
}

/** Radio indicator driven by the sibling input's state (the input is sr-only). */
function RadioDot() {
  return (
    <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-wd-line-2 bg-white transition-colors peer-checked:border-wd-accent-ink peer-checked:bg-wd-accent-ink peer-checked:[&>svg]:opacity-100">
      <svg viewBox="0 0 12 12" className="h-3 w-3 text-white opacity-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 6.2 5 8.6l4.5-5" />
      </svg>
    </span>
  );
}
