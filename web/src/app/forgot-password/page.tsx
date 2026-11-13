"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { PasswordField } from "@/components/PasswordField";
import { TextField } from "@/components/TextField";
import { SuccessPop } from "@/components/ui/Motion";
import { OtpInput } from "@/components/ui/OtpInput";
import { apiPost, ApiError } from "@/lib/api";

type Step = "request" | "verify" | "reset" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/v1/auth/forgot-password", { email });
      setStep("verify");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ reset_token: string }>("/api/v1/auth/verify-otp", { email, code });
      setResetToken(res.reset_token);
      setStep("reset");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/v1/auth/reset-password", {
        reset_token: resetToken,
        new_password: newPassword,
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      variant="unified"
      title={
        step === "request"
          ? "Reset password"
          : step === "verify"
            ? "Masukkan kode verifikasi"
            : step === "reset"
              ? "Buat password baru"
              : "Selesai"
      }
      subtitle={
        step === "request"
          ? "Masukkan email akunmu, kami kirim kode verifikasi 6 digit."
          : step === "verify"
            ? `Kode dikirim ke ${email}, berlaku 5 menit.`
            : step === "reset"
              ? "Kode terverifikasi, sekarang atur password baru."
              : undefined
      }
      footer={
        step === "done" && (
          <Link href="/login" className="font-semibold text-dc-ink underline decoration-dc-gold underline-offset-4 hover:text-dc-clay">
            Kembali ke halaman masuk
          </Link>
        )
      }
    >
      {step !== "done" && (
        <div className="-mt-3 mb-7">
          <div className="flex gap-1.5" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span key={n} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${n <= (step === "request" ? 1 : step === "verify" ? 2 : 3) ? "bg-dc-gold" : "bg-dc-paper-3"}`} />
            ))}
          </div>
          <p className="mt-2 text-sm font-semibold text-dc-text-2">Langkah {step === "request" ? 1 : step === "verify" ? 2 : 3} dari 3</p>
        </div>
      )}

      {step === "request" && (
        <form onSubmit={requestOtp} className="flex flex-col gap-4">
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
          {error && <p role="alert" className="text-sm text-dc-danger">
            {error}
          </p>}
          <Button type="submit" loading={loading}>
            Kirim kode OTP
          </Button>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={verifyOtp} className="flex flex-col gap-4">
          <OtpInput label="Kode verifikasi 6 digit" value={code} onChange={setCode} invalid={!!error} autoFocus />
          {error && <p role="alert" className="text-sm text-dc-danger">
            {error}
          </p>}
          <Button type="submit" loading={loading}>
            Verifikasi
          </Button>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={resetPassword} className="flex flex-col gap-4">
          <PasswordField
            label="Password baru"
            autoComplete="new-password"
            value={newPassword}
            onChange={setNewPassword}
            minLength={8}
            hint="Minimal 8 karakter."
          />
          {error && <p role="alert" className="text-sm text-dc-danger">
            {error}
          </p>}
          <Button type="submit" loading={loading}>
            Simpan password baru
          </Button>
        </form>
      )}

      {step === "done" && (
        <p role="status" className="flex items-center gap-3 rounded-xl border border-dc-success/30 bg-dc-success/[0.06] p-4 text-sm font-medium text-dc-success">
          <SuccessPop tone="success" className="shrink-0" />
          Password berhasil diperbarui. Silakan masuk kembali.
        </p>
      )}
    </AuthCard>
  );
}
