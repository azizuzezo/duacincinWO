// The founders on /tentang-kami: one joined panel, a row per founder, a
// large photo and the text beside it, zigzagging (photo left, then right).
// On phones the photo sits on top. Data in lib/team.ts; photos are the
// founders' own.
import Image from "next/image";

import { Reveal } from "@/components/landing/Reveal";
import { FOUNDERS } from "@/lib/team";

function LinkIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

export function Founders() {
  return (
    <Reveal>
      <div className="overflow-hidden rounded-2xl border border-dc-line bg-dc-white shadow-soft">
        {FOUNDERS.map((f, i) => {
          const flip = i % 2 === 1;
          return (
            <article key={f.name} className={`grid lg:grid-cols-2 ${i > 0 ? "border-t border-dc-line" : ""}`}>
              <div className={`relative aspect-square bg-dc-cream ${flip ? "lg:order-2" : ""}`}>
                <Image src={f.photo} alt={`Foto ${f.name}`} fill sizes="(min-width: 1024px) 620px, 100vw" quality={95} className="object-cover" />
              </div>
              <div className={`flex flex-col justify-center p-7 sm:p-12 lg:p-16 ${flip ? "lg:order-1" : ""}`}>
                <p className="text-sm font-semibold text-dc-clay">{f.role}</p>
                <h2 className="mt-3 font-heading text-[clamp(2.4rem,4vw,3.6rem)] leading-[1.02] text-dc-ink">{f.name}</h2>
                {f.altName && (
                  <p lang={f.altName.lang} className="mt-2 text-2xl tracking-[0.08em] text-dc-text-3">
                    {f.altName.text}
                  </p>
                )}
                <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-dc-text-2">{f.bio}</p>
                {f.links && (
                  <p className="mt-7 flex flex-wrap gap-x-6 gap-y-1">
                    {f.links.map((l) => (
                      <a
                        key={l.href}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-dc-clay underline decoration-dc-gold/50 underline-offset-[6px] transition-colors hover:text-dc-ink"
                      >
                        {l.label}
                        <LinkIcon />
                        <span className="sr-only"> {f.name} (tab baru)</span>
                      </a>
                    ))}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </Reveal>
  );
}
