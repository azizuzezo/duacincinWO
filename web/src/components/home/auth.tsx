"use client";

// Auth pages in the "Putih" system (/login, /register, /forgot-password):
// a calm white form column on the left, a tall rounded photo panel on the
// right that crossfades once through three real wedding photos and then
// rests (hidden on phones, still under reduced motion). The root carries
// data-wd-public so the older shared pieces used inside (OtpInput,
// AgreementCheckbox, Google button divider) pick up the Putih palette.
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { forwardRef, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { dissolve, useReducedMotion } from "@/lib/motion";

import { wdButton } from "./ui";

export type AuthPanel = { headline: ReactNode; bullets: string[]; photos: string[] };

const INK = "#231f1d";
/** Eyes shut while a password field has focus (no peeking), open again when "show" is on. */
const BLINK = "origin-center [transform-box:fill-box] transition-transform duration-200 group-has-[input[type=password]:focus]/card:scale-y-[0.12] motion-reduce:transition-none";

/** Little face-icon above the form title; wiggles on hover, never under reduced motion. */
export type Mascot = "rings" | "lock" | "shop";
export function MascotIcon({ kind }: { kind: Mascot }) {
  const face = (y: number) => (
    <>
      <circle cx="19" cy={y} r="1.7" fill={INK} className={BLINK} />
      <circle cx="29" cy={y} r="1.7" fill={INK} className={BLINK} />
      <path d={`M19 ${y + 6}c1.5 1.9 3.2 2.7 5 2.700s3.5-.8 5-2.7`} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </>
  );
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="h-full w-full">
      {kind === "rings" && (
        <>
          <circle cx="17" cy="26" r="13" fill="none" stroke="#c9a45c" strokeWidth="3" />
          <circle cx="29" cy="24" r="14" fill="#dcbd80" stroke={INK} strokeWidth="2" />
          {face(22)}
        </>
      )}
      {kind === "lock" && (
        <>
          <path d="M15 21v-5a9 9 0 0 1 18 0v5" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <rect x="8" y="20" width="32" height="24" rx="7" fill="#dcbd80" stroke={INK} strokeWidth="2" />
          {face(29)}
        </>
      )}
      {kind === "shop" && (
        <>
          <path d="M6 18 10 8h28l4 10v3a6 6 0 0 1-12 0 6 6 0 0 1-12 0 6 6 0 0 1-12 0v-3Z" fill="#dcbd80" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <rect x="9" y="26" width="30" height="16" rx="3" fill="#fff" stroke={INK} strokeWidth="2" />
          {face(31)}
        </>
      )}
    </svg>
  );
}

export const CLIENT_PANEL: AuthPanel = {
  headline: (
    <>
      Satu akun untuk <em>seluruh persiapan</em>
    </>
  ),
  bullets: ["Vendor diverifikasi tim DuaCincin", "Chat dan booking di satu tempat", "Dana ditahan DuaCincin sampai acara selesai"],
  photos: ["/photos/pinterest/pasangan-sofa-bunga.webp", "/photos/pinterest/dekorasi-taman.webp", "/photos/pinterest/rias-hijab.webp"],
};

export const VENDOR_PANEL: AuthPanel = {
  headline: (
    <>
      Fokus pada karyamu, <em>booking tercatat rapi</em>
    </>
  ),
  bullets: ["Profil dan portofolio tampil di direktori setelah diverifikasi", "Chat dan booking dengan calon pengantin di satu tempat", "Dana cair setelah acara selesai, harga paketmu diterima utuh"],
  photos: ["/photos/pinterest/pendopo-kursi-tamu.webp", "/photos/pinterest/pelaminan-kristal.webp", "/photos/kategori-vendor/catering-meja.webp"],
};

function PhotoPanel({ panel }: { panel: AuthPanel }) {
  const reduced = useReducedMotion();
  const [shot, setShot] = useState(0);
  const n = panel.photos.length;

  useEffect(() => {
    // One slow pass through the photos, then rest on the last one.
    if (reduced || shot >= n - 1) return;
    const t = window.setTimeout(() => setShot((i) => i + 1), 5000);
    return () => window.clearTimeout(t);
  }, [reduced, shot, n]);

  const fade = dissolve(reduced, 1.2);
  const src = panel.photos[Math.min(shot, n - 1)];

  return (
    <aside aria-hidden className="group relative hidden bg-wd-paper p-4 pl-0 lg:block">
      <div className="relative h-full min-h-[640px] overflow-hidden rounded-[32px] bg-wd-blush">
        <AnimatePresence initial={false}>
          <motion.div key={src} className="absolute inset-0" {...fade}>
            <Image src={src} alt="" fill priority={shot === 0} sizes="50vw" className="object-cover" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 via-black/25 to-transparent px-9 pb-8 pt-24 text-white">
          <p className="wd-display text-[clamp(1.8rem,2.6vw,2.4rem)] leading-[1.1] !text-white [&_em]:!text-[#f1dcaa]">{panel.headline}</p>
          <div className="mt-5 flex gap-1.5">
            {panel.photos.map((p, i) => (
              <span key={p} className={`h-1 rounded-full transition-[width,background-color] duration-500 ${i === shot ? "w-8 bg-white" : "w-3 bg-white/40"}`} />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Split auth page: logo + back link, title (an <em> turns gold italic), optional sub, the form, then the footer line. */
export function AuthLayout({
  title,
  sub,
  children,
  footer,
  panel = CLIENT_PANEL,
  mascot = "rings",
  aside,
}: {
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  panel?: AuthPanel;
  mascot?: Mascot;
  /** Replaces the photo panel (e.g. the reset-password stage). */
  aside?: ReactNode;
}) {
  return (
    <div data-wd-public className="wd flex min-h-svh flex-1">
      <div className="grid w-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <main id="konten" className="flex flex-col bg-wd-paper px-5 py-6 sm:px-10 lg:px-14 lg:py-8">
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="DuaCincin, ke beranda" className="inline-flex min-h-11 items-center rounded-md">
              <BrandLogo size={24} priority />
            </Link>
            <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-wd-muted transition-colors hover:text-wd-ink">
              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
              Beranda
            </Link>
          </div>
          <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center py-8">
            <div className="group/card relative overflow-hidden rounded-[28px] bg-white px-6 pb-8 pt-12 shadow-wd-card ring-1 ring-wd-line sm:px-9">
              {/* Shop awning along the card's top edge. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-5"
                style={{
                  backgroundImage: "radial-gradient(circle at 18px 0, #dcbd80 17px, transparent 18px), radial-gradient(circle at 54px 0, #f3ead6 17px, transparent 18px)",
                  backgroundSize: "72px 20px",
                  backgroundRepeat: "repeat-x",
                }}
              />
              <span className="block h-14 w-14 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/card:-rotate-6 group-hover/card:scale-110 motion-reduce:transition-none motion-reduce:group-hover/card:transform-none">
                <MascotIcon kind={mascot} />
              </span>
              <h1 className="wd-display mt-4 text-[clamp(2rem,3.6vw,2.6rem)] leading-[1.06]">{title}</h1>
              {sub && <p className="mt-3 leading-relaxed text-wd-text">{sub}</p>}
              <div className="mt-7">{children}</div>
            </div>
            {footer && <div className="mt-6 text-center text-[0.95rem] text-wd-text">{footer}</div>}
          </div>
        </main>
        {aside ? (
          <aside aria-hidden className="relative hidden bg-wd-paper p-4 pl-0 lg:block">
            <div className="relative h-full min-h-[640px] overflow-hidden rounded-[32px] bg-[radial-gradient(ellipse_at_70%_25%,#ffffff_0%,#fbf5e6_55%,#f3e8cc_100%)]">{aside}</div>
          </aside>
        ) : (
          <PhotoPanel panel={panel} />
        )}
      </div>
    </div>
  );
}

const FIELD =
  "peer block h-14 w-full rounded-[14px] border border-wd-line-2 bg-white px-4 pt-5 text-[0.98rem] text-wd-ink outline-none transition-[border-color,box-shadow] placeholder:text-transparent hover:border-wd-muted focus:border-wd-accent-ink focus:shadow-[0_0_0_4px_var(--wd-accent-soft)] focus-visible:outline-none aria-[invalid=true]:border-wd-danger";
const FLOAT =
  "pointer-events-none absolute left-4 top-[18px] origin-left text-[0.98rem] leading-5 text-wd-muted transition-transform duration-200 peer-focus:-translate-y-[9px] peer-focus:scale-[0.78] peer-[:not(:placeholder-shown)]:-translate-y-[9px] peer-[:not(:placeholder-shown)]:scale-[0.78] motion-reduce:transition-none";

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  minLength?: number;
  hint?: string;
  invalid?: boolean;
  /** id of a message (error) that describes this field. */
  describedBy?: string;
  spellCheck?: boolean;
  trailing?: ReactNode;
};

/** Floating-label input. The visible label is the placeholder's twin, so the field always has a name. */
export function AuthField({ label, name, type = "text", value, onChange, autoComplete, inputMode, minLength, hint, invalid, describedBy, spellCheck, trailing }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          inputMode={inputMode}
          minLength={minLength}
          spellCheck={spellCheck}
          aria-invalid={invalid || undefined}
          aria-describedby={[hintId, describedBy].filter(Boolean).join(" ") || undefined}
          placeholder={label}
          className={`${FIELD} ${trailing ? "pr-14" : ""}`}
        />
        <label htmlFor={id} className={FLOAT}>
          {label}
        </label>
        {trailing}
      </div>
      {hint && (
        <p id={hintId} className="mt-1.5 px-1 text-[0.82rem] leading-relaxed text-wd-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Password field with a show/hide toggle. */
export function AuthPassword(props: Omit<FieldProps, "type" | "trailing" | "name"> & { name?: string }) {
  const [show, setShow] = useState(false);
  return (
    <AuthField
      {...props}
      name={props.name ?? "password"}
      type={show ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
          aria-pressed={show}
          className="absolute right-2 top-[28px] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-wd-muted transition-colors hover:bg-wd-blush hover:text-wd-ink"
        >
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {show && <path d="M4 4l16 16" />}
          </svg>
        </button>
      }
    />
  );
}

/** Error message that takes focus when it appears, so it is seen and read. */
export const AuthError = forwardRef<HTMLParagraphElement, { id: string; children: ReactNode }>(function AuthError({ id, children }, ref) {
  return (
    <p id={id} ref={ref} tabIndex={-1} role="alert" className="rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-wd-danger outline-none">
      {children}
    </p>
  );
});

/** Focus the error element whenever a new error message appears. */
export function useFocusOnError(error: string | null) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  return ref;
}

export function AuthSubmit({ loading, disabled, children, busyLabel = "Memproses…" }: { loading: boolean; disabled?: boolean; children: ReactNode; busyLabel?: string }) {
  return (
    <button type="submit" disabled={loading || disabled} aria-busy={loading || undefined} className={wdButton({ size: "lg", className: "w-full" })}>
      {loading && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-wd-ink/30 border-t-wd-ink motion-reduce:animate-none" />}
      {loading ? busyLabel : children}
    </button>
  );
}

/** "atau pakai email" separator under the Google button (only shown when Google sign-in is configured). */
export function AuthOr() {
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;
  return (
    <div role="separator" aria-label="atau pakai email" className="my-6 flex items-center gap-3 text-sm text-wd-muted">
      <span aria-hidden className="h-px flex-1 bg-wd-line" />
      <span aria-hidden>atau pakai email</span>
      <span aria-hidden className="h-px flex-1 bg-wd-line" />
    </div>
  );
}

export const AUTH_LINK = "font-semibold text-wd-ink underline decoration-wd-accent decoration-2 underline-offset-4 hover:text-wd-accent-ink";
