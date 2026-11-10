"use client";

import { useEffect, useState } from "react";

import {
  BookingStatusFilter,
  matchesBookingFilter,
} from "@/components/BookingStatusFilter";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonGroup } from "@/components/ui/Skeleton";
import { BookingRow, BookingRowSkeleton, sortForWork } from "@/components/vendor-ops/ops";
import { StaggerItem, StaggerList } from "@/components/vendor-ops/motion";
import { WithUser } from "@/components/WithUser";
import {
  apiGet,
  ApiError,
  type Booking,
  type CurrentUser,
} from "@/lib/api";

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
  const [filter, setFilter] = useState("all");
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

  const sorted = sortForWork(bookings);
  const requested = sorted.filter((b) => b.status === "requested");
  const visible = sorted.filter((b) => matchesBookingFilter(b.status, filter));
  // Split the visible list so requests always read as their own group first.
  const visibleRequests = visible.filter((b) => b.status === "requested");
  const visibleRest = visible.filter((b) => b.status !== "requested");

  const summary =
    requested.length > 0
      ? `${requested.length} permintaan menunggu jawabanmu. Ketuk untuk menerima atau menolak.`
      : "Semua permintaan sudah kamu jawab. Booking diurutkan dari acara terdekat.";

  return (
    <Shell user={user} navItems={VENDOR_NAV} loginPath="/login" eyebrow="Vendor">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <PageHeader
          eyebrow="Booking"
          title={
            <>
              Booking <span className="dc-em">masuk</span>
            </>
          }
          subtitle={!loading && !error && bookings.length > 0 ? summary : undefined}
        />

        {loading && (
          <SkeletonGroup label="Memuat booking" className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <BookingRowSkeleton key={i} />
            ))}
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
          <EmptyState
            title="Belum ada booking masuk"
            body="Permintaan booking dari client muncul di sini setelah profilmu disetujui Admin. Etalase yang lengkap lebih sering dipilih."
            actionHref="/vendor/profile"
            actionLabel="Lengkapi etalase"
          />
        )}

        {!loading && !error && bookings.length > 0 && (
          <>
            <BookingStatusFilter value={filter} onChange={setFilter} />

            {visible.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Tidak ada booking di sini"
                  body="Belum ada booking dengan status ini."
                  action={
                    <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>
                      Tampilkan semua
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-8">
                {visibleRequests.length > 0 && (
                  <section aria-labelledby="grup-permintaan">
                    <h2 id="grup-permintaan" className="mb-3 font-heading text-2xl text-dc-ink">
                      Perlu jawabanmu
                    </h2>
                    <StaggerList>
                      {visibleRequests.map((b) => (
                        <StaggerItem key={b.id}>
                          <BookingRow booking={b} />
                        </StaggerItem>
                      ))}
                    </StaggerList>
                  </section>
                )}
                {visibleRest.length > 0 && (
                  <section aria-labelledby="grup-lain">
                    {visibleRequests.length > 0 && (
                      <h2 id="grup-lain" className="mb-3 font-heading text-2xl text-dc-ink">
                        Booking lainnya
                      </h2>
                    )}
                    {visibleRequests.length === 0 && (
                      <h2 id="grup-lain" className="sr-only">
                        Daftar booking
                      </h2>
                    )}
                    <StaggerList>
                      {visibleRest.map((b) => (
                        <StaggerItem key={b.id}>
                          <BookingRow booking={b} />
                        </StaggerItem>
                      ))}
                    </StaggerList>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
