// P4.AI — Task intent detection (§7.11, §7.12, WABOT-13/14/15).
//
// Two layers:
// 1. Deterministic command parser — `START <task>`, `DONE <task>`, `STATUS <task>`.
//    Zero ambiguity, zero AI cost. Tried first (§7.12).
// 2. AI natural-language intent detection via 9router — handles free text like
//    "kak tugas matematika udah gue mulai". Falls back to keyword matching
//    when 9router is unavailable (risk: "9router down → fallback").
//
// AI proposes, backend decides (§10, NFR-12): this module NEVER mutates
// the DB. It only returns a structured intent the caller validates + executes.

import { chatCompletion, type ChatMessage } from "@/services/ai";

export type TaskIntentType = "START_TASK" | "DONE_TASK" | "STATUS_TASK";

export interface TaskIntent {
  type: TaskIntentType;
  /** Normalised task query — subject, title fragment, or id. */
  task: string;
  /** Whether AI was used (false = deterministic command/keyword). */
  viaAI: boolean;
  /** Raw original text — kept for activity-log metadata. */
  raw: string;
}

/** Deterministic command prefixes (§7.12). Case-insensitive. */
const COMMANDS: { prefix: string; type: TaskIntentType }[] = [
  { prefix: "start", type: "START_TASK" },
  { prefix: "done", type: "DONE_TASK" },
  { prefix: "selesai", type: "DONE_TASK" },
  { prefix: "status", type: "STATUS_TASK" },
];

/**
 * Try to parse a deterministic command (§7.12).
 * Accepted forms: `START matematika`, `START Matematika Bab 4`, `done matematika`.
 * Returns null if the message doesn't start with a command verb.
 */
export function parseCommand(raw: string): TaskIntent | null {
  const text = raw.trim();
  if (!text) return null;

  // First word is the verb; rest is the task query.
  const sp = text.indexOf(" ");
  if (sp === -1) {
    // Bare verb with no task — treat as no command (caller may still AI-route).
    return null;
  }

  const verb = text.slice(0, sp).toLowerCase();
  const task = text.slice(sp + 1).trim();

  if (!task) return null;

  const match = COMMANDS.find((c) => c.prefix === verb);
  if (!match) return null;

  return { type: match.type, task, viaAI: false, raw };
}

const FALLBACK_KEYWORDS: { type: TaskIntentType; words: string[] }[] = [
  { type: "START_TASK", words: ["mulai", "start", "kerjain", "ngerjain", "gas"] },
  { type: "DONE_TASK", words: ["selesai", "done", "kelar", "udah", "selesa"] },
  { type: "STATUS_TASK", words: ["status", "gimana", "apa kabar", "kapan"] },
];

/**
 * Keyword-based fallback when 9router is unavailable (risk: "9router down → fallback").
 * Coarse but deterministic — matches Indonesian slang + formal words.
 * @param raw — the inbound message text.
 * @returns a best-guess intent, or null if no task keywords found.
 */
function keywordIntent(raw: string): TaskIntent | null {
  const q = raw.toLowerCase();

  for (const { type, words } of FALLBACK_KEYWORDS) {
    if (words.some((w) => q.includes(w))) {
      return { type, task: raw, viaAI: false, raw };
    }
  }
  return null;
}

const AI_SYSTEM_PROMPT = `Kamu adalah intent detector untuk bot tugas kelas. Deteksi intent dari pesan siswa dan balas HANYA JSON object.

Intent yang valid:
- START_TASK: siswa mau mulai / sedang mengerjakan / sudah mulai tugas
- DONE_TASK: siswa sudah selesai mengerjakan tugas
- STATUS_TASK: siswa nanya status/kondisi tugas

Format: {"intent":"START_TASK|DONE_TASK|STATUS_TASK","task":"<nama tugas/mapel>","confidence":0.0-1.0}

Jika pesan bukan tentang tugas, balas: {"intent":"NONE","task":"","confidence":0}

Contoh:
- "kak tugas matematika udah gue mulai" → {"intent":"START_TASK","task":"matematika","confidence":0.95}
- "tugas fisika kelar" → {"intent":"DONE_TASK","task":"fisika","confidence":0.9}
- "gimana status tugas b.inggris" → {"intent":"STATUS_TASK","task":"b.inggris","confidence":0.9}`;

/**
 * Detect a task intent from a free-text message via 9router (§7.11).
 * Tries deterministic command first (§7.12), then AI, then keyword fallback.
 *
 * Returns null if the message has no task intent (caller falls through to
 * the general chatbot responder).
 */
export async function detectIntent(raw: string): Promise<TaskIntent | null> {
  // Layer 1: deterministic command.
  const cmd = parseCommand(raw);
  if (cmd) return cmd;

  // Layer 2: AI intent detection.
  const messages: ChatMessage[] = [
    { role: "system", content: AI_SYSTEM_PROMPT },
    { role: "user", content: raw },
  ];

  const ai = await chatCompletion(messages, { temperature: 0.2, maxTokens: 150 });
  const intent = ai ? parseAIIntent(ai, raw) : null;
  if (intent) return intent;

  // Layer 3: keyword fallback when AI unavailable.
  return keywordIntent(raw);
}

/** Parse the AI's JSON response into a TaskIntent, or null. */
function parseAIIntent(rawAI: string, original: string): TaskIntent | null {
  // Extract JSON object from possible markdown fences.
  const m = rawAI.match(/\{[\s\S]*\}/);
  if (!m) return null;

  let parsed: { intent?: unknown; task?: unknown; confidence?: unknown };
  try {
    parsed = JSON.parse(m[0]);
  } catch {
    return null;
  }

  const intent = String(parsed.intent ?? "").toUpperCase();
  if (intent !== "START_TASK" && intent !== "DONE_TASK" && intent !== "STATUS_TASK") {
    return null;
  }

  const conf = typeof parsed.confidence === "number" ? parsed.confidence : 0;
  if (conf < 0.5) return null;

  const task = String(parsed.task ?? "").trim();
  if (!task) return null;

  return {
    type: intent,
    task,
    viaAI: true,
    raw: original,
  };
}
