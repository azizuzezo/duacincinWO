"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { useShareLink } from "@/components/vendor/directory/useShareLink";
import { EASE, useReducedMotion } from "@/lib/motion";

/** Share this vendor (share sheet on phones, else copy + toast). The icon
 * turns into a check for a moment so the copy is confirmed in place. */
export function ShareButton({ name, path }: { name: string; path: string }) {
  const shareLink = useShareLink();
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function flash() {
    setDone(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1800);
  }

  async function share() {
    if (await shareLink(`${name} di DuaCincin`, path)) flash();
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-wd-line-2 bg-white px-4 text-sm font-semibold text-wd-ink transition-[border-color,transform] duration-200 hover:border-wd-ink active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-accent-ink motion-reduce:active:scale-100"
    >
      <span className="relative inline-flex size-4 items-center justify-center" aria-hidden>
        <AnimatePresence initial={false} mode="popLayout">
          {done ? (
            <motion.svg
              key="ok"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-wd-ok"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.01 : 0.25, ease: EASE }}
            >
              <path d="M4.5 12.5 9.5 17.5 19.5 7" />
            </motion.svg>
          ) : (
            <motion.svg
              key="share"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.01 : 0.2 }}
            >
              <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
              <path d="M5 12.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.5" />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>
      {done ? "Disalin" : "Bagikan"}
    </button>
  );
}
