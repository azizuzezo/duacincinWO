"use client";

// Vendor availability calendar. A day is closed to couples when the vendor
// closes it here, or automatically when a confirmed booking locks it. Tap a
// free day to close it, tap a closed one to open it again. Booking-locked
// days cannot be changed by hand. Couples see closed days struck out in the
// booking calendar.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { ClientArt } from "@/components/home/ClientArt";
import { VENDOR_NAV } from "@/components/shell/navConfig";
import { VendorShell } from "@/components/shell/VendorShell";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPut, ApiError, availabilityQuery, unavailableMap, type CurrentUser, type UnavailableDate } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent-ink";
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const longDate = (s: string) => {
  const d = fromIso(s);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
};

export default function VendorCalendarPage() {
  return (
    <WithUser allowedRoles={["vendor"]} loginPath="/login">
      {(user) => <VendorCalendarContent user={user} />}
    </WithUser>
  );
}

function VendorCalendarContent({ user }: { user: CurrentUser }) {
  const reduced = useReducedMotion();
  const [days, setDays] = useState<Record<string, "booked" | "blocked">>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [dir, setDir] = useState(1);
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
      setNotice({ text: block ? `${longDate(day)} ditutup. Calon pengantin tidak bisa memilihnya.` : `${longDate(day)} dibuka lagi.` });
    } catch (err) {
      setNotice({ text: err instanceof ApiError ? err.message : "Perubahan belum tersimpan, coba lagi.", bad: true });
    } finally {
      setBusy(null);
    }
  }

  function go(delta: number) {
    setDir(delta);
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  }

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const count = new Date(y, m + 1, 0).getDate();
  const cells = useMemo(() => [...Array.from({ length: lead }, () => null), ...Array.from({ length: count }, (_, i) => new Date(y, m, i + 1))] as (Date | null)[], [lead, count, y, m]);
  const atStart = y === now.getFullYear() && m === now.getMonth();

  const upcoming = useMemo(
    () =>
      Object.entries(days)
        .filter(([date, r]) => r === "booked" && date >= today)
        .map(([date]) => date)
        .sort(),
    [days, today],
  );
  const closedCount = Object.values(days).filter((r) => r === "blocked").length;

  const arrow = (d: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );

  return (
    <VendorShell user={user} navItems={VENDOR_NAV} tone="wd" loginPath="/login" eyebrow="Vendor">
      <div className="wd-container pb-16 pt-8 sm:pt-10">
        <p className="wd-kicker">Kalender</p>
        <h1 className="wd-display mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.05]">
          Tanggal <em>tersedia</em>
        </h1>
        <p className="mt-3 max-w-xl text-wd-text">Tutup tanggal yang tidak bisa kamu kerjakan. Calon pengantin tidak bisa memilihnya saat mengajukan booking.</p>

        {error ? (
          <div role="alert" className="mt-8 flex flex-col items-center rounded-[22px] bg-wd-accent-wash px-6 py-12 text-center ring-1 ring-wd-line">
            <span aria-hidden className="block h-24 w-24">
              <ClientArt kind="clipboard" />
            </span>
            <p className="wd-title mt-3 text-[1.2rem]">Kalender belum bisa dimuat</p>
            <p className="mt-1 max-w-sm text-sm text-wd-text">{error}</p>
            <button type="button" onClick={load} className={`mt-4 inline-flex min-h-11 items-center rounded-full bg-wd-ink px-6 text-sm font-semibold text-white hover:opacity-90 ${FOCUS}`}>
              Coba lagi
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
            <section aria-label="Kalender ketersediaan">
              <div className="flex items-center justify-between">
                <button type="button" disabled={atStart} onClick={() => go(-1)} aria-label="Bulan sebelumnya" className={`flex h-11 w-11 items-center justify-center rounded-full text-wd-ink transition-colors hover:bg-wd-accent-wash disabled:pointer-events-none disabled:opacity-30 ${FOCUS}`}>
                  {arrow("m15 5-7 7 7 7")}
                </button>
                <h2 className="wd-display text-[1.6rem] sm:text-[2rem]" aria-live="polite">
                  {BULAN[m]} <em>{y}</em>
                </h2>
                <button type="button" onClick={() => go(1)} aria-label="Bulan berikutnya" className={`flex h-11 w-11 items-center justify-center rounded-full text-wd-ink transition-colors hover:bg-wd-accent-wash ${FOCUS}`}>
                  {arrow("m9 5 7 7-7 7")}
                </button>
              </div>

              <div aria-hidden className="mt-4 grid grid-cols-7 border-b border-wd-line pb-2 text-center text-xs font-semibold text-wd-muted">
                {HARI.map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </div>
              <div className="overflow-hidden">
                <AnimatePresence mode="wait" initial={false} custom={dir}>
                  <motion.div
                    key={`${y}-${m}`}
                    role="group"
                    aria-label={`${BULAN[m]} ${y}`}
                    aria-busy={loading}
                    custom={dir}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: dir * 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, x: dir * -28 }}
                    transition={{ duration: reduced ? 0.01 : 0.22, ease: EASE }}
                    className={`grid grid-cols-7 gap-y-1 pt-2 ${loading ? "opacity-50" : ""}`}
                  >
                    {cells.map((d, i) => {
                      if (!d) return <span key={`e${i}`} />;
                      const key = iso(d);
                      const reason = days[key];
                      const past = key < today;
                      const locked = reason === "booked";
                      const closed = reason === "blocked";
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={past || locked || loading || busy === key}
                          onClick={() => void toggle(key)}
                          aria-pressed={closed}
                          aria-label={`${d.getDate()} ${BULAN[m]} ${y}${locked ? ", sudah dibooking" : closed ? ", ditutup, ketuk untuk membuka" : past ? "" : ", tersedia, ketuk untuk menutup"}`}
                          className={`relative mx-auto flex h-11 w-11 items-center justify-center rounded-full text-[0.95rem] tabular-nums transition-colors sm:h-14 sm:w-14 sm:text-base disabled:cursor-not-allowed ${FOCUS} ${
                            locked
                              ? "bg-wd-accent font-bold text-wd-ink"
                              : closed
                                ? "bg-wd-blush text-wd-muted line-through decoration-wd-muted hover:bg-wd-paper"
                                : past
                                  ? "text-wd-line-2"
                                  : "text-wd-ink hover:bg-wd-accent-wash"
                          } ${key === today ? "ring-2 ring-wd-ink ring-offset-2" : ""} ${busy === key ? "animate-pulse" : ""}`}
                        >
                          {d.getDate()}
                        </button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>

              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-wd-line pt-4 text-sm text-wd-text">
                <li className="flex items-center gap-2">
                  <span aria-hidden className="h-4 w-4 rounded-full bg-wd-accent" />
                  Sudah dibooking
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="h-4 w-4 rounded-full bg-wd-blush ring-1 ring-wd-line-2" />
                  Kamu tutup
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="h-4 w-4 rounded-full ring-1 ring-wd-line-2" />
                  Tersedia
                </li>
              </ul>
              <p role="status" className={`mt-3 min-h-6 text-sm ${notice?.bad ? "font-semibold text-wd-danger" : "text-wd-text"}`}>
                {loading ? "Memuat kalender..." : (notice?.text ?? "Ketuk tanggal untuk menutup atau membukanya. Tanggal yang sudah dibooking terkunci.")}
              </p>
            </section>

            <aside aria-label="Tanggal terbooking" className="rounded-[22px] bg-wd-accent-wash p-5 ring-1 ring-wd-line sm:p-6 lg:self-start">
              <p className="wd-kicker">Segera</p>
              <h2 className="wd-display text-[1.6rem] leading-tight">
                Tanggal <em>terbooking</em>
              </h2>
              {loading ? (
                <p className="mt-4 text-sm text-wd-text">Memuat...</p>
              ) : upcoming.length === 0 ? (
                <div className="mt-4 flex flex-col items-center py-4 text-center">
                  <span aria-hidden className="block h-20 w-20">
                    <ClientArt kind="card" />
                  </span>
                  <p className="mt-2 font-semibold text-wd-ink">Belum ada tanggal terbooking</p>
                  <p className="mt-1 text-sm text-wd-text">Tanggal muncul di sini setelah booking dikonfirmasi.</p>
                </div>
              ) : (
                <ul className="mt-3 border-t border-wd-line-2">
                  {upcoming.slice(0, 8).map((date) => {
                    const d = fromIso(date);
                    return (
                      <li key={date} className="flex min-h-14 items-center gap-3 border-b border-wd-line-2 py-2">
                        <span aria-hidden className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full bg-wd-accent text-wd-ink">
                          <span className="text-sm font-bold leading-none tabular-nums">{d.getDate()}</span>
                          <span className="text-[0.6rem] font-semibold uppercase leading-none">{BULAN[d.getMonth()].slice(0, 3)}</span>
                        </span>
                        <span className="text-sm font-semibold text-wd-ink">{longDate(date)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {!loading && upcoming.length > 8 && <p className="mt-3 text-sm text-wd-text">dan {upcoming.length - 8} tanggal lainnya.</p>}
              {!loading && closedCount > 0 && <p className="mt-4 text-sm text-wd-text">{closedCount} tanggal kamu tutup.</p>}
            </aside>
          </div>
        )}
      </div>
    </VendorShell>
  );
}
