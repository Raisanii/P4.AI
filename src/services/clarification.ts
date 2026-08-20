// P4.AI — Clarification service: AI question generation + KB compile (§7.6).
//
// Flow:
//   Secretary draft → AI generates 3-5 questions → Secretary answers →
//   Compile → Knowledge Base → Assignment
//
// AI proposes, backend decides: every AI output is validated server-side
// before storage. If 9router is down, deterministic fallback questions
// and field-mapping are used (risk: "9router down → Retry + fallback").

import { chatCompletion, type ChatMessage } from "@/services/ai";

export type TaskDraft = {
  title: string;
  subject?: string;
  description?: string;
};

export type Clarification = {
  question: string;
  answer: string;
};

export type KnowledgeBase = {
  title: string;
  subject: string;
  description: string;
  deadline: string;
  type: "INDIVIDUAL" | "GROUP";
  submissionFormat: string | null;
  criteria: string | null;
  reference: string | null;
};

const ASSIGNMENT_TYPES = ["INDIVIDUAL", "GROUP"] as const;
type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

function isAssignmentType(v: unknown): v is AssignmentType {
  return typeof v === "string" && (ASSIGNMENT_TYPES as readonly string[]).includes(v);
}

// Deterministic fallback questions (used when AI is unavailable).
const FALLBACK_QUESTIONS = [
  "Apakah tugas ini dikerjakan secara individu atau kelompok?",
  "Format pengumpulan tugas (misal: PDF, link Google Docs, fisik)?",
  "Ada kriteria penilaian khusus?",
  "Ada referensi atau materi pendukung?",
  "Deadline jam berapa?",
];

/**
 * Generate 3-5 clarification questions from a task draft via 9router.
 * Falls back to 5 deterministic questions if AI is unavailable (TASK-02).
 */
export async function generateClarificationQuestions(
  draft: TaskDraft,
): Promise<string[]> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Kamu adalah asisten sekretaris kelas. Tugasmu menghasilkan 3-5 pertanyaan klarifikasi singkat untuk tugas baru. " +
        "Pertanyaan harus mencakup: jenis (individu/kelompok), format pengumpulan, kriteria penilaian, referensi, dan deadline. " +
        'Balas HANYA array JSON string, contoh: ["pertanyaan 1", "pertanyaan 2"].',
    },
    {
      role: "user",
      content: `Judul: ${draft.title}${draft.subject ? `\nMapel: ${draft.subject}` : ""}${draft.description ? `\nDeskripsi: ${draft.description}` : ""}`,
    },
  ];

  const raw = await chatCompletion(messages, { temperature: 0.5, maxTokens: 500 });
  if (!raw) return FALLBACK_QUESTIONS;

  // Extract JSON array from possible markdown fences.
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return FALLBACK_QUESTIONS;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!Array.isArray(parsed)) return FALLBACK_QUESTIONS;

    const questions = parsed
      .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
      .map((q) => q.trim());

    // Enforce 3-5 questions.
    if (questions.length < 3 || questions.length > 5) return FALLBACK_QUESTIONS;

    return questions;
  } catch {
    return FALLBACK_QUESTIONS;
  }
}

/**
 * Compile clarifications into a structured knowledge base JSON (TASK-03).
 * Uses AI to synthesize draft + answers, with deterministic fallback
 * field-mapping if AI is unavailable.
 *
 * Server-side validation: type must be INDIVIDUAL or GROUP, deadline
 * must be valid ISO date. The caller must re-validate before DB write.
 */
export async function compileKnowledgeBase(
  draft: TaskDraft,
  clarifications: Clarification[],
): Promise<KnowledgeBase> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Kamu adalah kompilator knowledge base. Gabungkan draft tugas dan jawaban klarifikasi menjadi JSON terstruktur. " +
        "Balas HANYA JSON object dengan field: title, subject, description, deadline (ISO date), type (INDIVIDUAL|GROUP), submissionFormat, criteria, reference. " +
        "Field null jika tidak diketahui.",
    },
    {
      role: "user",
      content: JSON.stringify({ draft, clarifications }),
    },
  ];

  const raw = await chatCompletion(messages, { temperature: 0.3, maxTokens: 800 });

  if (raw) {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        const kb = validateKnowledgeBase(parsed, draft);
        if (kb) return kb;
      } catch {
        // fall through to deterministic compile
      }
    }
  }

  return deterministicCompile(draft, clarifications);
}

/** Validate a parsed object into a KnowledgeBase, or return null. */
function validateKnowledgeBase(
  obj: Record<string, unknown>,
  fallback: TaskDraft,
): KnowledgeBase | null {
  const title = strOr(obj.title, fallback.title);
  const subject = strOr(obj.subject, fallback.subject ?? "");
  const description = strOr(obj.description, fallback.description ?? "");
  const deadline = strOr(obj.deadline, "");
  const type = isAssignmentType(obj.type) ? obj.type : null;
  const submissionFormat = strOrNull(obj.submissionFormat);
  const criteria = strOrNull(obj.criteria);
  const reference = strOrNull(obj.reference);

  if (!title || !subject || !deadline || !type) return null;

  return { title, subject, description, deadline, type, submissionFormat, criteria, reference };
}

/**
 * Deterministic fallback: map clarifications to KB fields by keyword
 * matching on the question text. Used when AI is unavailable.
 */
function deterministicCompile(
  draft: TaskDraft,
  clarifications: Clarification[],
): KnowledgeBase {
  let type: AssignmentType = "INDIVIDUAL";
  let deadline = "";
  let submissionFormat: string | null = null;
  let criteria: string | null = null;
  let reference: string | null = null;

  for (const c of clarifications) {
    const q = c.question.toLowerCase();
    const a = c.answer.trim();

    if (q.includes("individu") || q.includes("kelompok")) {
      if (a.toLowerCase().includes("kelompok")) type = "GROUP";
    } else if (q.includes("format")) {
      submissionFormat = a || null;
    } else if (q.includes("kriteria")) {
      criteria = a || null;
    } else if (q.includes("referensi") || q.includes("materi")) {
      reference = a || null;
    } else if (q.includes("deadline") || q.includes("jam") || q.includes("kapan") || q.includes("tanggal")) {
      deadline = a;
    }
  }

  return {
    title: draft.title,
    subject: draft.subject ?? "",
    description: draft.description ?? "",
    deadline,
    type,
    submissionFormat,
    criteria,
    reference,
  };
}

function strOr(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}
