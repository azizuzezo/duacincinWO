"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PinterestImageCard } from "@/components/PinterestImageCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { apiGet, ApiError, type InspirationItem } from "@/lib/api";
import { DURATION, EASE, motionSafe, useReducedMotion } from "@/lib/motion";

import { ADAT, adatOf, matchesQuery, vendorCategory } from "./adat";
import { Lightbox } from "./Lightbox";

const PINTEREST_BOARD_URL = "https://id.pinterest.com/2cincinid/inspirasi-nikah-indonesia-venue-decor-mua-artis/";

// Motion purpose: photos arrive in reading order once the data lands, so the
// grid fills like prints being laid on a table instead of popping in at once.
const arrive = (i: number) => ({
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE, delay: Math.min(i, 10) * 0.045 } },
});

/** 2 columns on phones, 3 on tablets, 4 on wide screens. */
function useColumns() {
  const [cols, setCols] = useState(2);
  useEffect(() => {
    const pick = () => setCols(window.innerWidth >= 1280 ? 4 : window.innerWidth >= 768 ? 3 : 2);
    pick();
    window.addEventListener("resize", pick);
    return () => window.removeEventListener("resize", pick);
  }, []);
  return cols;
}

function readParams() {
  if (typeof window === "undefined") return { adat: "", kategori: "", q: "" };
  const p = new URLSearchParams(window.location.search);
  return { adat: p.get("adat") ?? "", kategori: p.get("kategori") ?? "", q: p.get("q") ?? "" };
}

const CHIP =
  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-[background-color,border-color,color] duration-300";
const chipClass = (on: boolean) =>
  `${CHIP} ${on ? "border-dc-ink bg-dc-ink text-dc-on-dark" : "border-dc-line-strong bg-dc-white text-dc-ink hover:border-dc-ink"}`;

export function InspirationGallery() {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Filters start from the address (shared links). Safe for hydration: the
  // filter bar and grid only render after the data arrives on the client.
  const [adat, setAdat] = useState(() => readParams().adat);
  const [kategori, setKategori] = useState(() => readParams().kategori);
  const [q, setQ] = useState(() => readParams().q);
  const [open, setOpen] = useState<number | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const cols = useColumns();
  const reduced = useReducedMotion();

  useEffect(() => {
    apiGet<InspirationItem[]>("/api/v1/inspiration")
      .then((data) => {
        setItems(data ?? []);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat galeri inspirasi."))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  // Keep the filter in the address so a filtered gallery can be shared.
  useEffect(() => {
    const p = new URLSearchParams();
    if (adat) p.set("adat", adat);
    if (kategori) p.set("kategori", kategori);
    if (q) p.set("q", q);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [adat, kategori, q]);

  function retry() {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  const adatCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) for (const k of adatOf(it)) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  }, [items]);
  const adatChips = ADAT.filter((a) => adatCounts.has(a.key));

  const catChips = useMemo(() => {
    const seen = new Set(items.map((i) => i.category));
    return [...seen].map(vendorCategory).filter((c): c is NonNullable<typeof c> => Boolean(c));
  }, [items]);

  const shown = useMemo(
    () =>
      items.filter(
        (it) => (!adat || adatOf(it).includes(adat)) && (!kategori || it.category === kategori) && matchesQuery(it, q),
      ),
    [items, adat, kategori, q],
  );

  const columns = useMemo(() => {
    const out: { item: InspirationItem; i: number }[][] = Array.from({ length: cols }, () => []);
    shown.forEach((item, i) => out[i % cols].push({ item, i }));
    return out;
  }, [shown, cols]);

  const filtered = Boolean(adat || kategori || q);
  const clear = () => {
    setAdat("");
    setKategori("");
    setQ("");
  };
  const close = useCallback(() => setOpen(null), []);
  const move = useCallback((n: number) => setOpen(n), []);

  return (
    <section aria-labelledby="galeri-judul" className="bg-dc-cream pb-20 pt-10 sm:pt-12 lg:pb-28">
      <h2 id="galeri-judul" className="sr-only">
        Galeri foto
      </h2>

      {!loading && !error && items.length > 0 && (
        <div className="z-30 border-b md:sticky md:top-[72px] border-dc-line bg-dc-cream/95 backdrop-blur-sm">
          <div className="dc-container flex flex-col gap-3 py-3 lg:flex-row lg:items-start lg:gap-8">
            <div className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              <button type="button" aria-pressed={!adat && !kategori} onClick={() => { setAdat(""); setKategori(""); }} className={chipClass(!adat && !kategori)}>
                Semua
              </button>
              {adatChips.length > 0 && (
                <div role="group" aria-label="Saring menurut adat" className="flex shrink-0 gap-2 sm:flex-wrap">
                  {adatChips.map((a) => (
                    <button key={a.key} type="button" aria-pressed={adat === a.key} onClick={() => setAdat(adat === a.key ? "" : a.key)} className={`${chipClass(adat === a.key)} ${a.photo ? "pl-1.5" : ""}`}>
                      {a.photo && (
                        <span className="relative h-8 w-8 overflow-hidden rounded-full bg-dc-paper-3">
                          <Image src={a.photo} alt="" fill sizes="32px" className="object-cover object-[50%_15%]" />
                        </span>
                      )}
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
              {catChips.length > 0 && (
                <div role="group" aria-label="Saring menurut kategori vendor" className="flex shrink-0 gap-2 sm:flex-wrap sm:border-l sm:border-dc-line-strong sm:pl-2">
                  {catChips.map((c) => (
                    <button key={c.value} type="button" aria-pressed={kategori === c.value} onClick={() => setKategori(kategori === c.value ? "" : c.value)} className={chipClass(kategori === c.value)}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3 lg:w-72 lg:flex-col lg:items-stretch lg:gap-1">
              <label htmlFor="cari-inspirasi" className="sr-only">
                Cari inspirasi
              </label>
              <div className="relative flex-1 lg:flex-none">
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dc-text-3">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <input
                  id="cari-inspirasi"
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari: siger, pelaminan, kebaya"
                  className="min-h-11 w-full rounded-full border border-dc-line-strong bg-dc-white pl-10 pr-4 text-sm text-dc-black placeholder:text-dc-text-3 focus:border-dc-gold focus:shadow-[0_0_0_4px_rgba(184,146,74,0.18)] focus:outline-none"
                />
              </div>
              <p className="shrink-0 text-sm text-dc-text-3 lg:pl-4" aria-live="polite">
                {shown.length} foto
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="dc-container pt-8">
        {loading && (
          <div role="status" aria-label="Memuat inspirasi" className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((c) => (
              <div key={c} className={`flex flex-col gap-3 sm:gap-5 ${c >= 2 ? "hidden md:flex" : ""} ${c === 3 ? "md:hidden xl:flex" : ""}`}>
                {[[78, 52], [55, 90], [96, 60]][c % 3].map((h, i) => (
                  <div key={i} style={{ height: `${h * 3.2}px` }} className="dc-skeleton rounded-xl" />
                ))}
              </div>
            ))}
            <span className="sr-only">Memuat inspirasi</span>
          </div>
        )}

        {!loading && error && <ErrorState title="Galeri belum bisa dimuat" body={error} onRetry={retry} />}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            title="Belum ada inspirasi"
            body="Kurasi foto sedang disiapkan. Sambil menunggu, lihat papan Pinterest kami langsung."
            action={
              <a href={PINTEREST_BOARD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-dc-ink px-5 text-sm font-semibold text-dc-on-dark hover:bg-dc-ink-2">
                Buka papan Pinterest
              </a>
            }
          />
        )}

        {!loading && !error && items.length > 0 && shown.length === 0 && (
          <EmptyState
            title="Belum ada foto yang cocok"
            body={q ? `Tidak ada foto untuk "${q}" dengan saringan ini. Coba kata seperti siger, pelaminan, atau kebaya, atau hapus saringan.` : "Coba pilih adat atau kategori lain."}
            action={
              <Button variant="primary" size="sm" onClick={clear}>
                Hapus saringan
              </Button>
            }
          />
        )}

        {!loading && !error && shown.length > 0 && (
          <div className="flex items-start gap-3 sm:gap-5">
            {columns.map((col, c) => (
              <div key={c} className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-5">
                {col.map(({ item, i }) => (
                  <motion.div
                    key={item.id}
                    layout={!reduced}
                    variants={motionSafe(reduced, arrive(i))}
                    initial="hidden"
                    animate="visible"
                  >
                    <PinterestImageCard
                      imageUrl={item.url}
                      pinUrl={item.source_url || PINTEREST_BOARD_URL}
                      alt={item.alt_text || item.caption || "Inspirasi pernikahan"}
                      caption={item.caption || undefined}
                      tags={adatOf(item).map((k) => ADAT.find((a) => a.key === k)!.label)}
                      layoutId={reduced ? undefined : `insp-${item.id}`}
                      onOpen={() => {
                        setOpenedId(item.id);
                        setOpen(i);
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <p className="mt-14 text-center text-sm text-dc-text-2">
            {filtered ? "Ingin lihat semuanya? " : "Ada lebih banyak di "}
            {filtered ? (
              <button type="button" onClick={clear} className="inline-flex min-h-11 items-center font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
                Tampilkan semua foto
              </button>
            ) : (
              <a href={PINTEREST_BOARD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-dc-clay underline underline-offset-4 hover:text-dc-ink">
                papan Pinterest DuaCincin
              </a>
            )}
          </p>
        )}
      </div>

      <AnimatePresence>
        {open !== null && shown[open] && <Lightbox items={shown} index={open} sharedId={openedId} onClose={close} onMove={move} />}
      </AnimatePresence>
    </section>
  );
}
