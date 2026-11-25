"use client";

// Guest RSVP in the "Putih" system: a white invitation card with a fine gold
// inner frame (the gold gate on top, the couple's names in the display
// serif), then the reply card. No marketplace header: a guest came to answer
// an invitation, not to shop. The root carries data-wd-public so shared
// pieces (GoldArch, the dc- motion classes) read in the Putih palette.
//
// States: loading (skeleton of the card), invalid or inactive link (4xx),
// could not load (network or server, with "Coba lagi"), the form (with
// inline name validation and a send error), and sent (thank-you card that
// takes focus). The API has no "already answered" signal, so a guest who
// opens the link again simply sees the form.
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { wdButton } from "@/components/home/ui";
import { GoldArch } from "@/components/ornament/GoldArch";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { apiGet, apiPost, ApiError, type RSVPInfo } from "@/lib/api";
import { EASE, useReducedMotion } from "@/lib/motion";

import { daysUntil, downloadIcs, googleCalendarUrl, parseEventDate } from "./calendar";

type Status = "attending" | "not_attending";
type Load = "loading" | "ready" | "invalid" | "failed";
const MAX_PARTY = 10;
const MAX_MESSAGE = 500;
const NAME_ERROR = "Tulis namamu dulu, supaya pengantin tahu siapa yang datang.";

const FIELD =
  "block min-h-12 w-full rounded-[14px] border border-wd-line-2 bg-white px-4 text-[0.98rem] text-wd-ink outline-none transition-[border-color,box-shadow] placeholder:text-wd-muted hover:border-wd-muted focus:border-wd-accent-ink focus:shadow-[0_0_0_4px_var(--wd-accent-soft)] focus-visible:outline-none aria-[invalid=true]:border-wd-danger";
const LABEL = "text-[0.9rem] font-semibold text-wd-ink";

/** "Pernikahan Shareen & Utama" -> { lead: "Pernikahan", names: "Shareen & Utama" }. */
function splitTitle(name: string) {
  const m = /^(pernikahan|resepsi|akad nikah|walimah|ngunduh mantu)\s+(.+)$/i.exec(name.trim());
  return m ? { lead: m[1], names: m[2] } : { lead: "", names: name };
}

/** The couple's names with the "&" set in the gold italic. */
function Names({ names }: { names: string }) {
  const parts = names.split(/\s+&\s+/);
  if (parts.length !== 2) return <>{names}</>;
  return (
    <>
      {parts[0]} <em className="px-[0.05em]">&amp;</em> {parts[1]}
    </>
  );
}

/** Two rings that slide together: the one celebratory motion, on success. */
function JoiningRings({ reduced }: { reduced: boolean }) {
  const t = { duration: reduced ? 0 : 0.9, ease: EASE, delay: reduced ? 0 : 0.15 };
  return (
    <svg viewBox="0 0 64 40" fill="none" className="mx-auto h-14 w-24 text-wd-accent-deep" aria-hidden>
      <motion.circle cx="24" cy="20" r="14" stroke="currentColor" strokeWidth="1.6" initial={{ x: reduced ? 0 : -10, opacity: reduced ? 1 : 0 }} animate={{ x: 0, opacity: 1 }} transition={t} />
      <motion.circle cx="40" cy="20" r="14" stroke="currentColor" strokeWidth="1.6" initial={{ x: reduced ? 0 : 10, opacity: reduced ? 1 : 0 }} animate={{ x: 0, opacity: 1 }} transition={t} />
    </svg>
  );
}

function Rings({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" fill="none" className={`mx-auto h-12 w-20 text-wd-accent-deep ${className}`} aria-hidden>
      <circle cx="24" cy="20" r="14" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="40" cy="20" r="14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

function SaveTheDate({ title, date, venue }: { title: string; date: Date; venue: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
      <button type="button" onClick={() => downloadIcs(title, date, venue)} className={wdButton({ variant: "outline", size: "sm", className: "min-h-11" })}>
        <CalendarIcon />
        Simpan ke kalender
      </button>
      <a href={googleCalendarUrl(title, date, venue)} target="_blank" rel="noopener noreferrer" className={wdButton({ variant: "outline", size: "sm", className: "min-h-11" })}>
        Tambah ke Google Calendar
        <span className="sr-only"> (membuka tab baru)</span>
      </a>
    </div>
  );
}

/** White card with a fine gold inner frame: the invitation's paper. */
function Paper({ children, className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`relative rounded-[32px] border border-wd-line bg-white shadow-wd-card ${className}`}>
      <span aria-hidden className="pointer-events-none absolute inset-2.5 rounded-[24px] border border-wd-accent-line/60 sm:inset-3" />
      <div className="relative">{children}</div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div data-wd-public className="wd flex min-h-dvh flex-col bg-wd-paper">
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-wd-ink focus:px-4 focus:py-2 focus:text-white">
        Langsung ke konten
      </a>
      {/* A soft champagne glow at the top, like light on card stock. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(70%_100%_at_50%_0%,var(--wd-accent-wash),transparent)]" />
      <main id="konten" className="relative mx-auto w-full max-w-[600px] flex-1 px-4 pb-10 pt-6 sm:pt-12">
        {children}
      </main>
      <footer className="relative pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 text-center">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-[0.8rem] text-wd-muted transition-colors hover:text-wd-ink">
          Undangan ini dikelola lewat
          <BrandLogo size={18} tone="dark" />
        </Link>
      </footer>
    </div>
  );
}

function Bone({ className }: { className: string }) {
  return <span aria-hidden className={`block animate-pulse rounded-full bg-wd-blush motion-reduce:animate-none ${className}`} />;
}

export function RsvpView({ token }: { token: string }) {
  const reduced = useReducedMotion() ?? false;
  const [info, setInfo] = useState<RSVPInfo | null>(null);
  const [load, setLoad] = useState<Load>("loading");
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
  const errRef = useRef<HTMLParagraphElement>(null);
  const ids = { name: useId(), phone: useId(), msg: useId(), party: useId() };

  const fetchInfo = useCallback(() => {
    apiGet<RSVPInfo>(`/api/v1/rsvp/${token}`)
      .then((d) => {
        setInfo(d);
        setLoad("ready");
      })
      // A 4xx means the link itself is wrong or switched off; anything else
      // (offline, server down) is worth another try.
      .catch((e) => setLoad(e instanceof ApiError && e.status >= 400 && e.status < 500 ? "invalid" : "failed"));
  }, [token]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  useEffect(() => {
    if (submitted) doneRef.current?.focus();
  }, [submitted]);

  useEffect(() => {
    if (error) errRef.current?.focus();
  }, [error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(NAME_ERROR);
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

  if (load === "loading") {
    return (
      <Shell>
        <div role="status" aria-label="Memuat undangan">
          <Paper className="flex flex-col items-center px-6 py-10">
            <span aria-hidden className="block h-40 w-36 animate-pulse rounded-t-full bg-wd-blush motion-reduce:animate-none" />
            <Bone className="mt-8 h-4 w-36" />
            <Bone className="mt-5 h-12 w-3/4" />
            <Bone className="mt-6 h-5 w-1/2" />
            <Bone className="mt-3 h-7 w-24" />
          </Paper>
          <span aria-hidden className="mt-6 block h-96 animate-pulse rounded-[28px] bg-white motion-reduce:animate-none" />
        </div>
      </Shell>
    );
  }

  if (load === "failed") {
    return (
      <Shell>
        <Paper role="alert" className="mt-6 px-6 py-12 text-center sm:px-12">
          <Rings />
          <h1 className="wd-display mt-5 text-[clamp(1.9rem,6vw,2.3rem)] leading-tight">Undangan belum bisa dimuat</h1>
          <p className="mx-auto mt-3 max-w-sm leading-relaxed text-wd-text">Sepertinya koneksi sedang terputus atau server sibuk. Periksa internetmu lalu coba lagi.</p>
          <button
            type="button"
            onClick={() => {
              setLoad("loading");
              fetchInfo();
            }}
            className={wdButton({ className: "mt-7" })}>
            Coba lagi
          </button>
        </Paper>
      </Shell>
    );
  }

  if (load === "invalid" || !info) {
    return (
      <Shell>
        <Paper role="alert" className="mt-6 px-6 py-12 text-center sm:px-12">
          <Rings />
          <h1 className="wd-display mt-5 text-[clamp(1.9rem,6vw,2.3rem)] leading-tight">Undangan tidak ditemukan</h1>
          <p className="mx-auto mt-3 max-w-sm leading-relaxed text-wd-text">
            Tautan ini tidak valid atau sudah tidak aktif. Coba buka lagi tautan yang dibagikan pengantin, atau tanyakan tautan yang baru kepada mereka.
          </p>
        </Paper>
      </Shell>
    );
  }

  const { lead, names } = splitTitle(info.event_name || "Konfirmasi kehadiran");
  const date = parseEventDate(info.event_date);
  const days = date ? daysUntil(date) : null;
  const dateText = date?.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const calTitle = info.event_name || "Pernikahan";
  const firstName = name.trim().split(/\s+/)[0];
  const upcoming = days !== null && days >= 0;

  return (
    <Shell>
      <Paper className="px-6 pb-9 pt-8 text-center sm:px-12 sm:pb-11 sm:pt-10">
        <header>
          <div className="relative mx-auto w-40 sm:w-48">
            <GoldArch className="relative h-auto w-full" />
          </div>
          <p className="wd-kicker mt-4">Undangan {lead ? lead.toLowerCase() : "pernikahan"}</p>
          <h1 className="wd-display mt-2 break-words text-[clamp(2.5rem,10vw,3.75rem)] leading-[1.04]">
            {lead && <span className="sr-only">{lead} </span>}
            <Names names={names} />
          </h1>
          <div aria-hidden className="mx-auto my-6 flex w-40 items-center gap-3 text-wd-accent-deep">
            <span className="h-px flex-1 bg-wd-accent-line" />
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M5 0 6.2 3.8 10 5 6.2 6.2 5 10 3.8 6.2 0 5 3.8 3.8Z" fill="currentColor" />
            </svg>
            <span className="h-px flex-1 bg-wd-accent-line" />
          </div>
          {dateText && <p className="text-[1.15rem] font-semibold text-wd-ink first-letter:uppercase sm:text-[1.25rem]">{dateText}</p>}
          {upcoming && (
            <p className="mt-2.5 inline-flex rounded-full bg-wd-accent-soft px-3 py-1 text-sm font-semibold text-wd-accent-ink">
              {days === 0 ? "Hari ini" : days === 1 ? "Besok" : `${days} hari lagi`}
            </p>
          )}
          {info.venue_note && (
            <div className="mx-auto mt-4 flex max-w-sm flex-col items-center gap-0.5 text-wd-text">
              <p className="flex items-start justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="mt-0.5 shrink-0 text-wd-accent-ink" aria-hidden>
                  <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
                <span>{info.venue_note}</span>
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.venue_note)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-wd-accent-ink underline decoration-wd-accent-line underline-offset-4 hover:text-wd-ink"
              >
                Buka peta
                <span className="sr-only"> (membuka tab baru)</span>
              </a>
            </div>
          )}
          {date && upcoming && (
            <div className="mt-5">
              <SaveTheDate title={calTitle} date={date} venue={info.venue_note} />
            </div>
          )}
        </header>
      </Paper>

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
            className="mt-6 rounded-[28px] border border-wd-accent-line bg-wd-accent-wash px-6 py-10 text-center outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wd-accent-ink"
          >
            <JoiningRings reduced={reduced} />
            <h2 className="wd-display mt-5 text-[clamp(1.9rem,6vw,2.3rem)] leading-tight">
              Terima kasih, <em>{firstName}</em>
            </h2>
            <p className="mx-auto mt-3 max-w-sm leading-relaxed text-wd-text">
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
            className="mt-6 rounded-[28px] border border-wd-line bg-white p-5 shadow-wd-card sm:p-8"
          >
            <h2 id="rsvp-judul" className="wd-title text-[1.5rem] leading-tight sm:text-[1.65rem]">
              Kabari kami <em>kehadiranmu</em>
            </h2>
            <p className="mt-1.5 text-[0.95rem] leading-relaxed text-wd-muted">Supaya pengantin bisa menyiapkan tempat untukmu.</p>

            <fieldset className="mt-6">
              <legend className={`mb-2.5 ${LABEL}`}>Apakah kamu akan hadir?</legend>
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
                      className={`relative flex min-h-20 cursor-pointer flex-col justify-center rounded-[18px] border px-4 py-3 transition-[border-color,background-color,box-shadow] duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wd-accent-ink ${
                        on ? "border-wd-accent-ink bg-wd-accent-wash shadow-[0_0_0_1px_var(--wd-accent-ink)]" : "border-wd-line-2 bg-white hover:border-wd-muted"
                      }`}
                    >
                      <input type="radio" name="rsvp-status" value={value} checked={on} onChange={() => setStatus(value)} className="sr-only" />
                      <span className="wd-display text-[1.3rem] leading-tight sm:text-[1.45rem]">{label}</span>
                      <span className={`pr-6 text-[0.8rem] ${on ? "text-wd-text" : "text-wd-muted"}`}>{sub}</span>
                      <span
                        aria-hidden
                        className={`absolute bottom-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${on ? "border-wd-accent bg-wd-accent text-wd-ink" : "border-wd-line-2 bg-white text-transparent"}`}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m5 12 5 5 9-10" />
                        </svg>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-5 flex flex-col gap-1.5">
              <label htmlFor={ids.name} className={LABEL}>
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
                  if (!name.trim() && name.length > 0) setNameError(NAME_ERROR);
                }}
                required
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? `${ids.name}-err` : undefined}
                placeholder="Nama lengkapmu"
                className={FIELD}
              />
              {nameError && (
                <p id={`${ids.name}-err`} role="alert" className="text-[0.82rem] font-medium text-wd-danger">
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
                  <div className="mt-5 flex items-center justify-between gap-4 rounded-[18px] bg-wd-paper px-4 py-3">
                    <div>
                      <p id={ids.party} className={LABEL}>
                        Jumlah yang hadir
                      </p>
                      <p className="text-[0.8rem] text-wd-muted">Termasuk kamu, maksimal {MAX_PARTY}</p>
                    </div>
                    <div role="group" aria-labelledby={ids.party} className="flex items-center gap-1 rounded-full border border-wd-line-2 bg-white p-1">
                      <button
                        type="button"
                        onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                        disabled={partySize <= 1}
                        aria-label="Kurangi satu orang"
                        className="flex h-11 w-11 items-center justify-center rounded-full text-wd-ink transition-colors hover:bg-wd-blush disabled:opacity-35 disabled:hover:bg-transparent"
                      >
                        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M5 12h14" />
                        </svg>
                      </button>
                      <output aria-live="polite" className="min-w-10 text-center text-[1.25rem] font-semibold tabular-nums text-wd-ink">
                        {partySize}
                        <span className="sr-only"> orang</span>
                      </output>
                      <button
                        type="button"
                        onClick={() => setPartySize((n) => Math.min(MAX_PARTY, n + 1))}
                        disabled={partySize >= MAX_PARTY}
                        aria-label="Tambah satu orang"
                        className="flex h-11 w-11 items-center justify-center rounded-full text-wd-ink transition-colors hover:bg-wd-blush disabled:opacity-35 disabled:hover:bg-transparent"
                      >
                        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-5 flex flex-col gap-1.5">
              <label htmlFor={ids.phone} className={LABEL}>
                Nomor WhatsApp <span className="font-normal text-wd-muted">(opsional)</span>
              </label>
              <input id={ids.phone} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx" className={FIELD} />
            </div>

            <div className="mt-5 flex flex-col gap-1.5">
              <label htmlFor={ids.msg} className={LABEL}>
                Ucapan dan doa <span className="font-normal text-wd-muted">(opsional)</span>
              </label>
              <textarea
                id={ids.msg}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                rows={4}
                aria-describedby={`${ids.msg}-count`}
                placeholder="Tulis ucapan untuk kedua mempelai"
                className={`${FIELD} resize-y py-3 leading-relaxed`}
              />
              <p id={`${ids.msg}-count`} className={`text-right text-[0.78rem] tabular-nums ${message.length >= MAX_MESSAGE ? "font-semibold text-wd-accent-ink" : "text-wd-muted"}`}>
                {message.length}/{MAX_MESSAGE}
              </p>
            </div>

            {error && (
              <p ref={errRef} tabIndex={-1} role="alert" className="mt-4 rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-wd-danger outline-none">
                {error}
              </p>
            )}
            <button type="submit" disabled={saving} aria-busy={saving || undefined} className={wdButton({ size: "lg", className: "mt-5 w-full" })}>
              {saving && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-wd-ink/30 border-t-wd-ink motion-reduce:animate-none" />}
              {saving ? "Mengirim…" : status === "attending" ? "Kirim, aku akan hadir" : "Kirim kabar"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </Shell>
  );
}
