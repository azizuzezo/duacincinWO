"use client";

// The cards the assistant answers with. Every one is built from data the
// server's tools read from DuaCincin (internal/aiassist/tools.go): real
// vendors, real gallery photos, the Budget Planner's own split, articles from
// the registry. The model only picks which to show.
//
// Motion purpose, per card:
// - vendors: cards rise one after another; each opens on a swipeable
//   portfolio gallery (arrows on hover, dots show the position); the card
//   lifts on hover.
// - budget: the ring draws pos by pos and the amounts count up, so the
//   split is seen being made; hovering a pos or its row lights both.
// - inspirations: photos unveil upward in turn; one opens into a lightbox
//   that grows out of the tile it came from.
// - timeline: the line draws down and each step lands on it in order.
// - consultant: the one gold-washed card in the chat (a person, not a list); its
//   avatar springs in = a person is ready to help.
// Reduced motion: everything is shown at once, no tilt, no draw.
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Shield, Star, wdButton } from "@/components/home/ui";
import { Counting } from "@/components/landing/Counting";
import { BodyPortal } from "@/components/ui/BodyPortal";
import { ARTICLES } from "@/content/artikel/registry";
import { categoryLabel, formatRupiah } from "@/lib/api";
import { EASE, MOTION, useReducedMotion } from "@/lib/motion";

import { BriefBlock } from "./BriefBlock";
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
        <p className="wd-kicker text-[1rem]">{eyebrow}</p>
        <h3 className="wd-title mt-0.5 text-[1.3rem] leading-tight sm:text-[1.45rem]">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-wd-ink underline decoration-wd-line-2 underline-offset-[6px] transition-colors hover:text-wd-accent-ink hover:decoration-wd-accent-ink">
      {children}
      <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="transition-transform duration-300 group-hover:translate-x-0.5">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

/* ------------------------------------------------------------------ vendors */

/** Portfolio gallery: swipe on touch, arrows on hover, dots show where you are. */
function Gallery({ v }: { v: VendorItem }) {
  const imgs = (v.images && v.images.length ? v.images : v.sample_image ? [v.sample_image] : []).slice(0, 5);
  const track = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set());

  function go(dir: -1 | 1) {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(imgs.length - 1, idx + dir));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  }

  if (imgs.length === 0) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-[14px] bg-wd-blush text-wd-muted">
        <svg aria-hidden width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <circle cx="9" cy="10" r="1.8" />
          <path d="m21 16-5-5-8 8" />
        </svg>
        <span className="text-sm font-medium">Belum ada foto</span>
      </div>
    );
  }
  return (
    <div className="group/g relative aspect-[4/3] overflow-hidden rounded-[14px] bg-wd-blush">
      <div
        ref={track}
        onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {imgs.map((src, i) => (
          <div key={src + i} className="relative h-full w-full shrink-0 snap-center">
            {/* Blurred copy of the photo fills the frame; the photo itself is
                shown whole on top, so no part of it is cropped away. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- vendor portfolio on remote storage */}
            <img
              src={src}
              alt=""
              aria-hidden
              loading="lazy"
              draggable={false}
              onLoad={() => setLoaded((s) => new Set(s).add(i))}
              className={`absolute inset-0 h-full w-full scale-125 object-cover blur-2xl transition-opacity duration-[1.1s] ${loaded.has(i) ? "opacity-100" : "opacity-0"}`}
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- vendor portfolio on remote storage */}
            <img
              src={src}
              alt={`Portofolio ${v.business_name} ${i + 1}`}
              loading="lazy"
              draggable={false}
              onLoad={() => setLoaded((s) => new Set(s).add(i))}
              className={`h-full w-full object-contain transition-[transform,opacity,filter] duration-[1.1s] ease-dc group-hover/g:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover/g:scale-100 ${loaded.has(i) ? "opacity-100 blur-0" : "opacity-0 blur-md"}`}
            />
          </div>
        ))}
      </div>
      {imgs.length > 1 && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-t from-black/35 to-transparent" />}
      <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[0.72rem] font-semibold text-wd-ink">
        <Shield size={11} className="text-wd-accent-ink" />
        Terverifikasi
      </span>
      {imgs.length > 1 && (
        <>
          <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
            {imgs.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full bg-white transition-all duration-300 ${i === idx ? "w-4 opacity-100" : "w-1.5 opacity-60"}`} />
            ))}
          </div>
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => go(d as -1 | 1)}
              disabled={(d < 0 && idx === 0) || (d > 0 && idx === imgs.length - 1)}
              aria-label={d < 0 ? "Foto sebelumnya" : "Foto berikutnya"}
              className={`absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-wd-ink opacity-0 shadow-wd-card transition-opacity duration-300 hover:bg-white focus-visible:opacity-100 group-hover/g:opacity-100 disabled:!opacity-0 sm:flex ${d < 0 ? "left-2.5" : "right-2.5"}`}
            >
              <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d={d < 0 ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
              </svg>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

/** Same anatomy as the home VendorCard (photo, name, category and city,
 * stars, starting price), plus what only Kirana knows: why it fits. */
function VendorCard({ v, i }: { v: VendorItem; i: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.li {...rise(reduced, i, 26)} className="w-[78%] max-w-[300px] shrink-0 snap-start sm:w-[46%] lg:w-auto lg:max-w-none">
      <article className="group flex h-full flex-col">
        <Gallery v={v} />
        <div className="flex flex-1 flex-col pt-3">
          <h4 className="line-clamp-2 break-words text-[1rem] font-semibold leading-snug text-wd-ink">
            <Link href={`/vendors/${v.id}`} className="rounded-sm transition-colors hover:text-wd-accent-ink">
              {v.business_name}
            </Link>
          </h4>
          <p className="mt-1 truncate text-[0.85rem] text-wd-muted">
            {categoryLabel(v.category)} · {v.city}
          </p>
          {v.review_count > 0 ? (
            <p className="mt-1.5 flex items-center gap-1 text-[0.85rem]">
              <span className="flex text-wd-gold" aria-hidden>
                {[0, 1, 2, 3, 4].map((k) => (
                  <Star key={k} size={13} className={k < Math.round(v.average_rating) ? "" : "opacity-30"} />
                ))}
              </span>
              <span className="font-semibold tabular-nums text-wd-ink">
                <span className="sr-only">Rating </span>
                {RATING.format(v.average_rating)}
              </span>
              <span className="text-wd-muted">({v.review_count} ulasan)</span>
            </p>
          ) : (
            <p className="mt-1.5">
              <span className="rounded-full bg-wd-accent-soft px-2 py-0.5 text-[0.72rem] font-semibold text-wd-accent-ink">Baru di DuaCincin</span>
            </p>
          )}
          <p className="mt-1.5 text-[0.85rem] text-wd-text">
            {v.price_min > 0 ? (
              <>
                Mulai <span className="font-semibold tabular-nums text-wd-ink">{formatRupiah(v.price_min)}</span>
              </>
            ) : (
              "Tanya harga lewat chat"
            )}
          </p>
          {v.description && <p className="mt-2 line-clamp-2 text-[0.85rem] leading-relaxed text-wd-muted">{v.description}</p>}
          {v.reasons && v.reasons.length > 0 && (
            <ul aria-label="Kenapa cocok" className="mt-2.5 flex flex-wrap gap-1.5">
              {v.reasons.slice(0, 3).map((r) => (
                <li key={r} className="inline-flex items-center gap-1 rounded-full bg-wd-accent-wash px-2.5 py-1 text-[0.75rem] font-medium text-wd-ink ring-1 ring-wd-accent-soft">
                  <svg aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-wd-accent-ink">
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                  {r}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 lg:mt-auto lg:pt-3">
            <Link href={`/vendors/${v.id}`} aria-label={`Lihat portofolio ${v.business_name}`} className={wdButton({ variant: "outline", size: "sm", className: "w-full" })}>
              Lihat portofolio
            </Link>
          </div>
        </div>
      </article>
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
        eyebrow={data.total === 1 ? "1 vendor terdaftar & terverifikasi" : `${data.total} vendor terdaftar & terverifikasi`}
        title={title}
        action={<MoreLink href={`/vendors?${qs}`}>{data.total > data.items.length ? `Lihat semua ${data.total}` : "Buka direktori"}</MoreLink>}
      />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {data.items.map((v, i) => (
          <VendorCard key={v.id} v={v} i={i} />
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
      {((data.excluded?.length ?? 0) > 0 || (data.added?.length ?? 0) > 0) && (
        <p className="-mt-2 mb-4 flex flex-wrap items-center gap-1.5 text-[0.8rem] font-semibold text-wd-ink">
          {!!data.added?.length && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f1eb] px-3 py-1 text-wd-ok">
              <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Ditambah {data.added.join(", ")}
            </span>
          )}
          {!!data.excluded?.length && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-wd-accent-wash px-3 py-1 ring-1 ring-wd-accent-soft">
              <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="text-wd-accent-ink">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
              Tanpa {data.excluded.join(", ")}
            </span>
          )}
          <span className="font-normal text-wd-muted">Porsi dibagi ulang, total tetap.</span>
        </p>
      )}
      <div className="grid items-center gap-6 sm:grid-cols-[220px_1fr] sm:gap-8">
        <div className="relative mx-auto aspect-square w-[200px] sm:w-[220px]">
          <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
            <circle cx="90" cy="90" r={R} fill="none" stroke="var(--wd-blush)" strokeWidth="18" />
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
                <p className="text-[0.75rem] font-medium text-wd-muted">{focus ? focus.label : "Total"}</p>
                <p className="mt-1 text-[1.4rem] font-semibold leading-none tabular-nums text-wd-ink">
                  {focus ? shortRupiah(focus.amount) : <Counting value={data.total} format={(n) => shortRupiah(Math.round(n))} />}
                </p>
                {focus && <p className="mt-1 text-xs font-semibold text-wd-accent-ink">{focus.percentage}%</p>}
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
                className={`grid grid-cols-[12px_1fr_auto] items-center gap-x-3 rounded-md px-2 py-1.5 transition-colors ${hot === s.key ? "bg-wd-paper" : ""}`}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                <span className="text-sm font-medium text-wd-ink">{s.label}</span>
                <span className="text-sm font-semibold tabular-nums text-wd-ink">
                  <Counting value={s.amount} format={(n) => formatRupiah(Math.round(n))} />
                </span>
                <span />
                <span className="col-span-2 mt-1 block h-1.5 overflow-hidden rounded-full bg-wd-blush">
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
        <p className="mt-5 rounded-[14px] bg-wd-accent-wash px-4 py-3 text-sm leading-relaxed text-wd-text">
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
              className="group relative block w-full overflow-hidden rounded-[14px] bg-wd-blush focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-wd-accent-ink"
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
                <span className="absolute inset-x-0 bottom-0 translate-y-full bg-linear-to-t from-black/75 to-transparent px-3 pb-2.5 pt-6 text-left text-xs font-semibold text-white transition-transform duration-500 ease-dc group-hover:translate-y-0 group-focus-visible:translate-y-0">
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
              <div aria-hidden onClick={() => setOpen(null)} className="absolute inset-0 bg-wd-ink/90 backdrop-blur-sm" />
              <figure className="relative z-10 flex max-h-full max-w-4xl flex-col items-center">
                <motion.img
                  layoutId={reduced ? undefined : `${group}-${current.id}`}
                  src={current.url}
                  alt={current.alt_text || current.caption}
                  className="max-h-[78vh] w-auto rounded-xl object-contain shadow-float"
                  transition={{ duration: 0.5, ease: EASE }}
                />
                <figcaption className="mt-4 flex w-full items-center justify-between gap-4 text-sm text-white">
                  <span className="font-semibold">{current.caption || current.alt_text}</span>
                  <span className="shrink-0 tabular-nums text-white/75">
                    {open + 1} / {items.length}
                  </span>
                </figcaption>
              </figure>
              {items.length > 1 && (
                <>
                  <button type="button" aria-label="Foto sebelumnya" onClick={() => setOpen((open - 1 + items.length) % items.length)} className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25 sm:left-6">
                    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></svg>
                  </button>
                  <button type="button" aria-label="Foto berikutnya" onClick={() => setOpen((open + 1) % items.length)} className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25 sm:right-6">
                    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
                  </button>
                </>
              )}
              <button ref={closeBtn} type="button" aria-label="Tutup" onClick={() => setOpen(null)} className="absolute right-3 top-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25 sm:right-6 sm:top-6">
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
          className="absolute bottom-3 left-[11px] top-3 w-px origin-top bg-linear-to-b from-wd-accent via-wd-accent-line to-wd-line"
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
              className="absolute -left-9 top-0.5 flex h-[23px] w-[23px] items-center justify-center rounded-full border-2 border-wd-accent bg-white"
              initial={reduced ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.12 + i * 0.14 }}
            >
              <span className="h-2 w-2 rounded-full bg-wd-accent-deep" />
            </motion.span>
            <p className="text-[0.8rem] font-semibold text-wd-accent-ink">{s.when}</p>
            <p className="mt-0.5 font-semibold text-wd-ink">{s.title}</p>
            {s.detail && <p className="mt-0.5 text-sm leading-relaxed text-wd-text">{s.detail}</p>}
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
            <Link href={`/artikel/${a.slug}`} className="group flex h-full gap-3 rounded-[14px] border border-wd-line bg-white p-2.5 transition-[border-color,box-shadow] duration-300 hover:border-wd-accent-line hover:shadow-wd-card">
              {/* eslint-disable-next-line @next/next/no-img-element -- small local thumbnail */}
              <img src={a.image} alt="" className="h-20 w-20 shrink-0 rounded-[10px] object-cover" loading="lazy" />
              <span className="min-w-0 py-0.5">
                <span className="text-[0.75rem] font-semibold text-wd-accent-ink">{a.topic} · {a.readMinutes} menit</span>
                <span className="mt-1 line-clamp-3 block text-sm font-semibold leading-snug text-wd-ink group-hover:text-wd-accent-ink">{a.title}</span>
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
    <div className="-m-4 rounded-[21px] bg-wd-accent-wash px-4 py-3.5 sm:-m-6 sm:px-5 sm:py-4">
      <div className="flex items-center gap-3">
        <motion.span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-wd-accent-line bg-white text-wd-accent-ink"
          initial={reduced ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 20, delay: 0.1 }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-1v-6h3M4 12v4a2 2 0 0 0 2 2h1v-6H4" />
          </svg>
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] font-semibold leading-snug text-wd-ink">
            {data.fallback ? "Kirana sedang ada kendala" : data.requested ? "Ngobrol dengan Wedding Consultant" : what ? `${what} belum tersedia` : "Butuh bantuan mencari vendor?"}
          </p>
          <p className="text-[0.82rem] leading-snug text-wd-text">
            {data.fallback ? "Wedding Consultant kami siap bantu langsung, gratis." : data.requested ? "Staf DuaCincin siap bantu rencanamu, gratis." : "Wedding Consultant kami bantu carikan, gratis."}
          </p>
        </div>
        <Link
          href="/client/consultation?chat=1"
          className={wdButton({ size: "sm", className: "min-h-11 shrink-0" })}
        >
          <span className="sm:hidden">Chat</span>
          <span className="hidden sm:inline">Chat konsultan</span>
        </Link>
      </div>
      {!!(data.label || data.city || data.budget) && (
        <div className="mt-2 border-t border-wd-accent-soft pt-1.5">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex min-h-11 items-center gap-1.5 rounded-full pr-2 text-[0.82rem] font-semibold text-wd-accent-ink">
              Lihat ringkasan kebutuhan
              <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[0.82rem] font-semibold text-wd-text hover:bg-white hover:text-wd-ink">
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
                className="overflow-hidden whitespace-pre-line pb-1 text-[0.82rem] leading-relaxed text-wd-text"
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
      case "brief":
        return <BriefBlock data={block.data} />;
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
      className="rounded-[22px] border border-wd-line bg-white p-4 sm:p-6"
    >
      {inner}
    </motion.section>
  );
}
