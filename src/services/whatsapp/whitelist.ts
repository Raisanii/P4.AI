// P4.AI — Whitelist enforcement for the WhatsApp bot (WABOT-02, constraint #10).
//
// Source of truth = User.whatsappNumber (E.164, unique). A message is allowed
// only if its sender JID resolves to a registered student/staff number.
//
// Baileys delivers `messages.upsert` with sender JIDs like
// `62xxxxxxxxxxx@s.whatsapp.net` (private) or group participant JIDs. We
// normalise the JID → E.164 (digits only, no @ suffix, no `:` device suffix)
// and compare against the stored numbers.

import { prisma } from "@/lib/db";

/** Normalise a Baileys JID or raw number to E.164 (leading +, digits only). */
export function normalizeNumber(jidOrNumber: string): string {
  // Strip device suffix (e.g. `62…:12@s.whatsapp.net`) and the @… host.
  const participant = jidOrNumber.split("@")[0]?.split(":")[0] ?? "";
  const digits = participant.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

/**
 * Check whether a sender JID maps to a registered, non-archived user.
 * Returns the user record so the caller can attach context (id, name, role)
 * for downstream intent handling.
 */
export async function findWhitelistedUser(jid: string) {
  const normalized = normalizeNumber(jid);
  if (!normalized) return null;

  return prisma.user.findFirst({
    where: { whatsappNumber: normalized },
    select: {
      id: true,
      name: true,
      nis: true,
      role: true,
      whatsappNumber: true,
    },
  });
}

/** Convenience boolean wrapper. */
export async function isWhitelisted(jid: string): Promise<boolean> {
  return (await findWhitelistedUser(jid)) !== null;
}
