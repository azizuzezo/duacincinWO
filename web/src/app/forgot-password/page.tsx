"use client";

// Password reset in the "Putih" system (shared split layout,
// components/home/auth): email -> 6-digit code -> new password -> done.
import Link from "next/link";
import { useState } from "react";

import { AUTH_LINK, AuthError, AuthField, AuthLayout, AuthPassword, AuthSubmit, useFocusOnError } from "@/components/home/auth";
import { ResetStage } from "@/components/home/ResetStage";
import { wdButton } from "@/components/home/ui";
import { SuccessPop } from "@/components/ui/Motion";
import { OtpInput } from "@/components/ui/OtpInput";
import { apiPost, ApiError } from "@/lib/api";

type Step = "request" | "verify" | "reset" | "done";

const STEP_NO: Record<Exclude<Step, "done">, number> = { request: 1, verify: 2, reset: 3 };

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const errorRef = useFocusOnError(error);

  async function run(fn: () => Promise<void>) {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const requestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await apiPost("/api/v1/auth/forgot-password", { email });
      setStep("verify");
    });
  };
  const verifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const res = await apiPost<{ reset_token: string }>("/api/v1/auth/verify-otp", { email, code });
      setResetToken(res.reset_token);
      setStep("reset");
    });
  };
  const resetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await apiPost("/api/v1/auth/reset-password", { reset_token: resetToken, new_password: newPassword });
      setStep("done");
    });
  };

  const errorBox = error && (
    <AuthError id="reset-galat" ref={errorRef}>
      {error}
    </AuthError>
  );

  return (
    <AuthLayout
      mascot="lock"
      aside={<ResetStage step={step} />}
      title={
        step === "request" ? (
          <>
            Lupa <em>password?</em>
          </>
        ) : step === "verify" ? (
          "Masukkan kode verifikasi"
        ) : step === "reset" ? (
          "Buat password baru"
        ) : (
          <>
            Password <em>diperbarui</em>
          </>
        )
      }
      sub={
        step === "request"
          ? "Masukkan email akunmu, kami kirim kode verifikasi 6 digit."
          : step === "verify"
            ? `Kode dikirim ke ${email}, berlaku 5 menit.`
            : step === "reset"
              ? "Kode terverifikasi. Atur password baru untuk akunmu."
              : undefined
      }
      footer={
        step !== "done" && (
          <>
            Ingat password?{" "}
            <Link href="/login" className={AUTH_LINK}>
              Masuk di sini
            </Link>
          </>
        )
      }
    >
      {step !== "done" && (
        <div className="-mt-2 mb-7">
          <div className="flex gap-1.5" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span key={n} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${n <= STEP_NO[step] ? "bg-wd-accent" : "bg-wd-blush"}`} />
            ))}
          </div>
          <p className="mt-2 text-sm font-medium text-wd-muted">Langkah {STEP_NO[step]} dari 3</p>
        </div>
      )}

      {step === "request" && (
        <form onSubmit={requestOtp} className="flex flex-col gap-4">
          <AuthField label="Email" name="email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={setEmail} invalid={!!error} describedBy={error ? "reset-galat" : undefined} />
          {errorBox}
          <AuthSubmit loading={loading}>Kirim kode</AuthSubmit>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={verifyOtp} className="flex flex-col gap-4">
          <OtpInput label="Kode verifikasi 6 digit" value={code} onChange={setCode} invalid={!!error} autoFocus />
          {errorBox}
          <AuthSubmit loading={loading} disabled={code.length !== 6}>
            Verifikasi
          </AuthSubmit>
          <button type="button" onClick={() => setStep("request")} className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-wd-accent-ink underline-offset-4 hover:underline">
            Ganti email
          </button>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={resetPassword} className="flex flex-col gap-4">
          <AuthPassword label="Password baru" name="new-password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} minLength={8} hint="Minimal 8 karakter." invalid={!!error} describedBy={error ? "reset-galat" : undefined} />
          {errorBox}
          <AuthSubmit loading={loading}>Simpan password baru</AuthSubmit>
        </form>
      )}

      {step === "done" && (
        <div className="flex flex-col gap-5">
          <p role="status" className="flex items-center gap-3 rounded-xl border border-wd-ok/30 bg-wd-ok/[0.06] p-4 text-sm font-medium text-wd-ok">
            <SuccessPop tone="success" className="shrink-0" />
            Password berhasil diperbarui. Silakan masuk kembali.
          </p>
          <Link href="/login" className={wdButton({ size: "lg", className: "w-full" })}>
            Masuk sekarang
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
