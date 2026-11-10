"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatRupiah, type VendorPackage, type VendorProfile } from "@/lib/api";

import { TanggalPicker, todayIso } from "./TanggalPicker";

/** "Rp8.500.000" -> "Rp8,5 jt" for the narrow mobile bar only. */
function shortRupiah(v: number): string {
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return formatRupiah(v);
}

/** The escrow path as three stations, same dot language as FundStatus, so
 * the promise reads the same before and after booking. */
export function EscrowSteps({ tone = "paper" }: { tone?: "paper" | "ink" }) {
  const dark = tone === "ink";
  const steps = [
    { t: "Kamu bayar lewat DuaCincin", d: "DP lalu pelunasan, tidak ke rekening pribadi vendor." },
    { t: "Dana ditahan", d: "Disimpan aman selama persiapan." },
    { t: "Diteruskan ke vendor", d: "Setelah kamu mengonfirmasi acara selesai." },
  ];
  return (
    <ol className="relative grid gap-4">
      <span aria-hidden className={`absolute bottom-3 left-[5px] top-3 w-px ${dark ? "bg-dc-on-dark/20" : "bg-dc-line-strong"}`} />
      {steps.map((s, i) => (
        <li key={s.t} className="relative flex gap-3">
          <span
            aria-hidden
            className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${
              i === 2 ? (dark ? "bg-dc-gold-antique" : "bg-dc-success") : dark ? "border-2 border-dc-gold-antique bg-dc-ink" : "border-2 border-dc-gold bg-dc-white"
            }`}
          />
          <div>
            <p className={`text-sm font-semibold ${dark ? "text-dc-on-dark" : "text-dc-ink"}`}>{s.t}</p>
            <p className={`text-sm leading-relaxed ${dark ? "text-dc-on-dark/80" : "text-dc-text-3"}`}>{s.d}</p>
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
};

function PriceBlock({ profile }: { profile: VendorProfile }) {
  return (
    <div>
      <p className="text-sm text-dc-text-2">Harga mulai dari</p>
      <p className="mt-0.5 text-[2rem] font-bold leading-tight tracking-tight text-dc-ink tabular-nums">
        {profile.price_min > 0 ? formatRupiah(profile.price_min) : "Lewat diskusi"}
      </p>
      {profile.price_max > profile.price_min && <p className="mt-0.5 text-sm text-dc-text-2">hingga {formatRupiah(profile.price_max)}, tergantung paket</p>}
    </div>
  );
}

/** Desktop: sticky decision card. Mobile: same card inline under the intro,
 * while MobileActionBar keeps the two actions under the thumb. */
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
}: Common & {
  eventDate: string;
  setEventDate: (v: string) => void;
  selected: VendorPackage | null;
  onClearPackage: () => void;
  onSeePackages: () => void;
  error: string | null;
}) {
  return (
    <div className="rounded-2xl border border-dc-line bg-dc-white p-5 shadow-lift sm:p-6">
      <PriceBlock profile={profile} />

      <div className="my-5 h-px bg-dc-line" />

      {checkingUser ? (
        <div className="grid gap-3" aria-hidden>
          <Skeleton className="h-12" />
          <Skeleton className="h-12 rounded-full" />
          <Skeleton className="h-12 rounded-full" />
        </div>
      ) : isClient ? (
        <div className="grid gap-4">
          <TanggalPicker label="Tanggal acara" min={todayIso()} value={eventDate} onChange={setEventDate} hint={eventDate ? undefined : "Bisa diubah lagi saat mengajukan booking."} />
          <div className="rounded-lg bg-dc-cream px-4 py-3">
            {selected ? (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-dc-text-3">Paket dipilih</p>
                  <p className="break-words font-semibold text-dc-ink">{selected.name}</p>
                  {selected.price > 0 && <p className="text-sm tabular-nums text-dc-text-2">{formatRupiah(selected.price)}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClearPackage}
                  className="-mr-2 -mt-1 inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
                >
                  Hapus
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-dc-text-2">Belum memilih paket</p>
                <button
                  type="button"
                  onClick={onSeePackages}
                  className="-mr-2 inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-sm font-semibold text-dc-clay underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold"
                >
                  Lihat paket
                </button>
              </div>
            )}
          </div>
          <Button variant="gold" block onClick={onChat} loading={starting}>
            Chat dengan vendor
          </Button>
          <Button variant="ghost" block onClick={onBook} aria-haspopup="dialog">
            Ajukan booking
          </Button>
          <p className="text-center text-xs leading-relaxed text-dc-text-3">Sepakati paket dan harga lewat chat dulu. Kamu belum membayar apa pun saat mengajukan.</p>
        </div>
      ) : (
        <div>
          <p className="text-sm leading-relaxed text-dc-text-2">Masuk sebagai Client untuk chat dan mengajukan booking ke vendor ini.</p>
          <ButtonLink href="/login" variant="gold" block className="mt-4">
            Masuk untuk chat
          </ButtonLink>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-dc-danger/[0.06] px-3 py-2 text-sm text-dc-danger">
          {error}
        </p>
      )}

      <div className="mt-6 rounded-xl border border-dc-line p-4">
        <p className="mb-3 text-sm font-semibold text-dc-ink">Uangmu dijaga escrow DuaCincin</p>
        <EscrowSteps />
      </div>
    </div>
  );
}

/** Mobile only: price + the two actions, always under the thumb. */
export function MobileActionBar({ profile, isClient, checkingUser, starting, onChat, onBook }: Common) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-dc-line bg-dc-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-float lg:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-dc-text-3">Mulai dari</p>
          <p className="truncate font-bold tabular-nums text-dc-ink">{profile.price_min > 0 ? shortRupiah(profile.price_min) : "Lewat diskusi"}</p>
        </div>
        {checkingUser ? (
          <Skeleton className="h-11 w-40 rounded-full" />
        ) : isClient ? (
          <>
            <Button variant="ghost" size="sm" onClick={onBook} aria-haspopup="dialog" aria-label="Ajukan booking">
              Booking
            </Button>
            <Button variant="gold" size="sm" onClick={onChat} loading={starting} aria-label="Chat dengan vendor">
              Chat vendor
            </Button>
          </>
        ) : (
          <ButtonLink href="/login" variant="gold" size="sm">
            Masuk untuk chat
          </ButtonLink>
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
        <Button type="submit" form="booking-form" variant="gold" block loading={saving}>
          Kirim pengajuan booking
        </Button>
      }
    >
      <form id="booking-form" onSubmit={onSubmit} className="grid gap-5">
        <TanggalPicker label="Tanggal acara" min={todayIso()} value={eventDate} onChange={setEventDate} error={dateError} />

        {packages.length > 0 && (
          <fieldset>
            <legend className="text-sm font-semibold text-dc-ink">Pilih dari paket vendor</legend>
            <div className="mt-2 grid gap-2">
              {packages.map((p) => {
                const active = packageDescription === p.name;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onPickPackage(p)}
                    className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
                      active ? "border-dc-gold bg-dc-gold/10" : "border-dc-line-strong hover:border-dc-text-3"
                    }`}
                  >
                    <span className="min-w-0 break-words text-sm font-semibold text-dc-ink">{p.name}</span>
                    <span className="shrink-0 text-sm tabular-nums text-dc-text-2">{p.price > 0 ? formatRupiah(p.price) : "Lewat chat"}</span>
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
          hint="Isi harga yang sudah kamu sepakati dengan vendor di chat."
        />

        <div className="rounded-xl bg-dc-cream p-4">
          <p className="mb-3 text-sm font-semibold text-dc-ink">Setelah vendor mengonfirmasi</p>
          <EscrowSteps />
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-dc-danger/[0.06] px-3 py-2 text-sm text-dc-danger">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}
