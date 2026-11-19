"use client";

// The cards the assistant answers with. Every one is built from data the
// server's tools read from DuaCincin (internal/aiassist/tools.go): real
// vendors, real gallery photos, the Budget Planner's own split, articles from
// the registry. The model only picks which to show.
//
// Motion purpose, per card:
// - vendors: cards rise one after another; with a mouse each leans toward
//   the pointer (it is a thing you can pick up) and the photo sharpens in.
// - budget: the ring draws pos by pos and the amounts count up, so the
//   split is seen being made; hovering a pos or its row lights both.
// - inspirations: photos unveil upward in turn; one opens into a lightbox
//   that grows out of the tile it came from.
// - timeline: the line draws down and each step lands on it in order.
// - consultant: the one dark card in the chat (a person, not a list); its
//   two avatars-as-initial rings slide together = you are being connected.
// Reduced motion: everything is shown at once, no tilt, no draw.
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";

import { Counting } from "@/components/landing/Counting";
import { BodyPortal } from "@/components/ui/BodyPortal";
import { ARTICLES } from "@/content/artikel/registry";
import { categoryLabel, formatRupiah } from "@/lib/api";
import { EASE, MOTION, useReducedMotion } from "@/lib/motion";

import type { Block, VendorItem } from "./useAsk";

const RATING = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const SHORT = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** "Rp 12,5 jt" for tight spots; full rupiah elsewhere. */
function shortRupiah(n: number) {
  if (n >= 1_000_000_000) return `Rp ${SHORT.format(n / 1_000_000_000)} M`;
  if (n >= 1_000_000) return `Rp ${SHORT.format(n / 1_000_000)} jt`;
  if (n >= 1_000) return `Rp ${SHORT.format(n / 1_000)} rb`;
  return formatRupiah(n);
}

function rise(reduced: boolean | null, i: number, y = 18) {
  return reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.01 } }
    : {
        initial: { opacity: 0, y, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        transition: { duration: MOTION.stagger, ease: EASE, delay: 0.06 + i * 0.07 },
      };
}

function CardHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div>
        <p className="text-[0.8rem] font-bold text-dc-clay">{eyebrow}</p>
        <h3 className="mt-1 font-heading text-[1.6rem] font-semibold leading-tight text-dc-ink">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-dc-ink underline decoration-dc-gold underline-offset-[6px] hover:text-dc-clay">
      {children}
      <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="transition-transform duration-300 group-hover:translate-x-0.5">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

/* ------------------------------------------------------------------ vendors */

function TiltCard({ v, i }: { v: VendorItem; i: number }) {
  const reduced = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 220, damping: 20 });
  const sy = useSpring(ry, { stiffness: 220, damping: 20 });
  const glareX = useTransform(sy, [-8, 8], ["20%", "80%"]);
  const glare = useTransform(glareX, (x) => `radial-gradient(circle at ${x} 0%, rgba(255,246,225,0.28), transparent 55%)`);
  const [loaded, setLoaded] = useState(false);

  function move(e: PointerEvent<HTMLAnchorElement>) {
    if (reduced || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 14);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 10);
  }
  function leave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.li {...rise(reduced, i, 26)} className="w-[72%] max-w-[300px] shrink-0 snap-start [perspective:900px] sm:w-[46%] lg:w-auto lg:max-w-none">
      <motion.div style={reduced ? undefined : { rotateX: sx, rotateY: sy, transformStyle: "preserve-3d" }}>
        <Link
          href={`/vendors/${v.id}`}
          onPointerMove={move}
          onPointerLeave={leave}
          className="group relative block aspect-[4/5] overflow-hidden rounded-xl bg-dc-paper-3 shadow-soft transition-shadow duration-500 ease-dc hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-dc-gold"
        >
          {v.sample_image ? (
            // eslint-disable-next-line @next/next/no-img-element -- vendor portfolio on remote storage, same as the directory rail
            <img
              src={v.sample_image}
              alt={`Portofolio ${v.business_name}`}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              className={`absolute inset-0 h-full w-full object-cover transition-[transform,filter,opacity] duration-[900ms] ease-dc group-hover:scale-[1.06] motion-reduce:transition-none ${
                loaded ? "scale-100 opacity-100 blur-0" : "scale-[1.08] opacity-0 blur-md"
              }`}
            />
          ) : (
            <div className="flex h-full items-center justify-center pb-20 text-sm text-dc-text-2">Belum ada foto</div>
          )}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-[70%] bg-linear-to-t from-dc-ink via-dc-ink/80 to-transparent" />
          {!reduced && <motion.div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: glare }} />}
          <span className="absolute left-3 top-3 rounded-full bg-dc-ink/85 px-2.5 py-1 text-[0.7rem] font-semibold text-dc-on-dark">{categoryLabel(v.category)}</span>
          <div className="absolute inset-x-0 bottom-0 p-4" style={{ transform: "translateZ(30px)" }}>
            <h4 className="font-heading text-[1.4rem] font-semibold leading-[1.05] text-[#fbf6ec]">{v.business_name}</h4>
            <p className="mt-0.5 line-clamp-1 text-xs text-[#fbf6ec]/90">{v.city}</p>
            {v.reasons && v.reasons.length > 0 && (
              <ul aria-label="Kenapa cocok" className="mt-2 flex flex-wrap gap-1">
                {v.reasons.slice(0, 2).map((r) => (
                  <li key={r} className="inline-flex items-center gap-1 rounded-full bg-[#fbf6ec]/15 px-2 py-0.5 text-[0.68rem] font-semibold text-[#fbf6ec] backdrop-blur-sm">
                    <svg aria-hidden width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-dc-gold-antique">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                    {r}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex items-end justify-between gap-2 border-t border-[#fbf6ec]/25 pt-2.5 text-[#fbf6ec]">
              <p className="text-xs">{v.price_min > 0 ? <>Mulai <span className="text-sm font-bold tabular-nums">{shortRupiah(v.price_min)}</span></> : <span className="font-semibold">Harga lewat chat</span>}</p>
              {v.review_count > 0 && (
                <p className="flex items-center gap-1 text-xs tabular-nums">
                  <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" className="text-dc-gold-antique">
                    <path fill="currentColor" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8Z" />
                  </svg>
                  <span className="font-bold">{RATING.format(v.average_rating)}</span>
                </p>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.li>
  );
}

function VendorsBlock({ data }: { data: Extract<Block, { type: "vendors" }>["data"] }) {
  const qs = new URLSearchParams({ category: data.query.category });
  if (data.query.city) qs.set("kota", data.query.city);
  if (data.query.max_price) qs.set("budget", String(data.query.max_price));
  const title = data.city ? `${data.label} di ${data.city}` : data.label;
  return (
    <div>
      <CardHead
        eyebrow={`${data.total} vendor ditemukan`}
        title={title}
        action={data.total > data.items.length ? <MoreLink href={`/vendors?${qs}`}>Lihat semua</MoreLink> : <MoreLink href={`/vendors?${qs}`}>Buka direktori</MoreLink>}
      />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {data.items.map((v, i) => (
          <TiltCard key={v.id} v={v} i={i} />
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------- budget */

const RING_COLORS = ["var(--color-dc-chart-1)", "var(--color-dc-chart-2)", "var(--color-dc-chart-3)", "var(--color-dc-chart-4)", "var(--color-dc-chart-5)", "var(--color-dc-chart-6)", "var(--color-dc-chart-7)"];

function BudgetBlock({ data }: { data: Extract<Block, { type: "budget" }>["data"] }) {
  const reduced = useReducedMotion();
  const [hot, setHot] = useState<string | null>(null);
  const R = 70;
  const C = 2 * Math.PI * R;
  const GAP = 0.006;
  const segs = data.lines.map((l, i) => ({
    ...l,
    start: data.lines.slice(0, i).reduce((sum, x) => sum + x.percentage / 100, 0),
    frac: l.percentage / 100,
    color: RING_COLORS[i % RING_COLORS.length],
    i,
  }));
  const focus = segs.find((s) => s.key === hot);

  return (
    <div>
      <CardHead eyebrow="Pembagian budget" title="Rencana budget kamu" action={<MoreLink href="/register?role=client">Atur di Budget Planner</MoreLink>} />
      <div className="grid items-center gap-6 sm:grid-cols-[220px_1fr] sm:gap-8">
        <div className="relative mx-auto aspect-square w-[200px] sm:w-[220px]">
          <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
            <circle cx="90" cy="90" r={R} fill="none" stroke="var(--color-dc-cream)" strokeWidth="18" />
            {segs.map((s) => (
              <motion.circle
                key={s.key}
                cx="90"
                cy="90"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={hot === s.key ? 24 : 18}
                strokeDashoffset={-s.start * C}
                initial={reduced ? false : { strokeDasharray: `0 ${C}` }}
                animate={{ strokeDasharray: `${Math.max(0, s.frac - GAP) * C} ${C}`, opacity: hot && hot !== s.key ? 0.35 : 1 }}
                transition={{ opacity: { duration: 0.25 }, default: { duration: 0.5, delay: 0.15 + s.i * 0.12, ease: EASE } }}
                onPointerEnter={() => setHot(s.key)}
                onPointerLeave={() => setHot(null)}
                className="cursor-pointer transition-[stroke-width] duration-300"
                style={{ strokeLinecap: "butt" }}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={focus?.key ?? "total"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <p className="text-[0.75rem] font-semibold text-dc-text-3">{focus ? focus.label : "Total"}</p>
                <p className="mt-1 font-heading text-[1.55rem] font-semibold leading-none tabular-nums text-dc-ink">
                  {focus ? shortRupiah(focus.amount) : <Counting value={data.total} format={(n) => shortRupiah(Math.round(n))} />}
                </p>
                {focus && <p className="mt-1 text-xs font-semibold text-dc-clay">{focus.percentage}%</p>}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <ul className="space-y-1">
          {segs.map((s) => (
            <motion.li key={s.key} {...rise(reduced, s.i, 10)}>
              <div
                onPointerEnter={() => setHot(s.key)}
                onPointerLeave={() => setHot(null)}
                className={`grid grid-cols-[12px_1fr_auto] items-center gap-x-3 rounded-md px-2 py-1.5 transition-colors ${hot === s.key ? "bg-dc-cream" : ""}`}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                <span className="text-sm font-semibold text-dc-ink">{s.label}</span>
                <span className="text-sm font-bold tabular-nums text-dc-ink">
                  <Counting value={s.amount} format={(n) => formatRupiah(Math.round(n))} />
                </span>
                <span />
                <span className="col-span-2 mt-1 block h-1.5 overflow-hidden rounded-full bg-dc-cream">
                  <motion.span
                    className="block h-full rounded-full"
                    style={{ background: s.color, transformOrigin: "left" }}
                    initial={reduced ? false : { scaleX: 0 }}
                    animate={{ scaleX: s.percentage / 40 > 1 ? 1 : s.percentage / 40 }}
                    transition={{ duration: 0.8, delay: 0.2 + s.i * 0.08, ease: EASE }}
                  />
                </span>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
      {data.guests && data.per_guest ? (
        <p className="mt-5 rounded-lg bg-dc-gold-wash px-4 py-3 text-sm leading-relaxed text-dc-black">
          Untuk <strong className="font-semibold">{data.guests.toLocaleString("id-ID")} tamu</strong>, pos venue dan catering setara sekitar{" "}
          <strong className="font-semibold tabular-nums">{formatRupiah(data.per_guest)}</strong> per tamu.
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- inspirations */

function InspirationsBlock({ data }: { data: Extract<Block, { type: "inspirations" }>["data"] }) {
  const reduced = useReducedMotion();
  const group = useId();
  const [open, setOpen] = useState<number | null>(null);
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const items = data.items.filter((it) => !broken.has(it.id));
  const current = open === null ? null : items[open];

  const closeBtn = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const opener = useRef<number | null>(null);

  // Lightbox as a real dialog: focus moves in, Tab stays in, the page behind
  // does not scroll, and focus returns to the photo it was opened from.
  useEffect(() => {
    if (open === null) {
      if (opener.current !== null) {
        gridRef.current?.querySelector<HTMLButtonElement>(`[data-tile="${opener.current}"]`)?.focus();
        opener.current = null;
      }
      return;
    }
    if (opener.current === null) opener.current = open;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => closeBtn.current?.focus(), 30);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const dlg = closeBtn.current?.closest("[role=dialog]");
        const items = dlg ? Array.from(dlg.querySelectorAll<HTMLButtonElement>("button")) : [];
        if (items.length) {
          const first = items[0];
          const lastEl = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            lastEl.focus();
          } else if (!e.shiftKey && document.activeElement === lastEl) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((o) => (o === null ? o : (o + 1) % items.length));
      if (e.key === "ArrowLeft") setOpen((o) => (o === null ? o : (o - 1 + items.length) % items.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items.length]);

  if (items.length === 0) return null;
  return (
    <div>
      <CardHead
        eyebrow={data.exact ? "Galeri inspirasi" : "Dari galeri inspirasi"}
        title={data.exact && data.keyword ? `Inspirasi “${data.keyword}”` : "Ide untuk kamu"}
        action={<MoreLink href={data.keyword ? `/inspirasi?q=${encodeURIComponent(data.keyword)}` : "/inspirasi"}>Buka galeri</MoreLink>}
      />
      <ul ref={gridRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((it, i) => (
          <motion.li
            key={it.id}
            initial={reduced ? { opacity: 0 } : { opacity: 0, clipPath: "inset(100% 0 0 0 round 18px)" }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, clipPath: "inset(0% 0 0 0 round 18px)" }}
            transition={{ duration: 0.7, delay: 0.08 + i * 0.07, ease: EASE }}
          >
            <button
              type="button"
              data-tile={i}
              onClick={() => setOpen(i)}
              aria-label={`Perbesar: ${it.caption || it.alt_text || "foto inspirasi"}`}
              className="group relative block w-full overflow-hidden rounded-lg bg-dc-cream focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-dc-gold"
            >
              <motion.img
                layoutId={reduced ? undefined : `${group}-${it.id}`}
                src={it.url}
                alt={it.alt_text || it.caption}
                loading="lazy"
                onError={() => setBroken((b) => new Set(b).add(it.id))}
                className="block aspect-[4/5] w-full object-cover transition-transform duration-700 ease-dc group-hover:scale-[1.05] motion-reduce:transition-none"
              />
              {it.caption && (
                <span className="absolute inset-x-0 bottom-0 translate-y-full bg-linear-to-t from-dc-ink/85 to-transparent px-3 pb-2.5 pt-6 text-left text-xs font-semibold text-[#fbf6ec] transition-transform duration-500 ease-dc group-hover:translate-y-0 group-focus-visible:translate-y-0">
                  {it.caption}
                </span>
              )}
            </button>
          </motion.li>
        ))}
      </ul>

      <BodyPortal>
        <AnimatePresence>
          {current && open !== null && (
            <motion.div
              key="lightbox"
              role="dialog"
              aria-modal="true"
              aria-label={current.caption || "Foto inspirasi"}
              className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            >
              <div aria-hidden onClick={() => setOpen(null)} className="absolute inset-0 bg-dc-ink/88 backdrop-blur-sm" />
              <figure className="relative z-10 flex max-h-full max-w-4xl flex-col items-center">
                <motion.img
                  layoutId={reduced ? undefined : `${group}-${current.id}`}
                  src={current.url}
                  alt={current.alt_text || current.caption}
                  className="max-h-[78vh] w-auto rounded-xl object-contain shadow-float"
                  transition={{ duration: 0.5, ease: EASE }}
                />
                <figcaption className="mt-4 flex w-full items-center justify-between gap-4 text-sm text-dc-on-dark">
                  <span className="font-semibold">{current.caption || current.alt_text}</span>
                  <span className="shrink-0 tabular-nums text-dc-on-dark/70">
                    {open + 1} / {items.length}
                  </span>
                </figcaption>
              </figure>
              {items.length > 1 && (
                <>
                  <button type="button" aria-label="Foto sebelumnya" onClick={() => setOpen((open - 1 + items.length) % items.length)} className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-dc-on-dark/15 text-dc-on-dark backdrop-blur hover:bg-dc-on-dark/25 sm:left-6">
                    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></svg>
                  </button>
                  <button type="button" aria-label="Foto berikutnya" onClick={() => setOpen((open + 1) % items.length)} className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-dc-on-dark/15 text-dc-on-dark backdrop-blur hover:bg-dc-on-dark/25 sm:right-6">
                    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
                  </button>
                </>
              )}
              <button ref={closeBtn} type="button" aria-label="Tutup" onClick={() => setOpen(null)} className="absolute right-3 top-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-dc-on-dark/15 text-dc-on-dark backdrop-blur hover:bg-dc-on-dark/25 sm:right-6 sm:top-6">
                <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </BodyPortal>
    </div>
  );
}

/* ----------------------------------------------------------------- timeline */

function TimelineBlock({ data }: { data: Extract<Block, { type: "timeline" }>["data"] }) {
  const reduced = useReducedMotion();
  const n = data.steps.length;
  return (
    <div>
      <CardHead eyebrow="Timeline persiapan" title={data.title} action={<MoreLink href="/register?role=client">Simpan ke Wedding Planner</MoreLink>} />
      <ol className="relative pl-9">
        <motion.span
          aria-hidden
          className="absolute bottom-3 left-[11px] top-3 w-px origin-top bg-linear-to-b from-dc-gold via-dc-gold/60 to-dc-line"
          initial={reduced ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.25 + n * 0.14, ease: EASE }}
        />
        {data.steps.map((s, i) => (
          <motion.li
            key={i}
            className="relative pb-5 last:pb-0"
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: reduced ? 0 : 0.15 + i * 0.14, ease: EASE }}
          >
            <motion.span
              aria-hidden
              className="absolute -left-9 top-0.5 flex h-[23px] w-[23px] items-center justify-center rounded-full border-2 border-dc-gold bg-dc-white"
              initial={reduced ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.12 + i * 0.14 }}
            >
              <span className="h-2 w-2 rounded-full bg-dc-gold" />
            </motion.span>
            <p className="text-[0.8rem] font-bold text-dc-clay">{s.when}</p>
            <p className="mt-0.5 font-semibold text-dc-ink">{s.title}</p>
            {s.detail && <p className="mt-0.5 text-sm leading-relaxed text-dc-text-2">{s.detail}</p>}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/* ----------------------------------------------------------------- articles */

function ArticlesBlock({ data }: { data: Extract<Block, { type: "articles" }>["data"] }) {
  const reduced = useReducedMotion();
  const list = data.slugs.map((s) => ARTICLES.find((a) => a.slug === s)).filter((a): a is (typeof ARTICLES)[number] => !!a);
  if (list.length === 0) return null;
  return (
    <div>
      <CardHead eyebrow="Bacaan lanjutan" title="Panduan yang pas" />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((a, i) => (
          <motion.li key={a.slug} {...rise(reduced, i)}>
            <Link href={`/artikel/${a.slug}`} className="group flex h-full gap-3 rounded-lg border border-dc-line bg-dc-white p-2.5 transition-[transform,box-shadow] duration-300 ease-dc hover:shadow-lift motion-safe:hover:-translate-y-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- small local thumbnail */}
              <img src={a.image} alt="" className="h-20 w-20 shrink-0 rounded-md object-cover" loading="lazy" />
              <span className="min-w-0 py-0.5">
                <span className="text-[0.75rem] font-bold text-dc-clay">{a.topic} · {a.readMinutes} menit</span>
                <span className="mt-1 line-clamp-3 block text-sm font-semibold leading-snug text-dc-ink group-hover:text-dc-clay">{a.title}</span>
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------- consultant */

function ConsultantBlock({ data }: { data: Extract<Block, { type: "consultant" }>["data"] }) {
  const reduced = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  // A ready brief for the consultant (Bree pattern): what was asked, in words.
  const brief = [
    "Halo Wedding Consultant DuaCincin, saya butuh bantuan mencari vendor.",
    data.label ? `Kategori: ${data.label}` : "",
    data.city ? `Kota: ${data.city}` : "",
    data.budget ? `Budget: sampai ${formatRupiah(data.budget)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const what = [data.label, data.city ? `di ${data.city}` : ""].filter(Boolean).join(" ");
  async function copy() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked: the text is visible to copy by hand */
    }
  }
  return (
    <div className="dc-on-dark -m-4 rounded-[20px] bg-dc-ink px-4 py-3.5 text-dc-on-dark sm:-m-6 sm:px-5 sm:py-4">
      <div className="flex items-center gap-3">
        <motion.span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dc-gold-antique/70 bg-dc-ink-2 text-dc-gold-antique"
          initial={reduced ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 20, delay: 0.1 }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-1v-6h3M4 12v4a2 2 0 0 0 2 2h1v-6H4" />
          </svg>
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] font-semibold leading-snug">{what ? `${what} belum tersedia` : "Butuh bantuan mencari vendor?"}</p>
          <p className="text-[0.8rem] leading-snug text-dc-on-dark/75">Wedding Consultant kami bantu carikan, gratis.</p>
        </div>
        <Link
          href="/client/consultation"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-linear-135 from-dc-gold-antique to-dc-gold px-4 text-sm font-semibold text-dc-ink transition-[transform,box-shadow] duration-300 ease-dc hover:shadow-gold active:scale-[0.98] motion-safe:hover:-translate-y-0.5"
        >
          <span className="sm:hidden">Chat</span>
          <span className="hidden sm:inline">Chat konsultan</span>
        </Link>
      </div>
      {(data.label || data.city || data.budget) && (
        <div className="mt-2 border-t border-dc-on-dark/10 pt-1.5">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex min-h-11 items-center gap-1.5 rounded-full pr-2 text-[0.8rem] font-semibold text-dc-gold-antique">
              Lihat ringkasan kebutuhan
              <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-[0.8rem] font-semibold text-dc-on-dark/85 hover:text-dc-on-dark">
              <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {copied ? <path d="m5 12 5 5 9-10" /> : <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>}
              </svg>
              {copied ? "Tersalin" : "Salin"}
            </button>
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.p
                key="brief"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="overflow-hidden whitespace-pre-line pb-1 text-[0.8rem] leading-relaxed text-dc-on-dark/80"
              >
                {brief}
              </motion.p>
            )}
          </AnimatePresence>
          <p role="status" className="sr-only">{copied ? "Ringkasan tersalin" : ""}</p>
        </div>
      )}
    </div>
  );
}

export function BlockView({ block }: { block: Block }) {
  const reduced = useReducedMotion();
  const inner = (() => {
    switch (block.type) {
      case "vendors":
        return <VendorsBlock data={block.data} />;
      case "budget":
        return <BudgetBlock data={block.data} />;
      case "inspirations":
        return <InspirationsBlock data={block.data} />;
      case "timeline":
        return <TimelineBlock data={block.data} />;
      case "articles":
        return <ArticlesBlock data={block.data} />;
      case "consultant":
        return <ConsultantBlock data={block.data} />;
      default:
        return null;
    }
  })();
  if (!inner) return null;
  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: MOTION.reveal, ease: EASE }}
      className="rounded-[24px] border border-dc-line/80 bg-dc-white/95 p-4 shadow-soft sm:p-6"
    >
      {inner}
    </motion.section>
  );
}
