"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps a screen current without a reload. The API runs serverless (no
 * websocket), so this re-runs `refresh` every `intervalMs` while the tab is
 * visible, and at once when the admin comes back to the tab or window.
 * A hidden tab makes no requests.
 */
export function useLiveRefresh(refresh: () => void, intervalMs = 10_000) {
  const ref = useRef(refresh);
  useEffect(() => {
    ref.current = refresh;
  });

  useEffect(() => {
    const visible = () => document.visibilityState === "visible";
    const timer = window.setInterval(() => {
      if (visible()) ref.current();
    }, intervalMs);
    let last = 0;
    const onReturn = () => {
      // focus and visibilitychange often fire together; refresh once.
      if (!visible() || Date.now() - last < 1000) return;
      last = Date.now();
      ref.current();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [intervalMs]);
}
