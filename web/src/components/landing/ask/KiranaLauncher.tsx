"use client";

// The always-visible door to Kirana on the landing: a dark glass pill in the
// bottom-right corner with her face, on phones and desktops. On phones it
// stays a round button while the hero (with its own search and "Tanya
// Kirana" link) fills the screen, and opens into the pill once the visitor
// scrolls. After they start scrolling she says hello once per visit (a
// bubble that can be closed for good). Tapping opens Kirana's own page,
// /kirana. It steps aside while the assistant section is
// on screen, so it never covers the conversation.
//
// Motion purpose: the pill rises in after the hero settles; a gold ring
// pulses twice (look here) then stops; with a mouse the pill leans toward
// the pointer (magnetic: it is reachable); hover makes Kirana smile.
// Reduced motion: no pulse, no lean, the bubble simply appears.
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import { EASE, useReducedMotion } from "@/lib/motion";

import { KiranaFace } from "./Kirana3D";

const SEEN = "dc-kirana-hello";
const DISMISSED = "dc-kirana-hello-off";

function readStore(store: "session" | "local", key: string) {
  try {
    return (store === "session" ? window.sessionStorage : window.localStorage).getItem(key) === "1";
  } catch {
    return false;
  }
}
function writeStore(store: "session" | "local", key: string) {
  try {
    (store === "session" ? window.sessionStorage : window.localStorage).setItem(key, "1");
  } catch {
    /* storage blocked: fine */
  }
}

export function KiranaLauncher() {
  const reduced = useReducedMotion();
  const router = useRouter();
  const [shown, setShown] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [hover, setHover] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 260, damping: 18 });
  const y = useSpring(my, { stiffness: 260, damping: 18 });

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 1400);
    const on = () => setScrolled(window.scrollY > window.innerHeight * 0.35);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", on);
    };
  }, []);

  // Hello once per visit, after scrolling, unless closed before.
  useEffect(() => {
    if (!shown || !scrolled || hidden || readStore("session", SEEN) || readStore("local", DISMISSED)) return;
    const t1 = setTimeout(() => {
      setBubble(true);
      writeStore("session", SEEN);
    }, 700);
    const t2 = setTimeout(() => setBubble(false), 9000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [shown, scrolled, hidden]);

  // Step aside while Kirana's own composer or chat is on screen (it would
  // sit on top of the send button), not merely when the section starts.
  useEffect(() => {
    const target = document.querySelector("[data-kirana-zone]");
    if (!target) return;
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { threshold: 0.2 });
    io.observe(target);
    return () => io.disconnect();
  }, []);

  function open() {
    setBubble(false);
    router.push("/kirana");
  }

  function magnet(e: PointerEvent<HTMLButtonElement>) {
    if (reduced || e.pointerType !== "mouse" || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    mx.set(((e.clientX - (r.left + r.width / 2)) / r.width) * 10);
    my.set(((e.clientY - (r.top + r.height / 2)) / r.height) * 8);
  }

  const visible = shown && !hidden;
  const compact = !scrolled;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="kirana-launcher"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.92, transition: { duration: 0.25 } }}
          transition={{ duration: 0.6, ease: EASE }}
          className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] right-4 z-[70] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6"
        >
          <AnimatePresence>
            {bubble && (
              <motion.div
                key="bubble"
                role="status"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, transition: { duration: 0.18 } }}
                transition={{ duration: 0.4, ease: EASE }}
                style={{ originX: 1, originY: 1 }}
                className="dc-glass relative mr-1 max-w-[260px] rounded-2xl rounded-br-sm py-3 pl-4 pr-12 text-sm leading-snug text-dc-black"
              >
                <span className="font-semibold text-dc-ink">Hai, aku Kirana!</span> Mau dibantu hitung budget atau cari vendor di kotamu?
                <button
                  type="button"
                  onClick={() => {
                    setBubble(false);
                    writeStore("local", DISMISSED);
                  }}
                  aria-label="Tutup sapaan Kirana"
                  className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-full text-dc-text-3 hover:bg-dc-cream hover:text-dc-ink"
                >
                  <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            ref={btn}
            type="button"
            onClick={open}
            onPointerMove={magnet}
            onPointerEnter={() => setHover(true)}
            onPointerLeave={() => {
              setHover(false);
              mx.set(0);
              my.set(0);
            }}
            style={{ x, y }}
            aria-label="Tanya Kirana, asisten AI DuaCincin"
            className={`dc-glass is-ink group relative flex h-[62px] items-center gap-2.5 rounded-full p-1 text-dc-on-dark shadow-float transition-[box-shadow] duration-300 hover:shadow-gold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dc-gold active:scale-95 sm:h-16 ${
              compact ? "max-sm:pr-1 sm:pr-5" : "pr-5"
            }`}
          >
            {!reduced && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full border-2 border-dc-gold-antique"
                initial={{ opacity: 0.8, scale: 1 }}
                animate={{ opacity: 0, scale: 1.4 }}
                transition={{ duration: 1.6, repeat: 2, repeatDelay: 0.7, delay: 0.9, ease: "easeOut" }}
              />
            )}
            <span className="relative rounded-full bg-linear-135 from-[#e8cb8c] via-[#c39c52] to-[#9c7731] p-[2px]">
              <KiranaFace size={52} mood={hover ? "happy" : "idle"} />
            </span>
            <span className={`text-left leading-tight ${compact ? "max-sm:sr-only" : ""}`}>
              <span className="block text-[0.95rem] font-extrabold text-dc-gold-antique">Tanya Kirana</span>
              <span className="block text-[0.72rem] font-semibold text-dc-on-dark/80">Asisten AI · gratis</span>
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
