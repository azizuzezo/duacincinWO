"use client";

// The page's first thing: what a couple does on a marketplace, search. One
// segmented bar (what / category / city / budget) that sends to the directory
// with the same URL parameters the directory already reads (q, category,
// kota, budget). City options come from the vendors that really exist.
// Under it, popular categories as quick links.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useDirectory } from "@/components/landing/useHomeData";
import { BUDGETS } from "@/components/vendor/directory/filters";
import { categoryThumb } from "@/components/vendor/directory/categoryArt";
import { VENDOR_CATEGORIES, vendorCities } from "@/lib/api";

const SEG = "flex min-w-0 flex-1 flex-col justify-center px-5 py-2.5 text-left";
const LABEL = "text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-wd-muted";
const CONTROL = "mt-0.5 w-full min-w-0 truncate bg-transparent text-[0.97rem] font-medium text-wd-ink outline-none placeholder:font-normal placeholder:text-wd-muted";

export function SearchHub() {
  const router = useRouter();
  const directory = useDirectory();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [kota, setKota] = useState("");
  const [budget, setBudget] = useState("");

  const cities = useMemo(() => {
    if (directory.status !== "ready") return [];
    return [...new Set((directory.data ?? []).flatMap((c) => vendorCities(c)))].sort((a, b) => a.localeCompare(b, "id"));
  }, [directory]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (category) p.set("category", category);
    if (kota) p.set("kota", kota);
    if (budget) p.set("budget", budget);
    router.push(`/vendors${p.size ? `?${p}` : ""}`);
  }

  return (
    <section aria-label="Cari vendor" className="bg-white pt-6 sm:pt-8">
      <div className="wd-container">
        <p className="wd-display text-center text-[clamp(1.5rem,3vw,2.3rem)] leading-tight">
          Mau cari apa untuk <em>hari bahagiamu?</em>
        </p>
        <form
          role="search"
          onSubmit={submit}
          className="mx-auto mt-5 flex max-w-[980px] flex-col divide-y divide-wd-line rounded-[28px] bg-white p-1.5 shadow-wd-pop ring-1 ring-wd-line lg:flex-row lg:items-stretch lg:divide-x lg:divide-y-0 lg:rounded-full"
        >
          <label className={`${SEG} lg:flex-[1.5]`}>
            <span className={LABEL}>Cari</span>
            <input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama vendor atau kata kunci" autoComplete="off" className={CONTROL} />
          </label>
          <label className={SEG}>
            <span className={LABEL}>Kategori</span>
            <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className={CONTROL}>
              <option value="">Semua kategori</option>
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className={SEG}>
            <span className={LABEL}>Kota</span>
            <select name="kota" value={kota} onChange={(e) => setKota(e.target.value)} className={CONTROL}>
              <option value="">Semua kota</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className={SEG}>
            <span className={LABEL}>Budget</span>
            <select name="budget" value={budget} onChange={(e) => setBudget(e.target.value)} className={CONTROL}>
              {BUDGETS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.short}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="m-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-wd-accent px-8 text-[0.98rem] font-semibold text-wd-ink transition-[background-color,transform] hover:bg-wd-accent-deep active:scale-[0.98] lg:min-h-14"
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4-4" />
            </svg>
            Cari vendor
          </button>
        </form>

        <ul className="wd-rail mx-auto mt-4 flex w-fit max-w-full gap-2 overflow-x-auto pb-1">
          {VENDOR_CATEGORIES.slice(0, 8).map((c) => {
            const thumb = categoryThumb(c.value);
            return (
              <li key={c.value} className="shrink-0">
                <Link
                  href={`/vendors?category=${c.value}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-wd-line bg-white py-1 pl-1 pr-4 text-[0.88rem] text-wd-ink transition-[border-color,background-color] hover:border-wd-accent hover:bg-wd-accent-wash"
                >
                  {thumb && (
                    // eslint-disable-next-line @next/next/no-img-element -- 28px thumbnail
                    <img src={thumb} alt="" width={28} height={28} loading="lazy" className="h-7 w-7 rounded-full object-cover" />
                  )}
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
