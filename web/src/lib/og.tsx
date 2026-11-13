/* eslint-disable @next/next/no-img-element -- Satori (next/og) only draws plain <img>. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import sharp from "sharp";

import { API_URL, SITE_URL } from "@/lib/site";

// Share previews (WhatsApp, Instagram DM, X, Facebook, LinkedIn) for the WO site.
// One composition everywhere: an ink card, the gold swan + rings logo as drawn
// (never recoloured), Cormorant Garamond for names and titles, one Great Vibes
// accent, and a real photo inside the arched frame the site uses as its motif.
// Satori renders PNG; we re-encode to JPEG so a photo card stays well under the
// ~300 KB WhatsApp skips, and decode WebP (which Satori cannot read) with sharp.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/jpeg";

const INK = "#15110d";
const INK_2 = "#241d17";
const IVORY = "#fbf6ec";
const GOLD = "#b8924a";
const GOLD_ANTIQUE = "#dcbb76";

// Arched photo frame, right side. It rises from the bottom edge like a doorway.
const ARCH = { width: 456, height: 560, right: 76 };

/** A photo for the arch. `focusX` (0..1) centres a known site photo on the
 * couple; without it (vendor uploads) sharp picks the most salient region. */
export type ArchPhoto = { src: string; focusX?: number };

/** Default photo: Melayu Deli couple at Istana Maimun (credited on /kredit). */
export const DEFAULT_PHOTO: ArchPhoto = { src: "/photos/pinterest/pelaminan-kristal.webp", focusX: 0.5 };

// ---------------------------------------------------------------- fonts

type Font = { name: string; data: ArrayBuffer; weight: 400 | 500 | 600; style: "normal" | "italic" };

const FONT_SPECS = [
  { name: "Cormorant", family: "Cormorant+Garamond", weight: 600, style: "normal" },
  { name: "Cormorant", family: "Cormorant+Garamond", weight: 500, style: "normal" },
  { name: "Great Vibes", family: "Great+Vibes", weight: 400, style: "normal" },
  { name: "Jakarta", family: "Plus+Jakarta+Sans", weight: 500, style: "normal" },
  { name: "Jakarta", family: "Plus+Jakarta+Sans", weight: 600, style: "normal" },
] as const;

/** Same faces as the site (next/font in app/layout.tsx), subset from Google
 * Fonts to the glyphs on the card. A failed fetch drops that face; Satori then
 * falls back to its built-in sans, so the image still renders. */
async function loadFonts(text: string): Promise<Font[]> {
  const glyphs = encodeURIComponent(Array.from(new Set(text + "duacincin.id DuaCincin")).join(""));
  const results = await Promise.all(
    FONT_SPECS.map(async (spec): Promise<Font | null> => {
      try {
        const css = await fetch(
          `https://fonts.googleapis.com/css2?family=${spec.family}:wght@${spec.weight}&text=${glyphs}`,
          { signal: AbortSignal.timeout(4000), cache: "force-cache" },
        ).then((r) => (r.ok ? r.text() : ""));
        const url = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/)?.[1];
        if (!url) return null;
        const res = await fetch(url, { signal: AbortSignal.timeout(4000), cache: "force-cache" });
        if (!res.ok) return null;
        return { name: spec.name, data: await res.arrayBuffer(), weight: spec.weight, style: spec.style };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((f): f is Font => f !== null);
}

// ---------------------------------------------------------------- images

const PUBLIC_DIR = join(process.cwd(), "public");

async function readPublic(path: string): Promise<Buffer | null> {
  // Only files under public/photos or public/brand, never ".." tricks.
  if (!/^\/(photos|brand)\/[\w\-/]+\.(webp|jpe?g|png)$/.test(path) || path.includes("..")) return null;
  try {
    return await readFile(join(PUBLIC_DIR, path));
  } catch {
    return null;
  }
}

const MAX_REMOTE_BYTES = 12 * 1024 * 1024;

function allowedRemote(raw: string): URL | null {
  try {
    const url = new URL(raw);
    const hosts = [new URL(SITE_URL).hostname, new URL(API_URL).hostname];
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && process.env.NODE_ENV !== "production")) return null;
    if (url.hostname.endsWith(".supabase.co") || hosts.includes(url.hostname) || local) return url;
    return null;
  } catch {
    return null;
  }
}

/** Photo bytes from public/ ("/photos/...") or a vendor upload (https, our
 * storage hosts only), with a timeout and a size cap. Null on any failure. */
async function loadPhoto(src: string): Promise<Buffer | null> {
  if (src.startsWith("/")) return readPublic(src);
  const url = allowedRemote(src);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } });
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) return null;
    if (Number(res.headers.get("content-length") ?? 0) > MAX_REMOTE_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.byteLength > MAX_REMOTE_BYTES ? null : buf;
  } catch {
    return null;
  }
}

/** Crop to the arch at 1x (the card is drawn at 1200x630), as a JPEG data URI. */
async function archPhoto({ src, focusX }: ArchPhoto): Promise<string | null> {
  const input = await loadPhoto(src);
  if (!input) return null;
  try {
    const base = sharp(input).rotate().flatten({ background: INK_2 });
    let img: ReturnType<typeof sharp>;
    if (focusX === undefined) {
      img = base.resize(ARCH.width, ARCH.height, { fit: "cover", position: sharp.strategy.attention });
    } else {
      const { width = 0, height = 0 } = await sharp(input).rotate().metadata();
      const scale = Math.max(ARCH.width / width, ARCH.height / height);
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      const left = Math.min(Math.max(Math.round(focusX * w - ARCH.width / 2), 0), w - ARCH.width);
      const top = Math.round((h - ARCH.height) / 2);
      const resized = await base.resize(w, h).toBuffer();
      img = sharp(resized).extract({ left, top, width: ARCH.width, height: ARCH.height });
    }
    const out = await img.jpeg({ quality: 88 }).toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

let logoPromise: Promise<string | null> | null = null;
/** The WO logo exactly as supplied, only converted WebP -> PNG for Satori. */
function logo(): Promise<string | null> {
  logoPromise ??= (async () => {
    const input = await readPublic("/brand/duacincin-logo.webp");
    if (!input) return null;
    const png = await sharp(input).resize(240, 240).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  })().catch(() => null);
  return logoPromise;
}

// ---------------------------------------------------------------- card

export type CardContent =
  | { kind: "brand" }
  | { kind: "page"; title: string; line?: string }
  | { kind: "vendor"; name: string; where: string };

type CardProps = { content: CardContent; photo: string | null; logoSrc: string | null };

function Arch({ photo, logoSrc }: { photo: string | null; logoSrc: string | null }) {
  const r = ARCH.width / 2;
  return (
    <div style={{ position: "absolute", right: ARCH.right, bottom: 0, width: ARCH.width, height: ARCH.height, display: "flex" }}>
      {/* Gold hairline arch, offset outside the photo like the site's GoldArch. */}
      <div
        style={{
          position: "absolute",
          left: -14,
          top: -14,
          width: ARCH.width + 28,
          height: ARCH.height + 14,
          borderTopLeftRadius: r + 14,
          borderTopRightRadius: r + 14,
          border: `1.5px solid ${GOLD}`,
          borderBottom: "none",
          display: "flex",
        }}
      />
      <div
        style={{
          width: ARCH.width,
          height: ARCH.height,
          borderTopLeftRadius: r,
          borderTopRightRadius: r,
          overflow: "hidden",
          background: INK_2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {photo ? (
          <img src={photo} alt="" width={ARCH.width} height={ARCH.height} />
        ) : logoSrc ? (
          // No vendor photo yet: the logo, never a stand-in photo of someone else's work.
          <img src={logoSrc} alt="" width={200} height={200} />
        ) : null}
      </div>
    </div>
  );
}

function Masthead({ logoSrc, large }: { logoSrc: string | null; large: boolean }) {
  const size = large ? 104 : 64;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: large ? 22 : 16 }}>
      {logoSrc ? <img src={logoSrc} alt="" width={size} height={size} /> : null}
      <div
        style={{
          fontFamily: "Cormorant",
          fontWeight: 600,
          fontSize: large ? 92 : 40,
          lineHeight: 1,
          letterSpacing: large ? -1.5 : -0.4,
          color: large ? IVORY : GOLD_ANTIQUE,
          display: "flex",
        }}
      >
        DuaCincin
      </div>
    </div>
  );
}

const Hairline = () => <div style={{ width: 72, height: 1.5, background: GOLD, display: "flex" }} />;

function Card({ content, photo, logoSrc }: CardProps) {
  const body = { fontFamily: "Jakarta", fontWeight: 500, fontSize: 23, lineHeight: 1.5, color: "rgba(251,246,236,0.78)" };
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: INK, color: IVORY }}>
      {/* Warm light from the photo side, so the ink is not a flat slab. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: "radial-gradient(circle at 78% 70%, rgba(184,146,74,0.22), rgba(21,17,13,0) 58%)",
          display: "flex",
        }}
      />
      {/* Inset gold hairline frame. */}
      <div style={{ position: "absolute", top: 22, left: 22, right: 22, bottom: 22, border: "1px solid rgba(220,187,118,0.34)", display: "flex" }} />

      <Arch photo={photo} logoSrc={logoSrc} />

      <div
        style={{
          position: "absolute",
          left: 84,
          top: 0,
          bottom: 0,
          width: 540,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {content.kind === "brand" ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Masthead logoSrc={logoSrc} large />
            <div style={{ marginTop: 34, marginBottom: 30, display: "flex" }}>
              <Hairline />
            </div>
            <div style={{ fontFamily: "Cormorant", fontWeight: 500, fontSize: 44, lineHeight: 1.12, display: "flex" }}>
              Hari bahagia kalian, disiapkan
            </div>
            <div style={{ fontFamily: "Great Vibes", fontSize: 64, lineHeight: 1.15, color: GOLD_ANTIQUE, display: "flex" }}>
              tanpa was-was.
            </div>
            <div style={{ ...body, fontSize: 22, marginTop: 22, maxWidth: 548, display: "flex" }}>
              Vendor terverifikasi, booking lewat chat, pembayaran ditahan escrow sampai acara selesai.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Masthead logoSrc={logoSrc} large={false} />
            <div
              style={{
                marginTop: 40,
                fontFamily: "Cormorant",
                fontWeight: 600,
                fontSize: titleSize(content.kind === "page" ? content.title : content.name),
                lineHeight: 1.04,
                letterSpacing: -1,
                color: IVORY,
                display: "flex",
              }}
            >
              {content.kind === "page" ? content.title : content.name}
            </div>
            <div style={{ marginTop: 28, marginBottom: 24, display: "flex" }}>
              <Hairline />
            </div>
            {content.kind === "vendor" ? (
              <div style={{ fontFamily: "Jakarta", fontWeight: 600, fontSize: 26, color: GOLD_ANTIQUE, display: "flex" }}>
                {content.where}
              </div>
            ) : null}
            {content.kind === "page" && content.line ? (
              <div style={{ ...body, maxWidth: 520, display: "flex" }}>{content.line}</div>
            ) : null}
            {content.kind === "vendor" ? (
              <div style={{ ...body, marginTop: 10, display: "flex" }}>Portofolio, paket, dan booking di DuaCincin.</div>
            ) : null}
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: 84,
          bottom: 50,
          fontFamily: "Jakarta",
          fontWeight: 600,
          fontSize: 19,
          color: GOLD_ANTIQUE,
          display: "flex",
        }}
      >
        duacincin.id
      </div>
    </div>
  );
}

/** Long vendor names and page titles step down so they stay within three lines. */
function titleSize(text: string): number {
  if (text.length <= 22) return 76;
  if (text.length <= 40) return 64;
  return 54;
}

function cardText(content: CardContent): string {
  if (content.kind === "brand")
    return "Hari bahagia kalian, disiapkan tanpa was-was. Vendor terverifikasi, booking lewat chat, pembayaran ditahan escrow sampai acara selesai.";
  if (content.kind === "page") return `${content.title} ${content.line ?? ""}`;
  return `${content.name} ${content.where} Portofolio, paket, dan booking di DuaCincin.`;
}

/** Render a share card as a JPEG response (1200x630). */
export async function renderCard(content: CardContent, photoSrc: ArchPhoto | null, init?: ResponseInit): Promise<Response> {
  const [fonts, photo, logoSrc] = await Promise.all([
    loadFonts(cardText(content)),
    photoSrc ? archPhoto(photoSrc) : Promise.resolve(null),
    logo(),
  ]);
  const png = await new ImageResponse(<Card content={content} photo={photo} logoSrc={logoSrc} />, {
    ...OG_SIZE,
    fonts,
  }).arrayBuffer();
  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", OG_CONTENT_TYPE);
  return new Response(new Uint8Array(jpeg), { ...init, headers });
}

/** The default brand card, used by the home page and as every fallback. */
export function renderBrandCard(init?: ResponseInit): Promise<Response> {
  return renderCard({ kind: "brand" }, DEFAULT_PHOTO, init);
}
