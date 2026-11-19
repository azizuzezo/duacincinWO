"use client";

// Kirana's composer: frosted glass, a gold ring that travels while it is
// focused or Kirana is working, a specular light under the pointer, example
// questions typed into the empty field. Used on the landing (big, the door
// to /kirana) and at the foot of the chat on /kirana.
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";

import { useReducedMotion } from "@/lib/motion";

// Starter prompts in the way couples actually ask (research: Bridestory 2026
// survey, most weddings 101-300 guests; budget, vendor, adat, timeline).
export const EXAMPLES = [
  { icon: "budget", text: "Budget kami 150 juta, 300 tamu di Bandung, cukup nggak?" },
  { icon: "vendor", text: "Cariin MUA di Jakarta Selatan di bawah 10 juta" },
  { icon: "idea", text: "Inspirasi dekorasi adat Jawa yang modern" },
  { icon: "time", text: "Nikah 8 bulan lagi, harus booking apa dulu?" },
] as const;

const TYPED = [
  "Kami mau resepsi intimate di taman, 150 tamu…",
  "Cariin fotografer di Yogyakarta yang bagus…",
  "Berapa budget catering untuk 500 tamu?",
  "Urutan acara adat Sunda itu apa saja?",
];

export const MAX_CHARS = 1000;

export function ExampleIcon({ kind }: { kind: (typeof EXAMPLES)[number]["icon"] }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" className="shrink-0 text-dc-clay">
      {kind === "budget" && (
        <>
          <circle cx="12" cy="12" r="8.5" {...p} />
          <path d="M12 3.5V12l6 6" {...p} />
        </>
      )}
      {kind === "vendor" && (
        <>
          <circle cx="12" cy="9" r="3.5" {...p} />
          <path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5" {...p} />
        </>
      )}
      {kind === "idea" && (
        <>
          <path d="M9 18h6M10 21h4" {...p} />
          <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" {...p} />
        </>
      )}
      {kind === "time" && (
        <>
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" {...p} />
          <path d="M3.5 10h17M8 3v4M16 3v4" {...p} />
        </>
      )}
    </svg>
  );
}

/** Example questions typed into the empty composer, only while it is on
 * screen; one pass through the list, then it rests on the first. */
function useTypedPlaceholder(active: boolean) {
  const reduced = useReducedMotion();
  const [text, setText] = useState(TYPED[0]);
  useEffect(() => {
    if (!active || reduced) return;
    let line = 0;
    let i = 0;
    let deleting = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = TYPED[line];
      if (!deleting) {
        i++;
        setText(full.slice(0, i));
        if (i >= full.length) {
          if (line === TYPED.length - 1) return;
          deleting = true;
          t = setTimeout(tick, 1700);
          return;
        }
        t = setTimeout(tick, 34 + Math.random() * 36);
      } else {
        i -= 2;
        setText(full.slice(0, Math.max(0, i)));
        if (i <= 0) {
          deleting = false;
          line++;
          t = setTimeout(tick, 350);
          return;
        }
        t = setTimeout(tick, 16);
      }
    };
    t = setTimeout(tick, 600);
    return () => clearTimeout(t);
  }, [active, reduced]);
  return text;
}

export type ComposerApi = { fill: (text: string) => void };

export function Composer({
  big,
  busy,
  onSend,
  onStop,
  onTyping,
  inputRef,
  apiRef,
}: {
  big: boolean;
  busy: boolean;
  onSend: (t: string) => void;
  onStop: () => void;
  onTyping: (typing: boolean) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  apiRef?: React.RefObject<ComposerApi | null>;
}) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const specRef = useRef<HTMLDivElement>(null);
  const specRaf = useRef(0);
  // Pointer position into --mx/--my for the specular light (no React state).
  const onSpecMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const x = e.clientX;
    const y = e.clientY;
    cancelAnimationFrame(specRaf.current);
    specRaf.current = requestAnimationFrame(() => {
      const el = specRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${x - r.left}px`);
      el.style.setProperty("--my", `${y - r.top}px`);
    });
  }, []);
  const typed = useTypedPlaceholder(big && value === "" && !focused && inView);
  const filling = useRef(false);

  useEffect(() => {
    const el = specRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => onTyping(focused && value.trim().length > 0), [focused, value, onTyping]);

  // Grow with the text, up to about five lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, big ? 180 : 150)}px`;
  }, [value, big, inputRef]);

  // Example chips type their question in quickly, then send it, so the
  // visitor sees what was asked.
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      fill: (text: string) => {
        if (filling.current) return;
        if (reduced) {
          onSend(text);
          return;
        }
        filling.current = true;
        let i = 0;
        const step = () => {
          i += 2;
          setValue(text.slice(0, i));
          if (i < text.length) setTimeout(step, 14);
          else
            setTimeout(() => {
              filling.current = false;
              setValue("");
              onSend(text);
            }, 220);
        };
        step();
      },
    };
  }, [apiRef, onSend, reduced]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (busy || !value.trim() || value.length > MAX_CHARS) return;
    onSend(value);
    setValue("");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  const over = value.length > MAX_CHARS;
  return (
    <div>
      <div ref={specRef} onPointerMove={onSpecMove} data-busy={busy} className={`dc-glow-ring dc-specular relative rounded-[28px] ${big ? "shadow-float" : ""}`}>
        <form onSubmit={submit} className={`dc-glass relative flex items-end gap-2 rounded-[28px] p-2 ${big ? "pl-5 sm:p-2.5 sm:pl-6" : "pl-4"}`}>
          <div className="relative min-w-0 flex-1 py-2.5">
            {value === "" && (
              <span aria-hidden className={`pointer-events-none absolute inset-x-0 top-2.5 truncate text-dc-text-3 ${big ? "text-lg" : "text-base"}`}>
                {focused || !big ? "Tulis pertanyaanmu untuk Kirana…" : typed}
                {big && !focused && !reduced && <span className="dc-ask-caret is-thin" />}
              </span>
            )}
            <textarea
              ref={inputRef}
              id={big ? "tanya-input" : undefined}
              rows={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKey}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              aria-label="Tulis pertanyaan untuk Kirana"
              aria-describedby={big ? "tanya-hint" : undefined}
              aria-invalid={over || undefined}
              maxLength={MAX_CHARS + 200}
              className={`relative block w-full resize-none bg-transparent leading-relaxed text-dc-ink outline-none ${big ? "text-lg" : "text-base"}`}
            />
          </div>
          {/* One button that changes role, so focus never falls off the page. */}
          <button
            type={busy ? "button" : "submit"}
            onClick={busy ? onStop : undefined}
            disabled={!busy && (!value.trim() || over)}
            aria-label={busy ? "Hentikan jawaban Kirana" : "Tanya Kirana"}
            className={`group relative flex h-12 shrink-0 items-center justify-center gap-2 rounded-full font-bold transition-[transform,box-shadow,opacity,background-color] duration-300 ease-dc active:scale-95 disabled:opacity-40 ${
              busy ? "w-12 bg-dc-ink text-dc-on-dark" : `bg-linear-135 from-[#e2c27f] via-[#c39c52] to-[#a17d36] text-[#1a140c] hover:shadow-gold ${big ? "px-4 sm:px-5" : "w-12"}`
            }`}
          >
            {busy ? (
              <span className="h-3.5 w-3.5 rounded-[3px] bg-current" />
            ) : (
              <>
                {big && <span className="hidden sm:inline">Tanya Kirana</span>}
                <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 motion-safe:group-enabled:group-hover:-translate-y-0.5 motion-safe:group-enabled:group-hover:translate-x-0.5">
                  <path d="M5 12h13M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
      {big && (
        <p id="tanya-hint" className={`mt-2 px-4 text-xs ${over ? "font-semibold text-dc-danger" : "text-dc-text-2"}`}>
          {over ? `Pesan terlalu panjang (${value.length}/${MAX_CHARS} karakter)` : "Enter untuk kirim. Kirana bisa keliru, cek lagi detailnya di profil vendor."}
        </p>
      )}
      {!big && over && <p className="mt-1.5 px-4 text-xs font-semibold text-dc-danger">Pesan terlalu panjang ({value.length}/{MAX_CHARS} karakter)</p>}
      <span role="status" className="sr-only">
        {over ? `Pesan terlalu panjang, maksimal ${MAX_CHARS} karakter` : ""}
      </span>
    </div>
  );
}

