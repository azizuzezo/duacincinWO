// End-to-end UI check against the real stack. Run after e2e/api.mjs: it reads the
// users and data that script created.
import { WEB, email, session } from "./lib/browser.mjs";

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
