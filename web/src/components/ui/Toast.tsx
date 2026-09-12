"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { reducedMotionOverride, slideIn, useReducedMotion } from "@/lib/motion";

type ToastTone = "neutral" | "success" | "danger";

type Toast = { id: string; message: string; tone: ToastTone };

const ToastContext = createContext<{ show: (message: string, tone?: ToastTone) => void } | null>(null);

const TONE_CLASS: Record<ToastTone, string> = {
  neutral: "bg-dc-navy text-dc-white",
  success: "bg-dc-navy text-dc-white border border-dc-gold/40",
  danger: "bg-red-600 text-white",
};

const DISMISS_MS = 4000;

/** Wrap the app once (see app/layout.tsx) to enable useToast() anywhere. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reduced = useReducedMotion();

  const show = useCallback((message: string, tone: ToastTone = "neutral") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), DISMISS_MS);
  }, []);

  const value = useMemo(() => ({ show }), [show]);
  const variants = reduced ? reducedMotionOverride : slideIn;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={variants}
              role="status"
              className={`pointer-events-auto max-w-sm rounded-xl px-4 py-3 text-sm shadow-lg ${TONE_CLASS[t.tone]}`}
            >
              {t.message}
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
