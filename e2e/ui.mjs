// End-to-end UI check against the real stack. Run after e2e/api.mjs: it reads the
// users and data that script created.
import { WEB, email, session, sleep } from "./lib/browser.mjs";

const out = []; let failed = 0; const ok = (n, c, d = "") => { out.push(`${c ? "PASS" : "FAIL"}  ${n}${c ? "" : "  -> " + d}`); if (!c) failed++; };

// anonymous browsing of real data
{
  const s = await session();
  await s.go(`${WEB}/vendors`);
  const dir = await s.ev("document.querySelector('main').innerText");
  ok("directory renders the real vendor from the database", dir.includes("Ballroom Uji") && dir.includes("35.000.000"), dir.slice(0, 200));
  ok("directory card shows verified rating 5.0 (1 ulasan)", /5\.0\s*\(1 ulasan\)/.test(dir), dir.slice(0, 300));
  ok("pending vendor not shown", !dir.includes("Dekor Uji"));
  const vid = await s.ev("document.querySelector('main ul li a')?.getAttribute('href')");
  await s.shot("real-directory");
  await s.go(`${WEB}` + vid);
  const det = await s.ev("document.body.innerText");
  ok("detail page: packages from real API", det.includes("Half Day Plus") && det.includes("Full Day") && det.includes("20.000.000"), det.slice(0, 200));
  ok("detail page: review summary and comment", det.includes("5.0") && det.includes("Rapi dan tepat waktu.") && det.includes("menyelesaikan booking lewat DuaCincin"));
  await s.shot("real-detail");
  await s.go(`${WEB}/kategori/venue`);
  ok("SEO category page server-renders vendors", (await s.ev("document.body.innerText")).includes("Ballroom Uji"), (await s.ev("document.body.innerText")).slice(0,200));
  await s.go(`${WEB}/kategori/venue/jakarta`);
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
  ok(`inspirasi (${label}): lightbox lists the tagged vendor`, dlg.includes("Vendor di foto ini") && dlg.includes("Ballroom Uji") && dlg.includes("Jakarta") && dlg.includes("Venue"), dlg.slice(0, 300));
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
  ok("vendor dashboard shows the review", body.includes("Ulasan dari client") && body.includes("Rapi dan tepat waktu."));
  ok("vendor dashboard checklist: packages (2)", body.includes("Paket harga (2)"));
  await s.shot("real-vendor-dashboard");
  await s.go(`${WEB}/vendor/paket`);
  const pk = await s.ev("document.body.innerText");
  ok("vendor packages page lists real packages", pk.includes("Half Day Plus") && pk.includes("Full Day"));
  await s.go(`${WEB}/vendor/payouts`);
  ok("vendor payouts page shows net payout", (await s.ev("document.body.innerText")).includes("18.000.000"));
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
  ok("queue counts match the database (1 pending vendor, 1 dispute from the flagged chat message, 0 disbursements)", JSON.stringify(rows) === JSON.stringify(["1|Sengketa terbuka", "0|Pencairan menunggu", "1|Vendor menunggu verifikasi", "0|Pengajuan ganti nama"]), JSON.stringify(rows));
  await s.shot("real-admin-dashboard");
  await s.go(`${WEB}/internal/admin/vendors`);
  ok("pending vendors table lists the second vendor", (await s.ev("document.body.innerText")).includes("Dekor Uji"));
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
