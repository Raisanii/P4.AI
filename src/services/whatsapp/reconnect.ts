// P4.AI — WhatsApp auto-reconnect + re-pair helpers (WABOT-01, risk §18).
//
// Baileys disconnect → classify:
//   • loggedOut / badSession / multideviceMismatch → wipe auth folder, re-pair (new QR)
//   • restartRequired / connectionClosed / connectionLost / timedOut → backoff retry
//   • forbidden → stop (manual intervention needed)
//
// Reconnect uses exponential backoff with jitter (capped at 30s) so the Pi
// doesn't hammer WhatsApp's servers after repeated failures.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { BaileysEventMap } from "@whiskeysockets/baileys";
import { DisconnectReason } from "@whiskeysockets/baileys";

/** Session auth folder (from BAILEYS_SESSION_PATH, default ./wa-session). */
export function sessionPath(): string {
  return process.env.BAILEYS_SESSION_PATH ?? path.join(process.cwd(), "wa-session");
}

/**
 * Wipe the auth folder so the next `startWhatsApp()` triggers a fresh QR / re-pair.
 * Called on `loggedOut` / `badSession` — the stored creds are invalid and must
 * not be reused, otherwise the bot loops on a dead session.
 */
export async function wipeAuthState(): Promise<void> {
  const folder = sessionPath();
  try {
    await fs.rm(folder, { recursive: true, force: true });
    console.warn("[wa] auth state wiped — re-pair required (new QR)");
  } catch (err) {
    console.error("[wa] failed to wipe auth state", err);
  }
}

/**
 * Exponential backoff with jitter. Cap at 30s so reconnects stay responsive
 * but don't spam. Returns ms to wait.
 */
export function backoffDelay(attempt: number): number {
  const base = Math.min(1000 * 2 ** attempt, 30_000);
  const jitter = Math.floor(Math.random() * 500);
  return base + jitter;
}

/** True if this disconnect reason can be resolved by a fresh QR re-pair. */
export function isRePairRequired(code: number | undefined): boolean {
  return (
    code === DisconnectReason.loggedOut ||
    code === DisconnectReason.badSession ||
    code === DisconnectReason.multideviceMismatch
  );
}

/** True if retrying the connection (same creds) is the right move. */
export function isRetryable(code: number | undefined): boolean {
  return (
    code === DisconnectReason.restartRequired ||
    code === DisconnectReason.connectionClosed ||
    code === DisconnectReason.connectionLost ||
    code === DisconnectReason.timedOut ||
    code === DisconnectReason.unavailableService ||
    code === DisconnectReason.connectionReplaced
  );
}

/**
 * Extract the status code Baileys carries on the lastDisconnect error.
 * Falls back to the DisconnectReason if the error shape differs across versions.
 */
export function disconnectCode(lastDisconnect: BaileysEventMap["connection.update"]["lastDisconnect"]): number | undefined {
  const code = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
  return code ?? (lastDisconnect?.error as { status?: number } | undefined)?.status;
}
