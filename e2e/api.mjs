// End-to-end API journey: real Go server + throwaway Postgres (see e2e/README.md).
// Run via e2e/run.sh. It creates the data that e2e/ui.mjs later asserts on.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { deflateSync as zlibDeflate } from "node:zlib";
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
// A rejected vendor can fix the profile and send it back for review.
r = await vendor2.call("POST", "/vendor/profile/resubmit", {}); ok("resubmit is refused while the profile is pending (409)", r.status === 409, JSON.stringify(r));
r = await admin.call("POST", `/admin/vendors/${vendor2Id}/reject`, { reason: "Foto portofolio belum ada" }); ok("admin rejects the second vendor", r.status < 300, JSON.stringify(r));
r = await vendor2.call("GET", "/vendor/profile/me"); ok("rejected vendor sees the status and the reason", r.status === 200 && r.data?.status === "rejected" && r.data?.rejection_reason === "Foto portofolio belum ada", JSON.stringify(r));
r = await vendor2.call("PUT", "/vendor/profile", { business_name: "Dekor Uji", category: "decor", city: "Bandung", price_min: 5000000, price_max: 20000000, description: "Sudah diperbaiki", whatsapp_number: "+62 813 1111 2222" }); ok("rejected vendor can edit the profile", r.status === 200 && r.data?.status === "rejected", JSON.stringify(r));
r = await admin.call("GET", "/admin/vendors/pending"); ok("a rejected vendor is not in the pending queue before resubmitting", !r.data?.some((v) => v.user_id === vendor2Id || v.id === vendor2Id), JSON.stringify(r.data?.map((v) => v.business_name)));
r = await client.call("POST", "/vendor/profile/resubmit", {}); ok("a client cannot resubmit (403)", r.status === 403, JSON.stringify(r));
r = await vendor2.call("POST", "/vendor/profile/resubmit", {}); ok("rejected vendor resubmits: back to pending, reason cleared", r.status === 200 && r.data?.status === "pending" && !r.data?.rejection_reason, JSON.stringify(r));
r = await admin.call("GET", "/admin/vendors/pending"); ok("the resubmitted vendor is back in the pending queue", r.status === 200 && r.data?.some((v) => v.user_id === vendor2Id || v.id === vendor2Id), JSON.stringify(r.data?.map((v) => v.business_name)));
r = await vendor2.call("POST", "/vendor/profile/resubmit", {}); ok("resubmit twice is refused (409)", r.status === 409, JSON.stringify(r));
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
// Brief -> Vendor: one structured brief goes to approved vendors as the first chat message.
const brief = { category: "venue", city: "Jakarta Selatan", event_date: "Oktober 2027", guests: 300, style: "adat Jawa", budget_max: 90000000, notes: "Butuh parkir luas." };
r = await new Client("anon").call("POST", "/briefs", { ...brief, vendor_ids: [vendorId] }); ok("anonymous cannot send a brief (401)", r.status === 401, JSON.stringify(r));
r = await vendor.call("POST", "/briefs", { ...brief, vendor_ids: [vendorId] }); ok("vendor cannot send a brief (403)", r.status === 403, JSON.stringify(r));
r = await client.call("POST", "/briefs", { ...brief, vendor_ids: [] }); ok("brief without vendors is refused (400)", r.status === 400, JSON.stringify(r));
r = await client.call("POST", "/briefs", { ...brief, vendor_ids: [vendorId, "a", "b", "c", "d", "e"] }); ok("brief to more than 5 vendors is refused (400)", r.status === 400, JSON.stringify(r));
r = await client.call("POST", "/briefs", { ...brief, category: "nope", vendor_ids: [vendorId] }); ok("brief with an unknown category is refused (400)", r.status === 400, JSON.stringify(r));
r = await client.call("POST", "/briefs", { ...brief, notes: "hubungi saya di 081234567890", vendor_ids: [vendorId] }); ok("brief with a phone number is refused (400)", r.status === 400, JSON.stringify(r));
r = await client.call("POST", "/briefs", { ...brief, vendor_ids: [vendor2Id] }); ok("brief to a pending vendor is refused (409)", r.status === 409 && r.data?.skipped?.length === 1, JSON.stringify(r));
r = await client.call("POST", "/briefs", { ...brief, category: "decor", vendor_ids: [vendorId] }); ok("brief for a category the vendor does not offer is refused (409)", r.status === 409, JSON.stringify(r));
r = await client.call("POST", "/briefs", { ...brief, vendor_ids: [vendorId, vendorId] }); ok("brief reaches the approved vendor once (duplicates collapsed)", r.status === 201 && r.data?.sent?.length === 1 && r.data.sent[0].conversation_id === conv.id, JSON.stringify(r));
r = await vendor.call("GET", `/conversations/${conv.id}/messages`);
ok("vendor reads the brief as a chat message", r.status === 200 && r.data?.some((m) => m.body.includes("mencari Venue") && m.body.includes("Jumlah tamu: 300") && m.body.includes("sampai Rp90.000.000") && !m.flagged), JSON.stringify(r.data?.slice(-1)));
ok("the brief is recorded with its recipient", psql(`select count(*) from wedding_brief_recipients where vendor_id = '${vendorId}'`) === "1");
r = await client.call("POST", "/briefs", { ...brief, vendor_ids: [vendorId] }); ok("the same brief is not sent twice to a vendor (409)", r.status === 409, JSON.stringify(r));

// Vendor AI copilot: vendor-only; with no AI configured it says so instead of failing.
r = await new Client("anon").call("POST", "/vendor/ai/reply-draft", { conversation_id: conv.id }); ok("anonymous cannot ask for a reply draft (401)", r.status === 401, JSON.stringify(r));
r = await client.call("POST", "/vendor/ai/reply-draft", { conversation_id: conv.id }); ok("client cannot use the vendor copilot (403)", r.status === 403, JSON.stringify(r));
r = await client.call("POST", "/vendor/ai/describe", { notes: "x" }); ok("client cannot ask for a description draft (403)", r.status === 403, JSON.stringify(r));
r = await vendor.call("POST", "/vendor/ai/reply-draft", { conversation_id: conv.id }); ok("reply draft says the assistant is off when AI is not configured (503)", r.status === 503, JSON.stringify(r));
r = await vendor.call("POST", "/vendor/ai/describe", { notes: "MUA adat Sunda" }); ok("description draft says the assistant is off when AI is not configured (503)", r.status === 503, JSON.stringify(r));
r = await vendor.call("POST", "/vendor/ai/reply-draft", {}); ok("reply draft without a conversation is refused (400)", r.status === 400, JSON.stringify(r));
r = await admin.call("POST", `/conversations/admin-vendor/${vendor2Id}`, {}); ok("admin can reach a vendor still pending review", r.status === 200, JSON.stringify(r));
r = await admin.call("POST", `/conversations/${av.id}/messages`, { body: "Halo, mohon konfirmasi nomor 081234567890 untuk verifikasi." }); ok("admin sends; contact details are not flagged in an admin chat", r.status === 201 && r.data?.flagged === false, JSON.stringify(r));

// 5c. Admin: registered clients and read-only client-vendor chats
{
  let w = await admin.call("GET", "/admin/clients?q=client%20uji");
  ok("admin lists registered clients with their WhatsApp status", w.status === 200 && w.data?.items?.some((c) => c.full_name === "Client Uji" && c.whatsapp_status === "verified" && c.conversations >= 1), JSON.stringify(w.data));
  w = await vendor.call("GET", "/admin/clients");
  ok("only admins can list clients", w.status === 403, JSON.stringify(w));
  w = await admin.call("GET", "/admin/chats?q=ballroom");
  const row = w.data?.items?.find((c) => c.id === conv.id);
  ok("admin lists client-vendor chats with names and counts", w.status === 200 && row?.client_name === "Client Uji" && row?.vendor_name === "Ballroom Uji" && row?.messages >= 3 && row?.flagged >= 1, JSON.stringify(row ?? w.data));
  w = await admin.call("GET", `/admin/chats?client_id=${(await client.call("GET", "/auth/me")).data.id}`);
  ok("chats can be narrowed to one client", w.status === 200 && w.data?.items?.length >= 1 && w.data.items.every((c) => c.client_name === "Client Uji"), JSON.stringify(w.data));
  const before = (await client.call("GET", `/conversations/${conv.id}/messages`)).data?.map((m) => m.status).join(",");
  w = await admin.call("GET", `/admin/chats/${conv.id}`);
  ok("admin reads a client-vendor chat, each message marked client or vendor", w.status === 200 && w.data?.conversation?.vendor?.name === "Ballroom Uji" && w.data.messages.some((m) => m.from === "client" && m.body.includes("14 Maret")) && w.data.messages.some((m) => m.from === "vendor"), JSON.stringify(w.data?.messages?.slice(0, 2)));
  await admin.call("GET", `/admin/chats/${conv.id}`);
  const after = (await client.call("GET", `/conversations/${conv.id}/messages`)).data?.map((m) => m.status).join(",");
  ok("reading as admin changes no read ticks", before === after, `${before} -> ${after}`);
  w = await admin.call("GET", "/admin/audit-log?limit=20");
  ok("opening a chat is audit-logged once per day", w.data?.filter((e) => e.action === "chat.view" && e.target_id === conv.id).length === 1, JSON.stringify(w.data?.filter((e) => e.action === "chat.view")));
  w = await admin.call("GET", `/admin/chats/${av.id}`);
  ok("the admin chat view is only for client-vendor chats", w.status === 404, JSON.stringify(w));
  w = await vendor.call("GET", `/admin/chats/${conv.id}`);
  ok("only admins can read chats here", w.status === 403, JSON.stringify(w));
}
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

// 5d. edit and retract a message, attachment signing and attachment references (admin <-> vendor thread)
{
  const base = `/conversations/${av.id}/messages`;
  r = await admin.call("POST", base, { body: "Draf awal pesan" }); const em = r.data; ok("admin sends a message to edit", r.status === 201 && em?.edited === false && em?.retracted === false, JSON.stringify(r));
  r = await admin.call("PATCH", `${base}/${em.id}`, { body: "  Pesan sudah diperbaiki  " }); ok("sender edits within the window: body changes, edited=true", r.status === 200 && r.data?.body === "Pesan sudah diperbaiki" && r.data?.edited === true && r.data?.retracted === false, JSON.stringify(r));
  r = await vendor.call("PATCH", `${base}/${em.id}`, { body: "Dibajak" }); ok("the other participant cannot edit (403)", r.status === 403, JSON.stringify(r));
  r = await client.call("PATCH", `${base}/${em.id}`, { body: "Dibajak" }); ok("a non-participant cannot edit", r.status === 404 || r.status === 403, JSON.stringify(r));
  r = await admin.call("PATCH", `${base}/${em.id}`, { body: "   " }); ok("empty edit is 400", r.status === 400, JSON.stringify(r));
  r = await admin.call("PATCH", `${base}/${em.id}`, { body: "sampai jumpa di wa.me/62812" }); ok("admin chats are not contact-filtered on edit", r.status === 200 && r.data?.flagged === false, JSON.stringify(r));
  r = await admin.call("PATCH", `${base}/bukan-uuid`, { body: "x" }); ok("editing an unknown message is 404", r.status === 404, JSON.stringify(r));
  r = await vendor.call("GET", base); ok("the other side reads the edited text", r.data?.find((m) => m.id === em.id)?.edited === true, JSON.stringify(r.data?.find((m) => m.id === em.id)));
  psql(`update messages set created_at = now() - interval '20 minutes' where id='${em.id}'`);
  r = await admin.call("PATCH", `${base}/${em.id}`, { body: "Terlambat" }); ok("edit after 15 minutes is refused", r.status === 403 && r.data?.error === "Pesan hanya bisa diedit 15 menit setelah dikirim.", JSON.stringify(r));

  r = await admin.call("POST", base, { body: "Pesan yang akan ditarik" }); const rm = r.data;
  r = await vendor.call("POST", base, { body: "Membalas pesan itu", reply_to_message_id: rm.id }); const reply = r.data; ok("vendor replies to it (preview shows the text)", r.status === 201 && reply?.reply_to?.body === "Pesan yang akan ditarik" && !reply.reply_to.retracted, JSON.stringify(r));
  r = await vendor.call("DELETE", `${base}/${rm.id}`); ok("the other participant cannot retract (403)", r.status === 403, JSON.stringify(r));
  r = await client.call("DELETE", `${base}/${rm.id}`); ok("a non-participant cannot retract", r.status === 404 || r.status === 403, JSON.stringify(r));
  r = await admin.call("DELETE", `${base}/${rm.id}`); ok("sender retracts: body empty, retracted=true", r.status === 200 && r.data?.body === "" && r.data?.retracted === true && !r.data?.attachment_url && r.data?.flagged === false, JSON.stringify(r));
  r = await admin.call("DELETE", `${base}/${rm.id}`); ok("retract is idempotent", r.status === 200 && r.data?.retracted === true && r.data?.body === "", JSON.stringify(r));
  r = await vendor.call("GET", base); const listed = r.data?.find((m) => m.id === rm.id);
  ok("the list shows the retracted message without its body", listed?.retracted === true && listed?.body === "", JSON.stringify(listed));
  ok("a reply preview of a retracted message is blanked", r.data?.find((m) => m.id === reply.id)?.reply_to?.body === "" && r.data?.find((m) => m.id === reply.id)?.reply_to?.retracted === true, JSON.stringify(r.data?.find((m) => m.id === reply.id)));
  ok("the retracted body stays in the database for moderation", psql(`select body from messages where id='${rm.id}'`) === "Pesan yang akan ditarik");
  r = await admin.call("PATCH", `${base}/${rm.id}`, { body: "Hidupkan lagi" }); ok("edit after retract is refused", r.status === 409 || r.status === 403, JSON.stringify(r));
  r = await admin.call("POST", base, { body: "Pesan lama" }); const old = r.data;
  psql(`update messages set created_at = now() - interval '25 hours' where id='${old.id}'`);
  r = await admin.call("DELETE", `${base}/${old.id}`); ok("retract after 24 hours is refused", r.status === 403 && r.data?.error === "Pesan hanya bisa ditarik 24 jam setelah dikirim.", JSON.stringify(r));

  // Attachment signing: auth -> participant -> validation -> configuration. e2e has no CLOUDINARY_URL.
  const sign = `/conversations/${av.id}/attachments/sign`;
  r = await new Client("anon").call("POST", sign, { name: "a.pdf", type: "application/pdf", size: 1000 }); ok("sign needs a session", r.status === 401, JSON.stringify(r));
  r = await client.call("POST", sign, { name: "a.pdf", type: "application/pdf", size: 1000 }); ok("sign: a non-participant is refused", r.status === 404 || r.status === 403, JSON.stringify(r));
  r = await admin.call("POST", sign, { name: "a.zip", type: "application/zip", size: 1000 }); ok("sign rejects an unsupported type", r.status === 400 && r.data?.error === "Jenis file ini belum didukung.", JSON.stringify(r));
  r = await admin.call("POST", sign, { name: "a.svg", type: "image/svg+xml", size: 1000 }); ok("sign rejects svg", r.status === 400, JSON.stringify(r));
  r = await admin.call("POST", sign, { name: "a.jpg", type: "image/jpeg", size: 16 * 1024 * 1024 }); ok("sign rejects an oversize photo", r.status === 400 && r.data?.error === "Ukuran file maksimal 15 MB untuk foto.", JSON.stringify(r));
  r = await admin.call("POST", sign, { name: "a.mp4", type: "video/mp4", size: 101 * 1024 * 1024 }); ok("sign rejects an oversize video", r.status === 400 && r.data?.error === "Ukuran file maksimal 100 MB untuk video.", JSON.stringify(r));
  r = await admin.call("POST", sign, { name: "a.pdf", type: "application/pdf", size: 26 * 1024 * 1024 }); ok("sign rejects an oversize document", r.status === 400 && r.data?.error === "Ukuran file maksimal 25 MB untuk dokumen.", JSON.stringify(r));
  r = await admin.call("POST", sign, { name: "a.pdf", type: "application/pdf", size: 1000 }); ok("sign without Cloudinary configured is 503", r.status === 503 && r.data?.error === "Penyimpanan lampiran belum dikonfigurasi.", JSON.stringify(r));

  // Attachment references on send
  r = await admin.call("POST", base, { body: "", attachment_url: "https://example.com/x.png", attachment_type: "image/png" }); ok("send rejects an arbitrary attachment url", r.status === 400, JSON.stringify(r));
  r = await admin.call("POST", base, { body: "", attachment_url: `https://res.cloudinary.com/demo/raw/upload/v1/duacincin/chat/${av.id}/a.pdf`, attachment_type: "application/pdf" }); ok("send rejects a Cloudinary url while Cloudinary is not configured", r.status === 400, JSON.stringify(r));
  r = await admin.call("POST", base, { body: "", attachment_url: "https://example.com/x.zip", attachment_type: "application/zip" }); ok("send rejects an unsupported attachment type", r.status === 400 && r.data?.error === "Jenis file ini belum didukung.", JSON.stringify(r));
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  const form = new FormData(); form.append("file", new Blob([png], { type: "image/png" }), "kecil.png");
  { const res = await fetch(`${BASE}/conversations/${av.id}/attachments`, { method: "POST", headers: { Cookie: admin.cookie }, body: form }); r = { status: res.status, data: await res.json().catch(() => null) }; }
  ok("the multipart image upload still works", r.status === 201 && r.data?.url && r.data?.type === "image/png", JSON.stringify(r));
  const up = r.data;
  r = await admin.call("POST", base, { body: "", attachment_url: up?.url, attachment_type: up?.type, attachment_name: "../kecil.png", attachment_size: png.length }); const att = r.data; ok("and its url is accepted on send, name sanitized", r.status === 201 && att?.attachment_url === up?.url && att?.attachment_name === "kecil.png" && att?.attachment_size === png.length, JSON.stringify(r));
  r = await admin.call("DELETE", `${base}/${att.id}`); ok("retracting hides the attachment", r.status === 200 && !r.data?.attachment_url && !r.data?.attachment_name && !r.data?.attachment_size && r.data?.body === "", JSON.stringify(r));
  r = await admin.call("POST", base, { body: "", attachment_url: up?.url, attachment_type: "image/png" }); const att2 = r.data;
  r = await admin.call("PATCH", `${base}/${att2.id}`, { body: "teks" }); ok("an attachment-only message cannot be edited", r.status === 400, JSON.stringify(r));
}

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
// 6b. availability: a locked day is unavailable, the vendor can close days by hand, and the couple's wedding date is stored.
r = await client.call("GET", `/vendors/${vendorId}/availability?from=2027-03-01&to=2027-03-31`); ok("public availability marks the booked day (no names)", r.status === 200 && r.data?.dates?.some((d) => d.date === "2027-03-14" && d.reason === "booked") && !JSON.stringify(r.data).includes(bk.id), JSON.stringify(r));
r = await client.call("GET", `/vendors/${vendorId}/availability?from=2027-03-31&to=2027-03-01`); ok("availability with to before from is refused (400)", r.status === 400, JSON.stringify(r));
r = await client.call("GET", `/vendors/${vendorId}/availability?from=2027-01-01&to=2028-12-31`); ok("availability range over 400 days is refused (400)", r.status === 400, JSON.stringify(r));
r = await client.call("POST", "/bookings", { vendor_id: vendorId, event_date: "2027-03-14", package_description: "Dobel", agreed_price: 10000000 }); ok("booking on a day locked by another booking is refused (409)", r.status === 409, JSON.stringify(r));
r = await vendor.call("PUT", "/vendor/availability/blocked", { dates: ["2027-03-20", "2027-03-21"], blocked: true }); ok("vendor closes two days", r.status === 200 && r.data?.dates?.filter((d) => d.reason === "blocked").length === 2, JSON.stringify(r));
r = await vendor.call("PUT", "/vendor/availability/blocked", { dates: ["2027-03-20"], blocked: true }); ok("closing a closed day again is a no-op (200)", r.status === 200, JSON.stringify(r));
r = await client.call("POST", "/bookings", { vendor_id: vendorId, event_date: "2027-03-20", package_description: "Hari ditutup", agreed_price: 10000000 }); ok("booking on a day the vendor closed is refused (409)", r.status === 409 && /tidak tersedia/i.test(r.data?.error ?? ""), JSON.stringify(r));
r = await vendor.call("PUT", "/vendor/availability/blocked", { dates: ["2027-03-14"], blocked: true }); ok("vendor cannot close a day locked by a booking (409)", r.status === 409, JSON.stringify(r));
r = await vendor.call("PUT", "/vendor/availability/blocked", { dates: ["2020-01-01"], blocked: true }); ok("closing a past day is refused (400)", r.status === 400, JSON.stringify(r));
r = await client.call("PUT", "/vendor/availability/blocked", { dates: ["2027-03-22"], blocked: true }); ok("a client cannot close vendor days (403)", r.status === 403, JSON.stringify(r));
r = await vendor.call("PUT", "/vendor/availability/blocked", { dates: ["2027-03-20", "2027-03-21"], blocked: false }); ok("vendor reopens the days", r.status === 200 && !r.data?.dates?.some((d) => d.reason === "blocked"), JSON.stringify(r));
r = await vendor.call("GET", "/vendor/availability?from=2027-03-01&to=2027-03-31"); ok("vendor sees its own calendar", r.status === 200 && r.data?.dates?.some((d) => d.date === "2027-03-14"), JSON.stringify(r));
r = await client.call("PUT", "/me/wedding-date", { wedding_date: "2027-03-14" }); ok("client saves the wedding date", r.status === 200 && r.data?.wedding_date === "2027-03-14", JSON.stringify(r));
r = await client.call("GET", "/auth/me"); ok("current user carries the wedding date", r.data?.wedding_date === "2027-03-14", JSON.stringify(r));
r = await client.call("PUT", "/me/wedding-date", { wedding_date: "2027-02-30" }); ok("an impossible wedding date is refused (400)", r.status === 400, JSON.stringify(r));
r = await client.call("PUT", "/me/wedding-date", { wedding_date: "2020-01-01" }); ok("a past wedding date is refused (400)", r.status === 400, JSON.stringify(r));
r = await vendor.call("PUT", "/me/wedding-date", { wedding_date: "2027-03-14" }); ok("a vendor cannot set a wedding date (403)", r.status === 403, JSON.stringify(r));
r = await client.call("PUT", "/me/wedding-date", { wedding_date: "" }); ok("the wedding date can be cleared", r.status === 200 && !r.data?.wedding_date, JSON.stringify(r));
// 6c. profile picture: any signed-in role can upload one (storage is the fake from e2e/fake-storage.mjs).
{
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, "ascii"); data.copy(out, 8); out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length); return out; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlibDeflate(Buffer.from([0, 255, 0, 0]))), chunk("IEND", Buffer.alloc(0))]);
  const upload = async (who, bytes, name, type) => {
    const form = new FormData(); form.append("file", new Blob([bytes], { type }), name);
    const res = await fetch(BASE + "/me/avatar", { method: "POST", headers: who.cookie ? { Cookie: who.cookie } : {}, body: form });
    const txt = await res.text(); let data = null; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    return { status: res.status, data };
  };
  const stored = async () => (await (await fetch(`http://127.0.0.1:${process.env.E2E_STORAGE_PORT ?? 55433}/__objects`)).json()).filter((p) => p.startsWith("foto-profil/"));
  r = await upload(client, png, "me.png", "image/png"); const avatarUrl = r.data?.avatar_url;
  ok("client uploads a profile picture", r.status === 200 && /^https?:\/\/.+\/foto-profil\/.+\.png$/.test(avatarUrl ?? ""), JSON.stringify(r));
  r = await client.call("GET", "/auth/me"); ok("current user carries the avatar url", r.data?.avatar_url === avatarUrl, JSON.stringify(r));
  const first = (await stored()).length;
  r = await upload(client, png, "again.png", "image/png"); ok("a second upload replaces the picture", r.status === 200 && r.data?.avatar_url && r.data.avatar_url !== avatarUrl, JSON.stringify(r));
  ok("the previous avatar object is removed from storage", first === 1 && (await stored()).length === 1, JSON.stringify(await stored()));
  r = await upload(client, "ini bukan gambar", "fake.png", "image/png"); ok("a text file renamed .png is refused (400)", r.status === 400, JSON.stringify(r));
  r = await upload(new Client("anon"), png, "me.png", "image/png"); ok("avatar upload without login is refused (401)", r.status === 401, JSON.stringify(r));
  r = await upload(vendor, png, "v.png", "image/png"); ok("a vendor can upload a profile picture too", r.status === 200 && !!r.data?.avatar_url, JSON.stringify(r));
  r = await client.call("DELETE", "/me/avatar"); ok("client clears the profile picture", r.status === 200 && r.data?.avatar_url === "", JSON.stringify(r));
  r = await client.call("GET", "/auth/me"); ok("current user no longer has an avatar url", r.status === 200 && !("avatar_url" in (r.data ?? {})), JSON.stringify(r));
  r = await client.call("DELETE", "/me/avatar"); ok("clearing again is a no-op (200)", r.status === 200 && r.data?.avatar_url === "", JSON.stringify(r));
  ok("only the vendor's avatar object is left in storage", (await stored()).length === 1, JSON.stringify(await stored()));
  r = await new Client("anon").call("DELETE", "/me/avatar"); ok("clearing without login is refused (401)", r.status === 401, JSON.stringify(r));
}
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

// 10b. The API host is never a web page: robots.txt disallows everything and every response says noindex.
{
  const root = BASE.replace(/\/api\/v1$/, "");
  const rb = await fetch(`${root}/robots.txt`); const rbt = await rb.text();
  ok("API robots.txt disallows everything", rb.status === 200 && /Disallow: \//.test(rbt), rbt);
  const hz = await fetch(`${root}/healthz`);
  ok("API responses carry X-Robots-Tag noindex", /noindex/.test(hz.headers.get("x-robots-tag") ?? ""), String(hz.headers.get("x-robots-tag")));
}

// 11. Articles: admin-written, rich-text body as a validated ProseMirror document.
{
  const anon = new Client("anon-art");
  const doc = (...content) => ({ type: "doc", content });
  const para = (text) => ({ type: "paragraph", content: [{ type: "text", text }] });
  const title = `Tips Memilih Venue ${stamp}`;
  r = await client.call("GET", "/admin/articles"); ok("client cannot list admin articles (403)", r.status === 403, JSON.stringify(r));
  r = await vendor.call("POST", "/admin/articles", { title }); ok("vendor cannot create an article (403)", r.status === 403, JSON.stringify(r));
  r = await anon.call("GET", "/admin/articles"); ok("anonymous cannot list admin articles (401)", r.status === 401, JSON.stringify(r));
  r = await admin.call("POST", "/admin/articles", { title }); ok("admin creates a draft, slug derived, reading_minutes >= 1", r.status === 201 && r.data?.status === "draft" && r.data.slug === `tips-memilih-venue-${stamp}` && r.data.reading_minutes >= 1 && r.data.author_name === "Admin Uji" && r.data.body?.type === "doc" && r.data.published_at === null, JSON.stringify(r));
  const art = r.data;
  r = await admin.call("POST", "/admin/articles", { title }); ok("same title gets a -2 slug", r.status === 201 && r.data?.slug === `${art.slug}-2`, JSON.stringify(r));
  const art2 = r.data;
  r = await admin.call("POST", "/admin/articles", { title: "Judul lain", slug: art.slug }); ok("typed duplicate slug is refused (409)", r.status === 409 && r.data?.error === "alamat artikel sudah dipakai", JSON.stringify(r));
  r = await admin.call("POST", "/admin/articles", { title: "Judul lain", slug: "Bad Slug!" }); ok("malformed typed slug is refused (400)", r.status === 400, JSON.stringify(r));
  r = await admin.call("POST", "/admin/articles", { title: "ab" }); ok("too short title is refused (400)", r.status === 400, JSON.stringify(r));
  r = await admin.call("POST", "/admin/articles", { title: "Judul bagus", cover_url: "javascript:alert(1)" }); ok("bad cover url is refused (400)", r.status === 400, JSON.stringify(r));
  r = await admin.call("POST", "/admin/articles", { title: "Judul bagus", body: doc({ type: "script", content: [] }) }); ok("unknown node type is refused (400, Indonesian)", r.status === 400 && /^isi artikel tidak valid/.test(r.data?.error ?? ""), JSON.stringify(r));
  r = await admin.call("POST", "/admin/articles", { title: "Judul bagus", body: doc({ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }) }); ok("javascript: link is refused (400)", r.status === 400 && /^isi artikel tidak valid/.test(r.data?.error ?? ""), JSON.stringify(r));
  let deep = { type: "paragraph" }; for (let i = 0; i < 13; i++) deep = { type: "blockquote", content: [deep] };
  r = await admin.call("POST", "/admin/articles", { title: "Judul bagus", body: doc(deep) }); ok("too-deep document is refused (400)", r.status === 400 && /^isi artikel tidak valid/.test(r.data?.error ?? ""), JSON.stringify(r));
  r = await admin.call("POST", "/admin/articles", { title: "Judul bagus", body: doc({ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "textStyle", attrs: { fontFamily: "Comic Sans" } }] }] }) }); ok("font outside the allowlist is refused (400)", r.status === 400, JSON.stringify(r));
  const words = Array.from({ length: 450 }, () => "kata").join(" ");
  const longBody = doc({ type: "heading", attrs: { level: 2, textAlign: "center" }, content: [{ type: "text", text: "Mulai dari anggaran" }] }, para(words));
  r = await admin.call("PUT", `/admin/articles/${art.id}`, { title: "Memilih Venue dengan Tenang", slug: `venue-${stamp}`, description: "Panduan singkat memilih venue pernikahan sesuai anggaran.", topic: "Venue", body: longBody, author_name: "Tim Dua Cincin" });
  ok("admin updates the article (slug, body, reading time 3)", r.status === 200 && r.data?.slug === `venue-${stamp}` && r.data.reading_minutes === 3 && r.data.author_name === "Tim Dua Cincin" && r.data.body?.content?.length === 2 && r.data.status === "draft", JSON.stringify(r).slice(0, 300));
  r = await admin.call("PUT", `/admin/articles/${art.id}`, { title: "Memilih Venue dengan Tenang", slug: art2.slug }); ok("update to a taken slug is refused (409)", r.status === 409, JSON.stringify(r));
  r = await admin.call("PUT", `/admin/articles/${art.id}`, { title: "Memilih Venue dengan Tenang", description: "Panduan singkat memilih venue pernikahan sesuai anggaran.", topic: "Venue" });
  ok("update without body or slug keeps both", r.status === 200 && r.data?.slug === `venue-${stamp}` && r.data.body?.content?.length === 2, JSON.stringify(r).slice(0, 300));
  r = await admin.call("GET", `/admin/articles/${art.id}`); ok("admin get returns the body as an object", r.status === 200 && typeof r.data?.body === "object" && r.data.body.type === "doc", JSON.stringify(r).slice(0, 200));
  r = await admin.call("GET", "/admin/articles/bukan-uuid"); ok("malformed id is 404", r.status === 404, JSON.stringify(r));
  r = await admin.call("GET", "/admin/articles?status=draft"); ok("admin list (summaries, no body) filters by status", r.status === 200 && r.data.some((a) => a.id === art.id) && r.data.every((a) => a.status === "draft" && !("body" in a)), JSON.stringify(r).slice(0, 200));
  r = await admin.call("GET", "/admin/articles?status=nope"); ok("bad status filter is refused (400)", r.status === 400, JSON.stringify(r));
  r = await anon.call("GET", "/articles"); ok("public list does not show the draft", r.status === 200 && Array.isArray(r.data) && !r.data.some((a) => a.id === art.id), JSON.stringify(r).slice(0, 200));
  r = await anon.call("GET", `/articles/venue-${stamp}`); ok("public get of a draft is 404", r.status === 404, JSON.stringify(r));
  // publish: empty body and short description are refused
  r = await admin.call("POST", `/admin/articles/${art2.id}/publish`); ok("publish without description is refused (400)", r.status === 400 && /deskripsi/.test(r.data?.error ?? ""), JSON.stringify(r));
  r = await admin.call("PUT", `/admin/articles/${art2.id}`, { title, description: "Deskripsi yang cukup panjang untuk terbit." }); ok("description saved", r.status === 200, JSON.stringify(r));
  r = await admin.call("POST", `/admin/articles/${art2.id}/publish`); ok("publish with an empty body is refused (400)", r.status === 400 && /isi artikel/.test(r.data?.error ?? ""), JSON.stringify(r));
  r = await admin.call("PUT", `/admin/articles/${art2.id}`, { title, description: "Deskripsi yang cukup panjang untuk terbit.", body: doc(para("Isi artikel yang nyata.")) }); ok("body saved", r.status === 200, JSON.stringify(r));
  r = await admin.call("POST", `/admin/articles/${art2.id}/publish`); ok("publish succeeds, published_at set", r.status === 200 && r.data?.status === "published" && !!r.data.published_at, JSON.stringify(r).slice(0, 300));
  const firstPub = r.data?.published_at;
  r = await anon.call("GET", "/articles"); ok("public list shows it without body", r.status === 200 && r.data.some((a) => a.slug === art2.slug && !("body" in a) && !("created_by" in a) && a.status === "published"), JSON.stringify(r).slice(0, 300));
  { const res = await fetch(`${BASE}/articles/${art2.slug}`); const data = await res.json(); ok("public get returns the body object with cache headers", res.status === 200 && data.body?.type === "doc" && data.body.content[0].content[0].text === "Isi artikel yang nyata." && /max-age=60/.test(res.headers.get("cache-control") ?? "") && !("created_by" in data), JSON.stringify(data).slice(0, 200)); }
  { const res = await fetch(`${BASE}/articles?limit=1`); const data = await res.json(); ok("public list honours limit", res.status === 200 && data.length <= 1 && /stale-while-revalidate/.test(res.headers.get("cache-control") ?? "")); }
  await new Promise((res) => setTimeout(res, 1100));
  r = await admin.call("POST", `/admin/articles/${art2.id}/publish`); ok("republish keeps the original published_at", r.status === 200 && r.data?.published_at === firstPub, JSON.stringify({ a: r.data?.published_at, b: firstPub }));
  r = await admin.call("POST", `/admin/articles/${art2.id}/unpublish`); ok("unpublish returns it to draft", r.status === 200 && r.data?.status === "draft", JSON.stringify(r).slice(0, 200));
  r = await anon.call("GET", `/articles/${art2.slug}`); ok("unpublished article is 404 publicly", r.status === 404, JSON.stringify(r));
  r = await admin.call("POST", `/admin/articles/${art2.id}/publish`); ok("republish after unpublish keeps the first date", r.status === 200 && r.data?.published_at === firstPub, JSON.stringify(r).slice(0, 200));
  // image upload through the fake storage
  const upImg = async (who, bytes, name, type) => {
    const form = new FormData(); form.append("file", new Blob([bytes], { type }), name);
    const res = await fetch(BASE + "/admin/articles/images", { method: "POST", headers: who.cookie ? { Cookie: who.cookie } : {}, body: form });
    const txt = await res.text(); let data = null; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    return { status: res.status, data };
  };
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  r = await upImg(admin, gif, "kecil.gif", "image/gif"); ok("admin uploads an article image (200 + public url)", r.status === 200 && /^https?:\/\/.+\/artikel-foto\/[0-9a-f-]{36}\.gif$/.test(r.data?.url ?? ""), JSON.stringify(r));
  r = await upImg(admin, "ini bukan gambar", "palsu.png", "image/png"); ok("a text file renamed .png is refused (400)", r.status === 400, JSON.stringify(r));
  r = await upImg(client, gif, "kecil.gif", "image/gif"); ok("client cannot upload article images (403)", r.status === 403, JSON.stringify(r));
  // delete
  r = await client.call("DELETE", `/admin/articles/${art.id}`); ok("client cannot delete (403)", r.status === 403, JSON.stringify(r));
  r = await admin.call("DELETE", `/admin/articles/${art.id}`); ok("admin deletes an article", r.status === 200 && r.data?.message === "artikel dihapus", JSON.stringify(r));
  r = await admin.call("GET", `/admin/articles/${art.id}`); ok("deleted article is 404", r.status === 404, JSON.stringify(r));
  r = await admin.call("DELETE", `/admin/articles/${art.id}`); ok("deleting again is 404", r.status === 404, JSON.stringify(r));
  const acts = psql(`select string_agg(distinct action, ',' order by action) from admin_audit_log where action like 'article.%'`);
  ok("every article action is audited", acts === "article.create,article.delete,article.publish,article.unpublish,article.update", acts);
  await admin.call("DELETE", `/admin/articles/${art2.id}`);
}

console.log(results.join("\n")); console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
