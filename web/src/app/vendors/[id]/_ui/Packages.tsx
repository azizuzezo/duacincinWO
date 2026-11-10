"use client";

import { motion } from "framer-motion";

import { Button, ButtonLink } from "@/components/ui/Button";
import { formatRupiah, type VendorPackage } from "@/lib/api";
import { fadeUp, motionSafe, staggerList, useReducedMotion } from "@/lib/motion";

/** Priced package cards. The price is the biggest thing on the card because
 * it is what the couple compares; choosing one fills the booking form. */
export function PackageCards({
  packages,
  selectedId,
  isClient,
  onChoose,
}: {
  packages: VendorPackage[];
  selectedId: string | null;
  isClient: boolean;
  onChoose: (p: VendorPackage) => void;
}) {
  const reduced = useReducedMotion();
  return (
    // Stagger: cards arrive in reading order when the tab opens.
    <motion.ul className="grid gap-4 sm:grid-cols-2" variants={motionSafe(reduced, staggerList)} initial="hidden" animate="visible">
      {packages.map((p) => {
        const active = p.id === selectedId;
        return (
          <motion.li
            key={p.id}
            variants={motionSafe(reduced, fadeUp)}
            className={`flex flex-col rounded-xl border bg-dc-white p-5 transition-[border-color,box-shadow,transform] duration-300 ease-dc sm:p-6 ${
              active ? "border-dc-gold shadow-lift" : "border-dc-line shadow-soft hover:shadow-lift motion-safe:hover:-translate-y-1"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-heading min-w-0 break-words text-[1.7rem] leading-tight text-dc-ink">{p.name}</h3>
              {active && (
                <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-dc-gold/15 px-2.5 py-0.5 text-xs font-semibold text-dc-clay">
                  <svg aria-hidden width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m4.5 10.5 3.5 3.5 7.5-8" />
                  </svg>
                  Dipilih
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-dc-ink tabular-nums">{p.price > 0 ? formatRupiah(p.price) : "Harga lewat chat"}</p>
            {p.description && <p className="mt-3 flex-1 whitespace-pre-line break-words text-sm leading-relaxed text-dc-text-2">{p.description}</p>}
            <div className="mt-5 border-t border-dc-line pt-4">
              {isClient ? (
                <Button variant={active ? "primary" : "ghost"} size="sm" block onClick={() => onChoose(p)} aria-haspopup="dialog">
                  {active ? "Lanjut ajukan booking" : "Pilih paket ini"}
                </Button>
              ) : (
                <ButtonLink href="/login" variant="ghost" size="sm" block>
                  Masuk untuk memilih paket
                </ButtonLink>
              )}
            </div>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
