import Link from "next/link";

import { wdButton } from "@/components/home/ui";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { artFor } from "@/components/vendor/directory/categoryArt";
import { CategoryResults } from "@/components/vendor/directory/CategoryResults";
import { CategoryStrip, ListingEmpty, ListingHeader, SideLinks, SideSection, TEXT_LINK } from "@/components/vendor/directory/ListingParts";
import { categoryLabel, formatRupiah, VENDOR_CATEGORIES, type DirectoryCard, vendorCities } from "@/lib/api";
import { citySlug } from "@/lib/server-api";
import { SITE_URL as SITE } from "@/lib/site";

/** Server-rendered listing for /kategori/[kategori] and /kategori/[kategori]/[kota]:
 * crawlable HTML for "vendor <kategori> <kota>" searches, Bridestory style.
 * Compact header (breadcrumb, H1, count) and a row of round category photos,
 * then a filter sidebar (categories and cities as links with real counts,
 * budget, sort) beside the card grid, then a short guide below: what to
 * compare, the questions worth asking, and a FAQ answered from this listing. */
export function CategoryListing({
  category,
  cityName,
  cards,
  failed,
}: {
  category: string;
  cityName?: string;
  cards: DirectoryCard[];
  failed: boolean;
}) {
  const label = categoryLabel(category);
  const art = artFor(category);
  const counts = new Map<string, number>();
  for (const c of cards) for (const city of vendorCities(c)) counts.set(city, (counts.get(city) ?? 0) + 1);
  const cities = Array.from(counts.keys()).sort();
  const where = cityName ? ` di ${cityName}` : "";
  const directoryHref = `/vendors?category=${category}`;
  // Breadcrumb structured data mirrors the visible breadcrumb (same names, same
  // links) so search results can show the path. Same site URL as sitemap.ts.
  const crumbs = [
    { name: "Beranda", path: "/" },
    { name: "Vendor", path: "/vendors" },
    { name: label, path: `/kategori/${category}` },
    ...(cityName ? [{ name: cityName, path: `/kategori/${category}/${citySlug(cityName)}` }] : []),
  ];
  const faq = buildFaq({ label, cityName, cards, cities, ask: art.ask, failed });
  const pagePath = crumbs[crumbs.length - 1].path;
  // The listed vendors (ItemList) and the FAQ below, both mirroring what is on the page.
  const listLd =
    !failed && cards.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Vendor ${label}${where}`,
          url: `${SITE}${pagePath}`,
          numberOfItems: cards.length,
          itemListElement: cards.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/vendors/${c.id}`, name: c.business_name })),
        }
      : null;
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE}${c.path}` })),
  };

  const cityLinks: { key: string; href: string; label: string; count?: number }[] = [
    { key: "", href: `/kategori/${category}`, label: "Semua kota" },
    ...cities.map((c) => ({ key: c, href: `/kategori/${category}/${citySlug(c)}`, label: c, count: counts.get(c) })),
  ];

  return (
    <div className="wd flex min-h-screen flex-col bg-white">
      <Navbar />
      <main id="konten" className="flex-1">
        {[breadcrumbLd, listLd, faqLd].filter(Boolean).map((ld, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
        ))}
        <div className="wd-container pb-14">
          <section aria-labelledby="kategori-judul">
            <ListingHeader
              id="kategori-judul"
              crumbs={crumbs.map((c, i) => ({ name: c.name, href: i < crumbs.length - 1 ? c.path : undefined }))}
              title={`Vendor ${label} di ${cityName ?? "Indonesia"}`}
              sub={art.covers}
              image={art.src}
            />
            <div className="mt-5 border-b border-wd-line pb-4">
              <CategoryStrip active={category} hrefFor={(v) => (v ? `/kategori/${v}` : "/vendors")} withAll />
            </div>
          </section>

          <div className="mt-6">
            {failed ? (
              <ListingEmpty
                title="Daftar vendor belum bisa dimuat"
                body="Muat ulang halaman ini sebentar lagi, atau cari langsung di direktori lengkap."
                actions={
                  <Link href={directoryHref} className={wdButton({ size: "sm" })}>
                    Buka direktori {label}
                  </Link>
                }
              />
            ) : cards.length === 0 ? (
              <ListingEmpty
                title={`Belum ada vendor ${label}${where}`}
                body={
                  cityName
                    ? `Belum ada vendor ${label} yang terdaftar di ${cityName}. Lihat vendor ${label} dari kota lain, lalu tanyakan lewat chat apakah mereka bisa datang ke kotamu.`
                    : `Vendor ${label} sedang kami verifikasi. Sementara itu, lihat kategori lain di atas.`
                }
                actions={
                  <Link href={cityName ? `/kategori/${category}` : "/vendors"} className={wdButton({ size: "sm" })}>
                    {cityName ? `Semua vendor ${label}` : "Lihat semua vendor"}
                  </Link>
                }
              />
            ) : (
              <CategoryResults
                cards={cards}
                directoryHref={directoryHref}
                what={`${label}${where}`}
                links={
                  <>
                    <SideSection id="sisi-kategori" title="Kategori">
                      <SideLinks active={category} items={VENDOR_CATEGORIES.map((c) => ({ key: c.value, href: `/kategori/${c.value}`, label: c.label }))} />
                    </SideSection>
                    {cities.length > 0 && (
                      <SideSection id="sisi-kota" title="Kota">
                        <SideLinks active={cityName ?? ""} items={cityLinks} />
                      </SideSection>
                    )}
                  </>
                }
                phoneLinks={
                  cities.length > 0 ? (
                    <nav aria-label="Pilih kota" className="mb-4">
                      <ul className="wd-rail -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                        {cityLinks.map((c) => {
                          const on = c.key === (cityName ?? "");
                          return (
                            <li key={c.key || "semua"} className="shrink-0">
                              <Link
                                href={c.href}
                                aria-current={on ? "page" : undefined}
                                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[0.88rem] transition-colors ${
                                  on ? "border-wd-accent bg-wd-accent font-semibold text-wd-ink" : "border-wd-accent-line text-wd-accent-ink hover:bg-wd-accent-wash"
                                }`}
                              >
                                {c.label}
                                {c.count !== undefined && <span className="tabular-nums text-wd-muted">{c.count}</span>}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </nav>
                  ) : undefined
                }
              />
            )}
          </div>
        </div>

        <section aria-labelledby="panduan-judul" className="border-t border-wd-line bg-wd-paper">
          <div className="wd-container grid gap-10 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-14">
            <div>
              <h2 id="panduan-judul" className="wd-title text-[1.4rem] leading-tight">
                Memilih vendor {label}
                {where}
              </h2>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-wd-text">{art.intro}</p>
              {art.ask.length > 0 && (
                <>
                  <h3 className="mt-6 text-[0.95rem] font-semibold text-wd-ink">Tanyakan sebelum booking</h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {art.ask.map((q) => (
                      <li key={q} className="flex gap-2.5 text-[0.92rem] leading-snug text-wd-text">
                        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0 text-wd-accent-ink">
                          <path d="M4 12.5 9 17.5 20 6.5" />
                        </svg>
                        {q}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="mt-6 text-[0.9rem]">
                <Link href={directoryHref} className={`inline-flex min-h-11 items-center ${TEXT_LINK}`}>
                  Saring dengan kata kunci di direktori
                </Link>
              </p>
            </div>
            <div>
              <h2 id="faq-judul" className="wd-title text-[1.4rem] leading-tight">
                Pertanyaan seputar vendor {label}
              </h2>
              <dl className="mt-2 flex flex-col divide-y divide-wd-line">
                {faq.map((f) => (
                  <div key={f.q} className="py-4">
                    <dt className="text-[0.95rem] font-semibold text-wd-ink">{f.q}</dt>
                    <dd className="mt-1.5 text-[0.92rem] leading-relaxed text-wd-text">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/** Questions a couple searching "vendor <kategori> <kota>" asks, answered
 * from this page's own listing (prices, cities, counts), so every category
 * and city page says something true and specific. */
function buildFaq({
  label,
  cityName,
  cards,
  cities,
  ask,
  failed,
}: {
  label: string;
  cityName?: string;
  cards: DirectoryCard[];
  cities: string[];
  ask: string[];
  failed: boolean;
}): { q: string; a: string }[] {
  const where = cityName ? ` di ${cityName}` : "";
  const priced = cards.map((c) => c.price_min).filter((p) => p > 0).sort((a, b) => a - b);
  const out: { q: string; a: string }[] = [];

  let price: string;
  if (failed) price = `Lihat kisaran harga terbaru di direktori DuaCincin, tiap vendor ${label} mencantumkan harga mulai dari.`;
  else if (priced.length === 0)
    price = cards.length
      ? `Vendor ${label}${where} di DuaCincin membahas harga lewat chat sesuai kebutuhan acaramu, jadi tanyakan paket dan harganya langsung.`
      : `Belum ada vendor ${label}${where} dengan harga tercantum. Lihat vendor ${label} di kota lain sebagai gambaran.`;
  else {
    const median = priced[Math.floor((priced.length - 1) / 2)];
    price =
      priced.length === 1
        ? `Saat ini ada 1 vendor ${label}${where} dengan harga mulai dari ${formatRupiah(priced[0])}.`
        : `Dari ${priced.length} vendor ${label}${where} yang mencantumkan harga di DuaCincin, harga mulai dari ${formatRupiah(priced[0])} sampai ${formatRupiah(priced[priced.length - 1])}, dengan nilai tengah ${formatRupiah(median)}. Harga akhir tergantung paket, jumlah tamu, dan tanggal acara.`;
  }
  out.push({ q: `Berapa harga vendor ${label}${where}?`, a: price });

  if (cityName) {
    out.push({
      q: `Apakah vendor ${label} dari kota lain bisa melayani ${cityName}?`,
      a: `Bisa jadi. Banyak vendor ${label} melayani beberapa kota sekaligus. Buka profil vendor untuk melihat kota layanannya, lalu tanyakan biaya transportasi lewat chat sebelum booking.`,
    });
  } else if (cities.length > 0) {
    const shown = cities.slice(0, 12).join(", ");
    out.push({
      q: `Di kota mana saja ada vendor ${label} di DuaCincin?`,
      a: `Saat ini vendor ${label} di DuaCincin melayani ${shown}${cities.length > 12 ? `, dan ${cities.length - 12} kota lainnya` : ""}. Pilih kota di daftar filter untuk melihat vendornya.`,
    });
  }

  if (ask.length > 0) {
    out.push({
      q: `Apa yang perlu ditanyakan sebelum booking vendor ${label}?`,
      a: `${ask.join(" ")} Simpan jawabannya di chat DuaCincin supaya ada catatan bila nanti ada perbedaan.`,
    });
  }

  out.push({
    q: `Bagaimana cara booking vendor ${label} dengan aman?`,
    a: `Pilih vendor, ngobrol lewat chat DuaCincin, lalu ajukan booking dengan tanggal dan paket yang disepakati. Pembayaranmu ditahan lewat escrow DuaCincin dan baru diteruskan ke vendor setelah acaramu selesai, jadi uangmu tetap aman bila ada masalah.`,
  });
  return out;
}
