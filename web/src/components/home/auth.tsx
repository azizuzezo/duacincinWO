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

import { Check, wdButton } from "./ui";

export type AuthPanel = { headline: ReactNode; bullets: string[]; photos: string[] };

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
    <aside aria-hidden className="relative hidden p-4 lg:block">
      <div className="relative h-full min-h-[640px] overflow-hidden rounded-[32px] bg-wd-blush">
        <AnimatePresence initial={false}>
          <motion.div key={src} className="absolute inset-0" {...fade}>
            <Image src={src} alt="" fill priority={shot === 0} sizes="50vw" className="object-cover" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent" />
        <div className="absolute inset-x-8 bottom-8 rounded-[24px] bg-white/92 p-6 shadow-wd-pop backdrop-blur-md">
          <p className="wd-display text-[1.6rem] leading-snug">{panel.headline}</p>
          <ul className="mt-4 grid gap-2 text-sm text-wd-text">
            {panel.bullets.map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-wd-accent-soft text-wd-accent-ink">
                  <Check size={11} />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex gap-1.5">
            {panel.photos.map((p, i) => (
              <span key={p} className={`h-1 rounded-full transition-[width,background-color] duration-500 ${i === shot ? "w-8 bg-wd-accent" : "w-3 bg-wd-line-2"}`} />
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
}: {
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  panel?: AuthPanel;
}) {
  return (
    <div data-wd-public className="wd flex min-h-svh flex-1">
      <div className="grid w-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <main id="konten" className="flex flex-col px-5 py-6 sm:px-10 lg:px-16 lg:py-8">
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
          <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
            <h1 className="wd-display text-[clamp(2.2rem,4vw,2.9rem)] leading-[1.06]">{title}</h1>
            {sub && <p className="mt-3 leading-relaxed text-wd-text">{sub}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-center text-[0.95rem] text-wd-text">{footer}</div>}
          </div>
        </main>
        <PhotoPanel panel={panel} />
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
