"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { motionSafe, slideIn, useReducedMotion } from "@/lib/motion";

type ToastTone = "neutral" | "success" | "danger";

type Toast = { id: string; message: string; tone: ToastTone };

const ToastContext = createContext<{ show: (message: string, tone?: ToastTone) => void } | null>(null);

const TONE: Record<ToastTone, { box: string; mark: string }> = {
  neutral: { box: "bg-dc-ink text-dc-on-dark", mark: "bg-dc-gold-antique" },
  success: { box: "bg-dc-ink text-dc-on-dark", mark: "bg-dc-success-light" },
  danger: { box: "bg-dc-danger text-white", mark: "bg-white" },
};

const DISMISS_MS = 4500;

/** Wrap the app once (app/layout.tsx). useToast().show("Tersimpan", "success").
 * Top-center under the mobile top bar, top-right on desktop: never over the
 * bottom tab bar or the action buttons of an open Sheet/Modal footer. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reduced = useReducedMotion();

  const dismiss = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (message: string, tone: ToastTone = "neutral") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => dismiss(id), DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        data-dc-toasts=""
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-[calc(4.75rem+env(safe-area-inset-top))] z-[80] flex flex-col items-center gap-2 lg:inset-x-auto lg:right-6 lg:top-6 lg:items-end"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout={!reduced}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={motionSafe(reduced, slideIn)}
              role={t.tone === "danger" ? "alert" : "status"}
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-full py-2 pl-4 pr-2 text-sm font-medium shadow-float ${TONE[t.tone].box}`}
            >
              {t.tone === "success" ? (
                <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
                  <circle cx="10" cy="10" r="9" fill="#7fc49b" opacity="0.2" />
                  <path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#7fc49b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dc-draw" />
                </svg>
              ) : (
                <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${TONE[t.tone].mark}`} />
              )}
              <span className="flex-1 py-1.5">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Tutup pesan"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full opacity-80 transition hover:bg-white/10 hover:opacity-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
