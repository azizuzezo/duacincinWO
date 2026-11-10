"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

import { SCENES, type Scene } from "@/components/landing/scenes";
import { EASE, useReducedMotion } from "@/lib/motion";

/** Asset paths for a scene: licensed painting/photo backdrop + the owner's couple cutout. */
function sceneAssets(scene: Scene) {
  return { bg: `/scene/${scene.bg}-720.webp`, couple: `/scene/${scene.couple}-sm.webp` };
}

/**
 * Arch window used by the preview and the compact card: the scene painting
 * behind the couple cutout, framed like the arch of a printed invitation.
 */
export function ArchScene({ scene, className = "", sizes = "320px", priority = false }: { scene: Scene; className?: string; sizes?: string; priority?: boolean }) {
  const a = sceneAssets(scene);
  return (
    <div className={`relative overflow-hidden rounded-t-full ${className}`}>
      <Image src={a.bg} alt="" fill sizes={sizes} priority={priority} className="object-cover" style={{ objectPosition: scene.focus }} />
      <span aria-hidden className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-dc-ink/25" />
      <Image src={a.couple} alt={scene.coupleAlt} fill sizes={sizes} className="object-contain object-bottom" />
    </div>
  );
}

/**
 * Live preview of the digital invitation for the "Buat undangan digital"
 * moment: the couple sees their own names on a printed-invitation layout while
 * they type, and can flip between example worlds. Honest framing: these are
 * example moods; the full theme catalogue lives in the invitation editor.
 * Motion: the arch crossfades between worlds (shows that the look changes,
 * the data stays). Reduced motion: instant swap.
 */
export function InvitationPreview({ bride, groom }: { bride: string; groom: string }) {
  const [key, setKey] = useState(SCENES[0].key);
  const reduced = useReducedMotion();
  const scene = SCENES.find((s) => s.key === key) ?? SCENES[0];
  const b = bride.trim();
  const g = groom.trim();
  const hasNames = !!(b || g);

  return (
    <figure className="mx-auto w-full max-w-[300px] sm:max-w-[330px]">
      <div className="relative rounded-[28px] border border-dc-line bg-dc-white p-3 shadow-lift">
        <div className="relative flex flex-col items-center rounded-[20px] border border-dc-gold/45 bg-dc-ivory px-5 pb-7 pt-5 text-center">
          <span aria-hidden className="pointer-events-none absolute inset-1.5 rounded-[16px] border border-dc-gold/25" />
          <p className="relative text-[0.7rem] font-semibold text-dc-clay">Undangan pernikahan</p>
          <div className="relative mt-3 aspect-[4/5] w-[78%]">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={scene.key}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: reduced ? 0.01 : 0.7, ease: EASE } }}
                exit={{ opacity: 0, transition: { duration: reduced ? 0.01 : 0.35 } }}
                className="absolute inset-0"
              >
                <ArchScene scene={scene} className="h-full w-full border border-dc-gold/50" sizes="260px" priority />
              </motion.div>
            </AnimatePresence>
          </div>
          <p aria-live="polite" className="relative mt-5 min-h-[3.2rem] max-w-full break-words">
            {hasNames ? (
              <span className="dc-script text-[2.6rem] leading-[1.05]">
                {b || "Mempelai"} &amp; {g || "Mempelai"}
              </span>
            ) : (
              <span className="font-heading text-[1.6rem] italic leading-tight text-dc-text-3">Nama kalian di sini</span>
            )}
          </p>
          <span aria-hidden className="relative my-3 h-px w-16 bg-dc-gold/60" />
          <p className="relative text-xs leading-relaxed text-dc-text-2">
            Tanggal, tempat, dan daftar tamu
            <br />
            terisi dari DuaCincin WO
          </p>
        </div>
      </div>

      <div role="group" aria-label="Contoh suasana tema" className="mt-5 flex flex-wrap justify-center gap-2">
        {SCENES.map((s) => {
          const on = s.key === key;
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={on}
              onClick={() => setKey(s.key)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-sm font-semibold transition-colors duration-200 ${
                on ? "border-dc-ink bg-dc-ink text-dc-on-dark" : "border-dc-line-strong bg-dc-white text-dc-ink hover:border-dc-ink"
              }`}
            >
              <span className="relative h-8 w-8 overflow-hidden rounded-full bg-dc-cream">
                <Image src={sceneAssets(s).couple} alt="" fill sizes="32px" className="object-cover object-top" />
              </span>
              {s.label}
            </button>
          );
        })}
      </div>

      <figcaption className="mt-3 text-center text-xs leading-relaxed text-dc-text-3">
        Contoh suasana. Tema lengkapnya kalian pilih di editor undangan.
        <br />
        {scene.credit.kind}:{" "}
        <a href={scene.credit.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-dc-ink">
          {scene.credit.title}
        </a>
        , {scene.credit.author} ({scene.credit.license})
      </figcaption>
    </figure>
  );
}

