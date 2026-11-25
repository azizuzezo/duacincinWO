"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

import { Check, wdButton } from "@/components/home/ui";
import { formatRupiah, type VendorPackage } from "@/lib/api";
import { EASE, fadeUp, motionSafe, staggerList, useReducedMotion } from "@/lib/motion";

import { WdButton } from "./wd";

/** Package cards: name, price, what is included, one action. Choosing a
 * package fills the booking form and opens it. */
export function PackageCards({
  packages,
  selectedId,
  isClient,
  onChoose,
  loginHref,
}: {
  /** Login link that brings the visitor back to this profile. */
  loginHref: string;
  packages: VendorPackage[];
  selectedId: string | null;
  isClient: boolean;
  onChoose: (p: VendorPackage) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.ul className="grid gap-4 sm:grid-cols-2" variants={motionSafe(reduced, staggerList)} initial="hidden" animate="visible">
      {packages.map((p) => {
        const active = p.id === selectedId;
        return (
          <motion.li
            key={p.id}
            variants={motionSafe(reduced, fadeUp)}
            aria-current={active ? "true" : undefined}
            className={`flex flex-col rounded-[14px] border bg-white p-5 transition-[border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] has-[:focus-visible]:border-wd-accent-ink has-[:focus-visible]:shadow-wd-lift sm:p-6 ${
              active ? "border-wd-accent shadow-wd-card ring-2 ring-wd-accent" : "border-wd-line hover:-translate-y-0.5 hover:border-wd-line-2 hover:shadow-wd-lift motion-reduce:hover:translate-y-0"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 break-words text-[1.08rem] font-semibold leading-snug text-wd-ink">{p.name}</h3>
              <AnimatePresence initial={false}>
                {active && (
                  <motion.span
                    initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: reduced ? 1 : 0.8 }}
                    transition={{ duration: reduced ? 0.01 : 0.28, ease: EASE }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-wd-accent-soft px-2.5 py-0.5 text-xs font-semibold text-wd-accent-ink"
                  >
                    <Check size={12} />
                    Dipilih
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <p className="mt-2 text-[1.35rem] font-semibold tracking-tight text-wd-ink tabular-nums">{p.price > 0 ? formatRupiah(p.price) : "Harga lewat chat"}</p>
            {p.description ? (
              <p className="mt-3 flex-1 whitespace-pre-line break-words text-[0.95rem] leading-relaxed text-wd-text">{p.description}</p>
            ) : (
              <div className="flex-1" />
            )}
            <div className="mt-5">
              {isClient ? (
                <WdButton variant={active ? "gold" : "outline"} size="sm" block onClick={() => onChoose(p)} aria-haspopup="dialog">
                  {active ? "Lanjut ajukan booking" : "Pilih paket ini"}
                </WdButton>
              ) : (
                <Link href={loginHref} className={wdButton({ variant: "outline", size: "sm", className: "!min-h-11 w-full" })}>
                  Masuk untuk memilih paket
                </Link>
              )}
            </div>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
