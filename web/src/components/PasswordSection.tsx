"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { Button } from "@/components/Button";
import { PasswordField } from "@/components/PasswordField";
import { apiPost, ApiError } from "@/lib/api";

/** Shared "ubah password" form, used by Client and Vendor account pages. */
export function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/v1/auth/change-password", { current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengubah password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl text-dc-ink">Ubah Password</h2>
      <PasswordField label="Password saat ini" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
      <PasswordField label="Password baru" value={newPassword} onChange={setNewPassword} autoComplete="new-password" minLength={8} />
      <PasswordField
        label="Konfirmasi password baru"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        minLength={8}
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <AnimatePresence>
        {success && (
          <motion.p
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-sm text-green-800"
          >
            <CheckIcon /> Password berhasil diperbarui.
          </motion.p>
        )}
      </AnimatePresence>
      <Button type="submit" loading={saving} className="w-auto">
        Simpan Password Baru
      </Button>
    </form>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
      <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
