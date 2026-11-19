"use client";

// Kirana's live 3D body for the big spots (the assistant section). Shows a
// still render of the same model at once (public/kirana, rendered from
// KiranaScene), loads three.js only when the section comes near the screen,
// cross-fades to the live scene when it is ready, and stops rendering while
// off screen. Reduced motion, data saver, a low-memory phone or no GPU:
// the still stays, floating gently.
//
// KiranaFace is the small avatar (chat, launcher, hero link): a still of her
// head; "thinking" adds a turning gold ring around it.
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/lib/motion";

import type { Kirana3DMood } from "./KiranaScene";

const Scene = dynamic(() => import("./KiranaScene"), { ssr: false, loading: () => null });

/** Live 3D only where it stays smooth: WebGL on a real GPU, not in data
 * saver mode, not on very low-memory phones. Elsewhere the still floats. */
function canRun3D() {
  try {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (nav.connection?.saveData) return false;
    if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return false;
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !/swiftshader|llvmpipe|software/i.test(renderer);
  } catch {
    return false;
  }
}

export function Kirana3D({ mood = "idle", className = "", label = "Kirana, asisten AI DuaCincin" }: { mood?: Kirana3DMood; className?: string; label?: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [can3d, setCan3d] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- capability check runs once in the browser
    setCan3d(canRun3D());
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (!e.isIntersecting) return;
        // Fetch three.js only when the browser is idle, so it never competes
        // with the first paint or the hero.
        const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
        if (w.requestIdleCallback) w.requestIdleCallback(() => setNear(true), { timeout: 1500 });
        else setTimeout(() => setNear(true), 300);
      },
      { rootMargin: "120px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const live = near && can3d && !reduced;
  const still = mood === "happy" ? "/kirana/kirana-happy.webp" : "/kirana/kirana-idle.webp";

  return (
    <div ref={ref} role="img" aria-label={label} className={`relative ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small local still, swapped for the live scene */}
      <img
        src={still}
        alt=""
        aria-hidden
        draggable={false}
        className={`pointer-events-none absolute inset-0 m-auto h-full w-full object-contain transition-opacity duration-700 ${ready && live ? "opacity-0" : "opacity-100"} ${live ? "" : "dc-kirana-float"}`}
      />
      {live && (
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          <Scene mood={mood} active={visible} onReady={() => setTimeout(() => setReady(true), 120)} />
        </div>
      )}
    </div>
  );
}

export function KiranaFace({ mood = "idle", size = 40, className = "" }: { mood?: "idle" | "happy" | "thinking"; size?: number; className?: string }) {
  return (
    <span aria-hidden className={`relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full bg-linear-to-b from-dc-ink-2 to-dc-ink" />
      {mood === "thinking" && <span className="dc-kirana-orbit absolute -inset-[3px] rounded-full" />}
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny local sprite */}
      <img src={mood === "happy" ? "/kirana/kirana-face-happy.webp" : "/kirana/kirana-face-idle.webp"} alt="" draggable={false} className="relative h-[92%] w-[92%] translate-y-[4%] object-contain" />
    </span>
  );
}
