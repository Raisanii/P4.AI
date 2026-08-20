// Self-test: birthday today detection (§7.19). Run: npx tsx src/lib/birthday.test.ts
// Verifies isBirthdayToday with WIB boundary cases. Pure logic — no DB import.

import { isBirthdayToday } from "@/lib/birthday";

const asserts: string[] = [];
function eq(name: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  asserts.push(`${pass ? "✓" : "✗"} ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
  if (!pass) process.exitCode = 1;
}

// Fix "now" at 2026-08-20T00:00:00Z so WIB math is deterministic.
// WIB = UTC+7, so 2026-08-20T00:00:00Z = 2026-08-20T07:00 WIB.
const NOW = new Date("2026-08-20T00:00:00Z");

// Same WIB day → true.
eq("same WIB day → birthday today", isBirthdayToday(new Date("2008-08-20T05:00:00Z"), NOW), true);
// Different day → false.
eq("different day → not today", isBirthdayToday(new Date("2008-08-21T05:00:00Z"), NOW), false);
// Different month → false.
eq("different month → not today", isBirthdayToday(new Date("2008-07-20T05:00:00Z"), NOW), false);
// String date works.
eq("string date → birthday today", isBirthdayToday("2008-08-20T05:00:00Z", NOW), true);
// null → false.
eq("null → false", isBirthdayToday(null, NOW), false);
// undefined → false.
eq("undefined → false", isBirthdayToday(undefined, NOW), false);
// Invalid string → false.
eq("invalid string → false", isBirthdayToday("not-a-date", NOW), false);
// Year is irrelevant — only month+day matters.
eq("different year same month/day → today", isBirthdayToday(new Date("1999-08-20T12:00:00Z"), NOW), true);
// WIB boundary: 2026-08-20T17:00:00Z = 2026-08-21T00:00 WIB → not Aug 20 WIB.
eq("UTC evening → next WIB day → not today", isBirthdayToday(new Date("2008-08-20T17:00:00Z"), NOW), false);

console.log(asserts.join("\n"));
console.log(asserts.every((l) => l.startsWith("✓")) ? "\nALL PASSED" : "\nFAILURES");
