"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { useRef } from "react";

import { BrowserFrame, PhoneFrame } from "../cara-kerja/DeviceFrame";

export type JoinStep = {
  title: string;
  body: string;
  /** What you hold at the end of this step. */
  result: string;
  screen: { src: string; alt: string; kind: "phone" | "desk" };
};

/** The three real steps to get listed, each with the screen where it happens.
 * Motion purpose: a gold path draws itself from step 1 to step 3 as the reader
 * scrolls, so the three cards read as one road, not three features. */
export function JoinPath({ steps }: { steps: JoinStep[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const draw = useSpring(scrollYProgress, { stiffness: 110, damping: 28, mass: 0.4 });

  return (
    <ol ref={ref} className="relative grid gap-6 lg:grid-cols-3 lg:gap-8">
      <span aria-hidden className="absolute left-[8%] right-[8%] top-[1.375rem] hidden h-px bg-dc-line-strong lg:block" />
      <motion.span aria-hidden style={{ scaleX: draw }} className="absolute left-[8%] right-[8%] top-[1.375rem] hidden h-px origin-left bg-dc-gold motion-reduce:!hidden lg:block" />
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex flex-col">
          <span aria-hidden className="relative z-10 mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-dc-gold bg-dc-ink font-heading text-xl text-dc-gold-antique lg:mx-0 lg:ml-[8%]">
            {i + 1}
          </span>
          <div className="mt-5 flex flex-1 flex-col overflow-hidden rounded-2xl border border-dc-line bg-dc-white shadow-soft transition-[box-shadow,transform] duration-500 ease-dc hover:shadow-lift motion-safe:hover:-translate-y-1">
            <div className="p-6">
              <h3 className="font-heading text-[1.8rem] leading-tight text-dc-ink">
                <span className="sr-only">Langkah {i + 1}: </span>
                {s.title}
              </h3>
              <p className="mt-2 leading-relaxed text-dc-text-2">{s.body}</p>
              <p className="mt-4 text-sm font-semibold text-dc-clay">{s.result}</p>
            </div>
            <div className={`relative mt-auto flex h-64 items-start overflow-hidden ${s.screen.kind === "phone" ? "justify-center" : "justify-start"} bg-[radial-gradient(90%_80%_at_50%_100%,#ead7ae_0%,#f3ecdf_55%,#faf6ef_100%)] px-5 pt-6`}>
              {s.screen.kind === "phone" ? (
                <PhoneFrame src={s.screen.src} alt={s.screen.alt} sizes="220px" className="w-[200px]" />
              ) : (
                <BrowserFrame src={s.screen.src} alt={s.screen.alt} sizes="(min-width: 1024px) 380px, 90vw" address="duacincin.id/vendor/profile" className="w-[150%] max-w-none shrink-0" />
              )}
              <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-dc-white/90 to-transparent" />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
