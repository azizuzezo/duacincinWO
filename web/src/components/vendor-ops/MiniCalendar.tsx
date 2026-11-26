"use client";

// The month at a glance, right on the dashboard: days locked by a booking
// (gold) and days the vendor closed (grey with a stroke). Tapping a free day
// closes it, tapping a closed day opens it again, so a vendor can answer
// "are you free on...?" without leaving Hari ini. The full calendar lives at
// /vendor/kalender.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiGet, apiPut, ApiError, availabilityQuery, unavailableMap, type UnavailableDate } from "@/lib/api";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-wd-ink";

export function MiniCalendar() {
  const [days, setDays] = useState<Record<string, "booked" | "blocked">>({});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const today = iso(now);

  function load() {
    setState("loading");
    apiGet<{ dates: UnavailableDate[] }>(`/api/v1/vendor/availability${availabilityQuery()}`)
      .then((d) => {
        setDays(unavailableMap(d?.dates));
        setState("ready");
      })
      .catch(() => setState("error"));
  }
  useEffect(() => {
    queueMicrotask(load);
  }, []);

  async function toggle(day: string) {
    const reason = days[day];
    if (reason === "booked" || busy || day < today) return;
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
      setNotice(block ? "Tanggal ditutup untuk booking." : "Tanggal dibuka lagi.");
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Belum tersimpan, coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const count = new Date(y, m + 1, 0).getDate();
  const cells = useMemo(() => [...Array.from({ length: lead }, () => null), ...Array.from({ length: count }, (_, i) => new Date(y, m, i + 1))] as (Date | null)[], [lead, count, y, m]);
  const atStart = y === now.getFullYear() && m === now.getMonth();

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setCursor(new Date(y, m - 1, 1))} disabled={atStart} aria-label="Bulan sebelumnya" className={`flex h-10 w-10 items-center justify-center rounded-full text-wd-ink transition-colors hover:bg-wd-accent-wash disabled:opacity-30 ${FOCUS}`}>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <p aria-live="polite" className="wd-display text-[1.25rem]">
          {BULAN[m]} {y}
        </p>
        <button type="button" onClick={() => setCursor(new Date(y, m + 1, 1))} aria-label="Bulan berikutnya" className={`flex h-10 w-10 items-center justify-center rounded-full text-wd-ink transition-colors hover:bg-wd-accent-wash ${FOCUS}`}>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>

      {state === "error" ? (
        <p role="alert" className="py-6 text-sm text-wd-danger">
          Kalender belum bisa dimuat.{" "}
          <button type="button" onClick={load} className={`font-semibold underline underline-offset-4 ${FOCUS}`}>
            Coba lagi
          </button>
        </p>
      ) : (
        <div role="group" aria-label={`Kalender ${BULAN[m]} ${y}`} aria-busy={state === "loading"}>
          <div aria-hidden className="grid grid-cols-7 text-center text-[0.72rem] font-semibold text-wd-muted">
            {HARI.map((h) => (
              <span key={h} className="py-1.5">
                {h}
              </span>
            ))}
          </div>
          <div className={`grid grid-cols-7 gap-y-0.5 transition-opacity ${state === "loading" ? "opacity-50" : ""}`}>
            {cells.map((d, i) => {
              if (!d) return <span key={`e${i}`} />;
              const key = iso(d);
              const reason = days[key];
              const past = key < today;
              const label = `${d.getDate()} ${BULAN[m]}${reason === "booked" ? ", sudah dibooking" : reason === "blocked" ? ", ditutup, ketuk untuk membuka" : past ? "" : ", tersedia, ketuk untuk menutup"}`;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={past || reason === "booked" || state === "loading"}
                  aria-label={label}
                  aria-pressed={reason === "blocked"}
                  onClick={() => toggle(key)}
                  className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[0.9rem] tabular-nums transition-colors ${FOCUS} ${
                    reason === "booked"
                      ? "bg-wd-accent font-bold text-wd-ink"
                      : reason === "blocked"
                        ? "bg-wd-blush text-wd-muted line-through decoration-wd-muted"
                        : past
                          ? "text-wd-line-2"
                          : "text-wd-ink hover:bg-wd-accent-wash"
                  } ${key === today ? "ring-2 ring-wd-ink ring-offset-2" : ""} ${busy === key ? "animate-pulse" : ""}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.78rem] text-wd-text">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-3 rounded-full bg-wd-accent" />
          Dibooking
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-3 rounded-full bg-wd-blush ring-1 ring-wd-line-2" />
          Kamu tutup
        </li>
      </ul>
      <p role="status" className="mt-2 min-h-5 text-[0.82rem] text-wd-text">
        {notice}
      </p>
      <Link href="/vendor/kalender" className={`inline-flex min-h-11 items-center text-sm font-semibold text-wd-accent-ink underline underline-offset-4 hover:text-wd-ink ${FOCUS}`}>
        Buka kalender lengkap
      </Link>
    </div>
  );
}
