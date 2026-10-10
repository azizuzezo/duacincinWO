// End-to-end UI check against the real stack. Run after e2e/api.mjs: it reads the
// users and data that script created.
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const SHOTS = process.env.SHOTS; // optional directory: save a screenshot per key page
const PG = process.env.E2E_PG_CONTAINER ?? "dc-e2e-pg";
const CHROMIUM = process.env.CHROMIUM ?? "/usr/bin/chromium-browser";
const WEB = process.env.E2E_WEB_URL ?? "http://localhost:3000";
const stampEmails = execSync(`docker exec ${PG} psql -U postgres -d duacincin -tAc "select role||' '||email from users order by created_at"`).toString().trim().split("\n").map((l) => l.split(" "));
const email = (role, nth = 0) => stampEmails.filter(([r]) => r === role)[nth][1];
const PW = "KataSandi123";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function session() {
  const port = 9400 + Math.floor(Math.random() * 300);
  const proc = spawn(CHROMIUM, ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`, "about:blank"], { stdio: "ignore" });
  let t; for (let i = 0; i < 40; i++) { try { t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (t.length) break; } catch {} await sleep(250); }
  const ws = new WebSocket(t.find((x) => x.type === "page").webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); const errors = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } else if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); else if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") { const txt = d.params.args.map((a) => a.value || a.description).join(" "); if (!/Failed to load resource/.test(txt)) errors.push("console.error " + txt); } };
  const send = (m, p = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.result.value;
  await send("Page.enable"); await send("Runtime.enable");
  const go = async (u, w = 1440, h = 900) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 }); await send("Page.navigate", { url: u }); await sleep(3200); };
  const setVal = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(v)});el.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`);
  const shot = async (name) => { if (!SHOTS) return; const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(r.result.data, "base64")); };
  const login = async (em) => { await go(`${WEB}/login`); await setVal("input[type=email]", em); await setVal("input[type=password]", PW); await ev("document.querySelector('form').requestSubmit(); 1"); await sleep(3500); };
  const close = () => { ws.close(); proc.kill(); };
  return { ev, go, login, shot, close, errors, send, sleep };
}
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
