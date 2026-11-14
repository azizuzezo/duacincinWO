// Two lines of giant serif type, adat and styles, running as a marquee in
// opposite directions. It says "every adat" at poster scale. Decorative: the
// sentence above it carries the meaning, the type itself is aria-hidden.
// Each row holds the word list twice and slides by exactly half its width,
// so the loop is seamless. Pauses on hover; static under reduced motion
// (globals.css .dc-marquee).
const ROW_A = ["Jawa", "Sunda", "Minang", "Batak", "Bugis", "Bali", "Melayu", "Betawi", "Dayak"];
const ROW_B = ["Akad", "Intimate", "Garden party", "Ballroom", "Modern", "Tradisional", "Rooftop", "Siraman"];

function Row({ words, italic, reverse }: { words: string[]; italic?: boolean; reverse?: boolean }) {
  return (
    <div className="flex overflow-hidden">
      <div className={`dc-marquee flex shrink-0 ${reverse ? "dc-marquee-reverse" : ""}`}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-[0.35em] whitespace-nowrap pr-[0.35em]">
            {words.map((w) => (
              <span key={w} className="flex items-center gap-[0.35em]">
                <span className={italic ? "italic text-dc-clay" : "text-dc-ink"}>{w}</span>
                <svg viewBox="0 0 40 24" className="h-[0.32em] w-auto text-dc-gold" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <circle cx="14" cy="12" r="9" />
                  <circle cx="26" cy="12" r="9" />
                </svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdatMarquee() {
  return (
    <section aria-labelledby="adat-judul" className="overflow-hidden border-y border-dc-line bg-dc-white py-14 sm:py-20">
      <p id="adat-judul" className="dc-container dc-eyebrow">
        Vendor untuk setiap adat dan setiap gaya
      </p>
      <div aria-hidden className="dc-marquee-group mt-6 font-heading text-[clamp(3.2rem,9vw,8.5rem)] font-medium leading-[1.05] tracking-[-0.02em]">
        <Row words={ROW_A} />
        <Row words={ROW_B} italic reverse />
      </div>
    </section>
  );
}
