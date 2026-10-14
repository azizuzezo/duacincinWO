// Thin WhatsApp transport for DuaCincin's vendor_chat relay. This process
// has no business logic of its own: every inbound text is POSTed to the Go
// API's /api/v1/whatsapp/inbound webhook, and whatever `reply` comes back is
// sent verbatim. The Go side (server/internal/whatsapp) decides everything —
// linking, menus, message storage, anti-circumvention filtering, and the
// other-direction relay via this file's /deliver endpoint.
import "dotenv/config";

import express from "express";
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";

const AUTH_DIR = process.env.AUTH_DIR || "./auth_info_baileys";
const GO_API_URL = (process.env.GO_API_URL || "http://localhost:8080/api/v1").replace(/\/+$/, "");
const BOT_SHARED_SECRET = process.env.WHATSAPP_BOT_SECRET || "";
const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || "127.0.0.1"; // internal-only by default — the Go API is the only expected caller

if (!BOT_SHARED_SECRET) {
  console.warn("WARNING: WHATSAPP_BOT_SECRET is not set — every request to/from the Go API will be rejected.");
}

let activeSock = null;
let reconnectTimer = null;

function extractText(message) {
  return message?.conversation || message?.extendedTextMessage?.text || message?.imageMessage?.caption || "";
}

function phoneFromJID(jid) {
  return (jid || "").split("@")[0].split(":")[0];
}

async function forwardToBackend(jid, phone, text) {
  try {
    const res = await fetch(`${GO_API_URL}/whatsapp/inbound`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Bot-Secret": BOT_SHARED_SECRET },
      body: JSON.stringify({ jid, phone, text }),
    });
    if (!res.ok) {
      console.error("inbound webhook returned", res.status);
      return;
    }
    const data = await res.json();
    if (data?.reply) {
      await activeSock?.sendMessage(jid, { text: data.reply });
    }
  } catch (error) {
    console.error("forward to backend failed:", error);
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startWhatsApp().catch((error) => console.error("reconnect failed:", error));
  }, 5000);
}

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    markOnlineOnConnect: false,
    shouldSyncHistoryMessage: () => false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\nScan this QR with the DuaCincin WhatsApp number: WhatsApp -> Linked Devices -> Link a Device\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      activeSock = sock;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      console.log("WhatsApp connected:", sock.user?.id);
    }

    if (connection === "close") {
      if (activeSock === sock) activeSock = null;
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log("Connection closed, status:", statusCode);
      if (statusCode === DisconnectReason.loggedOut) {
        console.log(`Session logged out — delete ${AUTH_DIR} and scan the QR again.`);
        return;
      }
      scheduleReconnect();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const m of messages) {
      const jid = m.key.remoteJid;
      if (!jid || m.key.fromMe || jid.endsWith("@g.us") || jid === "status@broadcast") continue;

      const text = extractText(m.message).trim();
      if (!text) continue;

      await forwardToBackend(jid, phoneFromJID(jid), text);
    }
  });

  return sock;
}

function startDeliveryServer() {
  const app = express();
  app.use(express.json());

  app.post("/deliver", async (req, res) => {
    if (req.header("X-Bot-Secret") !== BOT_SHARED_SECRET) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const { jid, text } = req.body || {};
    if (!jid || !text) {
      return res.status(400).json({ error: "jid and text are required" });
    }
    if (!activeSock) {
      return res.status(503).json({ error: "whatsapp not connected" });
    }
    try {
      await activeSock.sendMessage(jid, { text });
      res.json({ ok: true });
    } catch (error) {
      console.error("deliver failed:", error);
      res.status(500).json({ error: "send failed" });
    }
  });

  app.listen(PORT, HOST, () => {
    console.log(`Delivery server listening on http://${HOST}:${PORT}`);
  });
}

startWhatsApp().catch((error) => console.error("startWhatsApp failed:", error));
startDeliveryServer();

process.on("uncaughtException", (error) => console.error("uncaughtException:", error));
process.on("unhandledRejection", (reason) => console.error("unhandledRejection:", reason));
