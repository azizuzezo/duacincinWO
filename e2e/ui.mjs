// End-to-end UI check against the real stack. Run after e2e/api.mjs: it reads the
// users and data that script created.
import { WEB, email, session, sleep } from "./lib/browser.mjs";

const out = []; let failed = 0; const ok = (n, c, d = "") => { out.push(`${c ? "PASS" : "FAIL"}  ${n}${c ? "" : "  -> " + d}`); if (!c) failed++; };

// anonymous browsing of real data
{
  const s = await session();
  await s.go(`${WEB}/vendors`);
  const dir = await s.ev("document.querySelector('main').innerText");
  ok("directory renders the real vendor from the database", dir.includes("Ballroom Uji") && dir.includes("38.500.000"), dir.slice(0, 200));
  // Ratings use the Indonesian decimal comma ("5,0").
  ok("directory card shows verified rating 5,0 (1 ulasan)", /5,0\s*\(1 ulasan\)/.test(dir), dir.slice(0, 300));
  ok("pending vendor not shown", !dir.includes("Dekor Uji"));
  const vid = await s.ev("document.querySelector('main ul li a')?.getAttribute('href')");
  // SEO: what a crawler gets without running JavaScript.
  {
    const raw = async (path) => { const r = await fetch(WEB + path); return { status: r.status, html: await r.text() }; };
    const has = (html, re) => re.test(html);
    let p = await raw("/vendors");
    ok("SEO: directory HTML has its H1 and the vendor cards without JavaScript", p.status === 200 && has(p.html, /<h1[^>]*>[^]*?Temukan vendor/) && p.html.includes("Ballroom Uji"), p.html.slice(0, 200));
    ok("SEO: directory canonical is /vendors", has(p.html, /<link rel="canonical" href="[^"]*\/vendors"/));
    p = await raw(vid);
    ok("SEO: vendor profile HTML has the vendor name as H1 and its packages", p.status === 200 && has(p.html, /<h1[^>]*>[^<]*Ballroom Uji/) && p.html.includes("Half Day Plus"), p.html.slice(0, 200));
    p = await raw("/vendors/00000000-0000-0000-0000-000000000000");
    ok("SEO: an unknown vendor is a real 404", p.status === 404, String(p.status));
    p = await raw("/kategori/venue/jakarta-selatan");
    ok("SEO: city page has canonical, ItemList and an FAQ answered from real prices", p.status === 200 && has(p.html, /rel="canonical" href="[^"]*\/kategori\/venue\/jakarta-selatan"/) && p.html.includes('"ItemList"') && p.html.includes("Berapa harga vendor Venue di Jakarta Selatan?"), p.html.slice(0, 200));
    p = await raw("/kategori/venue/kota-yang-tidak-ada");
    ok("SEO: a made-up city slug is a 404, not an empty page", p.status === 404, String(p.status));
    p = await raw("/kategori/venue/sumedang");
    ok("SEO: a real city with no vendor yet is noindex", p.status === 200 && has(p.html, /<meta name="robots" content="noindex/), p.html.match(/<meta name="robots"[^>]*>/)?.[0] ?? "no robots meta");
    p = await raw("/");
    ok("SEO: home has a canonical and the category links in the footer", has(p.html, /<link rel="canonical" href="[^"]*"/) && p.html.includes('href="/kategori/mua_attire"'));
  }
  await s.shot("real-directory");
  await s.go(`${WEB}/vendors?kota=Jabodetabek`);
  await sleep(800);
  const jabo = await s.ev("document.querySelector('main').innerText");
  ok("directory filter 'Jabodetabek' shows a vendor listing Jakarta Selatan and Depok", jabo.includes("Ballroom Uji") && !/\b0 vendor\b/.test(jabo), jabo.slice(0, 300));
  await s.go(`${WEB}/vendors?kota=Sumedang`);
  await sleep(800);
  ok("directory filter for a city the vendor does not serve hides it", !(await s.ev("document.querySelector('main').innerText")).includes("Ballroom Uji"));
  await s.go(`${WEB}` + vid);
  const det = await s.ev("document.body.innerText");
  ok("detail page: packages from real API", det.includes("Half Day Plus") && det.includes("Full Day") && det.includes("22.000.000"), det.slice(0, 200));
  // Reviews sit in the "Ulasan" tab; hidden tab panels are not in innerText.
  await s.ev("[...document.querySelectorAll('[role=tab]')].find(t=>t.innerText.startsWith('Ulasan'))?.click(); 1");
  await sleep(1000);
  const rev = await s.ev("document.body.innerText");
  ok("detail page: review summary and comment (Ulasan tab)", rev.includes("5,0") && rev.includes("Rapi dan tepat waktu.") && rev.includes("menyelesaikan booking lewat DuaCincin"), rev.slice(0, 300));
  await s.shot("real-detail");
  await s.go(`${WEB}/kategori/venue`);
  ok("SEO category page server-renders vendors", (await s.ev("document.body.innerText")).includes("Ballroom Uji"), (await s.ev("document.body.innerText")).slice(0,200));
  await s.go(`${WEB}/kategori/venue/jakarta-selatan`);
  ok("SEO category+city page filters by city", (await s.ev("document.body.innerText")).includes("Ballroom Uji"));
  await s.go(`${WEB}/kategori/venue/bandung`);
  ok("SEO city with no vendors shows empty state", (await s.ev("document.body.innerText")).includes("Belum ada vendor Venue di Bandung"));
  ok("no console errors (anonymous)", s.errors.length === 0, JSON.stringify(s.errors.slice(0, 2)));
  s.close();
}
// Inspirasi: vendor tags set by e2e/api.mjs step 9 (desktop, then phone)
for (const [w, h, label] of [[1440, 900, "desktop"], [390, 844, "mobile"]]) {
  const s = await session();
  await s.go(`${WEB}/inspirasi`, w, h);
  await s.ev("document.getElementById('galeri-judul')?.scrollIntoView(); 1");
  await sleep(1200);
  const badges = await s.ev("[...document.querySelectorAll('figure')].map(f=>f.innerText).filter(t=>/\\d+ vendor/.test(t))");
  ok(`inspirasi (${label}): only the tagged photo shows a '1 vendor' badge`, badges.length === 1 && badges[0].includes("1 vendor"), JSON.stringify(badges));
  await s.shot(`inspirasi-badge-${label}`);
  await s.ev("document.querySelector('button[aria-label^=\"Perbesar foto: Pendopo joglo\"]').click(); 1");
  await sleep(1200);
  const dlg = await s.ev("document.querySelector('[role=dialog]')?.innerText ?? ''");
  ok(`inspirasi (${label}): lightbox lists the tagged vendor`, dlg.includes("Vendor di foto ini") && dlg.includes("Ballroom Uji") && dlg.includes("Jakarta Selatan") && dlg.includes("Venue"), dlg.slice(0, 300));
  ok(`inspirasi (${label}): generic 'Cari vendor' button hidden when vendors are tagged`, !/Cari vendor/.test(dlg), dlg.slice(0, 300));
  const href = await s.ev("[...document.querySelectorAll('[role=dialog] a')].find(a=>a.innerText.includes('Ballroom Uji'))?.getAttribute('href')");
  ok(`inspirasi (${label}): vendor links to its public profile`, /^\/vendors\/[0-9a-f-]{36}$/.test(href ?? ""), href);
  const overflow = await s.ev("document.documentElement.scrollWidth > window.innerWidth");
  ok(`inspirasi (${label}): no horizontal page scroll`, !overflow);
  await s.shot(`inspirasi-lightbox-${label}`);
  await s.go(`${WEB}${href}`, w, h);
  ok(`inspirasi (${label}): link opens the vendor profile`, (await s.ev("document.body.innerText")).includes("Ballroom Uji"));
  ok(`no console errors (inspirasi ${label})`, s.errors.length === 0, JSON.stringify(s.errors.slice(0, 2)));
  s.close();
}
// client
{
  const s = await session();
  await s.login(email("client"));
  ok("client login lands on /client/dashboard", (await s.ev("location.pathname")) === "/client/dashboard", await s.ev("location.pathname"));
  const body = await s.ev("document.body.innerText");
  ok("client dashboard greets by real name", body.includes("Client Uji"), body.slice(0, 150));
  ok("client next step is shown (no active booking)", /Mulai dari anggaran|Cari vendor/.test(body), body.slice(0, 300));
  await s.shot("real-client-dashboard");
  await s.go(`${WEB}/client/bookings`);
  const bk = await s.ev("document.body.innerText");
  ok("client bookings lists the completed booking with fund status", bk.includes("Half Day Plus") && bk.includes("Dana diteruskan ke vendor"), bk.slice(0, 300));
  await s.go(`${WEB}/client/messages`);
  ok("client messages page loads without error text", !/gagal|error/i.test(await s.ev("document.querySelector('main').innerText")));
  ok("no console errors (client)", s.errors.length === 0, JSON.stringify(s.errors.slice(0, 2)));
  s.close();
}
// vendor
{
  const s = await session();
  await s.login(email("vendor", 0));
  ok("vendor login lands on vendor area", (await s.ev("location.pathname")).startsWith("/vendor"), await s.ev("location.pathname"));
  await s.go(`${WEB}/vendor/dashboard`);
  const body = await s.ev("document.body.innerText");
  ok("vendor dashboard shows 'Hari ini' with real business name", body.includes("Hari ini") && body.includes("Ballroom Uji"), body.slice(0, 200));
  ok("vendor dashboard shows the review", body.includes("Ulasan terbaru") && body.includes("Rapi dan tepat waktu."), body.slice(0, 300));
  ok("vendor dashboard checklist: packages (2)", /Paket harga\s*2 paket/.test(body), body.slice(0, 300));
  await s.shot("real-vendor-dashboard");
  await s.go(`${WEB}/vendor/paket`);
  const pk = await s.ev("document.body.innerText");
  ok("vendor packages page lists real packages", pk.includes("Half Day Plus") && pk.includes("Full Day"));
  await s.go(`${WEB}/vendor/payouts`);
  ok("vendor payouts page shows net payout", (await s.ev("document.body.innerText")).includes("20.000.000"));
  ok("no console errors (vendor)", s.errors.length === 0, JSON.stringify(s.errors.slice(0, 2)));
  s.close();
}
// admin
{
  const s = await session();
  await s.login(email("admin"));
  await s.go(`${WEB}/internal/admin/dashboard`);
  const body = await s.ev("document.body.innerText");
  ok("admin queue board renders", body.includes("Antrian kerja") && body.includes("Vendor menunggu verifikasi"), body.slice(0, 200));
  const rows = await s.ev("[...document.querySelectorAll('#antrian-title ~ ul li a')].map(a=>a.querySelector('span').textContent+'|'+a.querySelector('.font-heading').textContent)");
  // api.mjs deletes the second (pending) vendor when it tests vendor deletion, so no vendor is waiting.
  ok("queue counts match the database (0 pending vendors, 1 dispute from the flagged chat message, 0 disbursements)", JSON.stringify(rows) === JSON.stringify(["1|Sengketa terbuka", "0|Pencairan menunggu", "0|Vendor menunggu verifikasi", "0|Pengajuan ganti nama"]), JSON.stringify(rows));
  await s.shot("real-admin-dashboard");
  await s.go(`${WEB}/internal/admin/vendors`);
  const pend = await s.ev("document.querySelector('main').innerText");
  ok("pending vendors page: deleted vendor gone, empty state shown", !pend.includes("Dekor Uji") && pend.includes("Tidak ada vendor yang menunggu"), pend.slice(0, 300));
  await s.go(`${WEB}/internal/admin/klien`);
  await sleep(1000);
  const kl = await s.ev("document.querySelector('main').innerText");
  ok("admin Klien terdaftar lists the couple with WhatsApp status", kl.includes("Client Uji") && kl.includes("WA terverifikasi"), kl.slice(0, 400));
  await s.go(`${WEB}/internal/admin/percakapan`);
  await sleep(1000);
  const pc = await s.ev("document.querySelector('main').innerText");
  ok("admin Percakapan lists the couple's chat with the vendor", pc.includes("Client Uji") && pc.includes("Ballroom Uji"), pc.slice(0, 400));
  await s.ev("document.querySelector('main ul li a').click(); 1");
  await sleep(1500);
  const th = await s.ev("document.querySelector('main').innerText");
  ok("admin chat view shows the messages read-only", th.includes("14 Maret") && th.includes("Hanya baca") && !th.includes("Tulis pesan"), th.slice(0, 400));
  await s.go(`${WEB}/internal/admin/whatsapp`);
  await sleep(1200);
  const wa = await s.ev("document.querySelector('main').innerText");
  ok("admin Kirim WhatsApp: verified vendor listed, history shows the API test send", wa.includes("Ballroom Uji") && wa.includes("Riwayat terkirim") && wa.includes("Halo Kak, profilmu sudah kami tinjau."), wa.slice(0, 500));
  await s.shot("admin-kirim-whatsapp");
  await s.go(`${WEB}/internal/admin/inspirasi`);
  const insp = await s.ev("document.querySelector('main').innerText");
  ok("admin inspirasi: tagged photo lists its vendor and offers 'Ubah vendor'", insp.includes("Vendor: Ballroom Uji") && insp.includes("Ubah vendor") && insp.includes("Tandai vendor"), insp.slice(0, 400));
  await s.ev("[...document.querySelectorAll('main button')].find(b=>b.innerText.trim()==='Ubah vendor').click(); 1");
  await sleep(2000);
  const sheet = await s.ev("document.querySelector('[role=dialog]')?.innerText ?? ''");
  ok("admin inspirasi: tag sheet lists approved vendors only, current tag ticked", sheet.includes("Ballroom Uji") && !sheet.includes("Dekor Uji") && sheet.includes("1 dari maksimal 10"), sheet.slice(0, 400));
  ok("admin inspirasi: current vendor checkbox is checked", await s.ev("[...document.querySelectorAll('[role=dialog] label')].find(l=>l.innerText.includes('Ballroom Uji'))?.querySelector('input')?.checked === true"));
  await s.shot("admin-inspirasi-tag-sheet");
  ok("no console errors (admin)", s.errors.length === 0, JSON.stringify(s.errors.slice(0, 2)));
  s.close();
}
// consultant
{
  const s = await session();
  await s.login(email("wedding_consultant"));
  ok("consultant login lands on inbox", (await s.ev("location.pathname")) === "/internal/consultations", await s.ev("location.pathname"));
  ok("consultant inbox shows the client's consultation", (await s.ev("document.body.innerText")).includes("Client Uji"));
  s.close();
}
console.log(out.join("\n")); console.log(`\n${out.length - failed}/${out.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
