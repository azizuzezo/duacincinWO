"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button, buttonClasses } from "@/components/ui/Button";
import { controlClasses } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet, apiPost, ApiError, type RSVPInfo } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

import { daysUntil, downloadIcs, googleCalendarUrl, parseEventDate } from "./calendar";
import { GoldArch } from "@/components/ornament/GoldArch";

type Status = "attending" | "not_attending";
const MAX_PARTY = 10;
const MAX_MESSAGE = 500;

/** "Pernikahan Shareen & Utama" -> { lead: "Pernikahan", names: "Shareen & Utama" }. */
function splitTitle(name: string) {
  const m = /^(pernikahan|resepsi|akad nikah|walimah|ngunduh mantu)\s+(.+)$/i.exec(name.trim());
  return m ? { lead: m[1], names: m[2] } : { lead: "", names: name };
}

/** Two rings that slide together: the one celebratory motion, on success. */
function JoiningRings({ reduced }: { reduced: boolean }) {
  const t = { duration: reduced ? 0 : 0.9, ease: EASE, delay: reduced ? 0 : 0.15 };
  return (
    <svg viewBox="0 0 64 40" fill="none" className="mx-auto h-14 w-24 text-dc-gold" aria-hidden>
      <motion.circle cx="24" cy="20" r="14" stroke="currentColor" strokeWidth="1.4" initial={{ x: reduced ? 0 : -10, opacity: reduced ? 1 : 0 }} animate={{ x: 0, opacity: 1 }} transition={t} />
      <motion.circle cx="40" cy="20" r="14" stroke="currentColor" strokeWidth="1.4" initial={{ x: reduced ? 0 : 10, opacity: reduced ? 1 : 0 }} animate={{ x: 0, opacity: 1 }} transition={t} />
    </svg>
  );
}

function SaveTheDate({ title, date, venue }: { title: string; date: Date; venue: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
      <Button variant="ghost" size="sm" onClick={() => downloadIcs(title, date, venue)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
        Simpan ke kalender
      </Button>
      <a href={googleCalendarUrl(title, date, venue)} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "quiet", size: "sm" })}>
        Tambah ke Google Calendar
      </a>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dc-grain flex min-h-dvh flex-col bg-dc-ivory">
      <a href="#konten" className="dc-skip">
        Langsung ke konten
      </a>
      <main id="konten" className="relative mx-auto w-full max-w-xl flex-1 px-4 pb-10 pt-6 sm:pt-10">
        {children}
      </main>
      <footer className="pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 text-center">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-xs text-dc-text-3 hover:text-dc-ink">
          Undangan ini dikelola lewat
          <BrandLogo size={18} tone="dark" />
        </Link>
      </footer>
    </div>
  );
}

export function RsvpView({ token }: { token: string }) {
  const reduced = useReducedMotion() ?? false;
  const [info, setInfo] = useState<RSVPInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [status, setStatus] = useState<Status>("attending");
  const [message, setMessage] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const ids = { name: useId(), phone: useId(), msg: useId(), party: useId() };

  useEffect(() => {
    apiGet<RSVPInfo>(`/api/v1/rsvp/${token}`)
      .then(setInfo)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (submitted) doneRef.current?.focus();
  }, [submitted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Tulis namamu dulu, supaya pengantin tahu siapa yang datang.");
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/v1/rsvp/${token}/respond`, {
        name,
        phone,
        party_size: partySize || 1,
        status,
        message,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengirim konfirmasi, coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <div role="status" aria-label="Memuat undangan" className="flex flex-col items-center pt-8">
          <Skeleton className="h-40 w-40 rounded-t-full" />
          <Skeleton className="mt-8 h-4 w-32" />
          <Skeleton className="mt-5 h-14 w-3/4" />
          <Skeleton className="mt-6 h-6 w-1/2" />
          <Skeleton className="mt-10 h-80 w-full rounded-2xl" />
        </div>
      </Shell>
    );
  }

  if (notFound || !info) {
    return (
      <Shell>
        <div role="alert" className="mt-10 rounded-2xl border border-dc-line bg-dc-white px-6 py-12 text-center shadow-soft">
          <svg viewBox="0 0 64 40" fill="none" className="mx-auto h-12 w-20 text-dc-gold" aria-hidden>
            <circle cx="24" cy="20" r="14" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="40" cy="20" r="14" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          <h1 className="mt-5 font-heading text-[2rem] leading-tight text-dc-ink">Undangan tidak ditemukan</h1>
          <p className="mx-auto mt-3 max-w-sm leading-relaxed text-dc-text-2">
            Tautan ini tidak valid atau sudah tidak aktif. Coba buka lagi tautan yang dibagikan pengantin, atau tanyakan tautan yang baru kepada mereka.
          </p>
        </div>
      </Shell>
    );
  }

  const { lead, names } = splitTitle(info.event_name || "Konfirmasi kehadiran");
  const date = parseEventDate(info.event_date);
  const days = date ? daysUntil(date) : null;
  const dateText = date?.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const calTitle = info.event_name || "Pernikahan";
  const firstName = name.trim().split(/\s+/)[0];

  return (
    <Shell>
      <header className="text-center">
        <div className="relative mx-auto w-48 sm:w-56">
          <GoldArch className="relative h-auto w-full" />
        </div>
        <p className="dc-eyebrow mt-4 justify-center">Undangan {lead ? lead.toLowerCase() : "pernikahan"}</p>
        <h1 className="mt-3">
          {lead && <span className="sr-only">{lead} </span>}
          <span className="dc-script block break-words text-[clamp(2.75rem,12vw,4.5rem)] leading-[1.05]">{names}</span>
        </h1>
        <div className="dc-rule mx-auto my-6 w-24" />
        {dateText && <p className="font-heading text-[1.75rem] leading-tight text-dc-ink first-letter:uppercase">{dateText}</p>}
        {days !== null && days >= 0 && (
          <p className="mt-2 inline-flex rounded-full bg-dc-cream px-3 py-1 text-sm font-semibold text-dc-clay">
            {days === 0 ? "Hari ini" : days === 1 ? "Besok" : `${days} hari lagi`}
          </p>
        )}
        {info.venue_note && (
          <p className="mx-auto mt-4 flex max-w-sm items-start justify-center gap-2 text-dc-text-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="mt-0.5 shrink-0 text-dc-clay" aria-hidden>
              <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
            <span>
              {info.venue_note}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.venue_note)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 inline-flex min-h-11 items-center font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink"
              >
                Buka peta
              </a>
            </span>
          </p>
        )}
        {date && days !== null && days >= 0 && (
          <div className="mt-4">
            <SaveTheDate title={calTitle} date={date} venue={info.venue_note} />
          </div>
        )}
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {submitted ? (
          <motion.div
            key="done"
            ref={doneRef}
            tabIndex={-1}
            role="status"
            initial={{ opacity: 0, y: reduced ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.5, ease: EASE }}
            className="mt-10 rounded-2xl border border-dc-line bg-dc-white px-6 py-10 text-center shadow-lift outline-none"
          >
            <JoiningRings reduced={reduced} />
            <h2 className="mt-5 font-heading text-[2.2rem] leading-tight text-dc-ink">
              Terima kasih, <span className="dc-em">{firstName}</span>
            </h2>
            <p className="mx-auto mt-3 max-w-sm leading-relaxed text-dc-text-2">
              {status === "attending"
                ? `Konfirmasi kehadiranmu${partySize > 1 ? ` untuk ${partySize} orang` : ""} sudah kami terima. Sampai jumpa di hari bahagia.`
                : "Konfirmasimu sudah kami terima. Terima kasih sudah memberi kabar dan doa."}
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            exit={{ opacity: 0, y: reduced ? 0 : -8 }}
            transition={{ duration: reduced ? 0.01 : 0.25 }}
            onSubmit={handleSubmit}
            noValidate
            aria-labelledby="rsvp-judul"
            className="mt-10 rounded-2xl border border-dc-line bg-dc-white p-5 shadow-lift sm:p-8"
          >
            <h2 id="rsvp-judul" className="font-heading text-[2rem] leading-tight text-dc-ink">
              Kabari kami kehadiranmu
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-dc-text-2">Supaya pengantin bisa menyiapkan tempat untukmu.</p>

            <fieldset className="mt-6">
              <legend className="mb-2 text-sm font-semibold text-dc-ink">Apakah kamu akan hadir?</legend>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["attending", "Hadir", "Dengan senang hati"],
                    ["not_attending", "Berhalangan", "Kirim doa dari jauh"],
                  ] as const
                ).map(([value, label, sub]) => {
                  const on = status === value;
                  return (
                    <label
                      key={value}
                      className={`relative flex min-h-20 cursor-pointer flex-col justify-center rounded-xl border px-4 py-3 transition-[border-color,background-color,box-shadow] duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-dc-gold ${
                        on ? "border-dc-ink bg-dc-ink text-dc-on-dark shadow-soft" : "border-dc-line-strong bg-dc-ivory text-dc-ink hover:border-dc-ink"
                      }`}
                    >
                      <input type="radio" name="rsvp-status" value={value} checked={on} onChange={() => setStatus(value)} className="sr-only" />
                      <span className="font-heading text-2xl leading-tight">{label}</span>
                      <span className={`text-xs ${on ? "text-dc-on-dark/80" : "text-dc-text-3"}`}>{sub}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-5 flex flex-col gap-1.5">
              <label htmlFor={ids.name} className="text-sm font-semibold text-dc-ink">
                Nama
              </label>
              <input
                ref={nameRef}
                id={ids.name}
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError && e.target.value.trim()) setNameError(null);
                }}
                onBlur={() => {
                  if (!name.trim() && name.length > 0) setNameError("Tulis namamu dulu, supaya pengantin tahu siapa yang datang.");
                }}
                required
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? `${ids.name}-err` : undefined}
                className={controlClasses}
              />
              {nameError && (
                <p id={`${ids.name}-err`} role="alert" className="text-xs font-medium text-dc-danger">
                  {nameError}
                </p>
              )}
            </div>

            <AnimatePresence initial={false}>
              {status === "attending" && (
                <motion.div
                  initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: reduced ? 0.01 : 0.3, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-4 pt-5">
                    <div>
                      <p id={ids.party} className="text-sm font-semibold text-dc-ink">
                        Jumlah yang hadir
                      </p>
                      <p className="text-xs text-dc-text-3">Termasuk kamu</p>
                    </div>
                    <div role="group" aria-labelledby={ids.party} className="flex items-center gap-1 rounded-full border border-dc-line-strong bg-dc-ivory p-1">
                      <button
                        type="button"
                        onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                        disabled={partySize <= 1}
                        aria-label="Kurangi satu orang"
                        className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-dc-ink hover:bg-dc-cream disabled:opacity-40"
                      >
                        <span aria-hidden>−</span>
                      </button>
                      <output aria-live="polite" className="min-w-12 text-center font-heading text-2xl tabular-nums text-dc-ink">
                        {partySize}
                        <span className="sr-only"> orang</span>
                      </output>
                      <button
                        type="button"
                        onClick={() => setPartySize((n) => Math.min(MAX_PARTY, n + 1))}
                        disabled={partySize >= MAX_PARTY}
                        aria-label="Tambah satu orang"
                        className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-dc-ink hover:bg-dc-cream disabled:opacity-40"
                      >
                        <span aria-hidden>+</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-5 flex flex-col gap-1.5">
              <label htmlFor={ids.phone} className="text-sm font-semibold text-dc-ink">
                Nomor WhatsApp <span className="font-normal text-dc-text-3">(opsional)</span>
              </label>
              <input id={ids.phone} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx" className={controlClasses} />
            </div>

            <div className="mt-5 flex flex-col gap-1.5">
              <label htmlFor={ids.msg} className="text-sm font-semibold text-dc-ink">
                Ucapan dan doa <span className="font-normal text-dc-text-3">(opsional)</span>
              </label>
              <textarea
                id={ids.msg}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                rows={4}
                aria-describedby={`${ids.msg}-count`}
                className={`${controlClasses} py-3`}
              />
              <p id={`${ids.msg}-count`} className="text-right text-xs text-dc-text-3">
                {message.length}/{MAX_MESSAGE}
              </p>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-lg border border-dc-danger/25 bg-dc-danger/5 px-4 py-3 text-sm text-dc-danger">
                {error}
              </p>
            )}
            <Button type="submit" variant="gold" size="lg" block loading={saving} className="mt-5">
              {status === "attending" ? "Kirim, aku akan hadir" : "Kirim kabar"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </Shell>
  );
}
