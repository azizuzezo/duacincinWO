// Minimal stand-in for Supabase Storage, so e2e can exercise uploads without
// real keys. Accepts bucket creation, object upload and object delete, and
// lists what it holds at GET /__objects (used by e2e/api.mjs).
import { createServer } from "node:http";
const port = Number(process.env.E2E_STORAGE_PORT ?? 55433);
const objects = new Set();
createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const url = req.url ?? "";
    const send = (code, body = {}) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
    if (req.method === "GET" && url === "/__objects") return send(200, [...objects]);
    const obj = url.match(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/);
    if (req.method === "POST" && obj) { objects.add(`${obj[1]}/${obj[2]}`); return send(200); }
    const bucket = url.match(/^\/storage\/v1\/object\/([^/]+)$/);
    if (req.method === "DELETE" && bucket) {
      try { for (const p of JSON.parse(Buffer.concat(chunks).toString()).prefixes ?? []) objects.delete(`${bucket[1]}/${p}`); } catch {}
      return send(200);
    }
    if (req.method === "POST" && url === "/storage/v1/bucket") return send(200);
    send(404);
  });
}).listen(port, "127.0.0.1");
