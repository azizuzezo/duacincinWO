"use client";

// Kirana's composer, Putih style: a white pill with a hairline that turns
// gold on focus, a gold send button with ink text (a stop button while
// Kirana answers), example questions typed into the empty field (big
// variant only). Used at the foot of the chat on /kirana and by AskAI.
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

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
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" className="shrink-0 text-wd-accent-ink">
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
    // IME-safe: Enter that confirms a composition (Japanese, Chinese,
    // Android keyboards report keyCode 229) must not send.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      submit();
    }
  }

  const over = value.length > MAX_CHARS;
  return (
    <div>
      <div ref={specRef} data-busy={busy} className="relative">
        <form
          onSubmit={submit}
          className={`relative flex items-end gap-2 rounded-[28px] border bg-white p-1.5 transition-[border-color,box-shadow] duration-300 ${
            over ? "border-wd-danger" : focused ? "border-wd-accent-ink shadow-[0_0_0_4px_var(--wd-accent-soft)]" : "border-wd-line-2 hover:border-wd-muted"
          } ${big ? "pl-5 shadow-wd-lift sm:p-2 sm:pl-6" : "pl-4 sm:pl-5"}`}
        >
          <div className="relative min-w-0 flex-1 py-2.5">
            {value === "" && (
              <span aria-hidden className={`pointer-events-none absolute inset-x-0 top-2.5 truncate text-wd-muted ${big ? "text-lg" : "text-base"}`}>
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
              aria-describedby={big ? "tanya-hint" : "kirana-hint"}
              aria-invalid={over || undefined}
              maxLength={MAX_CHARS + 200}
              enterKeyHint="send"
              // The pill around it shows focus (gold border + ring); the global
              // .wd :focus-visible outline would draw a second box inside it.
              style={{ outline: "none" }}
              className={`relative block w-full resize-none bg-transparent leading-relaxed text-wd-ink outline-none focus-visible:outline-none ${big ? "text-lg" : "text-base"}`}
            />
          </div>
          {/* One button that changes role, so focus never falls off the page. */}
          <button
            type={busy ? "button" : "submit"}
            onClick={busy ? onStop : undefined}
            disabled={!busy && (!value.trim() || over)}
            aria-label={busy ? "Hentikan jawaban Kirana" : "Kirim pertanyaan ke Kirana"}
            className={`group relative flex h-12 shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition-[transform,background-color,color] duration-300 active:scale-95 disabled:bg-wd-blush disabled:text-wd-muted ${
              busy ? "w-12 bg-wd-ink text-white hover:bg-black" : `bg-wd-accent text-wd-ink hover:bg-wd-accent-deep ${big ? "px-4 sm:px-5" : "w-12"}`
            }`}
          >
            {busy ? (
              <span aria-hidden className="h-3.5 w-3.5 rounded-[3px] bg-current" />
            ) : (
              <>
                {big && <span className="hidden sm:inline">Tanya Kirana</span>}
                <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 motion-safe:group-enabled:group-hover:-translate-y-0.5">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
      {big && (
        <p id="tanya-hint" className={`mt-2 px-4 text-xs ${over ? "font-semibold text-wd-danger" : "text-wd-muted"}`}>
          {over ? `Pesan terlalu panjang (${value.length}/${MAX_CHARS} karakter)` : "Enter untuk kirim. Kirana bisa keliru, cek lagi detailnya di profil vendor."}
        </p>
      )}
      {!big && (
        <p id="kirana-hint" className={`mt-1.5 px-4 text-center text-[0.75rem] ${over ? "font-semibold text-wd-danger" : "text-wd-muted"}`}>
          {over ? `Pesan terlalu panjang (${value.length}/${MAX_CHARS} karakter)` : (
            <>
              <span className="hidden sm:inline">Enter untuk kirim, Shift+Enter untuk baris baru. </span>Kirana bisa keliru, cek lagi detailnya di profil vendor.
            </>
          )}
        </p>
      )}
      <span role="status" className="sr-only">
        {over ? `Pesan terlalu panjang, maksimal ${MAX_CHARS} karakter` : ""}
      </span>
    </div>
  );
}

