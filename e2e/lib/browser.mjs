// Shared browser helpers for the e2e scripts: a headless Chromium driven over CDP
// (Node 22 built-in WebSocket, no npm dependencies) plus the seeded users.
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

export const SHOTS = process.env.SHOTS; // optional directory: save a screenshot per key page
export const PG = process.env.E2E_PG_CONTAINER ?? "dc-e2e-pg";
export const CHROMIUM = process.env.CHROMIUM ?? "/usr/bin/chromium-browser";
export const WEB = process.env.E2E_WEB_URL ?? "http://localhost:3000";
const stampEmails = execSync(`docker exec ${PG} psql -U postgres -d duacincin -tAc "select role||' '||email from users order by created_at"`).toString().trim().split("\n").map((l) => l.split(" "));
export const email = (role, nth = 0) => stampEmails.filter(([r]) => r === role)[nth][1];
export const PW = "KataSandi123";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function session() {
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
