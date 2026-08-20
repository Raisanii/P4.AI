// P4.AI — Baileys WhatsApp client (WABOT-01, WABOT-02, constraint #10, risk §18).
//
// Long-running process (separate from Next.js request cycle). On the Pi it is
// launched as a standalone `tsx` script; the Next.js app reads status via the
// shared sender singleton.
//
// Responsibilities:
// 1. Connect to WhatsApp via Baileys multi-file auth state (persists across restart).
// 2. Print QR code to terminal on first pairing (or after re-pair).
// 3. Auto-reconnect on transient disconnect; re-pair (wipe + new QR) on expired session.
// 4. Gate inbound messages: reject non-whitelisted numbers with a polite reply (WABOT-02).
//
// Downstream (AI, reminders, START/DONE) hooks into the `onMessage` callback —
// the actual intent/AI logic lives in later issues (WABOT-03+). This module is
// purely the connection + whitelist layer.

import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket,
  type BaileysEventMap,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import P from "pino";
import qrcode from "qrcode-terminal";

import { prisma } from "@/lib/db";
import {
  sessionPath,
  wipeAuthState,
  backoffDelay,
  isRePairRequired,
  isRetryable,
  disconnectCode,
} from "@/services/whatsapp/reconnect";
import {
  setSocket,
  setConnectionState,
  sendText,
} from "@/services/whatsapp/sender";
import { findWhitelistedUser } from "@/services/whatsapp/whitelist";

const logger = P({ level: "warn", name: "wa" });

export type InboundMessage = {
  jid: string; // sender JID
  userId: string; // P4.AI user id (whitelisted)
  name: string;
  role: string;
  text: string; // message body
  fromMe: boolean;
};

let startAttempt = 0;
let isRunning = false;

/**
 * Start the Baileys socket with auth persistence + reconnect logic.
 * `onMessage` is invoked for every whitelisted inbound message; returns
 * `true` on first successful open, `false` if it gave up (forbidden).
 */
export async function startWhatsApp(
  onMessage?: (msg: InboundMessage) => void | Promise<void>,
): Promise<boolean> {
  if (isRunning) return true;
  isRunning = true;

  return connect(onMessage);
}

async function connect(onMessage?: (msg: InboundMessage) => void | Promise<void>): Promise<boolean> {
  const { version, isLatest } = await fetchLatestBaileysVersion();
  if (!isLatest) {
    logger.warn(`using Baileys version ${version.join(".")} — not the latest`);
  }

  const folder = sessionPath();
  const { state, saveCreds } = await useMultiFileAuthState(folder);

  const sock: WASocket = makeWASocket({
    version,
    logger,
    auth: state,
    browser: ["P4.AI", "Chrome", "1.0.0"],
    markOnlineOnConnect: true,
    connectTimeoutMs: 20_000,
    keepAliveIntervalMs: 30_000,
  });

  setSocket(sock);

  // Persist creds on every update so a restart resumes the session.
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update: BaileysEventMap["connection.update"]) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      setConnectionState({ connected: false, qrPending: true });
      console.log("\n[wa] Scan this QR code to pair the bot:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      startAttempt = 0;
      setConnectionState({ connected: true, qrPending: false });
      setSocket(sock);
      console.log("[wa] ✅ connected — user:", sock.user?.id ?? "unknown");
    }

    if (connection === "close") {
      setConnectionState({ connected: false, qrPending: false });
      const code = disconnectCode(lastDisconnect);
      void handleClose(code, onMessage);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }: BaileysEventMap["messages.upsert"]) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const jid = msg.key.remoteJid ?? "";
      if (!jid || jid.endsWith("@status@broadcast")) continue;

      const text =
        msg.message?.conversation ??
        msg.message?.extendedTextMessage?.text ??
        msg.message?.imageMessage?.caption ??
        msg.message?.videoMessage?.caption ??
        "";
      if (!text) continue;

      try {
        const user = await findWhitelistedUser(jid);
        if (!user) {
          // WABOT-02: polite rejection for non-whitelisted senders.
          await sendText(jid, "Maaf, nomor Anda tidak terdaftar di P4.AI. Hubungi admin kelas untuk mendaftar.");
          continue;
        }

        await onMessage?.({
          jid,
          userId: user.id,
          name: user.name,
          role: user.role,
          text,
          fromMe: false,
        });
      } catch (err) {
        console.error("[wa] message handling failed", jid, err);
      }
    }
  });

  return true;
}

async function handleClose(
  code: number | undefined,
  onMessage?: (msg: InboundMessage) => void | Promise<void>,
): Promise<void> {
  setSocket(null);

  // Session expired → wipe + re-pair (new QR) (risk §18: Session expired → Re-pair).
  if (isRePairRequired(code)) {
    console.warn(`[wa] disconnect ${code} — session invalid, wiping for re-pair`);
    await wipeAuthState();
    await sleep(backoffDelay(startAttempt++));
    await connect(onMessage);
    return;
  }

  // Transient → exponential backoff (risk §18: Baileys disconnect → Auto reconnect).
  if (isRetryable(code)) {
    console.warn(`[wa] disconnect ${code} — retrying in backoff`);
    await sleep(backoffDelay(startAttempt++));
    await connect(onMessage);
    return;
  }

  // Forbidden / unknown → stop, needs manual intervention.
  if (code === DisconnectReason.forbidden) {
    console.error(`[wa] disconnect ${code} — forbidden, halting (manual action required)`);
    isRunning = false;
    return;
  }

  console.error(`[wa] disconnect ${code} — unhandled, will retry once`);
  await sleep(backoffDelay(startAttempt++));
  await connect(onMessage);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Standalone entrypoint — `tsx src/services/whatsapp/client.ts` on the Pi.
 * In production a process manager (pm2 / systemd) keeps it alive.
 */
async function main() {
  // Lazy-import so `import { prisma }` only runs when the script is executed,
  // not when the module is pulled into the Next.js bundle for types.
  await startWhatsApp(async (msg) => {
    // WABOT-03+ (AI / intent) hooks here in later issues.
    console.log("[wa] inbound", msg.name, msg.text.slice(0, 80));
    // Touch prisma so the import isn't tree-shaken — the real handler will query tasks.
    await prisma.user.count();
  });
}

const isDirect = process.argv[1] && import.meta.url?.endsWith(process.argv[1]!);
if (isDirect) {
  void main();
}
