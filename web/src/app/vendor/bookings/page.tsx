"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ClientArt } from "@/components/home/ClientArt";
import { wdButton } from "@/components/home/ui";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { VendorShell } from "@/components/shell/VendorShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonGroup } from "@/components/ui/Skeleton";
import { BookingList } from "@/components/vendor-ops/BookingList";
import { BookingRowSkeleton } from "@/components/vendor-ops/ops";
import { WithUser } from "@/components/WithUser";
import { apiGet, ApiError, type Booking, type CurrentUser } from "@/lib/api";

export default function VendorBookingsPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorBookingsContent user={user} />}
    </WithUser>
  );
}

function VendorBookingsContent({ user }: { user: CurrentUser }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    apiGet<Booking[]>("/api/v1/bookings")
      .then((data) => {
        setBookings(data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Gagal memuat booking.");
        setLoading(false);
      });
  }, [reload]);

  const waiting = bookings.filter((b) => b.status === "requested").length;
  const summary =
    waiting > 0
      ? `${waiting} permintaan menunggu jawabanmu.`
      : "Semua permintaan sudah kamu jawab. Urut dari acara terdekat.";

  return (
    <VendorShell user={user} navItems={VENDOR_NAV} tone="wd" loginPath="/login" eyebrow="Vendor">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <p className="wd-kicker">Booking</p>
        <h1 className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
          Booking <em>masuk</em>
        </h1>
        {!loading && !error && bookings.length > 0 && <p className="mt-2 text-wd-text">{summary}</p>}

        <div className="mt-8">
          {loading && (
            <SkeletonGroup label="Memuat booking">
              <div className="border-t border-wd-line">
                {Array.from({ length: 3 }).map((_, i) => (
                  <BookingRowSkeleton key={i} />
                ))}
              </div>
            </SkeletonGroup>
          )}

          {error && (
            <ErrorState
              title="Booking belum bisa dimuat"
              body={error}
              onRetry={() => {
                setLoading(true);
                setError(null);
                setReload((n) => n + 1);
              }}
            />
          )}

          {!loading && !error && bookings.length === 0 && (
            <div className="flex flex-col items-start gap-5 rounded-[28px] bg-wd-accent-wash p-6 sm:flex-row sm:items-center sm:p-8">
              <span aria-hidden className="h-20 w-20 shrink-0 rounded-3xl bg-white/70 p-3.5">
                <ClientArt kind="envelope" />
              </span>
              <div>
                <h2 className="wd-title text-[1.4rem] leading-tight">Belum ada booking masuk</h2>
                <p className="mt-1 max-w-lg text-[0.95rem] leading-relaxed text-wd-text">Permintaan dari client muncul di sini setelah profilmu disetujui Admin. Etalase yang lengkap lebih sering dipilih.</p>
                <Link href="/vendor/profile" className={`${wdButton({ variant: "ink", size: "md", className: "mt-4" })} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink`}>
                  Lengkapi etalase
                </Link>
              </div>
            </div>
          )}

          {!loading && !error && bookings.length > 0 && <BookingList bookings={bookings} />}
        </div>
      </div>
    </VendorShell>
  );
}
