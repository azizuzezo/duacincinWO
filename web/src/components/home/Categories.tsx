"use client";

// Every vendor category as a round photo on a soft gold band (the
// "vendor directories" strip of the big marketplaces), one swipeable /
// draggable row. The vendor count under a name appears only once the real
// directory has loaded and the category has vendors; nothing is invented.
import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef } from "react";

import { useDirectory } from "@/components/landing/useHomeData";
import { CATEGORY_ART } from "@/components/vendor/directory/categoryArt";
import { VENDOR_CATEGORIES, vendorCategoryList } from "@/lib/api";

import { RailArrows } from "./RailArrows";
import { SectionHead } from "./ui";
import { useDragScroll } from "./useDragScroll";

export function Categories() {
  const directory = useDirectory();
  const rail = useRef<HTMLUListElement>(null);
  useDragScroll(rail);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    if (directory.status === "ready") for (const c of directory.data ?? []) for (const k of vendorCategoryList(c)) m[k] = (m[k] ?? 0) + 1;
    return m;
  }, [directory]);

  return (
    <section aria-labelledby="kategori-judul" className="bg-white py-8 sm:py-10">
      <div className="wd-container">
        <div className="rounded-[28px] bg-[linear-gradient(120deg,#fbf7ef_0%,#f5ecd9_60%,#efe2c6_100%)] px-5 py-7 sm:px-8 sm:py-8">
          <SectionHead
            id="kategori-judul"
            title="Cari berdasarkan kategori"
            action={
              <div className="hidden lg:block">
                <RailArrows rail={rail} label="Kategori" />
              </div>
            }
          />
          <ul ref={rail} className="wd-rail -mx-1 mt-6 flex gap-4 overflow-x-auto px-1 pb-1 sm:gap-6">
            {VENDOR_CATEGORIES.map((c) => {
              const art = CATEGORY_ART[c.value];
              const n = counts[c.value];
              return (
                <li key={c.value} className="w-[88px] shrink-0 sm:w-[104px]">
                  <Link href={`/kategori/${c.value}`} className="group flex flex-col items-center rounded-2xl pt-1 text-center">
                    <span className="relative block aspect-square w-full rounded-full bg-white p-1 shadow-wd-card transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:shadow-wd-lift motion-safe:group-hover:-translate-y-1">
                      <span className="relative block h-full w-full overflow-hidden rounded-full bg-wd-blush ring-2 ring-transparent transition-[box-shadow] duration-300 group-hover:ring-wd-accent">
                        {art && (
                          <Image
                            src={art.src.replace(/\.webp$/, "-sm.webp")}
                            alt=""
                            fill
                            sizes="104px"
                            draggable={false}
                            className="object-cover transition-transform duration-700 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                          />
                        )}
                      </span>
                    </span>
                    <span className="mt-2.5 text-[0.84rem] font-semibold leading-tight text-wd-ink underline-offset-4 group-hover:underline">{c.label}</span>
                    <span className="mt-0.5 h-4 text-[0.75rem] text-wd-text">{n ? `${n} vendor` : ""}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
