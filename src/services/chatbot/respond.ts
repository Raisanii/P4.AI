// P4.AI — Chatbot responder: AI call + grounded response (WABOT-03..08, NFR-09).
//
// Flow:
//   inbound message
//     → build context bundle (§12)
//     → appendMemory(user)
//     → renderContextPrompt + chatCompletion (9router)
//     → appendMemory(assistant)
//     → return reply text
//
// Grounding (WABOT-05): the system prompt instructs the AI to answer ONLY
// from the provided context — no hallucination. If 9router is unavailable,
// a deterministic fallback searches the context bundle directly so the
// student still gets a useful answer (risk: "9router down → fallback").
//
// AI proposes, backend decides (§10): this module never mutates the DB.
// State mutations go through the task-agent/state-machine (SUN-34).

import { chatCompletion, type ChatMessage } from "@/services/ai";
import {
  buildContextBundle,
  renderContextPrompt,
} from "@/services/chatbot/context";
import {
  getOrCreateSession,
  appendMemory,
} from "@/services/chatbot/memory";
import type { Role } from "@/lib/roles";

export interface RespondInput {
  userId: string;
  role: Role;
  text: string;
}

export interface RespondOutput {
  reply: string;
  sessionId: string;
  usedFallback: boolean;
}

/**
 * Produce a grounded AI reply for a student message.
 * Persists the user message + AI reply to ChatMemory (WABOT-08).
 */
export async function respond(input: RespondInput): Promise<RespondOutput> {
  const session = await getOrCreateSession(input.userId);

  const bundle = await buildContextBundle(
    input.userId,
    input.role,
    session.id,
  );
  const systemPrompt = renderContextPrompt(bundle);

  // Persist the user's message to memory before calling the AI so the AI
  // sees it in context (memory is part of the bundle, but we append after
  // building to avoid including the current message twice on the first turn).
  await appendMemory(session.id, "user", input.text);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...bundle.memory.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    { role: "user", content: input.text },
  ];

  const aiReply = await chatCompletion(messages, {
    temperature: 0.3, // low temp → factual, grounded answers
    maxTokens: 600,
  });

  if (aiReply && aiReply.trim().length > 0) {
    await appendMemory(session.id, "assistant", aiReply.trim());
    return { reply: aiReply.trim(), sessionId: session.id, usedFallback: false };
  }

  // Fallback: deterministic search over the context bundle.
  const fallback = fallbackAnswer(input.text, bundle);
  await appendMemory(session.id, "assistant", fallback);
  return { reply: fallback, sessionId: session.id, usedFallback: true };
}

/**
 * Deterministic fallback when 9router is down or returns nothing.
 * Searches the context bundle for keywords in the student's message.
 * Not as smart as the AI, but always returns a grounded answer.
 */
function fallbackAnswer(
  text: string,
  bundle: Awaited<ReturnType<typeof buildContextBundle>>,
): string {
  const q = text.toLowerCase();

  // Task / tugas queries.
  if (q.includes("tugas") || q.includes("deadline") || q.includes("tenggat")) {
    if (bundle.activeAssignments.length === 0) {
      return "Saat ini tidak ada tugas aktif.";
    }
    const lines = bundle.activeAssignments.map((a) => {
      const p = bundle.progress.find((x) => x.assignmentId === a.id);
      const status = p ? ` (status: ${p.status})` : "";
      const overdue = p?.isOverdue ? " — TERLEWAT!" : "";
      return `- ${a.title} (${a.subject}) | deadline ${a.deadline}${status}${overdue}`;
    });
    return `Tugas aktif:\n${lines.join("\n")}`;
  }

  // Schedule / jadwal queries.
  if (q.includes("jadwal") || q.includes("pelajaran") || q.includes("hari ini")) {
    if (bundle.todaySchedule.length === 0) {
      return "Tidak ada jadwal hari ini.";
    }
    const lines = bundle.todaySchedule.map(
      (s) =>
        `- ${s.startTime}-${s.endTime} ${s.subject}` +
        (s.teacher ? ` (${s.teacher})` : "") +
        (s.room ? ` @${s.room}` : ""),
    );
    return `Jadwal hari ini:\n${lines.join("\n")}`;
  }

  // Announcement / pengumuman queries.
  if (q.includes("pengumuman") || q.includes("info")) {
    if (bundle.announcements.length === 0) {
      return "Tidak ada pengumuman aktif.";
    }
    const lines = bundle.announcements.map(
      (a) => `- [${a.priority}] ${a.title}: ${a.content}`,
    );
    return `Pengumuman:\n${lines.join("\n")}`;
  }

  return "Maaf, sistem AI sedang tidak tersedia. Untuk tugas, ketik 'tugas'. Untuk jadwal, ketik 'jadwal'. Untuk mulai/selesai tugas, gunakan perintah START/DONE/STATUS.";
}
