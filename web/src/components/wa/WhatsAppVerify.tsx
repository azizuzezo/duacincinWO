"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { BodyPortal } from "@/components/ui/BodyPortal";
import { Button as UIButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { OtpInput } from "@/components/ui/OtpInput";
import { useFocusTrap } from "@/components/ui/useFocusTrap";
import { apiGet, apiPost, ApiError, formatWhatsApp, type CurrentUser } from "@/lib/api";
import { motionSafe, scaleIn, useReducedMotion } from "@/lib/motion";

/** GET /whatsapp/me */
export type WhatsAppStatus = {
  verified: boolean;
  phone: string;
  phone_display: string;
  code_sent: boolean;
  resend_in: number;
};

// Verified once in this tab: later pages skip the check entirely.
let verifiedInTab = false;

/** "6281234567890" -> "0812 3456 7890", the way people type it. */
function localForm(digits: string): string {
  if (!digits.startsWith("62")) return digits;
  const d = "0" + digits.slice(2);
  return d.replace(/^(\d{4})(\d{4})(\d+)$/, "$1 $2 $3");
}

function message(err: unknown): string {
  if (err instanceof ApiError) return err.message.charAt(0).toUpperCase() + err.message.slice(1);
  return "Terjadi kesalahan, coba lagi.";
}

/**
 * The two steps of proving a WhatsApp number: type it and get a code over
 * WhatsApp, then enter that code. Used by the blocking gate (first time) and
 * by the "Ganti nomor" dialog.
 */
export function WhatsAppVerifyFlow({
  status,
  onVerified,
  changing = false,
}: {
  status: WhatsAppStatus | null;
  onVerified: (s: WhatsAppStatus) => void;
  /** Changing an already verified number: start empty, not from it. */
  changing?: boolean;
}) {
  const startPhone = status && !(changing && status.verified) ? localForm(status.phone) : "";
  const [phone, setPhone] = useState(startPhone);
  const [step, setStep] = useState<"phone" | "code">(status?.code_sent && !status.verified ? "code" : "phone");
  const [sentTo, setSentTo] = useState(status?.code_sent && !status.verified ? status.phone_display : "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(status?.resend_in ?? 0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const s = await apiPost<WhatsAppStatus>("/api/v1/whatsapp/me/code", { phone });
      setSentTo(s.phone_display);
      setResendIn(s.resend_in || 60);
      setCode("");
      setStep("code");
    } catch (err) {
      setError(message(err));
    } finally {
      setLoading(false);
    }
  }

  async function verify(value = code) {
    if (value.length !== 6 || loading) return;
    setError(null);
    setLoading(true);
    try {
      const s = await apiPost<WhatsAppStatus>("/api/v1/whatsapp/me/verify", { code: value });
      verifiedInTab = true;
      onVerified(s);
    } catch (err) {
      setError(message(err));
      setCode("");
      setLoading(false);
    }
  }

  if (step === "code") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
        className="flex flex-col gap-4"
      >
        <div className="rounded-lg border border-dc-line bg-dc-cream/60 p-4 text-sm leading-relaxed text-dc-text-2">
          Kode 6 digit sudah dikirim lewat WhatsApp dari nomor resmi <strong className="text-dc-ink">DuaCincin</strong> ke{" "}
          <strong className="whitespace-nowrap text-dc-ink">{sentTo}</strong>. Buka WhatsApp di HP itu, lalu masukkan kodenya di sini.
        </div>
        <OtpInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} invalid={!!error} autoFocus label="Kode verifikasi WhatsApp" />
        {error && (
          <p role="alert" className="text-sm text-dc-danger">
            {error}
          </p>
        )}
        <UIButton type="submit" block loading={loading} disabled={code.length !== 6}>
          Verifikasi nomor
        </UIButton>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setError(null);
            }}
            className="inline-flex min-h-11 items-center font-semibold text-dc-clay underline-offset-4 hover:underline"
          >
            Ganti nomor
          </button>
          <button
            type="button"
            onClick={() => void send()}
            disabled={resendIn > 0 || loading}
            className="inline-flex min-h-11 items-center font-semibold text-dc-ink underline decoration-dc-gold underline-offset-4 disabled:cursor-default disabled:text-dc-text-3 disabled:no-underline"
          >
            {resendIn > 0 ? `Kirim ulang dalam ${resendIn} dtk` : "Kirim ulang kode"}
          </button>
        </div>
        <p className="text-xs leading-relaxed text-dc-text-3">
          Kode berlaku 10 menit. Jangan berikan kode ini kepada siapa pun, termasuk yang mengaku dari DuaCincin.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-4">
      <Input
        label="Nomor WhatsApp"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0812 3456 7890"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        hint="Nomor yang aktif di WhatsApp. Hanya kamu dan admin DuaCincin yang bisa melihatnya."
        required
        autoFocus
      />
      {error && (
        <p role="alert" className="text-sm text-dc-danger">
          {error}
        </p>
      )}
      <UIButton type="submit" block loading={loading} disabled={phone.trim().length < 9 || resendIn > 0}>
        {resendIn > 0 ? `Kirim kode dalam ${resendIn} dtk` : "Kirim kode ke WhatsApp"}
      </UIButton>
    </form>
  );
}

/**
 * Blocks a client or vendor dashboard until the account has a verified
 * WhatsApp number. Chats with the other side are relayed there through
 * DuaCincin's official number, so it must be the person's real number.
 * No close button and no Escape: the only way out is verifying (or logging
 * out, which the gate offers).
 */
export function WhatsAppGate({ user }: { user: CurrentUser }) {
  const applies = user.role === "client" || user.role === "vendor";
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<WhatsAppStatus | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const titleId = useId();
  const noop = useCallback(() => {}, []);
  useFocusTrap(open, dialogRef, noop);

  useEffect(() => {
    if (!applies || verifiedInTab) return;
    let live = true;
    apiGet<WhatsAppStatus>("/api/v1/whatsapp/me")
      .then((s) => {
        if (!live) return;
        if (s.verified) {
          verifiedInTab = true;
          return;
        }
        setStatus(s);
        setOpen(true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [applies]);

  if (!applies) return null;
  const other = user.role === "vendor" ? "calon pengantin" : "vendor";

  return (
    <BodyPortal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-dc-ink/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={motionSafe(reduced, scaleIn)}
              className="relative max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-dc-line bg-dc-white p-6 shadow-float sm:p-7"
            >
              {done ? (
                <div className="flex flex-col gap-4 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-dc-success/10 text-dc-success">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </div>
                  <h2 id={titleId} className="font-heading text-3xl leading-tight text-dc-ink">
                    Nomor terverifikasi
                  </h2>
                  <p className="text-sm leading-relaxed text-dc-text-2">
                    Setiap ada pesan baru dari {other}, kami kabari lewat WhatsApp ke <strong className="whitespace-nowrap text-dc-ink">{done.phone_display}</strong>{" "}
                    lengkap dengan link untuk membalasnya di DuaCincin.
                  </p>
                  <UIButton type="button" block onClick={() => setOpen(false)}>
                    Lanjut
                  </UIButton>
                </div>
              ) : (
                <>
                  <h2 id={titleId} className="font-heading text-3xl leading-tight text-dc-ink">
                    Verifikasi nomor WhatsApp
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-dc-text-2">
                    Wajib sekali saja. Kami kabari pesan baru dari {other} lewat WhatsApp resmi DuaCincin, jadi kami pastikan dulu nomornya benar
                    milikmu.
                  </p>
                  <div className="mt-5">
                    <WhatsAppVerifyFlow status={status} onVerified={setDone} />
                  </div>
                  <p className="mt-5 border-t border-dc-line pt-4 text-center text-xs text-dc-text-3">
                    Bukan akunmu?{" "}
                    <button
                      type="button"
                      onClick={async () => {
                        await apiPost("/api/v1/auth/logout", {}).catch(() => {});
                        // Full reload: drops the signed-in user cached in this tab.
                        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                        window.location.href = "/login";
                      }}
                      className="inline-flex min-h-11 items-center font-semibold text-dc-clay underline-offset-4 hover:underline"
                    >
                      Keluar
                    </button>
                  </p>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </BodyPortal>
  );
}

/** The account's WhatsApp number with a "Ganti nomor" dialog (profile/account pages). */
export function WhatsAppNumberCard({ className = "" }: { className?: string }) {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiGet<WhatsAppStatus>("/api/v1/whatsapp/me").then(setStatus).catch(() => {});
  }, []);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dc-line bg-dc-white p-4 ${className}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-dc-ink">Nomor WhatsApp</p>
        <p className="mt-0.5 text-sm text-dc-text-2">
          {status ? (status.verified ? formatWhatsApp(status.phone) : "Belum terverifikasi") : "Memuat…"}
          {status?.verified && <span className="ml-2 rounded-full bg-dc-success/10 px-2 py-0.5 text-xs font-semibold text-dc-success">Terverifikasi</span>}
        </p>
        <p className="mt-1 text-xs text-dc-text-3">Hanya kamu dan admin DuaCincin yang bisa melihat nomor ini.</p>
      </div>
      <UIButton type="button" variant="ghost" size="sm" onClick={() => setOpen(true)} disabled={!status}>
        {status?.verified ? "Ganti nomor" : "Verifikasi"}
      </UIButton>
      <Modal open={open} onClose={() => setOpen(false)} title="Ganti nomor WhatsApp" description="Kami kirim kode ke nomor baru lewat WhatsApp. Nomor lama tetap dipakai sampai nomor baru terverifikasi.">
        {open && (
          <WhatsAppVerifyFlow
            status={status}
            changing
            onVerified={(s) => {
              setStatus(s);
              setOpen(false);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
