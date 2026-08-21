// P4.AI — ChatSession + ChatMemory persistence (WABOT-08, §12).
//
// Conversation memory is persisted across messages so the AI can refer to
// earlier turns ("kak tadi gua tanya soal matematika…"). A session groups
// consecutive messages for one user; it auto-closes after SESSION_TTL_MS
// of inactivity so a student who messages again tomorrow starts fresh.
//
// Constraint: student only sees own memory (Permission Matrix §6). All
// queries are scoped by userId — no cross-user leakage.

import { prisma } from "@/lib/db";
import type { ChatMemory, ChatSession } from "@prisma/client";

// Idle window before a session is considered stale. 30 min matches a typical
// class break; tune via SESSION_TTL_MIN env if needed. ponytail: ceiling =
// per-student TTL override in BotRule; add when rules engine lands.
const SESSION_TTL_MS =
  (Number(process.env.SESSION_TTL_MIN) || 30) * 60_000;

export type MemoryRole = "user" | "assistant" | "system";

export interface ChatTurn {
  role: MemoryRole;
  content: string;
}

/**
 * Find an active ChatSession for the user (started within SESSION_TTL_MS),
 * or create one. Closing stale sessions keeps conversation context bounded
 * to a single back-and-forth (WABOT-08) — a new day = a new session.
 */
export async function getOrCreateSession(userId: string): Promise<ChatSession> {
  const cutoff = new Date(Date.now() - SESSION_TTL_MS);

  const active = await prisma.chatSession.findFirst({
    where: {
      userId,
      startedAt: { gt: cutoff },
      endedAt: null,
    },
    orderBy: { startedAt: "desc" },
  });

  if (active) return active;

  return prisma.chatSession.create({ data: { userId } });
}

/**
 * Persist one ChatMemory row (a single message in the conversation).
 * Called after both the student's inbound message and the AI's reply.
 */
export async function appendMemory(
  sessionId: string,
  role: MemoryRole,
  content: string,
): Promise<ChatMemory> {
  return prisma.chatMemory.create({
    data: { sessionId, role, content },
  });
}

/**
 * Load recent conversation turns for a session, oldest-first, capped at
 * `limit` so the AI context window stays bounded (NFR-09 < 10s). Default
 * 20 turns = up to 10 exchange pairs — enough for a grounded answer.
 */
export async function getRecentMemory(
  sessionId: string,
  limit = 20,
): Promise<ChatTurn[]> {
  const rows = await prisma.chatMemory.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return rows.map((r) => ({
    role: r.role as MemoryRole,
    content: r.content,
  }));
}

/**
 * Close a session (sets endedAt). Called when the conversation is clearly
 * over (deterministic commands like DONE/STATUS often end a thread) or by
 * a periodic sweeper. Best-effort — never throws.
 */
export async function closeSession(sessionId: string): Promise<void> {
  try {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });
  } catch {
    // Session may already be closed/deleted — ignore.
  }
}
