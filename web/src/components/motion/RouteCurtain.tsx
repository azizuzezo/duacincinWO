"use client";

// Page-to-page transition for the public site. On an internal link click an
// ivory curtain with the rings loader fades over the page; once the new
// route has rendered (pathname changed, and at least MIN_MS so the motion
// reads instead of flickering) the curtain wipes upward off the new page,
// which is already at the top. Dashboards (/client, /vendor, /internal) keep
// their own shell transition and are skipped, as are new tabs, downloads,
// modified clicks, other origins and same-page hash links. A safety timer
// lifts the curtain if a navigation never lands. Off under reduced motion.
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { RingsLoader } from "@/components/motion/RingsLoader";

const APP = /^\/(client|vendor|internal)(\/|$)/;
const MIN_MS = 420;
const REVEAL_MS = 750;
const SAFETY_MS = 8000;

type Phase = "idle" | "cover" | "reveal";

export function RouteCurtain() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const startedAt = useRef(0);
  const timers = useRef<number[]>([]);

  function go(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }
  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }
  function clearTimers() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }
  function reveal() {
    clearTimers();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    go("reveal");
    later(() => go("idle"), REVEAL_MS);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.hasAttribute("download")) return;
      if (a.target && a.target !== "_self") return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      if (APP.test(url.pathname) || APP.test(window.location.pathname)) return;
      clearTimers();
      startedAt.current = performance.now();
      go("cover");
      later(reveal, SAFETY_MS);
    }
    // Capture phase: Next's <Link> calls preventDefault in its own handler.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phaseRef.current !== "cover") return;
    const wait = Math.max(0, MIN_MS - (performance.now() - startedAt.current));
    later(reveal, wait);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div aria-hidden className="dc-curtain" data-phase={phase}>
      <RingsLoader />
    </div>
  );
}
