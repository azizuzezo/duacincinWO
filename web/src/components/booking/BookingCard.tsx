import Image from "next/image";
import Link from "next/link";

import { bookingProgress } from "@/components/BookingStepper";
import { Badge } from "@/components/ui/Badge";
import { FundStatus } from "@/components/ui/FundStatus";
import { Rings } from "@/components/ui/Rings";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE, formatRupiah, type Booking, type BookingStatus } from "@/lib/api";

import { countdownLabel, formatTanggal } from "./format";
import type { VendorBrief } from "./useVendorLookup";

/** What the couple has to do next, per status (null when it is someone else's turn). */
export const CLIENT_NEXT_ACTION: Partial<Record<BookingStatus, string>> = {
  confirmed: "Giliranmu: bayar DP",
  dp_paid: "Giliranmu: lunasi pembayaran",
  full_paid: "Giliranmu: technical meeting, lalu konfirmasi acara selesai",
};

export function VendorThumb({ vendor, className = "" }: { vendor?: VendorBrief; className?: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg bg-dc-cream ${className}`}>
      {vendor?.photo ? (
        <Image
          src={vendor.photo}
          alt={vendor.photoAlt || `Portofolio ${vendor.name}`}
          fill
          unoptimized
          sizes="160px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-dc-gold" aria-hidden>
          <Rings className="h-8 w-12" stroke="currentColor" />
        </div>
      )}
    </div>
  );
}

/** One booking in the list: vendor photo first, who and when, the price, the
 * escrow position and how far along the 7 steps it is. The whole card is one
 * link to the detail page. */
export function BookingCard({ booking: b, vendor }: { booking: Booking; vendor?: VendorBrief }) {
  const progress = bookingProgress(b.status);
  const countdown = b.status === "cancelled" || b.status === "completed" ? null : countdownLabel(b.event_date);
  const next = CLIENT_NEXT_ACTION[b.status];
  const title = vendor?.name ?? b.package_description ?? "Booking";

  return (
    <Link
      href={`/client/bookings/${b.id}`}
      className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-dc-gold"
    >
      <article className="rounded-xl border border-dc-line bg-dc-white shadow-soft transition-[transform,box-shadow,border-color] duration-300 ease-dc group-hover:border-dc-line-strong group-hover:shadow-lift motion-safe:group-hover:-translate-y-1 motion-safe:group-active:translate-y-0 motion-safe:group-active:scale-[0.99]">
        <div className="flex gap-4 p-4 sm:gap-5 sm:p-5">
          <VendorThumb vendor={vendor} className="h-20 w-20 sm:h-32 sm:w-36" />
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              {vendor && (
                <p className="text-xs font-medium text-dc-text-3">
                  {vendor.category}
                  {vendor.city ? ` · ${vendor.city}` : ""}
                </p>
              )}
              <h2 className="wrap-break-word font-heading text-[1.4rem] leading-tight text-dc-ink sm:text-[1.65rem]">{title}</h2>
              {vendor && b.package_description && <p className="mt-0.5 wrap-break-word text-sm text-dc-text-2">{b.package_description}</p>}
              <p className="mt-1.5 text-sm text-dc-text-2">
                <span className="font-semibold text-dc-ink">{formatTanggal(b.event_date)}</span>
                {countdown && <span className="text-dc-text-3"> · {countdown}</span>}
              </p>
            </div>
            <div className="mt-1 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 sm:mt-0 sm:flex-col sm:items-end">
              <p className="text-lg font-bold tabular-nums text-dc-ink sm:text-xl">{formatRupiah(b.agreed_price)}</p>
              <Badge tone={BOOKING_STATUS_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-dc-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <FundStatus status={b.status} compact />
          {b.status !== "cancelled" && (
            <div className="flex items-center gap-3 sm:justify-end">
              <span aria-hidden className="flex gap-1">
                {Array.from({ length: progress.total }, (_, i) => (
                  <span key={i} className={`h-1.5 w-4 rounded-full ${i < progress.step - (b.status === "completed" ? 0 : 1) ? "bg-dc-gold" : i === progress.step - 1 ? "bg-dc-ink" : "bg-dc-line"}`} />
                ))}
              </span>
              <span className="text-xs font-medium text-dc-text-2">
                Langkah {progress.step} dari {progress.total}
                <span className="hidden sm:inline">: {progress.title}</span>
              </span>
            </div>
          )}
        </div>

        {next && (
          <div className="flex items-center justify-between gap-3 rounded-b-xl bg-dc-cream px-4 py-2.5 sm:px-5">
            <p className="text-sm font-semibold text-dc-clay">{next}</p>
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-dc-clay transition-transform duration-300 motion-safe:group-hover:translate-x-1">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
        )}
      </article>
    </Link>
  );
}

export function BookingCardSkeleton() {
  return (
    <div aria-hidden className="rounded-xl border border-dc-line bg-dc-white p-4 sm:p-5">
      <div className="flex gap-4 sm:gap-5">
        <span className="dc-skeleton block h-20 w-20 shrink-0 rounded-lg sm:h-32 sm:w-36" />
        <div className="flex flex-1 flex-col gap-2.5 pt-1">
          <span className="dc-skeleton block h-3 w-24 rounded-full" />
          <span className="dc-skeleton block h-6 w-3/4 rounded-full" />
          <span className="dc-skeleton block h-3 w-1/2 rounded-full" />
        </div>
      </div>
    </div>
  );
}
