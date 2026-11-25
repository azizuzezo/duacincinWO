"use client";

import { CountUp } from "@/components/ui/Motion";

/** A real percentage from the code (commission 10%, DP 30%) that counts up
 * once when first seen, so the eye lands on the figure that matters. The
 * server HTML already holds the final value. */
export function Percent({ value, className = "" }: { value: number; className?: string }) {
  return <CountUp value={value} duration={0.9} format={(n) => `${Math.round(n)}%`} className={className} />;
}
