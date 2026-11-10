"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { PasswordField } from "@/components/PasswordField";
import { Button } from "@/components/ui/Button";
import { apiPost, ApiError } from "@/lib/api";
import { motionSafe, useReducedMotion } from "@/lib/motion";

// Success line drops in so the confirmation is noticed next to the button.
const confirmIn = {
  hidden: { opacity: 0, y: -4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24 } },
};

/** Shared "ubah password" form, used by Client and Vendor account pages. */
export function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const reduced = useReducedMotion();

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-labelledby="ubah-password">
      <div>
        <h2 id="ubah-password" className="font-heading text-[1.75rem] leading-tight text-dc-ink">
          Ubah password
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-dc-text-2">Minimal 8 karakter. Setelah diganti, pakai password baru saat masuk berikutnya.</p>
      </div>
      <PasswordField label="Password saat ini" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <PasswordField label="Password baru" value={newPassword} onChange={setNewPassword} autoComplete="new-password" minLength={8} />
        <PasswordField label="Ulangi password baru" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" minLength={8} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-dc-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button type="submit" variant="primary" loading={saving}>
          Simpan password baru
        </Button>
        <div aria-live="polite">
          <AnimatePresence>
            {success && (
              <motion.p
                role="status"
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0 }}
                variants={motionSafe(reduced, confirmIn)}
                className="flex items-center gap-1.5 text-sm font-semibold text-dc-success"
              >
                <CheckIcon /> Password berhasil diperbarui.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </form>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
      <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
