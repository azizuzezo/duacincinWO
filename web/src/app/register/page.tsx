"use client";

// Sign-up in the "Putih" system (shared split layout, components/home/auth).
// Step 0: pick a role (skipped with ?role=client|vendor). Step 1: details,
// or Google. Step 2: the 6-digit email code; the account is created only
// after the inbox is proven (POST /auth/register/otp -> ticket -> register).
// Couples accept the Client ToS by signing up (notice shown); vendors tick the
// partnership agreement. ?next= is honored for couples.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AgreementCheckbox, AgreementNotice } from "@/components/AgreementCheckbox";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { nextFromLocation } from "@/components/auth/redirect";
import { AUTH_LINK, AuthError, AuthField, AuthLayout, AuthOr, AuthPassword, AuthSubmit, CLIENT_PANEL, MascotIcon, useFocusOnError, VENDOR_PANEL } from "@/components/home/auth";
import { OtpInput } from "@/components/ui/OtpInput";
import { apiPost, ApiError } from "@/lib/api";

type Role = "client" | "vendor";

// Only client/vendor register publicly. Admin & wedding_consultant
// accounts are created manually (PRD §8.10), so there's no third choice here.
const ROLE_CONFIG: Record<
  Role,
  {
    endpoint: string;
    redirect: string;
    nameLabel: string;
    nameAutoComplete: string;
    agreementHref: string;
    agreementLabel: string;
    cardTitle: string;
    cardDescription: string;
    waHint: string;
  }
> = {
  client: {
    endpoint: "/api/v1/auth/client/register",
    redirect: "/client/dashboard",
    nameLabel: "Nama lengkap",
    nameAutoComplete: "name",
    agreementHref: "/legal/client-tos",
    agreementLabel: "Ketentuan Layanan Client",
    cardTitle: "Calon pengantin",
    cardDescription: "Cari vendor, atur budget, dan susun rencana pernikahan.",
    waHint: "Notifikasi pesan dari vendor lewat WhatsApp resmi DuaCincin. Hanya admin yang bisa melihat nomor ini.",
  },
  vendor: {
    endpoint: "/api/v1/auth/vendor/register",
    redirect: "/vendor/profile",
    nameLabel: "Nama usaha",
    nameAutoComplete: "organization",
    agreementHref: "/legal/vendor-agreement",
    agreementLabel: "Perjanjian Kemitraan Vendor DuaCincin",
    cardTitle: "Vendor",
    cardDescription: "Terima booking dari calon pengantin lewat DuaCincin.",
    waHint: "Notifikasi pesan dari calon pengantin lewat WhatsApp resmi DuaCincin.",
  },
};


export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  // A CTA elsewhere that already knows the intent (e.g. "Daftar sebagai
  // vendor") links with ?role=vendor to skip the choice step.
  const searchParams = useSearchParams();
  const preselected = searchParams.get("role");
  const initialRole: Role | null = preselected === "client" || preselected === "vendor" ? preselected : null;

  const [role, setRole] = useState<Role | null>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  // Vendors tick the partnership agreement; couples accept by signing up.
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Step 2: the email code. The ticket comes from /register/otp and goes
  // back with the code, so the account is created only after the inbox is proven.
  const [ticket, setTicket] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [resent, setResent] = useState(false);
  const errorRef = useFocusOnError(error);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  async function sendCode() {
    const res = await apiPost<{ signup_ticket: string }>("/api/v1/auth/register/otp", { email });
    setTicket(res.signup_ticket);
    setCode("");
    setResendIn(60);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setError(null);
    setLoading(true);
    try {
      await sendCode();
      setResent(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndCreate(otp = code) {
    if (!role || !ticket || otp.length !== 6 || loading) return;
    setError(null);
    setLoading(true);
    try {
      await apiPost(ROLE_CONFIG[role].endpoint, {
        email,
        password,
        full_name: name,
        whatsapp,
        accept_terms: role === "vendor" ? acceptTerms : true,
        signup_ticket: ticket,
        otp_code: otp,
      });
      router.push(role === "client" ? (nextFromLocation() ?? ROLE_CONFIG[role].redirect) : ROLE_CONFIG[role].redirect);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan, coba lagi.");
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    setLoading(true);
    try {
      await sendCode();
      setResent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function backToForm() {
    setTicket(null);
    setCode("");
    setError(null);
    setResent(false);
  }

  function resetChoice() {
    backToForm();
    setRole(null);
    setName("");
    setEmail("");
    setWhatsapp("");
    setPassword("");
    setAcceptTerms(false);
    setError(null);
  }

  const describedBy = error ? "daftar-galat" : undefined;
  const errorBox = error && (
    <AuthError id="daftar-galat" ref={errorRef}>
      {error}
    </AuthError>
  );

  return (
    <AuthLayout
      wide={!!role && !ticket}
      mascot={role === "vendor" ? "shop" : "rings"} panel={role === "vendor" ? VENDOR_PANEL : CLIENT_PANEL}
      title={
        ticket ? (
          "Cek email kamu"
        ) : role ? (
          <>
            Daftar sebagai <em>{ROLE_CONFIG[role].cardTitle.toLowerCase()}</em>
          </>
        ) : (
          <>
            Buat akun <em>DuaCincin</em>
          </>
        )
      }
      sub={ticket ? `Kami kirim kode 6 digit ke ${email}. Berlaku 10 menit.` : role ? undefined : "Pilih peranmu untuk mulai. Gratis untuk calon pengantin."}
      footer={
        <>
          Sudah punya akun?{" "}
          <Link href="/login" className={AUTH_LINK}>
            Masuk di sini
          </Link>
        </>
      }
    >
      {role && (
        <div className="-mt-2 mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <ol aria-label="Langkah daftar" className="flex items-center gap-2 text-[0.8rem] font-semibold">
          {["Isi data", "Kode email"].map((t, i) => {
            const cur = (ticket ? 1 : 0) === i;
            const done = ticket && i === 0;
            return (
              <li key={t} aria-current={cur ? "step" : undefined} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden className="h-px w-6 bg-wd-line-2" />}
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[0.72rem] ${cur || done ? "bg-wd-accent text-wd-ink" : "bg-wd-blush text-wd-muted"}`}>{done ? "✓" : i + 1}</span>
                <span className={cur ? "text-wd-ink" : "text-wd-muted"}>{t}</span>
              </li>
            );
          })}
        </ol>
        {!ticket && (
          <button type="button" onClick={resetChoice} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-wd-accent-ink underline-offset-4 hover:underline">
            <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Ganti peran
          </button>
        )}
        </div>
      )}
      {!role ? (
        <div className="flex flex-col gap-3">
          {(Object.keys(ROLE_CONFIG) as Role[]).map((r, i) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`group relative flex min-h-11 items-center gap-4 overflow-hidden rounded-[22px] p-4 pr-5 text-left ring-1 ring-wd-line transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-wd-lift motion-reduce:transition-none motion-reduce:hover:transform-none ${i === 0 ? "bg-white" : "bg-wd-accent-wash"}`}
            >
              <span className="block h-[72px] w-[72px] shrink-0 rounded-2xl bg-wd-accent-wash p-2 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:transform-none">
                <MascotIcon kind={r === "vendor" ? "shop" : "rings"} />
              </span>
              <span className="flex-1">
                <span className="flex items-center gap-2 text-[1.1rem] font-semibold text-wd-ink">
                  {ROLE_CONFIG[r].cardTitle}
                  {r === "client" && <span className="rounded-full bg-wd-accent px-2 py-0.5 text-[0.7rem] font-semibold">Gratis</span>}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-wd-text">{ROLE_CONFIG[r].cardDescription}</span>
              </span>
              <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-wd-ink transition-transform duration-300 group-hover:translate-x-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      ) : ticket ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verifyAndCreate();
          }}
          className="flex flex-col gap-5"
        >
          <OtpInput value={code} onChange={setCode} onComplete={(v) => void verifyAndCreate(v)} invalid={!!error} autoFocus />
          {errorBox}
          {resent && !error && (
            <p role="status" className="text-sm text-wd-text">
              Kode baru sudah dikirim. Pakai kode yang paling baru.
            </p>
          )}
          <AuthSubmit loading={loading} disabled={code.length !== 6}>
            {role === "vendor" ? "Verifikasi dan daftar" : "Verifikasi dan buat akun"}
          </AuthSubmit>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" onClick={backToForm} className="inline-flex min-h-11 items-center font-semibold text-wd-accent-ink underline-offset-4 hover:underline">
              Ganti email
            </button>
            <button
              type="button"
              onClick={() => void resend()}
              disabled={resendIn > 0 || loading}
              className="inline-flex min-h-11 items-center font-semibold text-wd-ink underline decoration-wd-accent decoration-2 underline-offset-4 disabled:cursor-default disabled:text-wd-muted disabled:no-underline"
            >
              {resendIn > 0 ? `Kirim ulang dalam ${resendIn} dtk` : "Kirim ulang kode"}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-wd-muted">Tidak ada di kotak masuk? Cek folder spam atau promosi.</p>
        </form>
      ) : (
        <>
          {role === "client" && (
            <div className="mb-5">
              <AgreementNotice href={ROLE_CONFIG.client.agreementHref} label={ROLE_CONFIG.client.agreementLabel} role="calon pengantin" />
            </div>
          )}
          <div className="empty:hidden">
            <GoogleSignIn text="signup_with" acceptTerms={role === "vendor" ? acceptTerms : true} role={role} />
          </div>
          <AuthOr />
          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            <AuthField label={ROLE_CONFIG[role].nameLabel} name="name" autoComplete={ROLE_CONFIG[role].nameAutoComplete} value={name} onChange={setName} />
            <AuthField label="Email" name="email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={setEmail} invalid={!!error} describedBy={describedBy} />
            <AuthField label="Nomor WhatsApp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={setWhatsapp} hint={ROLE_CONFIG[role].waHint} />
            <AuthPassword label="Password" autoComplete="new-password" value={password} onChange={setPassword} minLength={8} hint="Minimal 8 karakter." />
            <div className="flex flex-col gap-2.5">
              {role === "vendor" && (
                <AgreementCheckbox checked={acceptTerms} onChange={setAcceptTerms} href={ROLE_CONFIG.vendor.agreementHref} label={ROLE_CONFIG.vendor.agreementLabel} />
              )}
              {errorBox}
              <AuthSubmit loading={loading} disabled={role === "vendor" && !acceptTerms}>
                Lanjut, kirim kode ke email
              </AuthSubmit>
            </div>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
