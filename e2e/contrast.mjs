// WCAG 2.x text contrast audit on the real, rendered pages. Run after e2e/api.mjs
// (it needs the seeded data and users), via e2e/run.sh or on its own.
//
// How it measures: for every visible text node it reads the computed text colour
// (alpha and ancestor opacity included), then takes the REAL pixels behind the text
// from a screenshot rendered with all text made transparent. That handles solid
// backgrounds, photos, veils and gradients alike, which a CSS-only walk cannot.
// The ratio used is the 5th percentile across the pixels behind the text, so a
// bright patch of a photo is not averaged away.
//
// Not covered: hover/focus/disabled states, non-text contrast (borders, icons, focus
// rings), text inside canvas/SVG images, and pages behind states that need input.
import { execSync } from "node:child_process";
import { inflateSync } from "node:zlib";

import { WEB, email, session } from "./lib/browser.mjs";

const PG = process.env.E2E_PG_CONTAINER ?? "dc-e2e-pg";
const REPORT_ONLY = process.env.E2E_CONTRAST_REPORT_ONLY === "1";
const q = (sql) => execSync(`docker exec ${PG} psql -U postgres -d duacincin -tAc "${sql}"`).toString().trim();
const vendorId = q("select user_id from vendor_profiles where status='approved' limit 1");
const bookingId = q("select id from bookings limit 1");

const PAGES = {
  anonymous: ["/", "/vendors", `/vendors/${vendorId}`, "/kategori/venue", "/cara-kerja", "/untuk-vendor", "/bantuan", "/inspirasi", "/login", "/register", "/forgot-password", "/legal/client-tos", "/legal/vendor-agreement", "/halaman-yang-tidak-ada"],
  client: ["/client/dashboard", "/client/bookings", `/client/bookings/${bookingId}`, "/client/budget", "/client/wedding-planner", "/client/wedding-planner/guests", "/client/wedding-planner/rundown", "/client/wedding-planner/seating", "/client/consultation", "/client/messages", "/client/account"],
  vendor: ["/vendor/dashboard", "/vendor/bookings", `/vendor/bookings/${bookingId}`, "/vendor/paket", "/vendor/profile", "/vendor/portfolio", "/vendor/payouts", "/vendor/messages"],
  admin: ["/internal/admin/dashboard", "/internal/admin/vendors", "/internal/admin/vendors/approved", "/internal/admin/vendor-name-changes", "/internal/admin/disputes", "/internal/admin/disbursements", "/internal/admin/inspirasi", "/internal/admin/audit-log", "/internal/consultations"],
};
const LOGIN = { client: email("client"), vendor: email("vendor", 0), admin: email("admin") };
const VIEWPORTS = [[1440, 900], [390, 844]];
const ONLY_PAGES = process.env.E2E_CONTRAST_PAGES?.split(","); // debug: exact paths
const MAX_SHOT_HEIGHT = 15000;

// ---- minimal PNG decoder (8-bit, non-interlaced RGB/RGBA: what Chromium emits) ----
function decodePng(buf) {
  let pos = 8, width = 0, height = 0, colorType = 0, depth = 8;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString("ascii", pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; colorType = data[9]; }
    else if (type === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  if (depth !== 8 || ![2, 6].includes(colorType)) throw new Error(`unsupported PNG (depth ${depth}, type ${colorType})`);
  const bpp = colorType === 6 ? 4 : 3, stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat)), out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], row = y * stride, src = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[row + x - bpp] : 0, b = y > 0 ? out[row - stride + x] : 0, c = x >= bpp && y > 0 ? out[row - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[row + x] = v & 255;
    }
  }
  return { width, height, bpp, data: out };
}

const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

// ---- in-page collector (runs in the browser) ----
const COLLECT = `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const toRGBA = (s) => { cx.clearRect(0,0,1,1); cx.fillStyle = '#000'; cx.fillStyle = s; cx.fillRect(0,0,1,1); const d = cx.getImageData(0,0,1,1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const path = (el) => { const p = []; while (el && el !== document.body && p.length < 4) { p.unshift(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/)[0] : '')); el = el.parentElement; } return p.join('>'); };
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const text = n.nodeValue.replace(/\\s+/g, ' ').trim();
    if (!text) continue;
    const el = n.parentElement;
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TITLE)$/.test(el.tagName)) continue;
    let skip = false, opacity = 1, fx = false, e = el;
    while (e) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') { skip = true; break; }
      // sr-only: positioned 1px box, intentionally invisible, so it has no contrast to measure.
      if (cs.position === 'absolute' && parseFloat(cs.width) <= 1 && parseFloat(cs.height) <= 1) { skip = true; break; }
      // fixed/sticky layers are measured in a separate pass (they overlap content at scroll 0).
      if (cs.position === 'fixed' || cs.position === 'sticky') { fx = true; e.setAttribute('data-dc-fx', '1'); }
      if (e.getAttribute && (e.getAttribute('aria-hidden') === 'true' || e.hasAttribute('disabled'))) { skip = true; break; }
      opacity *= parseFloat(cs.opacity);
      e = e.parentElement;
    }
    if (skip) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el), c = toRGBA(cs.color);
    out.push({ fx, text: text.slice(0, 60), x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, fg: c.slice(0, 3), alpha: c[3] * opacity, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight) || 400, path: path(el) });
  }
  return out;
})()`;
const HIDE_TEXT = `(() => { const s = document.createElement('style'); s.id = '__hide_text'; s.textContent = '*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}::placeholder{color:transparent!important}'; document.head.appendChild(s); return 1; })()`;
const HIDE_FIXED = `(() => { const s = document.createElement('style'); s.id = '__hide_fx'; s.textContent = '[data-dc-fx]{visibility:hidden!important}'; document.head.appendChild(s); return 1; })()`;
const SHOW_ALL = `(() => { document.getElementById('__hide_text')?.remove(); document.getElementById('__hide_fx')?.remove(); return 1; })()`;
const SHOW_TEXT = `(() => { document.getElementById('__hide_text')?.remove(); return 1; })()`;

async function auditPage(s, url, label) {
  const dims = await s.ev(`(async () => {
    // Walk the page once so scroll-triggered reveals have fired, then return to the top.
    for (let y = 0, guard = 0; y < document.documentElement.scrollHeight && guard++ < 60; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
    scrollTo(0, 0); await new Promise(r => setTimeout(r, 600));
    // Never wait forever on one image; and let every running CSS transition/animation finish,
    // otherwise colours are read mid-transition (e.g. the navbar fading between states).
    // Contrast is judged on the final, revealed state. The scroll walk usually triggers every
    // reveal; force any stragglers (headless can drop IntersectionObserver frames).
    document.querySelectorAll('.dc-reveal[data-reveal="hidden"]').forEach(e => { e.dataset.reveal = 'shown'; });
    await new Promise(r => setTimeout(r, 700));
    const within = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
    await within(Promise.all([...document.images].map(i => i.decode().catch(() => {}))), 4000);
    await within(Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))), 4000);
    await new Promise(r => setTimeout(r, 300));
    return [document.documentElement.scrollWidth, document.documentElement.scrollHeight];
  })()`);
  const items = await s.ev(COLLECT);
  const height = Math.min(dims[1], MAX_SHOT_HEIGHT);
  const failures = [], seen = new Set(); let checked = 0;

  async function measure(group, hideFixed) {
    if (!group.length) return;
    await s.ev(HIDE_TEXT); if (hideFixed) await s.ev(HIDE_FIXED); await s.sleep(250);
    const shot = await s.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: dims[0], height, scale: 1 } });
    await s.ev(SHOW_ALL);
    const img = decodePng(Buffer.from(shot.result.data, "base64"));
    for (const it of group) {
      const x0 = Math.max(0, Math.floor(it.x)), y0 = Math.max(0, Math.floor(it.y)), x1 = Math.min(img.width, Math.ceil(it.x + it.w)), y1 = Math.min(img.height, Math.ceil(it.y + it.h));
      if (x1 <= x0 || y1 <= y0) continue;
      const ratios = [], stepX = Math.max(1, Math.floor((x1 - x0) / 24)), stepY = Math.max(1, Math.floor((y1 - y0) / 6));
      let bg = null;
      for (let y = y0; y < y1; y += stepY) for (let x = x0; x < x1; x += stepX) {
        const i = (y * img.width + x) * img.bpp, px = [img.data[i], img.data[i + 1], img.data[i + 2]];
        const eff = it.fg.map((c, k) => it.alpha * c + (1 - it.alpha) * px[k]);
        const r = ratio(lum(...eff), lum(...px));
        ratios.push(r); if (!bg || r < bg.r) bg = { r, px };
      }
      if (!ratios.length) continue;
      ratios.sort((a, b) => a - b);
      const p5 = ratios[Math.floor(ratios.length * 0.05)], large = it.size >= 24 || (it.size >= 18.66 && it.weight >= 700), need = large ? 3 : 4.5;
      checked++;
      if (p5 + 0.005 < need) {
        const key = `${it.text}|${it.fg}|${it.path}`;
        if (seen.has(key)) continue; seen.add(key);
        failures.push({ label, text: it.text, ratio: +p5.toFixed(2), need, size: Math.round(it.size), weight: it.weight, fg: `rgb(${it.fg.map(Math.round)})${it.alpha < 1 ? `@${it.alpha.toFixed(2)}` : ""}`, bg: `rgb(${bg.px})`, path: it.path });
      }
    }
  }
  // Pass 1: normal content with fixed/sticky layers hidden. Pass 2: the fixed/sticky layers themselves, as laid out at scroll 0.
  await measure(items.filter((i) => !i.fx), true);
  await measure(items.filter((i) => i.fx), false);
  return { checked, failures, truncated: dims[1] > MAX_SHOT_HEIGHT };
}

const PAGE_TIMEOUT_MS = 60_000;
const withTimeout = (promise, label) =>
  Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${PAGE_TIMEOUT_MS / 1000}s: ${label}`)), PAGE_TIMEOUT_MS))]);

async function runRole(role, paths) {
  const s = await session();
  if (role !== "anonymous") await s.login(LOGIN[role]);
  const res = [];
  for (const [w, h] of VIEWPORTS) {
    for (const p of paths.filter((x) => !ONLY_PAGES || ONLY_PAGES.includes(x))) {
      try {
        await withTimeout(s.go(`${WEB}${p}`, w, h), `buka ${p}`);
        res.push({ page: p, vp: `${w}`, ...(await withTimeout(auditPage(s, p, `${p} @${w}`), `audit ${p}`)) });
        if (process.env.E2E_CONTRAST_VERBOSE) console.error(`[${role}] ${p} @${w} selesai`);
      } catch (e) {
        // A page that cannot be audited is reported, never silently skipped.
        res.push({ page: p, vp: `${w}`, checked: 0, failures: [], error: e.message });
        console.error(`[${role}] ${p} @${w} GAGAL DIAUDIT: ${e.message}`);
      }
    }
  }
  s.close();
  return res;
}

const started = Date.now();
const ONLY = process.env.E2E_CONTRAST_ROLES?.split(",");
const results = (await Promise.all(Object.entries(PAGES).filter(([role]) => !ONLY || ONLY.includes(role)).map(([role, paths]) => runRole(role, paths)))).flat();
const failures = results.flatMap((r) => r.failures);
const checked = results.reduce((n, r) => n + r.checked, 0);

// group the same defect across pages/viewports: one line per (text colour, size, background colour)
const groups = new Map();
for (const f of failures) {
  const k = `${f.fg}|${f.bg}|${f.size}|${f.weight}`;
  const g = groups.get(k) ?? { ...f, pages: new Set(), samples: new Set(), worst: f.ratio };
  g.pages.add(f.label); if (g.samples.size < 3) g.samples.add(`"${f.text}"`); g.worst = Math.min(g.worst, f.ratio);
  groups.set(k, g);
}
const sorted = [...groups.values()].sort((a, b) => a.worst - b.worst);
console.log(`Kontras: ${results.length} halaman x viewport, ${checked} teks diperiksa, ${failures.length} pelanggaran dalam ${sorted.length} kelompok (${Math.round((Date.now() - started) / 1000)} dtk)`);
for (const g of sorted) {
  console.log(`\nFAIL  ${g.worst}:1 (perlu ${g.need}:1)  ${g.size}px/${g.weight}  teks ${g.fg} di atas ${g.bg}`);
  console.log(`      contoh: ${[...g.samples].join(", ")}`);
  console.log(`      elemen: ${g.path}`);
  console.log(`      di ${g.pages.size} halaman: ${[...g.pages].slice(0, 4).join("; ")}${g.pages.size > 4 ? "; ..." : ""}`);
}
const errored = results.filter((r) => r.error);
if (errored.length) console.log(`\nPERINGATAN: ${errored.length} halaman tidak bisa diaudit: ${errored.map((r) => `${r.page}@${r.vp} (${r.error})`).join("; ")}`);
const trunc = results.filter((r) => r.truncated).map((r) => `${r.page}@${r.vp}`);
if (trunc.length) console.log(`\nCatatan: halaman lebih tinggi dari ${MAX_SHOT_HEIGHT}px hanya diperiksa sebagian: ${trunc.join(", ")}`);
console.log(sorted.length ? "\nKONTRAS: ADA PELANGGARAN" : "\nKONTRAS: LULUS");
process.exit((sorted.length || errored.length) && !REPORT_ONLY ? 1 : 0);
