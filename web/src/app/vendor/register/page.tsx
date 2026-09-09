"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { PasswordField } from "@/components/PasswordField";
import { TextField } from "@/components/TextField";
import { apiPost, ApiError } from "@/lib/api";

export default function VendorRegisterPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/v1/auth/vendor/register", {
        email,
        password,
        full_name: businessName,
      });
      router.push("/vendor/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Mitra Vendor"
      title="Daftar jadi mitra vendor"
      subtitle="Terima booking dari calon pengantin lewat DuaCincin — pembayaran aman lewat platform."
      footer={
        <>
          Sudah jadi mitra?{" "}
          <Link href="/vendor/login" className="font-semibold text-dc-navy hover:text-dc-gold">
            Masuk di sini
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField label="Nama usaha" autoComplete="organization" value={businessName} onChange={setBusinessName} />
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          minLength={8}
        />
        <p className="-mt-2 text-xs text-dc-black/50">Minimal 8 karakter.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading}>
          Daftar
        </Button>
        <p className="text-center text-xs text-dc-black/50">
          Dengan mendaftar, kamu menyetujui Perjanjian Kemitraan Vendor DuaCincin.
        </p>
      </form>
    </AuthCard>
  );
}
