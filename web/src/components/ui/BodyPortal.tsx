"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const noopSubscribe = () => () => {};

/**
 * Renders overlays (Sheet, Modal) at the end of <body>. A `position: fixed`
 * layer inside a transformed ancestor (the route entrance animates
 * main#konten) is sized to that ancestor instead of the viewport, which
 * pushed sheet footers below the screen. Nothing renders on the server.
 */
export function BodyPortal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}
