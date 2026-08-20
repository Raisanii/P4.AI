// P4.AI — WhatsApp send-message helper (WABOT-01).
//
// Thin wrapper around `sock.sendMessage` so the rest of the app (reminders,
// AI replies, whitelist rejection) doesn't import Baileys directly. Keeps the
// socket instance in a module-level singleton so the long-running bot process
// and the Next.js status endpoint share one connection.

import type { WASocket } from "@whiskeysockets/baileys";

let socket: WASocket | null = null;

/** Bind the singleton socket. Called by `startWhatsApp()` once connected. */
export function setSocket(sock: WASocket | null): void {
  socket = sock;
}

/** Current singleton socket (may be null if the bot hasn't started/connected). */
export function getSocket(): WASocket | null {
  return socket;
}

/** Coarse connection state surfaced to /api/whatsapp/status. */
export type WAStatus = {
  connected: boolean;
  qrPending: boolean;
  user: string | null;
};

/**
 * Track the latest connection.update state from Baileys so the status endpoint
 * can report QR-pending vs connected without poking the raw WebSocket (whose
 * `readyState` is not part of the typed API).
 */
let connected = false;
let qrPending = false;

export function setConnectionState(next: { connected?: boolean; qrPending?: boolean }): void {
  if (typeof next.connected === "boolean") connected = next.connected;
  if (typeof next.qrPending === "boolean") qrPending = next.qrPending;
}

export function getStatus(): WAStatus {
  return {
    connected,
    qrPending,
    user: socket?.user?.id ?? null,
  };
}

/**
 * Send a text message to a JID. Returns the message key or undefined.
 * No-op (logged) if the socket isn't connected yet — callers that must
 * deliver (e.g. reminders) should queue and retry.
 */
export async function sendText(jid: string, text: string) {
  if (!socket) {
    console.warn("[wa] sendText skipped — socket not ready", jid);
    return undefined;
  }
  try {
    return await socket.sendMessage(jid, { text });
  } catch (err) {
    console.error("[wa] sendText failed", jid, err);
    return undefined;
  }
}
