"use client";

// "Toko saya": the vendor's own storefront as couples see it in the
// marketplace. A real cover photo (their first portfolio picture, else the
// category's licensed photo), the name, the real rating and review count,
// and the two things they do most: preview the public page, edit the shop.
import Image from "next/image";
import Link from "next/link";

import { artFor } from "@/components/vendor/directory/categoryArt";
import { categoryLabel, type VendorProfile } from "@/lib/api";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wd-ink";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="m12 3 2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3 1.2-6.2L3 9.5l6.3-.8L12 3Z" />
    </svg>
  );
}

export function Storefront({ profile, userId }: { profile: VendorProfile; userId: string }) {
  const art = artFor(profile.category);
  const own = profile.portfolio?.[0];
  const cover = own?.url ?? art.src;
  const rating = Math.round(profile.average_rating * 10) / 10;
  const approved = profile.status === "approved";
  const statusLabel = approved ? "Tampil di direktori" : profile.status === "rejected" ? "Perlu diperbaiki" : "Menunggu persetujuan";

  return (
    <section aria-label="Tokomu" className="relative isolate overflow-hidden rounded-[28px] bg-wd-ink text-white">
      <Image src={cover} alt={own?.alt_text || art.alt} fill priority unoptimized={!!own} sizes="(min-width: 1200px) 1140px, 100vw" className="-z-20 object-cover" style={{ objectPosition: own ? "50% 40%" : art.focus ?? "50% 35%" }} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-wd-ink/95 via-wd-ink/75 to-wd-ink/25" />
      <div className="flex min-h-[260px] flex-col justify-end gap-5 p-6 pt-24 sm:min-h-[300px] sm:p-9 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[0.8rem] font-semibold">
            <span className="rounded-full bg-white px-3 py-1 text-wd-ink">{categoryLabel(profile.category)}</span>
            <span className={`rounded-full px-3 py-1 ${approved ? "bg-wd-accent text-wd-ink" : "bg-white/90 text-wd-ink"}`}>{statusLabel}</span>
          </div>
          <h1 className="wd-display mt-3 break-words text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.04] !text-white">{profile.business_name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.95rem] text-white">
            {profile.review_count > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex gap-0.5 text-wd-accent" aria-hidden>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} filled={rating >= n - 0.25} />
                  ))}
                </span>
                <span className="font-semibold tabular-nums">{rating.toLocaleString("id-ID")}</span>
                <span>({profile.review_count} ulasan)</span>
              </span>
            ) : (
              <span>Belum ada ulasan</span>
            )}
            {profile.city && <span>{profile.city}</span>}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2.5">
          {approved && (
            <Link href={`/vendors/${userId}`} className={`inline-flex min-h-11 items-center rounded-full bg-white px-5 text-[0.92rem] font-semibold text-wd-ink transition-colors hover:bg-wd-blush ${FOCUS}`}>
              Lihat halaman publik
            </Link>
          )}
          <Link href="/vendor/profile" className={`inline-flex min-h-11 items-center rounded-full border border-white/60 px-5 text-[0.92rem] font-semibold text-white transition-colors hover:bg-white/15 ${FOCUS}`}>
            Edit etalase
          </Link>
        </div>
      </div>
    </section>
  );
}
