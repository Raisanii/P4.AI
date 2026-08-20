// Self-test: week detection logic (SCHD-05). Run: npx tsx src/lib/schedule.test.ts
// Verifies detectWeekType + dayKeyFor return correct values for known dates.
// Pure logic only — no DB import.

import { detectWeekType, dayKeyFor } from "@/lib/schedule";

const asserts: string[] = [];
function eq(name: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  asserts.push(`${pass ? "✓" : "✗"} ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
  if (!pass) process.exitCode = 1;
}

// 2026-01-05 is the anchor Monday (Week A). Any date in that ISO week → A.
eq("anchor Monday is Week A", detectWeekType(new Date("2026-01-05T00:00:00Z")), "A");
eq("anchor +6 days (Sunday) still Week A", detectWeekType(new Date("2026-01-11T00:00:00Z")), "A");
// 7 days later → Week B.
eq("anchor +7 days is Week B", detectWeekType(new Date("2026-01-12T00:00:00Z")), "B");
eq("anchor +13 days is Week B", detectWeekType(new Date("2026-01-18T00:00:00Z")), "B");
// 14 days later → back to A.
eq("anchor +14 days is Week A", detectWeekType(new Date("2026-01-19T00:00:00Z")), "A");
// Two-week boundary holds 4 weeks out.
eq("anchor +28 days is Week A", detectWeekType(new Date("2026-02-02T00:00:00Z")), "A");
eq("anchor +35 days is Week B", detectWeekType(new Date("2026-02-09T00:00:00Z")), "B");

// dayKeyFor — verify each weekday maps to its key.
eq("2026-01-05 (Mon) → monday", dayKeyFor(new Date("2026-01-05T00:00:00Z")), "monday");
eq("2026-01-06 (Tue) → tuesday", dayKeyFor(new Date("2026-01-06T00:00:00Z")), "tuesday");
eq("2026-01-04 (Sun) → sunday", dayKeyFor(new Date("2026-01-04T00:00:00Z")), "sunday");
eq("2026-01-09 (Fri) → friday", dayKeyFor(new Date("2026-01-09T00:00:00Z")), "friday");
eq("2026-01-10 (Sat) → saturday", dayKeyFor(new Date("2026-01-10T00:00:00Z")), "saturday");

console.log(asserts.join("\n"));
console.log(asserts.every((l) => l.startsWith("✓")) ? "\nALL PASSED" : "\nFAILURES");
