"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import { EASE, useReducedMotion } from "@/lib/motion";

import { BrowserFrame, PhoneFrame } from "@/components/ui/DeviceFrame";
import { GoldArch } from "@/components/ornament/GoldArch";

/** Hero visual: the real vendor dashboard on a laptop-sized window, the
 * booking detail on a phone in front, and the gold arch ornament
 * behind (the vendor's own craft). Motion purpose: three layers drift at three
 * speeds on scroll (depth), after rising in once. Static under reduced motion. */
export function VendorHeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yArch = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -40]);
  const yDesk = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -72]);
  const yPhone = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -140]);
  const rise = (delay: number, y = 40) => ({
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0 : 0.9, ease: EASE, delay: reduced ? 0 : delay },
  });

  return (
    <div ref={ref} className="relative mx-auto aspect-[6/5] w-full max-w-[640px]">
      <motion.div {...rise(0, 20)} className="absolute right-0 top-0 w-[46%]" aria-hidden>
        <motion.div style={{ y: yArch }}>
          <GoldArch className="h-auto w-full opacity-90" />
        </motion.div>
      </motion.div>
      <motion.div {...rise(0.12)} className="absolute left-0 top-[16%] w-[86%]">
        <motion.div style={{ y: yDesk }}>
          <BrowserFrame
            src="/showcase/pages/v-dashboard.webp"
            alt="Dashboard vendor DuaCincin: satu permintaan booking menunggu jawaban, acara terdekat, dan dana yang ditahan escrow"
            address="duacincin.id/vendor/dashboard"
            sizes="(min-width: 1024px) 560px, 90vw"
            priority
          />
        </motion.div>
      </motion.div>
      <motion.div {...rise(0.3, 60)} className="absolute bottom-0 right-[2%] w-[30%]">
        <motion.div style={{ y: yPhone }}>
          <PhoneFrame
            src="/showcase/pages/v-booking-m.webp"
            alt="Detail booking di ponsel vendor: DP sudah masuk escrow"
            sizes="200px"
            crop="390 / 700"
            priority
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
