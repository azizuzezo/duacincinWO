"use client";

import { useEffect, useState } from "react";

import { apiGet } from "@/lib/api";

// Whether the AI assistant is configured (GET /ai/status). One answer per
// page load, shared by every caller. Assumed off until the server says on,
// so AI buttons never flash for people who cannot use them.
let known: boolean | null = null;
let pending: Promise<boolean> | null = null;

function load(): Promise<boolean> {
  pending ??= apiGet<{ enabled: boolean }>("/api/v1/ai/status")
    .then((s) => (known = !!s.enabled))
    .catch(() => (known = false));
  return pending;
}

export function useAIEnabled(): boolean {
  const [on, setOn] = useState(known ?? false);
  useEffect(() => {
    let live = true;
    load().then((v) => live && setOn(v));
    return () => {
      live = false;
    };
  }, []);
  return on;
}
