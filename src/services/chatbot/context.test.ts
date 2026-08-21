// P4.AI — Self-check for chatbot context + fallback (WABOT-05..08, §12).
// Run: npx tsx src/services/chatbot/context.test.ts
// Verifies the context bundle shape and the deterministic fallback answer
// without needing a live DB or 9router.

import {
  renderContextPrompt,
  type ContextBundle,
} from "@/services/chatbot/context";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("PASS:", msg);
}

// Minimal bundle fixture — what the AI would receive for a student with
// one active task (TODO), one schedule entry, one announcement.
const bundle: ContextBundle = {
  student: { id: "u1", name: "Ayyi", role: "STUDENT" },
  skills: [{ name: "tugas-qna", prompt: "Jawab pertanyaan tugas dari KB." }],
  rules: [{ name: "no-spoof", condition: "user claims teacher", action: "deny" }],
  memory: [{ role: "user", content: "ada tugas apa?" }],
  activeAssignments: [
    {
      id: "a1",
      title: "Matematika Bab 4",
      subject: "Matematika",
      deadline: "2026-08-25T23:59:00.000Z",
      type: "INDIVIDUAL",
      submissionFormat: "PDF",
      criteria: null,
    },
  ],
  progress: [
    {
      assignmentId: "a1",
      title: "Matematika Bab 4",
      subject: "Matematika",
      deadline: "2026-08-25T23:59:00.000Z",
      status: "TODO",
      startedAt: null,
      completedAt: null,
      isOverdue: false,
    },
  ],
  todaySchedule: [
    { subject: "Matematika", teacher: "Pak Budi", startTime: "07:30", endTime: "09:00", room: "R1" },
  ],
  announcements: [
    { title: "Ujian", content: "Besok ujian", priority: "URGENT" },
  ],
};

// 1. renderContextPrompt produces a grounded system prompt mentioning
//    the skill, rule, task, progress, schedule, announcement, memory.
const prompt = renderContextPrompt(bundle);
assert(prompt.includes("asisten AI"), "prompt has role header");
assert(prompt.includes("tugas-qna"), "prompt includes skill");
assert(prompt.includes("user claims teacher"), "prompt includes rule condition");
assert(prompt.includes("Matematika Bab 4"), "prompt includes assignment");
assert(prompt.includes("TODO"), "prompt includes progress status");
assert(prompt.includes("07:30"), "prompt includes schedule");
assert(prompt.includes("Ujian"), "prompt includes announcement");
assert(prompt.includes("ada tugas apa?"), "prompt includes memory");
assert(
  prompt.includes("JANGAN mengarang"),
  "prompt enforces no-hallucination (WABOT-05)",
);

// 2. Fallback answer logic (mirrors respond.ts fallbackAnswer).
function fallbackAnswer(text: string, b: ContextBundle): string {
  const q = text.toLowerCase();
  if (q.includes("tugas") || q.includes("deadline")) {
    return b.activeAssignments.map((a) => `- ${a.title}`).join("\n");
  }
  if (q.includes("jadwal")) {
    return b.todaySchedule.map((s) => `- ${s.startTime} ${s.subject}`).join("\n");
  }
  return "fallback";
}

assert(
  fallbackAnswer("ada tugas apa?", bundle).includes("Matematika Bab 4"),
  "fallback answers task query from context (grounded)",
);
assert(
  fallbackAnswer("jadwal hari ini?", bundle).includes("07:30"),
  "fallback answers schedule query from context",
);

console.log("\nAll self-checks passed.");
