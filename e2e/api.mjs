// End-to-end API journey: real Go server + throwaway Postgres (see e2e/README.md).
// Run via e2e/run.sh. It creates the data that e2e/ui.mjs later asserts on.
import { execSync } from "node:child_process";
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
const reg = (who, kind, email, name) => who.call("POST", `/auth/${kind}/register`, { email, password: PW, full_name: name, accept_terms: true });

// 1. registration + login for all roles
let r = await reg(vendor, "vendor", `vendor${stamp}@test.local`, "Vendor Uji"); ok("vendor registers", r.status === 201 || r.status === 200, JSON.stringify(r));
r = await reg(vendor2, "vendor", `vendor2${stamp}@test.local`, "Vendor Dua"); ok("second vendor registers", r.status < 300, JSON.stringify(r));
r = await reg(client, "client", `client${stamp}@test.local`, "Client Uji"); ok("client registers", r.status < 300, JSON.stringify(r));
await reg(admin, "client", `admin${stamp}@test.local`, "Admin Uji"); await reg(consultant, "client", `cons${stamp}@test.local`, "Konsultan Uji");
psql(`update users set role='admin' where email='admin${stamp}@test.local'`); psql(`update users set role='wedding_consultant' where email='cons${stamp}@test.local'`);
const emails = { vendor: `vendor${stamp}@test.local`, vendor2: `vendor2${stamp}@test.local`, client: `client${stamp}@test.local`, admin: `admin${stamp}@test.local`, consultant: `cons${stamp}@test.local` };
const who = { vendor, vendor2, client, admin, consultant };
for (const [k, c] of Object.entries(who)) { r = await c.call("POST", "/auth/login", { email: emails[k], password: PW }); ok(`${k} logs in`, r.status === 200 && !!c.cookie, JSON.stringify(r)); }
r = await client.call("GET", "/auth/me"); ok("client /me has role client", r.data?.role === "client", JSON.stringify(r));
r = await admin.call("GET", "/auth/me"); ok("admin /me has role admin", r.data?.role === "admin", JSON.stringify(r));
const vendorId = (await vendor.call("GET", "/auth/me")).data.id, vendor2Id = (await vendor2.call("GET", "/auth/me")).data.id;

// 2. vendor profile
r = await vendor.call("PUT", "/vendor/profile", { business_name: "Ballroom Uji", category: "venue", city: "Jakarta", price_min: 35000000, price_max: 120000000, description: "Venue uji untuk E2E." });
ok("vendor creates profile", r.status === 200 && r.data?.status === "pending", JSON.stringify(r));
r = await vendor2.call("PUT", "/vendor/profile", { business_name: "Dekor Uji", category: "decor", city: "Bandung", price_min: 5000000, price_max: 20000000, description: "x" });
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
r = await new Client("anon").call("GET", "/vendors?category=venue&city=jakarta"); ok("city filter is case-insensitive", r.data?.some((v) => v.id === vendorId), JSON.stringify(r.data));
r = await new Client("anon").call("GET", "/vendors?max_price=1000000"); ok("max_price filter excludes expensive vendor", !r.data?.some((v) => v.id === vendorId), JSON.stringify(r.data));
r = await new Client("anon").call("GET", `/vendors/${vendorId}/packages`); ok("public packages visible after approval", r.status === 200 && r.data.length === 2 && r.data[0].name === "Half Day Plus", JSON.stringify(r));

// 5. chat + contact-info filter
r = await client.call("POST", `/conversations/vendor/${vendorId}`, {}); ok("client starts vendor chat", r.status < 300 && r.data?.id, JSON.stringify(r)); const conv = r.data;
r = await client.call("POST", `/conversations/${conv.id}/messages`, { body: "Halo, apakah tanggal 14 Maret tersedia?" }); ok("client sends message", r.status < 300, JSON.stringify(r));
r = await client.call("POST", `/conversations/${conv.id}/messages`, { body: "WA saya 081234567890 ya" }); ok("phone number message is flagged", r.data?.flagged === true, JSON.stringify(r));
r = await vendor.call("GET", `/conversations/${conv.id}/messages`); ok("vendor reads thread (2 messages)", r.status === 200 && r.data.length >= 2, JSON.stringify(r));
r = await vendor2.call("GET", `/conversations/${conv.id}/messages`); ok("unrelated vendor cannot read thread", r.status === 403 || r.status === 404, JSON.stringify(r));

// 6. booking lifecycle with simulated payments (Midtrans not configured)
r = await client.call("POST", "/bookings", { vendor_id: vendorId, event_date: "2027-03-14", package_description: "Half Day Plus", agreed_price: 20000000 }); ok("client creates booking", r.status < 300 && r.data?.status === "requested", JSON.stringify(r)); const bk = r.data;
r = await client.call("POST", `/bookings/${bk.id}/review`, { rating: 5, comment: "terlalu cepat" }); ok("review before completion refused (409)", r.status === 409, JSON.stringify(r));
r = await vendor.call("POST", `/bookings/${bk.id}/confirm`, {}); ok("vendor confirms", r.status < 300, JSON.stringify(r));
r = await client.call("POST", `/bookings/${bk.id}/pay/dp`, {}); ok("client starts DP payment (dev mode)", r.status < 300, JSON.stringify(r));
r = await client.call("POST", `/bookings/${bk.id}/dev-simulate-payment`, { type: "dp" }); ok("simulate DP paid", r.status < 300, JSON.stringify(r));
r = await client.call("GET", `/bookings/${bk.id}`); ok("status dp_paid, DP is 30%", r.data?.status === "dp_paid" && r.data?.dp_amount === 6000000, JSON.stringify(r.data));
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
r = await vendor.call("GET", "/vendor/payouts"); ok("vendor sees payout with 10% default commission", r.status === 200 && r.data.some((d) => d.booking_id === bk.id && d.commission_amount === 2000000 && d.net_amount === 18000000), JSON.stringify(r.data));
r = await admin.call("POST", `/admin/disbursements/${bk.id}/mark-disbursed`, {}); ok("admin marks disbursed", r.status < 300, JSON.stringify(r));
r = await admin.call("GET", "/admin/disbursements/pending"); ok("disbursement queue clears", !r.data.some((d) => d.booking_id === bk.id), JSON.stringify(r.data));

// 8. consultation channel
r = await client.call("POST", "/conversations/consultation", {}); ok("client opens consultation", r.status < 300 && r.data?.id, JSON.stringify(r)); const cc = r.data;
r = await consultant.call("GET", "/conversations"); ok("consultant sees consultation in inbox", r.status === 200 && r.data.some((c) => c.id === cc?.id), JSON.stringify(r.data));
r = await vendor2.call("GET", `/conversations/${cc?.id}/messages`); ok("vendor cannot read consultation", r.status === 403 || r.status === 404, JSON.stringify(r));

console.log(results.join("\n")); console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
