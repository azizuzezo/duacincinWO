"use client";

// Vendor availability calendar. A day is closed to couples when the vendor
// closes it here, or automatically when a confirmed booking locks it. Click a
// free day to close it, click a closed one to open it again. Booking-locked
// days cannot be changed by hand. Couples see closed days struck out in the
// booking calendar.
import { useEffect, useMemo, useState } from "react";

import { VENDOR_NAV } from "@/components/shell/navConfig";
import { Shell } from "@/components/shell/Shell";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPut, ApiError, availabilityQuery, unavailableMap, type CurrentUser, type UnavailableDate } from "@/lib/api";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function VendorCalendarPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorCalendarContent user={user} />}
    </WithUser>
  );
}

function VendorCalendarContent({ user }: { user: CurrentUser }) {
  const [days, setDays] = useState<Record<string, "booked" | "blocked">>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const today = iso(now);

  function load() {
    setLoading(true);
    setError(null);
    apiGet<{ dates: UnavailableDate[] }>(`/api/v1/vendor/availability${availabilityQuery()}`)
      .then((d) => setDays(unavailableMap(d?.dates)))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Kalender belum bisa dimuat."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  async function toggle(day: string) {
    const reason = days[day];
    if (reason === "booked" || busy) return;
    const block = reason !== "blocked";
    setBusy(day);
    setNotice(null);
    try {
      await apiPut("/api/v1/vendor/availability/blocked", { dates: [day], blocked: block });
      setDays((cur) => {
        const next = { ...cur };
        if (block) next[day] = "blocked";
        else delete next[day];
        return next;
      });
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Perubahan belum tersimpan, coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const count = new Date(y, m + 1, 0).getDate();
  const cells = useMemo(() => [...Array.from({ length: lead }, () => null), ...Array.from({ length: count }, (_, i) => new Date(y, m, i + 1))] as (Date | null)[], [lead, count, y, m]);
  const blocked = Object.values(days).filter((r) => r === "blocked").length;
  const booked = Object.values(days).filter((r) => r === "booked").length;
  const atStart = y === now.getFullYear() && m === now.getMonth();

  return (
    <Shell user={user} navItems={VENDOR_NAV} tone="wd" loginPath="/login" eyebrow="Vendor">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <PageHeader
          eyebrow="Kalender"
          title={
            <>
              Tanggal <span className="dc-em">tersedia</span>
            </>
          }
          subtitle="Tutup tanggal yang tidak bisa kamu kerjakan. Calon pengantin tidak bisa memilihnya saat mengajukan booking."
        />

        {error ? (
          <ErrorState title="Kalender belum bisa dimuat" body={error} onRetry={load} />
        ) : (
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <button type="button" disabled={atStart} onClick={() => setCursor(new Date(y, m - 1, 1))} aria-label="Bulan sebelumnya" className="flex h-11 w-11 items-center justify-center rounded-full text-dc-ink transition-colors hover:bg-dc-cream disabled:pointer-events-none disabled:opacity-35">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m15 5-7 7 7 7" />
                </svg>
              </button>
              <h2 className="font-heading text-2xl text-dc-ink" aria-live="polite">
                {BULAN[m]} {y}
              </h2>
              <button type="button" onClick={() => setCursor(new Date(y, m + 1, 1))} aria-label="Bulan berikutnya" className="flex h-11 w-11 items-center justify-center rounded-full text-dc-ink transition-colors hover:bg-dc-cream">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1" role="grid" aria-label={`${BULAN[m]} ${y}`} aria-busy={loading}>
              {HARI.map((h) => (
                <span key={h} role="columnheader" className="py-1.5 text-center text-xs font-semibold text-dc-text-3">
                  {h}
                </span>
              ))}
              {cells.map((d, i) => {
                if (!d) return <span key={`e${i}`} role="gridcell" />;
                const key = iso(d);
                const reason = days[key];
                const past = key < today;
                const locked = reason === "booked";
                const closed = reason === "blocked";
                return (
                  <span key={key} role="gridcell" className="flex justify-center">
                    <button
                      type="button"
                      disabled={past || locked || loading || busy === key}
                      onClick={() => void toggle(key)}
                      aria-pressed={closed}
                      aria-label={`${d.getDate()} ${BULAN[m]} ${y}${locked ? ", terkunci booking" : closed ? ", ditutup, klik untuk membuka" : ", tersedia, klik untuk menutup"}`}
                      className={`relative flex h-12 w-full max-w-14 items-center justify-center rounded-xl text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-dc-gold disabled:cursor-not-allowed ${
                        past
                          ? "text-dc-text-3 opacity-50"
                          : locked
                            ? "bg-dc-ink font-semibold text-dc-on-dark"
                            : closed
                              ? "bg-[repeating-linear-gradient(135deg,var(--dc-cream),var(--dc-cream)_4px,var(--dc-line)_4px,var(--dc-line)_8px)] font-semibold text-dc-text-2 line-through hover:bg-dc-cream"
                              : "font-medium text-dc-ink hover:bg-dc-gold-wash"
                      }`}
                    >
                      {d.getDate()}
                      {key === today && <span aria-hidden className="absolute bottom-1.5 h-1 w-1 rounded-full bg-dc-gold" />}
                    </button>
                  </span>
                );
              })}
            </div>

            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-dc-line pt-3 text-xs text-dc-text-2">
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="h-3.5 w-3.5 rounded bg-dc-ink" />
                Terkunci booking
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="h-3.5 w-3.5 rounded bg-[repeating-linear-gradient(135deg,var(--dc-cream),var(--dc-cream)_3px,var(--dc-line)_3px,var(--dc-line)_6px)]" />
                Kamu tutup
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="h-3.5 w-3.5 rounded ring-1 ring-dc-line" />
                Tersedia
              </li>
            </ul>
            {notice && (
              <p role="alert" className="mt-3 rounded-lg bg-dc-danger/10 px-3 py-2 text-sm font-medium text-dc-danger">
                {notice}
              </p>
            )}
            <p className="mt-3 text-sm text-dc-text-2">
              {loading ? "Memuat…" : `${blocked} tanggal kamu tutup, ${booked} terkunci booking (hingga 13 bulan ke depan).`}
            </p>
          </Card>
        )}
      </div>
    </Shell>
  );
}
