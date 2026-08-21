// P4.AI — Chatbot context assembly (WABOT-07, §12).
//
// Assembles the full context bundle the AI sees before answering. §12:
//   BotSkill + BotRules + ChatMemory + Student Context + Active Assignments
//   + Student Progress + Today's Schedule + Relevant Announcements
//
// Permission (§6, NFR-12): a STUDENT only ever receives context scoped to
// their own data — own progress, own attendance. SUPER_ADMIN/SECRETARY get
// class-wide context. The AI never receives rows it shouldn't surface; the
// backend decides what's visible (§10: AI proposes, backend decides).
//
// Everything here is read-only — the AI cannot mutate the DB (constraint #11).
// Mutations are delegated to the task-agent/state-machine (SUN-34).

import { prisma } from "@/lib/db";
import { getTodaySchedule } from "@/services/schedule";
import { getActiveAnnouncements } from "@/services/announcement";
import { getRecentMemory, type ChatTurn } from "@/services/chatbot/memory";
import type { Role } from "@/lib/roles";

// Upper bounds so the context window stays small (NFR-09 < 10s AI response).
const MAX_SKILLS = 5;
const MAX_RULES = 10;
const MAX_ASSIGNMENTS = 10;
const MAX_ANNOUNCEMENTS = 5;
const MAX_MEMORY_TURNS = 20;

export interface StudentContext {
  id: string;
  name: string;
  role: Role;
}

export interface AssignmentProgressSummary {
  assignmentId: string;
  title: string;
  subject: string;
  deadline: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  isOverdue: boolean;
}

export interface ContextBundle {
  student: StudentContext;
  skills: { name: string; prompt: string }[];
  rules: { name: string; condition: string; action: string }[];
  memory: ChatTurn[];
  activeAssignments: {
    id: string;
    title: string;
    subject: string;
    deadline: string;
    type: string;
    submissionFormat: string | null;
    criteria: string | null;
  }[];
  progress: AssignmentProgressSummary[];
  todaySchedule: {
    subject: string;
    teacher: string | null;
    startTime: string;
    endTime: string;
    room: string | null;
  }[];
  announcements: {
    title: string;
    content: string;
    priority: string;
  }[];
}

function isOverdue(deadline: Date, status: string): boolean {
  return status !== "DONE" && deadline.getTime() < Date.now();
}

/**
 * Assemble the full chatbot context bundle for a user.
 * All DB reads happen here; the responder just formats this for the LLM.
 */
export async function buildContextBundle(
  userId: string,
  role: Role,
  sessionId?: string,
): Promise<ContextBundle> {
  const student = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  });

  // §12: BotSkill + BotRules — only active ones.
  const [skills, rules] = await Promise.all([
    prisma.botSkill.findMany({
      where: { active: true },
      select: { name: true, prompt: true },
      orderBy: { createdAt: "asc" },
      take: MAX_SKILLS,
    }),
    prisma.botRule.findMany({
      where: { active: true },
      select: { name: true, condition: true, action: true },
      orderBy: { createdAt: "asc" },
      take: MAX_RULES,
    }),
  ]);

  // §12: ChatMemory — recent turns from the active session.
  let memory: ChatTurn[] = [];
  if (sessionId) {
    memory = await getRecentMemory(sessionId, MAX_MEMORY_TURNS);
  }

  // §12: Active Assignments + Student Progress.
  // Student sees own progress; admin/secretary see class-wide progress
  // summary (still single-class — constraint #3).
  const now = new Date();
  const activeAssignments = await prisma.assignment.findMany({
    where: { deadline: { gt: now } },
    select: {
      id: true,
      title: true,
      subject: true,
      deadline: true,
      type: true,
      submissionFormat: true,
      criteria: true,
    },
    orderBy: { deadline: "asc" },
    take: MAX_ASSIGNMENTS,
  });

  // Progress rows for the student (own only — §6).
  const progressRows = await prisma.assignmentProgress.findMany({
    where: { userId },
    include: {
      assignment: {
        select: { id: true, title: true, subject: true, deadline: true },
      },
    },
  });

  // Build progress summary keyed by assignmentId for the assignments we loaded.
  const progressMap = new Map(progressRows.map((p) => [p.assignmentId, p]));
  const progress: AssignmentProgressSummary[] = activeAssignments.map((a) => {
    const p = progressMap.get(a.id);
    const status = p?.status ?? "TODO";
    return {
      assignmentId: a.id,
      title: a.title,
      subject: a.subject,
      deadline: a.deadline.toISOString(),
      status,
      startedAt: p?.startedAt?.toISOString() ?? null,
      completedAt: p?.completedAt?.toISOString() ?? null,
      isOverdue: isOverdue(a.deadline, status),
    };
  });

  // §12: Today's Schedule + Relevant Announcements.
  const [todaySchedule, announcementsRows] = await Promise.all([
    getTodaySchedule(now),
    getActiveAnnouncements(),
  ]);

  const announcements = announcementsRows
    .slice(0, MAX_ANNOUNCEMENTS)
    .map((a) => ({
      title: a.title,
      content: a.content,
      priority: a.priority,
    }));

  return {
    student: {
      id: student.id,
      name: student.name,
      role: student.role as Role,
    },
    skills: skills.map((s) => ({ name: s.name, prompt: s.prompt })),
    rules: rules.map((r) => ({
      name: r.name,
      condition: r.condition,
      action: r.action,
    })),
    memory,
    activeAssignments: activeAssignments.map((a) => ({
      id: a.id,
      title: a.title,
      subject: a.subject,
      deadline: a.deadline.toISOString(),
      type: a.type,
      submissionFormat: a.submissionFormat,
      criteria: a.criteria,
    })),
    progress,
    todaySchedule: todaySchedule.map((s) => ({
      subject: s.subject,
      teacher: s.teacher,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
    })),
    announcements,
  };
}

/**
 * Render the context bundle as a system-prompt string for the LLM.
 * Grounded: the AI is told to answer ONLY from this context and never invent
 * data (WABOT-05 — no hallucination).
 */
export function renderContextPrompt(bundle: ContextBundle): string {
  const lines: string[] = [];

  lines.push("Kamu adalah asisten AI untuk kelas SMK P4.AI.");
  lines.push(
    "Kamu HANYA boleh menjawab berdasarkan data kelas yang diberikan di bawah ini.",
  );
  lines.push("JANGAN mengarang informasi. Jika tidak tahu, katakan tidak tahu.");
  lines.push(
    "Kamu TIDAK boleh mengubah data. Untuk aksi (mulai/selesai tugas), arahkan siswa gunakan perintah START/DONE/STATUS.",
  );
  lines.push("");

  lines.push(`Siswa: ${bundle.student.name} (role: ${bundle.student.role})`);
  lines.push("");

  if (bundle.skills.length > 0) {
    lines.push("=== SKILL ===");
    for (const s of bundle.skills) {
      lines.push(`[${s.name}] ${s.prompt}`);
    }
    lines.push("");
  }

  if (bundle.rules.length > 0) {
    lines.push("=== ATURAN ===");
    for (const r of bundle.rules) {
      lines.push(`- ${r.condition} → ${r.action}`);
    }
    lines.push("");
  }

  if (bundle.activeAssignments.length > 0) {
    lines.push("=== TUGAS AKTIF ===");
    for (const a of bundle.activeAssignments) {
      lines.push(
        `- ${a.title} (${a.subject}) | deadline ${a.deadline} | ${a.type}` +
          (a.submissionFormat ? ` | format: ${a.submissionFormat}` : "") +
          (a.criteria ? ` | kriteria: ${a.criteria}` : ""),
      );
    }
    lines.push("");
  }

  if (bundle.progress.length > 0) {
    lines.push("=== PROGRESS SISWA ===");
    for (const p of bundle.progress) {
      const overdue = p.isOverdue ? " (TERLEWAT)" : "";
      lines.push(
        `- ${p.title} (${p.subject}): ${p.status}${overdue} | deadline ${p.deadline}`,
      );
    }
    lines.push("");
  }

  if (bundle.todaySchedule.length > 0) {
    lines.push("=== JADWAL HARI INI ===");
    for (const s of bundle.todaySchedule) {
      lines.push(
        `- ${s.startTime}-${s.endTime} ${s.subject}` +
          (s.teacher ? ` (${s.teacher})` : "") +
          (s.room ? ` @${s.room}` : ""),
      );
    }
    lines.push("");
  }

  if (bundle.announcements.length > 0) {
    lines.push("=== PENGUMUMAN ===");
    for (const a of bundle.announcements) {
      lines.push(`- [${a.priority}] ${a.title}: ${a.content}`);
    }
    lines.push("");
  }

  if (bundle.memory.length > 0) {
    lines.push("=== RIWAYAT PERCAKAPAN ===");
    for (const m of bundle.memory) {
      lines.push(`${m.role}: ${m.content}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
