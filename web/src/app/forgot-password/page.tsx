"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { PasswordField } from "@/components/PasswordField";
import { TextField } from "@/components/TextField";
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
      eyebrow="Lupa Password"
      title={
        step === "request"
          ? "Reset password"
          : step === "verify"
            ? "Masukkan kode OTP"
            : step === "reset"
              ? "Buat password baru"
              : "Selesai"
      }
      subtitle={
        step === "request"
          ? "Masukkan email akunmu, kami kirim kode OTP 6 digit."
          : step === "verify"
            ? `Kode dikirim ke ${email}, berlaku 5 menit.`
            : step === "reset"
              ? "Kode terverifikasi, sekarang atur password baru."
              : undefined
      }
      footer={
        step === "done" && (
          <Link href="/client/login" className="font-semibold text-dc-navy hover:text-dc-gold">
            Kembali ke halaman masuk
          </Link>
        )
      }
    >
      {step === "request" && (
        <form onSubmit={requestOtp} className="flex flex-col gap-4">
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={loading}>
            Kirim kode OTP
          </Button>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={verifyOtp} className="flex flex-col gap-4">
          <TextField label="Kode OTP" autoComplete="one-time-code" value={code} onChange={setCode} />
          {error && <p className="text-sm text-red-600">{error}</p>}
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
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={loading}>
            Simpan password baru
          </Button>
        </form>
      )}

      {step === "done" && (
        <p className="text-sm text-dc-black/70">Password berhasil diperbarui. Silakan masuk kembali.</p>
      )}
    </AuthCard>
  );
}
