// Self-test: attendance helpers (ATT-03 default HADIR, ATT-08 unique).
// Run: npx tsx src/lib/attendance.test.ts
// Verifies isAttendanceStatus + parseDateParam + toDateOnly return correct
// values for known inputs. Pure logic only — no DB import.

import {
  isAttendanceStatus,
  parseDateParam,
  toDateOnly,
} from "@/lib/attendance";

const asserts: string[] = [];
function eq(name: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  asserts.push(`${pass ? "✓" : "✗"} ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
  if (!pass) process.exitCode = 1;
}

// isAttendanceStatus — accepts the four valid values (ATT-02).
eq("HADIR valid", isAttendanceStatus("HADIR"), true);
eq("SAKIT valid", isAttendanceStatus("SAKIT"), true);
eq("IZIN valid", isAttendanceStatus("IZIN"), true);
eq("ALFA valid", isAttendanceStatus("ALFA"), true);
eq("hadir lowercase invalid", isAttendanceStatus("hadir"), false);
eq("empty invalid", isAttendanceStatus(""), false);
eq("number invalid", isAttendanceStatus(42), false);

// parseDateParam — valid date → Date at 00:00:00 UTC; invalid → null.
eq(
  "valid date parsed",
  parseDateParam("2026-08-20")?.toISOString(),
  "2026-08-20T00:00:00.000Z",
);
eq("null input → null", parseDateParam(null), null);
eq("empty string → null", parseDateParam(""), null);
eq("garbage → null", parseDateParam("not-a-date"), null);

// toDateOnly — strips time to 00:00:00 UTC.
eq(
  "afternoon stripped to midnight",
  toDateOnly(new Date("2026-08-20T15:30:45Z")).toISOString(),
  "2026-08-20T00:00:00.000Z",
);
eq(
  "midnight stays midnight",
  toDateOnly(new Date("2026-08-20T00:00:00Z")).toISOString(),
  "2026-08-20T00:00:00.000Z",
);

console.log(asserts.join("\n"));
console.log(asserts.every((l) => l.startsWith("✓")) ? "\nALL PASSED" : "\nFAILURES");
