// End-to-end API journey: real Go server + throwaway Postgres (see e2e/README.md).
// Run via e2e/run.sh. It creates the data that e2e/ui.mjs later asserts on.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
const BASE = `http://localhost:${process.env.E2E_API_PORT ?? 8080}/api/v1`;
const PG = process.env.E2E_PG_CONTAINER ?? "dc-e2e-pg";
const results = []; let failed = 0;
const ok = (name, cond, detail = "") => { results.push(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  -> " + detail}`); if (!cond) failed++; };
class Client {
  constructor(label) { this.label = label; this.cookie = ""; }
  async call(method, path, body) {
    const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(this.cookie ? { Cookie: this.cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const sc = res.headers.getSetCookie?.() ?? [];
    for (const c of sc) { const kv = c.split(";")[0]; if (kv.startsWith("dc_session=")) this.cookie = kv.endsWith("=") ? "" : kv; }
    let data = null; const txt = await res.text(); try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    return { status: res.status, data };
  }
}
const psql = (sql) => execSync(`docker exec ${PG} psql -U postgres -d duacincin -tAc "${sql}"`).toString().trim();
const stamp = Date.now();
const vendor = new Client("vendor"), vendor2 = new Client("vendor2"), client = new Client("client"), admin = new Client("admin"), consultant = new Client("consultant");
const PW = "KataSandi123";
// Sign-up needs an emailed code. Without RESEND_API_KEY the API logs it
// instead ("[DEV] kode pendaftaran untuk <email>: <code>"), so read it there.
const API_LOG = process.env.E2E_API_LOG;
const signupCode = async (email) => {
  for (let i = 0; i < 20; i++) {
    const m = readFileSync(API_LOG, "utf8").match(new RegExp(`kode pendaftaran untuk ${email.replace(/[.+]/g, "\\$&")}: (\\d{6})`));
    if (m) return m[1];
    await new Promise((res) => setTimeout(res, 100));
  }
  throw new Error(`no sign-up code logged for ${email}`);
};
// Every sign-up needs its own WhatsApp number (one number per account).
let waSeq = 0;
const nextWA = () => `0857${String(stamp).slice(-5)}${String(++waSeq).padStart(2, "0")}`;
const reg = async (who, kind, email, name, whatsapp = nextWA()) => {
  const otp = await who.call("POST", "/auth/register/otp", { email });
  if (otp.status !== 200) return otp;
  return who.call("POST", `/auth/${kind}/register`, { email, password: PW, full_name: name, accept_terms: true, whatsapp, signup_ticket: otp.data.signup_ticket, otp_code: await signupCode(email) });
};
const waCode = async (phone) => {
  for (let i = 0; i < 20; i++) {
    const all = [...readFileSync(API_LOG, "utf8").matchAll(new RegExp(`kode WhatsApp untuk ${phone}: (\\d{6})`, "g"))];
    if (all.length) return all[all.length - 1][1];
    await new Promise((res) => setTimeout(res, 100));
  }
  throw new Error(`no WhatsApp code logged for ${phone}`);
};

// 1. registration + login for all roles
let r = await reg(vendor, "vendor", `vendor${stamp}@test.local`, "Vendor Uji"); ok("vendor registers", r.status === 201 || r.status === 200, JSON.stringify(r));
r = await reg(vendor2, "vendor", `vendor2${stamp}@test.local`, "Vendor Dua"); ok("second vendor registers", r.status < 300, JSON.stringify(r));
r = await reg(client, "client", `client${stamp}@test.local`, "Client Uji"); ok("client registers", r.status < 300, JSON.stringify(r));
await reg(admin, "client", `admin${stamp}@test.local`, "Admin Uji"); await reg(consultant, "client", `cons${stamp}@test.local`, "Konsultan Uji");
psql(`update users set role='admin' where email='admin${stamp}@test.local'`); psql(`update users set role='wedding_consultant' where email='cons${stamp}@test.local'`);

// 1b. WhatsApp number: required at sign-up, proven by a code sent over WhatsApp
{
  const lone = new Client("lone");
  const otp = await lone.call("POST", "/auth/register/otp", { email: `nowa${stamp}@test.local` });
  const noWA = await lone.call("POST", "/auth/client/register", { email: `nowa${stamp}@test.local`, password: PW, full_name: "Tanpa WA", accept_terms: true, signup_ticket: otp.data?.signup_ticket, otp_code: await signupCode(`nowa${stamp}@test.local`) });
  ok("sign-up without a WhatsApp number is refused", noWA.status === 400 && /WhatsApp/i.test(noWA.data?.error ?? ""), JSON.stringify(noWA));
  let w = await client.call("GET", "/whatsapp/me");
  const cPhone = w.data?.phone;
  ok("new client has the sign-up number waiting for verification", w.status === 200 && w.data?.verified === false && /^62857\d+$/.test(cPhone ?? ""), JSON.stringify(w));
  w = await client.call("POST", "/whatsapp/me/code", {});
  ok("a code is sent to the sign-up number", w.status === 200 && w.data?.code_sent === true, JSON.stringify(w));
  w = await client.call("POST", "/whatsapp/me/code", {});
  ok("asking again within 60s is refused", w.status === 429, JSON.stringify(w));
  w = await client.call("POST", "/whatsapp/me/verify", { code: "000000" === (await waCode(cPhone)) ? "111111" : "000000" });
  ok("a wrong code is refused with attempts left", w.status === 400 && /sisa/.test(w.data?.error ?? ""), JSON.stringify(w));
  w = await client.call("POST", "/whatsapp/me/verify", { code: await waCode(cPhone) });
  ok("the right code verifies the number", w.status === 200 && w.data?.verified === true && w.data?.phone === cPhone, JSON.stringify(w));
  w = await vendor2.call("POST", "/whatsapp/me/code", { phone: "0" + cPhone.slice(2) });
  ok("another account cannot take a verified number", w.status === 409, JSON.stringify(w));
  w = await vendor.call("POST", "/whatsapp/me/code", { phone: "0812-3456-7890" });
  ok("vendor can verify a different number than the sign-up one", w.status === 200 && w.data?.phone === "6281234567890", JSON.stringify(w));
  w = await vendor.call("POST", "/whatsapp/me/verify", { code: await waCode("6281234567890") });
  ok("vendor verifies its number too", w.status === 200 && w.data?.verified === true, JSON.stringify(w));
}
const emails = { vendor: `vendor${stamp}@test.local`, vendor2: `vendor2${stamp}@test.local`, client: `client${stamp}@test.local`, admin: `admin${stamp}@test.local`, consultant: `cons${stamp}@test.local` };
const who = { vendor, vendor2, client, admin, consultant };
for (const [k, c] of Object.entries(who)) { r = await c.call("POST", "/auth/login", { email: emails[k], password: PW }); ok(`${k} logs in`, r.status === 200 && !!c.cookie, JSON.stringify(r)); }
{
  let w;
  w = await admin.call("GET", "/whatsapp/me");
  ok("admin has no WhatsApp verification to do", w.status === 403, JSON.stringify(w));
  w = await admin.call("GET", "/whatsapp/admin/status");
  ok("admin sees WhatsApp coverage (vendors still pending are not counted yet)", w.status === 200 && w.data?.clients_verified >= 1 && w.data?.vendors_verified === 0 && w.data?.vendors_missing === 0 && w.data?.official === "not_configured", JSON.stringify(w));
  w = await client.call("GET", "/whatsapp/admin/status");
  ok("WhatsApp status is admin-only", w.status === 403, JSON.stringify(w));
}
r = await client.call("GET", "/auth/me"); ok("client /me has role client", r.data?.role === "client", JSON.stringify(r));
r = await admin.call("GET", "/auth/me"); ok("admin /me has role admin", r.data?.role === "admin", JSON.stringify(r));
const vendorId = (await vendor.call("GET", "/auth/me")).data.id, vendor2Id = (await vendor2.call("GET", "/auth/me")).data.id;

// 2. vendor profile
r = await vendor.call("PUT", "/vendor/profile", { business_name: "Ballroom Uji", category: "venue", city: "jakarta selatan", price_min: 35000000, price_max: 120000000, description: "Venue uji untuk E2E." });
ok("profile without a typed number uses the verified WhatsApp number", r.status === 200 && r.data?.whatsapp_number === "6281234567890", JSON.stringify(r));
r = await vendor.call("PUT", "/vendor/profile", { business_name: "Ballroom Uji", category: "venue", city: "jakarta selatan", price_min: 35000000, price_max: 120000000, description: "Venue uji untuk E2E.", whatsapp_number: "021 555 1234" });
ok("landline is not accepted as WhatsApp", r.status === 400, JSON.stringify(r));
r = await vendor.call("PUT", "/vendor/profile", { business_name: "Ballroom Uji", category: "venue", city: "jakarta selatan", price_min: 35000000, price_max: 120000000, description: "Venue uji untuk E2E.", whatsapp_number: "0812-3456-7890" });
ok("vendor creates profile", r.status === 200 && r.data?.status === "pending", JSON.stringify(r));
ok("city is stored with the list's spelling", r.data?.city === "Jakarta Selatan", JSON.stringify(r.data));
ok("WhatsApp stored as 628... and returned to the vendor", r.data?.whatsapp_number === "6281234567890", JSON.stringify(r.data));
r = await vendor.call("PUT", "/vendor/profile", { business_name: "Ballroom Uji", category: "venue", city: "Bandung sumedang", price_min: 35000000, price_max: 120000000, description: "Venue uji untuk E2E." });
ok("free-text city outside the kabupaten/kota list is refused", r.status === 400, JSON.stringify(r.data));
r = await vendor2.call("PUT", "/vendor/profile", { business_name: "Dekor Uji", category: "decor", city: "Bandung", price_min: 5000000, price_max: 20000000, description: "x", whatsapp_number: "+62 813 1111 2222" });
ok("second vendor creates profile", r.status === 200, JSON.stringify(r));

// 3. packages: the new endpoints, against a real database
r = await vendor.call("GET", "/vendor/packages"); ok("own packages empty at start", r.status === 200 && Array.isArray(r.data) && r.data.length === 0, JSON.stringify(r));
r = await vendor.call("POST", "/vendor/packages", { name: "", price: 1 }); ok("create rejects empty name (400)", r.status === 400, JSON.stringify(r));
r = await vendor.call("POST", "/vendor/packages", { name: "A", price: -5 }); ok("create rejects negative price (400)", r.status === 400, JSON.stringify(r));
r = await vendor.call("POST", "/vendor/packages", { name: "x".repeat(81), price: 1 }); ok("create rejects 81-char name (400)", r.status === 400, JSON.stringify(r));
r = await vendor.call("POST", "/vendor/packages", { name: "Half Day", description: "6 jam", price: 18000000 }); ok("create package 1", r.status === 201 && r.data?.id, JSON.stringify(r)); const pkg1 = r.data;
r = await vendor.call("POST", "/vendor/packages", { name: "Full Day", description: "12 jam", price: 35000000 }); ok("create package 2", r.status === 201, JSON.stringify(r));
r = await vendor.call("GET", "/vendor/packages"); ok("list keeps creation order", JSON.stringify(r.data?.map((p) => p.name)) === JSON.stringify(["Half Day", "Full Day"]), JSON.stringify(r.data));
r = await vendor.call("PUT", `/vendor/packages/${pkg1.id}`, { name: "Half Day Plus", description: "7 jam", price: 20000000 }); ok("update own package", r.status === 200 && r.data?.name === "Half Day Plus" && r.data?.price === 20000000, JSON.stringify(r));
r = await vendor2.call("PUT", `/vendor/packages/${pkg1.id}`, { name: "Dibajak", price: 1 }); ok("IDOR: other vendor cannot update (404)", r.status === 404, JSON.stringify(r));
r = await vendor2.call("DELETE", `/vendor/packages/${pkg1.id}`); ok("IDOR: other vendor cannot delete (404)", r.status === 404, JSON.stringify(r));
r = await client.call("POST", "/vendor/packages", { name: "A", price: 1 }); ok("client role cannot create packages (403)", r.status === 403, JSON.stringify(r));
r = await new Client("anon").call("POST", "/vendor/packages", { name: "A", price: 1 }); ok("anonymous cannot create packages (401)", r.status === 401, JSON.stringify(r));
for (let i = 3; i <= 12; i++) await vendor.call("POST", "/vendor/packages", { name: `Paket ${i}`, price: i * 1000 });
r = await vendor.call("POST", "/vendor/packages", { name: "Ke-13", price: 1 }); ok("13th package refused (409)", r.status === 409, JSON.stringify(r));
const all = (await vendor.call("GET", "/vendor/packages")).data; for (const p of all.slice(2)) await vendor.call("DELETE", `/vendor/packages/${p.id}`);
r = await vendor.call("GET", "/vendor/packages"); ok("delete works, 2 packages remain", r.data?.length === 2, JSON.stringify(r.data));

// 4. visibility before/after approval
r = await new Client("anon").call("GET", "/vendors"); ok("pending vendor NOT in public directory", r.status === 200 && !r.data.some((v) => v.id === vendorId), JSON.stringify(r.data));
r = await new Client("anon").call("GET", `/vendors/${vendorId}/packages`); ok("pending vendor packages are 404 publicly", r.status === 404, JSON.stringify(r));
r = await admin.call("GET", "/admin/vendors/pending"); ok("admin sees pending vendors", r.status === 200 && r.data.length >= 2, JSON.stringify(r));
r = await client.call("GET", "/admin/vendors/pending"); ok("client forbidden from admin API (403)", r.status === 403, JSON.stringify(r));
r = await admin.call("POST", `/admin/vendors/${vendorId}/approve`, {}); ok("admin approves vendor", r.status < 300, JSON.stringify(r));
r = await new Client("anon").call("GET", "/vendors?category=venue"); ok("approved vendor in directory (category filter)", r.data?.some((v) => v.id === vendorId), JSON.stringify(r.data));
r = await new Client("anon").call("GET", "/vendors?category=venue&city=jakarta%20selatan"); ok("city filter is case-insensitive", r.data?.some((v) => v.id === vendorId), JSON.stringify(r.data));
r = await vendor.call("PUT", "/vendor/profile", { category: "venue", cities: ["jakarta selatan", "Depok", "depok"], price_min: 35000000, price_max: 120000000, description: "Venue uji untuk E2E." });
ok("vendor serves several kabupaten/kota (deduped, list spelling)", r.status === 200 && JSON.stringify(r.data?.cities) === JSON.stringify(["Jakarta Selatan", "Depok"]) && r.data?.city === "Jakarta Selatan, Depok", JSON.stringify(r.data));
r = await vendor.call("PUT", "/vendor/profile", { category: "venue", cities: ["Bandung", "Bandung sumedang"], price_min: 35000000, price_max: 120000000, description: "x" }); ok("a free-text entry among cities is refused", r.status === 400, JSON.stringify(r));
r = await vendor.call("PUT", "/vendor/profile", { category: "venue", cities: ["Bandung", "Sumedang", "Garut", "Bogor", "Depok", "Bekasi", "Cimahi", "Cianjur", "Subang", "Karawang", "Purwakarta", "Indramayu", "Majalengka", "Kuningan", "Ciamis", "Pangandaran", "Tasikmalaya", "Banjar", "Cirebon", "Sukabumi", "Bandung Barat"], price_min: 35000000, price_max: 120000000, description: "x" }); ok("more than 20 kabupaten/kota refused", r.status === 400, JSON.stringify(r));
r = await new Client("anon").call("GET", "/vendors?category=venue&city=depok"); ok("directory finds the vendor under its second city", r.data?.some((v) => v.id === vendorId && v.cities?.includes("Depok")), JSON.stringify(r.data));
// "Jabodetabek" is one service area: it absorbs its own cities, and a search for any of them finds the vendor.
r = await vendor.call("PUT", "/vendor/profile", { category: "venue", cities: ["Depok", "jabotabek", "Bandung", "Jakarta Selatan"], price_min: 35000000, price_max: 120000000, description: "x" });
ok("Jabodetabek is saved as one area and drops the cities it covers", r.status === 200 && JSON.stringify(r.data?.cities) === JSON.stringify(["Jabodetabek", "Bandung"]), JSON.stringify(r.data));
r = await new Client("anon").call("GET", "/vendors?category=venue&city=Bekasi"); ok("a search for a Jabodetabek city finds a Jabodetabek vendor", r.data?.some((v) => v.id === vendorId), JSON.stringify(r.data));
r = await new Client("anon").call("GET", "/vendors?category=venue&city=Jabodetabek"); ok("a search for Jabodetabek finds the vendor", r.data?.some((v) => v.id === vendorId), JSON.stringify(r.data));
r = await new Client("anon").call("GET", "/vendors?category=venue&city=Sumedang"); ok("a city outside the vendor's areas does not match", !r.data?.some((v) => v.id === vendorId), JSON.stringify(r.data));
r = await vendor.call("PUT", "/vendor/profile", { category: "venue", cities: ["Jakarta Selatan", "Depok"], price_min: 35000000, price_max: 120000000, description: "Venue uji untuk E2E." });
r = await new Client("anon").call("GET", "/vendors?category=venue&city=Jabodetabek"); ok("a search for Jabodetabek finds vendors listing one of its cities", r.data?.some((v) => v.id === vendorId), JSON.stringify(r.data));
// Several categories per vendor: the first is the main one, the directory finds the vendor under each.
const multiCat = { cities: ["Jakarta Selatan", "Depok"], price_min: 35000000, price_max: 120000000, description: "Venue uji untuk E2E." };
r = await vendor.call("PUT", "/vendor/profile", { ...multiCat, categories: ["venue", "mc", "venue"] });
ok("vendor offers several categories (deduped, main first)", r.status === 200 && r.data?.category === "venue" && JSON.stringify(r.data?.categories) === JSON.stringify(["venue", "mc"]), JSON.stringify(r.data));
r = await new Client("anon").call("GET", "/vendors?category=mc"); ok("directory finds the vendor under its second category", r.data?.some((v) => v.id === vendorId && v.category === "venue" && v.categories?.includes("mc")), JSON.stringify(r.data));
r = await new Client("anon").call("GET", "/vendors?category=wedding_cake"); ok("new category is a valid filter", r.status === 200 && !r.data?.some((v) => v.id === vendorId), JSON.stringify(r));
r = await vendor.call("PUT", "/vendor/profile", { ...multiCat, categories: ["venue", "pawang_hujan"] }); ok("unknown category refused", r.status === 400, JSON.stringify(r));
r = await vendor.call("PUT", "/vendor/profile", { ...multiCat, categories: [] }); ok("at least one category required", r.status === 400, JSON.stringify(r));
r = await vendor.call("GET", "/vendor/profile/me"); ok("saving without whatsapp_number keeps the saved number", r.data?.whatsapp_number === "6281234567890", JSON.stringify(r.data));
// Guardrail: the WhatsApp number never leaves through a public endpoint.
r = await new Client("anon").call("GET", "/vendors"); ok("directory never carries the WhatsApp number", r.status === 200 && !JSON.stringify(r.data).includes("whatsapp") && !JSON.stringify(r.data).includes("81234567890"), JSON.stringify(r.data));
r = await new Client("anon").call("GET", `/vendors/${vendorId}`); ok("public vendor detail never carries the WhatsApp number", r.status === 200 && !JSON.stringify(r.data).includes("whatsapp") && !JSON.stringify(r.data).includes("81234567890"), JSON.stringify(r.data));
r = await admin.call("GET", `/admin/vendors/${vendorId}`); ok("admin vendor detail shows the WhatsApp number", r.data?.whatsapp_number === "6281234567890", JSON.stringify(r.data));
r = await new Client("anon").call("GET", "/vendors?max_price=1000000"); ok("max_price filter excludes expensive vendor", !r.data?.some((v) => v.id === vendorId), JSON.stringify(r.data));
r = await new Client("anon").call("GET", `/vendors/${vendorId}/packages`); ok("public packages visible after approval", r.status === 200 && r.data.length === 2 && r.data[0].name === "Half Day Plus", JSON.stringify(r));
// Commission is added on top of the vendor's price for couples (default 10%).
ok("public package price includes commission (20 jt -> 22 jt)", r.data?.[0]?.price === 22000000, JSON.stringify(r.data?.[0]));
r = await vendor.call("GET", "/vendor/packages"); ok("vendor still sees its own package price", r.data?.find((p) => p.name === "Half Day Plus")?.price === 20000000, JSON.stringify(r.data));
r = await new Client("anon").call("GET", "/vendors?category=venue"); const card = r.data?.find((v) => v.id === vendorId);
ok("directory card shows the couple's price (35 jt -> 38,5 jt)", card?.price_min === 38500000 && card?.price_max === 132000000, JSON.stringify(card));
r = await new Client("anon").call("GET", `/vendors/${vendorId}`); ok("vendor detail shows the couple's price", r.data?.price_min === 38500000, JSON.stringify(r.data));
r = await admin.call("GET", `/admin/vendors/${vendorId}`); const hp = r.data?.packages?.find((p) => p.name === "Half Day Plus");
ok("admin vendor detail pairs vendor and website prices", r.status === 200 && r.data.price_min.vendor === 35000000 && r.data.price_min.website === 38500000 && hp?.price.vendor === 20000000 && hp?.price.website === 22000000 && r.data.commission_rate === 0.1 && r.data.email?.includes("@"), JSON.stringify(r.data));
r = await client.call("GET", `/admin/vendors/${vendorId}`); ok("client cannot read admin vendor detail (403)", r.status === 403, JSON.stringify(r));
r = await admin.call("GET", "/admin/vendors/bukan-uuid"); ok("admin vendor detail: malformed id is 404", r.status === 404, JSON.stringify(r));
r = await vendor.call("GET", "/vendor/profile/me"); ok("vendor's own profile keeps its price", r.data?.price_min === 35000000, JSON.stringify(r.data));
r = await new Client("anon").call("GET", "/vendors?max_price=38000000"); ok("budget filter compares the couple's price (38 jt excludes 38,5 jt)", !r.data?.some((v) => v.id === vendorId), JSON.stringify(r.data));
r = await new Client("anon").call("GET", "/vendors?max_price=38500000"); ok("budget filter includes a vendor at the couple's price", r.data?.some((v) => v.id === vendorId), JSON.stringify(r.data));

// 5. chat + contact-info filter
r = await client.call("POST", `/conversations/vendor/${vendorId}`, {}); ok("client starts vendor chat", r.status < 300 && r.data?.id, JSON.stringify(r)); const conv = r.data;
r = await client.call("POST", `/conversations/${conv.id}/messages`, { body: "Halo, apakah tanggal 14 Maret tersedia?" }); ok("client sends message", r.status < 300, JSON.stringify(r));
r = await client.call("POST", `/conversations/${conv.id}/messages`, { body: "WA saya 081234567890 ya" }); ok("phone number message is flagged", r.data?.flagged === true, JSON.stringify(r));
r = await vendor.call("GET", `/conversations/${conv.id}/messages`); ok("vendor reads thread (2 messages)", r.status === 200 && r.data.length >= 2, JSON.stringify(r));
r = await vendor2.call("GET", `/conversations/${conv.id}/messages`); ok("unrelated vendor cannot read thread", r.status === 403 || r.status === 404, JSON.stringify(r));

// Chat emails. Without RESEND_API_KEY the API logs them ("[DEV] email pesan
// baru untuk <email> dari <sender>: <link>"); sending is in the background.
const chatEmails = (email, link) => readFileSync(API_LOG, "utf8").split("\n").filter((l) => l.includes(`email pesan baru untuk ${email} `) && l.includes(`: ${link} (`)).length;
const waitChatEmails = async (email, link, n) => { for (let i = 0; i < 30 && chatEmails(email, link) < n; i++) await new Promise((res) => setTimeout(res, 100)); await new Promise((res) => setTimeout(res, 300)); return chatEmails(email, link); };
ok("vendor is emailed once for the couple's two unread messages", (await waitChatEmails(emails.vendor, `/vendor/messages/${conv.id}`, 1)) === 1, String(chatEmails(emails.vendor, `/vendor/messages/${conv.id}`)));
r = await vendor.call("POST", `/conversations/${conv.id}/messages`, { body: "Tersedia, Kak." }); ok("vendor replies to the couple", r.status === 201, JSON.stringify(r));
ok("couple is emailed when the vendor replies", (await waitChatEmails(emails.client, `/client/messages/${conv.id}`, 1)) === 1);

// 5a. WhatsApp is notification only (no transport in e2e: the API logs "[DEV] whatsapp ke <jid>: <text>")
{
  const waOut = (phone) => readFileSync(API_LOG, "utf8").split("\n").filter((l) => l.includes(`[DEV] whatsapp ke ${phone}@s.whatsapp.net: `)).map((l) => JSON.parse(l.slice(l.indexOf(": \"") + 2)));
  const inbound = async (phone, text, secret = "e2e-only-bot-secret-0123456789") => {
    const res = await fetch(BASE + "/whatsapp/inbound", { method: "POST", headers: { "Content-Type": "application/json", "X-Bot-Secret": secret }, body: JSON.stringify({ jid: `${phone}@s.whatsapp.net`, phone, text }) });
    return { status: res.status, data: await res.json().catch(() => null) };
  };
  const vPhone = "6281234567890", cPhone = (await client.call("GET", "/whatsapp/me")).data?.phone;
  await new Promise((res) => setTimeout(res, 300));
  ok("a newly verified couple is congratulated on WhatsApp", waOut(cPhone).some((t) => t.includes("Selamat bergabung di DuaCincin, Client Uji")), JSON.stringify(waOut(cPhone)));
  ok("a newly verified vendor is congratulated on WhatsApp", waOut(vPhone).some((t) => t.includes("Selamat bergabung di DuaCincin") && t.includes("/vendor/profile")), JSON.stringify(waOut(vPhone)));
  const toVendor = waOut(vPhone).filter((t) => t.includes("Pesan baru di DuaCincin"));
  ok("vendor gets one WhatsApp notification for the couple's burst of messages", toVendor.length === 1, JSON.stringify(toVendor));
  ok("the notification says who, what, and links to the vendor's chat", toVendor[0]?.includes("Dari: *Client Uji*") && toVendor[0]?.includes('"Halo, apakah tanggal 14 Maret tersedia?"') && toVendor[0]?.includes(`/vendor/messages/${conv.id}`), JSON.stringify(toVendor[0]));
  const toClient = waOut(cPhone).filter((t) => t.includes("Pesan baru di DuaCincin"));
  ok("couple gets a notification of the vendor's reply with a link to their chat", toClient.length === 1 && toClient[0].includes("Dari: *Ballroom Uji*") && toClient[0].includes(`/client/messages/${conv.id}`), JSON.stringify(toClient));
  let w = await inbound(vPhone, "Siap kak");
  ok("a WhatsApp message from a member gets no reply", w.status === 200 && !w.data?.reply, JSON.stringify(w));
  r = await vendor.call("GET", `/conversations/${conv.id}/messages`);
  ok("and is not added to any chat", r.data?.at(-1)?.body !== "Siap kak", JSON.stringify(r.data?.at(-1)));
  w = await inbound("6289900001111", "mau tanya vendor di duacincin");
  ok("an unknown number gets no reply either", w.status === 200 && !w.data?.reply, JSON.stringify(w));
  w = await inbound(vPhone, "halo", "wrong");
  ok("inbound webhook needs the bot secret", w.status === 401, JSON.stringify(w));

  // Admin panel: send a WhatsApp to a verified client/vendor
  w = await admin.call("GET", "/whatsapp/admin/status");
  ok("WhatsApp coverage counts the approved vendor", w.status === 200 && w.data?.vendors_verified === 1, JSON.stringify(w));
  w = await admin.call("GET", "/whatsapp/admin/recipients?q=ballroom");
  ok("admin finds a verified vendor by business name", w.status === 200 && w.data?.some((x) => x.business_name === "Ballroom Uji" && x.role === "vendor"), JSON.stringify(w));
  w = await admin.call("GET", "/whatsapp/admin/recipients?q=0812-3456");
  ok("admin finds a recipient by a typed number", w.status === 200 && w.data?.some((x) => x.business_name === "Ballroom Uji"), JSON.stringify(w));
  w = await admin.call("GET", "/whatsapp/admin/recipients?role=client&q=client%20uji");
  ok("role filter keeps only clients", w.status === 200 && w.data?.length >= 1 && w.data.every((x) => x.role === "client"), JSON.stringify(w));
  w = await admin.call("GET", `/whatsapp/admin/recipients?user_id=${vendor2Id}`);
  ok("an unverified account is not a recipient", w.status === 200 && w.data?.length === 0, JSON.stringify(w));
  w = await admin.call("POST", "/whatsapp/admin/send", { user_id: vendorId, message: "Halo Kak, profilmu sudah kami tinjau." });
  ok("admin sends a WhatsApp to a vendor", w.status === 200 && w.data?.sent === true, JSON.stringify(w));
  ok("the vendor gets it with the DuaCincin team header", waOut(vPhone).some((t) => t.startsWith("📣 *Pesan dari Tim DuaCincin*") && t.includes("Halo Kak, profilmu sudah kami tinjau.")), JSON.stringify(waOut(vPhone).slice(-1)));
  w = await admin.call("POST", "/whatsapp/admin/send", { user_id: vendor2Id, message: "x" });
  ok("sending to an unverified account is refused", w.status === 400, JSON.stringify(w));
  w = await admin.call("POST", "/whatsapp/admin/send", { user_id: vendorId, message: "   " });
  ok("an empty message is refused", w.status === 400, JSON.stringify(w));
  w = await admin.call("POST", "/whatsapp/admin/send", { user_id: vendorId, message: "a".repeat(1001) });
  ok("a message over 1000 characters is refused", w.status === 400, JSON.stringify(w));
  w = await admin.call("GET", "/whatsapp/admin/sent");
  ok("the send is in the admin history", w.status === 200 && w.data?.[0]?.recipient_name === "Ballroom Uji" && w.data[0].message === "Halo Kak, profilmu sudah kami tinjau." && w.data[0].phone_tail === "7890", JSON.stringify(w.data?.[0]));
  w = await client.call("POST", "/whatsapp/admin/send", { user_id: vendorId, message: "x" });
  ok("only admins can send from the panel", w.status === 403, JSON.stringify(w));
}

// 5b. Admin <-> Vendor chat: one thread per (admin, vendor), only those two.
r = await vendor.call("POST", `/conversations/admin-vendor/${vendorId}`, {}); ok("vendor cannot start an admin chat", r.status === 403, JSON.stringify(r));
r = await client.call("POST", `/conversations/admin-vendor/${vendorId}`, {}); ok("client cannot start an admin chat", r.status === 403, JSON.stringify(r));
r = await admin.call("POST", `/conversations/admin-vendor/${vendorId}`, {}); const av = r.data;
ok("admin starts a chat with the vendor", r.status === 200 && av?.type === "admin_vendor" && av?.vendor_id === vendorId && !!av?.admin_id && av?.client_id === "", JSON.stringify(r));
r = await admin.call("POST", `/conversations/admin-vendor/${vendorId}`, {}); ok("starting again reuses the thread", r.data?.id === av?.id, JSON.stringify(r));
r = await admin.call("POST", `/conversations/admin-vendor/${vendor2Id}`, {}); ok("admin can reach a vendor still pending review", r.status === 200, JSON.stringify(r));
r = await admin.call("POST", `/conversations/${av.id}/messages`, { body: "Halo, mohon konfirmasi nomor 081234567890 untuk verifikasi." }); ok("admin sends; contact details are not flagged in an admin chat", r.status === 201 && r.data?.flagged === false, JSON.stringify(r));
r = await admin.call("POST", `/conversations/${av.id}/messages`, { body: "Terima kasih." }); ok("admin sends a second message", r.status === 201, JSON.stringify(r));
ok("vendor is emailed once for the admin's two unread messages", (await waitChatEmails(emails.vendor, `/vendor/messages/${av.id}`, 1)) === 1, String(chatEmails(emails.vendor, `/vendor/messages/${av.id}`)));
r = await vendor.call("GET", "/conversations"); const avRow = r.data?.find((c) => c.id === av.id);
ok("vendor inbox lists the admin chat with the admin's name", avRow?.type === "admin_vendor" && avRow?.admin_name === "Admin Uji", JSON.stringify(avRow));
r = await vendor.call("GET", "/notifications"); ok("vendor gets an in-app notification linking the admin chat", r.data?.some((n) => n.type === "chat.message" && n.link === `/vendor/messages/${av.id}`), JSON.stringify(r.data));
r = await vendor.call("GET", `/conversations/${av.id}/messages`); const avMsgs = r.data;
ok("vendor reads the admin chat", r.status === 200 && avMsgs?.length === 2, JSON.stringify(r));
r = await vendor.call("POST", `/conversations/${av.id}/read`, { last_read_message_id: avMsgs?.[1]?.id }); ok("vendor marks the admin chat read", r.status < 300, JSON.stringify(r));
r = await vendor.call("POST", `/conversations/${av.id}/messages`, { body: "Benar, itu nomor kami." }); ok("vendor replies to admin", r.status === 201, JSON.stringify(r));
ok("admin is emailed when the vendor replies", (await waitChatEmails(emails.admin, `/internal/admin/pesan/${av.id}`, 1)) === 1);
r = await admin.call("GET", "/notifications"); ok("admin gets an in-app notification linking the admin inbox", r.data?.some((n) => n.type === "chat.message" && n.link === `/internal/admin/pesan/${av.id}`), JSON.stringify(r.data));
r = await admin.call("GET", `/conversations/${av.id}/messages`); ok("admin sees the vendor's reply and its own read receipts", r.data?.length === 3 && r.data[0].status === "read", JSON.stringify(r.data));
r = await admin.call("POST", `/conversations/${av.id}/messages`, { body: "Siap, sudah kami catat." }); ok("admin writes again after the vendor read everything", r.status === 201, JSON.stringify(r));
ok("vendor is emailed again for a new unread stretch", (await waitChatEmails(emails.vendor, `/vendor/messages/${av.id}`, 2)) === 2, String(chatEmails(emails.vendor, `/vendor/messages/${av.id}`)));
r = await admin.call("GET", "/conversations?type=admin_vendor"); ok("admin inbox ?type=admin_vendor lists the vendor chats", r.data?.length === 2 && r.data.every((c) => c.type === "admin_vendor"), JSON.stringify(r.data));
r = await admin.call("GET", "/conversations?type=consultation"); ok("consultation inbox leaves admin chats out", !r.data?.some((c) => c.type === "admin_vendor"), JSON.stringify(r.data));
r = await consultant.call("GET", `/conversations/${av.id}/messages`); ok("consultant (staff) cannot read an admin chat", r.status === 404, JSON.stringify(r));
r = await client.call("GET", `/conversations/${av.id}`); ok("client cannot read an admin chat", r.status === 404, JSON.stringify(r));
r = await vendor2.call("POST", `/conversations/${av.id}/messages`, { body: "x" }); ok("another vendor cannot post in it", r.status === 404, JSON.stringify(r));
ok("admin chat opens no dispute", psql(`select count(*) from disputes where message_id in (select id from messages where conversation_id='${av.id}')`) === "0");

// 6. booking lifecycle with simulated payments (Midtrans not configured)
r = await client.call("POST", "/bookings", { vendor_id: vendorId, event_date: "2027-03-14", package_description: "Half Day Plus", agreed_price: 22000000 }); ok("client creates booking", r.status < 300 && r.data?.status === "requested", JSON.stringify(r)); const bk = r.data;
ok("client booking hides the vendor's share", bk?.vendor_amount === undefined, JSON.stringify(bk));
r = await vendor.call("GET", `/bookings/${bk.id}`); ok("vendor sees it receives its own price (22 jt -> 20 jt)", r.data?.agreed_price === 22000000 && r.data?.vendor_amount === 20000000, JSON.stringify(r.data));
r = await admin.call("PATCH", `/admin/vendors/${vendorId}/commission`, { rate: 0.2 }); ok("admin sets a 20% commission", r.status === 200, JSON.stringify(r));
r = await new Client("anon").call("GET", `/vendors/${vendorId}/packages`); ok("new rate moves public prices at once (20 jt -> 24 jt)", r.data?.[0]?.price === 24000000, JSON.stringify(r.data?.[0]));
r = await client.call("POST", `/bookings/${bk.id}/review`, { rating: 5, comment: "terlalu cepat" }); ok("review before completion refused (409)", r.status === 409, JSON.stringify(r));
r = await vendor.call("POST", `/bookings/${bk.id}/confirm`, {}); ok("vendor confirms", r.status < 300, JSON.stringify(r));
r = await client.call("POST", `/bookings/${bk.id}/pay/dp`, {}); ok("client starts DP payment (dev mode)", r.status < 300, JSON.stringify(r));
r = await client.call("POST", `/bookings/${bk.id}/dev-simulate-payment`, { type: "dp" }); ok("simulate DP paid", r.status < 300, JSON.stringify(r));
r = await client.call("GET", `/bookings/${bk.id}`); ok("status dp_paid, DP is 30%", r.data?.status === "dp_paid" && r.data?.dp_amount === 6600000, JSON.stringify(r.data));
r = await client.call("POST", `/bookings/${bk.id}/pay/full`, {}); ok("client starts full payment", r.status < 300, JSON.stringify(r));
r = await client.call("POST", `/bookings/${bk.id}/dev-simulate-payment`, { type: "full" }); ok("simulate full paid", r.status < 300, JSON.stringify(r));
r = await client.call("GET", `/bookings/${bk.id}`); ok("status full_paid", r.data?.status === "full_paid", JSON.stringify(r.data));
r = await client.call("POST", `/bookings/${bk.id}/meetings`, { scheduled_at: "2027-03-01T10:00:00+07:00", meeting_link: "https://meet.example/test" }); ok("technical meeting scheduled", r.status < 300, JSON.stringify(r));
r = await vendor2.call("GET", `/bookings/${bk.id}`); ok("unrelated vendor cannot read booking", r.status === 404 || r.status === 403, JSON.stringify(r));
r = await client.call("POST", `/bookings/${bk.id}/complete`, {}); ok("client confirms completion", r.status < 300, JSON.stringify(r));
r = await client.call("GET", `/bookings/${bk.id}`); ok("status completed", r.data?.status === "completed", JSON.stringify(r.data));

// 7. reviews (Fase G) + payouts
r = await client.call("POST", `/bookings/${bk.id}/review`, { rating: 5, comment: "Rapi dan tepat waktu." }); ok("review accepted after completion", r.status === 201, JSON.stringify(r));
r = await client.call("POST", `/bookings/${bk.id}/review`, { rating: 1, comment: "dobel" }); ok("duplicate review refused (409)", r.status === 409, JSON.stringify(r));
r = await client.call("POST", `/bookings/${bk.id}/review`, { rating: 9 }); ok("out-of-range rating refused (400/409)", r.status === 400 || r.status === 409, JSON.stringify(r));
r = await new Client("anon").call("GET", `/vendors/${vendorId}/reviews`); ok("public reviews list has the review", r.status === 200 && r.data.length === 1 && r.data[0].rating === 5, JSON.stringify(r.data));
r = await new Client("anon").call("GET", `/vendors/${vendorId}`); ok("vendor detail aggregate 5.0 from 1 review", r.data?.average_rating === 5 && r.data?.review_count === 1, JSON.stringify({ a: r.data?.average_rating, c: r.data?.review_count }));
r = await new Client("anon").call("GET", "/vendors?category=venue"); ok("directory card carries rating", r.data?.find((v) => v.id === vendorId)?.review_count === 1, JSON.stringify(r.data));
r = await vendor.call("GET", "/notifications"); const note = r.data?.find((n) => n.type === "review.received" || /Ulasan baru/.test(n.title || ""));
ok("vendor notified of review, link goes to dashboard", !!note && /\/vendor\/dashboard#ulasan-vendor/.test(note.link || ""), JSON.stringify(r.data));
r = await admin.call("GET", "/admin/disbursements/pending"); ok("completed booking appears in pending disbursements", r.status === 200 && r.data.some((d) => d.booking_id === bk.id), JSON.stringify(r.data));
r = await admin.call("GET", "/admin/dashboard"); ok("admin dashboard stats respond", r.status === 200 && typeof r.data?.active_vendors === "number", JSON.stringify(r));
r = await vendor.call("GET", "/vendor/payouts"); ok("payout keeps the commission fixed at booking (rate changed to 20% since)", r.status === 200 && r.data.some((d) => d.booking_id === bk.id && d.gross_amount === 22000000 && d.commission_amount === 2000000 && d.net_amount === 20000000), JSON.stringify(r.data));
// The 20% rate set after booking did not touch this deal: commission was fixed at booking time.
r = await admin.call("PATCH", `/admin/vendors/${vendorId}/commission`, { rate: null }); ok("admin clears the override", r.status === 200, JSON.stringify(r));
r = await admin.call("POST", `/admin/disbursements/${bk.id}/mark-disbursed`, {}); ok("admin marks disbursed", r.status < 300, JSON.stringify(r));
r = await admin.call("GET", "/admin/disbursements/pending"); ok("disbursement queue clears", !r.data.some((d) => d.booking_id === bk.id), JSON.stringify(r.data));

// 8. consultation channel
r = await client.call("POST", "/conversations/consultation", {}); ok("client opens consultation", r.status < 300 && r.data?.id, JSON.stringify(r)); const cc = r.data;
r = await consultant.call("GET", "/conversations"); ok("consultant sees consultation in inbox", r.status === 200 && r.data.some((c) => c.id === cc?.id), JSON.stringify(r.data));
r = await vendor2.call("GET", `/conversations/${cc?.id}/messages`); ok("vendor cannot read consultation", r.status === 403 || r.status === 404, JSON.stringify(r));

// 9. vendor tags on Inspirasi photos. Photos are seeded straight into the
// database (Admin upload needs Supabase Storage, which e2e never touches).
const photo = (f) => `http://localhost:3000/photos/pinterest/${f}.webp`;
const tagged = psql(`insert into inspiration_items (category, storage_path, public_url, caption, alt_text) values ('Pinterest', 'e2e-a', '${photo("venue-joglo")}', 'Akad di pendopo joglo', 'Pendopo joglo dengan lorong bunga putih') returning id`).split("\n")[0];
psql(`insert into inspiration_items (category, storage_path, public_url, caption, alt_text) values ('Pinterest', 'e2e-b', '${photo("dekorasi-taman")}', 'Dekorasi taman malam', 'Lilin dan lampu gantung di taman') returning id`);
r = await new Client("anon").call("GET", "/inspiration"); ok("inspiration items carry an empty vendors list", r.status === 200 && r.data.length === 2 && r.data.every((i) => Array.isArray(i.vendors) && i.vendors.length === 0), JSON.stringify(r.data));
r = await new Client("anon").call("PUT", `/admin/inspiration/${tagged}/vendors`, { vendor_ids: [vendorId] }); ok("anonymous cannot tag vendors (401)", r.status === 401, JSON.stringify(r));
r = await vendor.call("PUT", `/admin/inspiration/${tagged}/vendors`, { vendor_ids: [vendorId] }); ok("vendor cannot tag itself on a photo (403)", r.status === 403, JSON.stringify(r));
r = await admin.call("PUT", `/admin/inspiration/${tagged}/vendors`, { vendor_ids: [vendorId, vendor2Id] }); ok("pending vendor cannot be tagged (400)", r.status === 400, JSON.stringify(r));
r = await admin.call("PUT", `/admin/inspiration/${tagged}/vendors`, { vendor_ids: ["bukan-uuid"] }); ok("malformed vendor id refused (400)", r.status === 400, JSON.stringify(r));
r = await admin.call("PUT", `/admin/inspiration/${tagged}/vendors`, { vendor_ids: [vendorId, vendorId] }); ok("admin tags the approved vendor (duplicates collapse)", r.status === 200 && r.data?.vendors?.length === 1 && r.data.vendors[0].business_name === "Ballroom Uji", JSON.stringify(r));
r = await new Client("anon").call("GET", "/inspiration"); const tg = r.data?.find((i) => i.id === tagged)?.vendors;
ok("public gallery shows the tag with category and city", tg?.length === 1 && tg[0].id === vendorId && tg[0].category === "venue" && tg[0].city.includes("Jakarta Selatan"), JSON.stringify(r.data));
const audits = psql(`select count(*) from admin_audit_log where action = 'inspiration.set_vendors'`);
ok("only the successful tagging is written to the audit log", audits === "1", audits);

// 10. admin deletes a vendor: refused while bookings exist, permanent
// otherwise. vendor2 (still pending, no bookings) is the one deleted; the
// browser checks after this file never log in as vendor2.
r = await vendor.call("DELETE", `/admin/vendors/${vendor2Id}`); ok("vendor cannot delete vendors (403)", r.status === 403, JSON.stringify(r));
r = await admin.call("DELETE", `/admin/vendors/${vendorId}`); ok("vendor with bookings cannot be deleted (409)", r.status === 409 && /booking/.test(r.data?.error ?? ""), JSON.stringify(r));
ok("refused delete keeps the vendor", psql(`select count(*) from users where id = '${vendorId}'`) === "1");
r = await admin.call("DELETE", `/admin/vendors/${vendor2Id}`); ok("admin deletes a vendor without bookings", r.status === 200, JSON.stringify(r));
ok("deleted vendor's account and profile are gone", psql(`select count(*) from users where id = '${vendor2Id}'`) === "0" && psql(`select count(*) from vendor_profiles where user_id = '${vendor2Id}'`) === "0");
r = await new Client("v2again").call("POST", "/auth/login", { email: emails.vendor2, password: PW }); ok("deleted vendor cannot log in", r.status === 401, JSON.stringify(r));
r = await admin.call("DELETE", `/admin/vendors/${vendor2Id}`); ok("deleting again is 404", r.status === 404, JSON.stringify(r));
r = await admin.call("DELETE", `/admin/vendors/${(await client.call("GET", "/auth/me")).data.id}`); ok("a client account cannot be deleted here (404)", r.status === 404, JSON.stringify(r));
r = await admin.call("DELETE", "/admin/vendors/bukan-uuid"); ok("malformed id is 404", r.status === 404, JSON.stringify(r));
ok("deletion is written to the audit log", psql(`select count(*) from admin_audit_log where action = 'vendor.delete' and target_id = '${vendor2Id}'`) === "1");
r = await admin.call("GET", "/admin/audit-log"); const delEntry = r.data?.find((e) => e.action === "vendor.delete" && e.target_id === vendor2Id);
ok("audit log names who did it", delEntry?.actor_name === "Admin Uji" && delEntry?.actor_email === emails.admin && delEntry?.actor_role === "admin", JSON.stringify(delEntry));

console.log(results.join("\n")); console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
