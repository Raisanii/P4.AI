// P4.AI — Manual reminder endpoint (§7.13, §7.14).
// POST /api/reminder/send-manual — SUPER_ADMIN, SECRETARY only.
//
// Secretary can manually trigger a reminder for a specific assignment to all
// students who haven't completed it yet (TODO + IN_PROGRESS). This bypasses
// the scheduler's window check but still respects dedup via ReminderLog.
//
// Body:
// { assignmentId: string, reminderType?: "T_MINUS_3_DAYS" | "T_MINUS_1_DAY" | "T_MINUS_6_HOURS" }
//
// Default reminderType = T_MINUS_1_DAY (the most common manual nudge).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { sendReminders } from "@/services/reminder/sender";
import type { ReminderCandidate } from "@/services/reminder/engine";
import type { ReminderType, ProgressStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_TYPES: ReminderType[] = [
  "T_MINUS_3_DAYS",
  "T_MINUS_1_DAY",
  "T_MINUS_6_HOURS",
];

function isReminderType(v: unknown): v is ReminderType {
  return typeof v === "string" && (VALID_TYPES as readonly string[]).includes(v);
}

export async function POST(request: Request) {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY");
  if (!ctx.ok) return ctx.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const assignmentId = typeof b.assignmentId === "string" ? b.assignmentId.trim() : "";
  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
  }

  const reminderType: ReminderType = isReminderType(b.reminderType)
    ? b.reminderType
    : "T_MINUS_1_DAY";

  // Verify assignment exists.
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, title: true, deadline: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  // Select all students with TODO or IN_PROGRESS status for this assignment.
  // Manual reminder hits both — the secretary chose to nudge everyone.
  const progressRows = await prisma.assignmentProgress.findMany({
    where: {
      assignmentId,
      status: { in: ["TODO", "IN_PROGRESS"] as ProgressStatus[] },
    },
    include: {
      user: {
        select: { id: true, name: true, whatsappNumber: true },
      },
    },
  });

  if (progressRows.length === 0) {
    return NextResponse.json({
      assignmentId,
      assignmentTitle: assignment.title,
      reminderType,
      candidates: 0,
      sent: 0,
      skipped: 0,
      message: "No students with TODO or IN_PROGRESS status for this assignment.",
    });
  }

  // Build candidates, filtering out already-reminded (dedup, single batched query).
  const alreadyReminded = await prisma.reminderLog.findMany({
    where: {
      assignmentId,
      reminderType,
      userId: { in: progressRows.map((r) => r.userId) },
    },
    select: { userId: true },
  });
  const alreadySet = new Set(alreadyReminded.map((l) => l.userId));

  const candidates: ReminderCandidate[] = [];
  const skipped: string[] = [];
  for (const row of progressRows) {
    if (alreadySet.has(row.userId)) {
      skipped.push(row.userId);
      continue;
    }

    candidates.push({
      userId: row.userId,
      userName: row.user.name,
      whatsappNumber: row.user.whatsappNumber,
      assignmentId,
      assignmentTitle: assignment.title,
      deadline: assignment.deadline,
      status: row.status,
      reminderType,
    });
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      assignmentId,
      assignmentTitle: assignment.title,
      reminderType,
      candidates: 0,
      sent: 0,
      skipped: skipped.length,
      message: "All eligible students already reminded for this type.",
    });
  }

  const results = await sendReminders(candidates);
  const sent = results.filter((r) => r.sent).length;
  const errors = results.filter((r) => r.error && r.error !== "already_sent");

  return NextResponse.json({
    assignmentId,
    assignmentTitle: assignment.title,
    reminderType,
    candidates: candidates.length,
    sent,
    skipped: skipped.length,
    errors: errors.map((e) => ({ userId: e.candidate.userId, error: e.error })),
  }, { status: 201 });
}
