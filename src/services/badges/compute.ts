// P4.AI — Badge computation service (§7.16 Positive Gamification).
//
// All badges derive from ActivityLog + AssignmentProgress — never manual input
// (§7.9, Constraint #13). The service:
//   1. Reads activity + progress analytics per student.
//   2. Evaluates each badge's criteria.
//   3. Upserts BadgeAward rows (unique(badgeId, userId) prevents duplicates).
//
// Positive-only per §7.16 — no "Most Lazy"/"Worst Student"/"Slowest Student".

import { prisma } from "@/lib/db";
import type { Badge, BadgeAward } from "@prisma/client";
import { BADGE_DEFS, type BadgeDef } from "./defs";

export type { BadgeDef } from "./defs";
export { BADGE_DEFS } from "./defs";

// ---------------------------------------------------------------------------
// Per-student analytics (derived from ActivityLog + AssignmentProgress).
// ---------------------------------------------------------------------------

interface StudentAnalytics {
  userId: string;
  completions: number;
  onTimeCompletions: number;
  earlyCompletions: number; // completed ≥ leadMs before deadline
  activeDays: number; // distinct calendar days with activity
  activityEvents: number; // total ActivityLog rows
  avgCompletionMs: number | null; // avg startedAt→completedAt
}

/** Fetch analytics for all students in one pass. */
async function fetchStudentAnalytics(): Promise<StudentAnalytics[]> {
  const [students, progress, logs] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true },
    }),
    prisma.assignmentProgress.findMany({
      where: { status: "DONE", completedAt: { not: null } },
      select: {
        userId: true,
        startedAt: true,
        completedAt: true,
        assignment: { select: { deadline: true } },
      },
    }),
    prisma.activityLog.findMany({
      select: { userId: true, createdAt: true },
    }),
  ]);

  const studentIds = new Set(students.map((s) => s.id));
  const byUser = new Map<string, StudentAnalytics>();

  for (const id of studentIds) {
    byUser.set(id, {
      userId: id,
      completions: 0,
      onTimeCompletions: 0,
      earlyCompletions: 0,
      activeDays: 0,
      activityEvents: 0,
      avgCompletionMs: null,
    });
  }

  // Progress metrics.
  const completionTimes = new Map<string, number[]>();
  for (const p of progress) {
    const a = byUser.get(p.userId);
    if (!a || !p.completedAt) continue;
    a.completions += 1;
    const deadline = p.assignment.deadline;
    if (p.completedAt.getTime() <= deadline.getTime()) {
      a.onTimeCompletions += 1;
    }
    // Early Bird check done after (needs criteria.leadMs) — track lead per badge.
    if (p.startedAt) {
      const dur = p.completedAt.getTime() - p.startedAt.getTime();
      const arr = completionTimes.get(p.userId) ?? [];
      arr.push(dur);
      completionTimes.set(p.userId, arr);
    }
  }

  // Early completions — use Early Bird leadMs (24h).
  const earlyLeadMs = BADGE_DEFS[0].criteria.leadMs;
  for (const p of progress) {
    const a = byUser.get(p.userId);
    if (!a || !p.completedAt) continue;
    const lead = p.assignment.deadline.getTime() - p.completedAt.getTime();
    if (lead >= earlyLeadMs) a.earlyCompletions += 1;
  }

  // Activity metrics.
  const activeDaySets = new Map<string, Set<string>>();
  for (const log of logs) {
    const a = byUser.get(log.userId);
    if (!a) continue;
    a.activityEvents += 1;
    const dayKey = log.createdAt.toISOString().slice(0, 10);
    const set = activeDaySets.get(log.userId) ?? new Set<string>();
    set.add(dayKey);
    activeDaySets.set(log.userId, set);
  }
  for (const [uid, set] of activeDaySets) {
    const a = byUser.get(uid);
    if (a) a.activeDays = set.size;
  }

  // Avg completion time.
  for (const [uid, times] of completionTimes) {
    const a = byUser.get(uid);
    if (a && times.length > 0) {
      a.avgCompletionMs = Math.round(
        times.reduce((s, t) => s + t, 0) / times.length,
      );
    }
  }

  return [...byUser.values()];
}

// ---------------------------------------------------------------------------
// Badge evaluation — pure functions mapping analytics → badge keys earned.
// ---------------------------------------------------------------------------

function evaluateBadges(
  a: StudentAnalytics,
  mostActiveLeaderIds: Set<string>,
): string[] {
  const earned: string[] = [];

  // 🐦 Early Bird — ≥1 completion far before deadline.
  if (a.earlyCompletions >= BADGE_DEFS[0].criteria.minCompletions) {
    earned.push("early_bird");
  }

  // ⚡ Fast Finisher — avg completion < threshold, ≥2 completions.
  const ff = BADGE_DEFS[1].criteria;
  if (
    a.avgCompletionMs !== null &&
    a.completions >= ff.minCompletions &&
    a.avgCompletionMs <= ff.maxAvgMs
  ) {
    earned.push("fast_finisher");
  }

  // 🔥 Consistent — activity on ≥5 distinct days.
  if (a.activeDays >= BADGE_DEFS[2].criteria.minActiveDays) {
    earned.push("consistent");
  }

  // 🎯 On-Time Hero — on-time rate ≥80%, ≥3 completions.
  const oth = BADGE_DEFS[3].criteria;
  if (a.completions >= oth.minCompletions) {
    const rate = Math.round((a.onTimeCompletions / a.completions) * 100);
    if (rate >= oth.minOnTimeRate) earned.push("on_time_hero");
  }

  // 🚀 Most Active — top-N by activity events (leader only).
  if (mostActiveLeaderIds.has(a.userId)) {
    earned.push("most_active");
  }

  return earned;
}

/** Find the single most-active student (ties: all leaders share the badge). */
function mostActiveLeaders(analytics: StudentAnalytics[]): Set<string> {
  const max = analytics.reduce(
    (m, a) => (a.activityEvents > m ? a.activityEvents : m),
    0,
  );
  if (max === 0) return new Set();
  return new Set(
    analytics.filter((a) => a.activityEvents === max).map((a) => a.userId),
  );
}

// ---------------------------------------------------------------------------
// Public service API.
// ---------------------------------------------------------------------------

/**
 * Compute + persist badge awards for all students.
 * Idempotent — upsert on unique(badgeId, userId) means re-running never
 * duplicates. Awards are never revoked (positive gamification §7.16).
 */
export async function computeAndAwardBadges(): Promise<{
  awarded: number;
  evaluated: number;
}> {
  // Ensure badge catalog exists (seed-on-first-run).
  await seedBadgeCatalog();

  const [analytics, badges] = await Promise.all([
    fetchStudentAnalytics(),
    prisma.badge.findMany({ select: { id: true, key: true } }),
  ]);
  const badgeByKey = new Map(badges.map((b) => [b.key, b.id]));
  const leaders = mostActiveLeaders(analytics);

  let awarded = 0;
  for (const a of analytics) {
    const earned = evaluateBadges(a, leaders);
    for (const key of earned) {
      const badgeId = badgeByKey.get(key);
      if (!badgeId) continue;
      const result = await prisma.badgeAward.upsert({
        where: { badgeId_userId: { badgeId, userId: a.userId } },
        create: { badgeId, userId: a.userId },
        update: {}, // no-op — award already exists
        select: { id: true },
      });
      // Prisma upsert returns the row either way; count new awards via createdAt
      // approximation isn't reliable, so we count all matched as "awarded" ops.
      awarded += 1;
    }
  }

  return { awarded, evaluated: analytics.length };
}

/** Return the badge catalog (all badges). */
export async function getBadgeCatalog(): Promise<Badge[]> {
  await seedBadgeCatalog();
  return prisma.badge.findMany({ orderBy: { createdAt: "asc" } });
}

/**
 * Return all catalog badges joined with this student's award info.
 * Unearned badges have `award: null` (FE expects full catalog).
 */
export async function getStudentBadges(
  userId: string,
): Promise<{ badge: Badge; award: BadgeAward | null }[]> {
  await seedBadgeCatalog();
  const rows = await prisma.badge.findMany({
    include: {
      awards: { where: { userId }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((b) => {
    const { awards, ...badge } = b;
    return { badge, award: awards[0] ?? null };
  });
}

// ---------------------------------------------------------------------------
// Seed — ensures the 5 badge definitions exist in the DB.
// ---------------------------------------------------------------------------

let seeded = false;

async function seedBadgeCatalog(): Promise<void> {
  if (seeded) return;
  for (const def of BADGE_DEFS) {
    await prisma.badge.upsert({
      where: { key: def.key },
      create: {
        key: def.key,
        name: def.name,
        description: def.description,
        emoji: def.emoji,
        criteria: def.criteria,
      },
      update: {
        name: def.name,
        description: def.description,
        emoji: def.emoji,
        criteria: def.criteria,
      },
      select: { id: true },
    });
  }
  seeded = true;
}
