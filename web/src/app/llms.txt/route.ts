import { allArticles } from "@/lib/articles";
import { VENDOR_CATEGORIES } from "@/lib/api";
import { COMPANY } from "@/lib/company";
import { SITE_URL as SITE } from "@/lib/site";

// /llms.txt (llmstxt.org): a plain map of the site for AI assistants and
// answer engines. Built from the same lists as the sitemap so it never drifts.
export const revalidate = 86400;

export async function GET() {
  const ARTICLES = await allArticles();
  const lines = [
    "# DuaCincin",
    "",
    `> Marketplace vendor pernikahan di Indonesia: direktori vendor terverifikasi per kategori dan kota, chat dan booking langsung dengan vendor, serta Dana Aman (escrow) yang ditahan DuaCincin sampai acara selesai. Dikelola ${COMPANY.name}.`,
    "",
    "## Mulai di sini",
    `- [Direktori vendor](${SITE}/vendors): semua vendor terverifikasi, bisa disaring per kategori, kota, dan budget`,
    `- [Cara kerja Dana Aman (escrow)](${SITE}/cara-kerja): tahap pemesanan dan di mana uang calon pengantin berada di setiap tahap`,
    `- [Kirana, asisten AI pernikahan](${SITE}/kirana): tanya budget, vendor terdaftar di kotamu, dan urutan persiapan`,
    `- [Bantuan](${SITE}/bantuan): pertanyaan umum soal pembayaran, booking, sengketa, dan akun vendor`,
    `- [Untuk vendor](${SITE}/untuk-vendor): cara vendor pernikahan bergabung`,
    `- [Tentang kami](${SITE}/tentang-kami): pendiri dan data perusahaan`,
    "",
    "## Kategori vendor",
    ...VENDOR_CATEGORIES.map((c) => `- [Vendor ${c.label}](${SITE}/kategori/${c.value})`),
    "",
    "## Artikel persiapan pernikahan",
    ...ARTICLES.map((a) => `- [${a.title}](${SITE}/artikel/${a.slug}): ${a.description}`),
    "",
    "## Legal",
    `- [Ketentuan layanan client](${SITE}/legal/client-tos)`,
    `- [Perjanjian kemitraan vendor](${SITE}/legal/vendor-agreement)`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
