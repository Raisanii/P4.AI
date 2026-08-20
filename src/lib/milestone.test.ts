// Self-test: milestone countdown + expiry + cap (MILE-03..05). Run: npx tsx src/lib/milestone.test.ts
// Verifies countdownDays, isPastTarget, isMilestoneType, MAX_ACTIVE_MILESTONES.
// Pure logic only — no DB import.

import {
  countdownDays,
  isPastTarget,
  isMilestoneType,
  MAX_ACTIVE_MILESTONES,
} from "@/lib/milestone";

const asserts: string[] = [];
function eq(name: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  asserts.push(`${pass ? "✓" : "✗"} ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
  if (!pass) process.exitCode = 1;
}

// Fix "now" at 2026-08-20T00:00:00Z so WIB math is deterministic.
// WIB = UTC+7, so 2026-08-20T00:00:00Z = 2026-08-20T07:00 WIB.
const NOW = new Date("2026-08-20T00:00:00Z");

// countdownDays — same WIB day → 0 (MILE-03).
eq("same WIB day → 0 countdown", countdownDays(new Date("2026-08-20T05:00:00Z"), NOW), 0);
// Tomorrow WIB → 1.
eq("tomorrow WIB → 1 countdown", countdownDays(new Date("2026-08-21T05:00:00Z"), NOW), 1);
// 10 days out → 10.
eq("10 days out → 10 countdown", countdownDays(new Date("2026-08-30T05:00:00Z"), NOW), 10);
// Past date → 0 (clamped, non-negative).
eq("past date → 0 countdown", countdownDays(new Date("2026-08-01T05:00:00Z"), NOW), 0);
// Countdown never negative even for far-past.
eq("far past → 0 countdown", countdownDays(new Date("2025-01-01T00:00:00Z"), NOW), 0);

// isPastTarget — milestone date's WIB day strictly before now's WIB day → expired (MILE-04).
eq("yesterday WIB → past target", isPastTarget(new Date("2026-08-19T05:00:00Z"), NOW), true);
eq("today WIB → not past target", isPastTarget(new Date("2026-08-20T05:00:00Z"), NOW), false);
eq("tomorrow WIB → not past target", isPastTarget(new Date("2026-08-21T05:00:00Z"), NOW), false);

// isMilestoneType — accept valid enum values, reject others (MILE-02).
eq("PTS is valid", isMilestoneType("PTS"), true);
eq("PRAKERIN is valid", isMilestoneType("PRAKERIN"), true);
eq("OTHER is valid", isMilestoneType("OTHER"), true);
eq("lowercase rejected", isMilestoneType("pts"), false);
eq("unknown type rejected", isMilestoneType("EXAM"), false);
eq("non-string rejected", isMilestoneType(123), false);

// MAX_ACTIVE_MILESTONES — the cap value (MILE-05).
eq("cap is 5", MAX_ACTIVE_MILESTONES, 5);

console.log(asserts.join("\n"));
console.log(asserts.every((l) => l.startsWith("✓")) ? "\nALL PASSED" : "\nFAILURES");
