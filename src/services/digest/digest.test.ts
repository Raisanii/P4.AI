// P4.AI — digest pure-helper self-check (no framework).
// Run: npx tsx src/services/digest/digest.test.ts
// Asserts the date/key/range helpers and the notStarted dedup contract.

import assert from "node:assert";
import { wibDayRange, wibDateKey, isPastSendTime, formatDigestDate, completionRate } from "@/lib/digest";

// WIB = UTC+7: a UTC timestamp in the evening of one day maps to the next WIB day.
// 2026-08-19T23:30:00Z = 2026-08-20T06:30 WIB.
const sample = new Date("2026-08-19T23:30:00Z");

assert.strictEqual(wibDateKey(sample), "2026-08-20", "wibDateKey crosses UTC boundary correctly");
assert.strictEqual(formatDigestDate(sample), "20 Agustus", "formatDigestDate WIB day+month");
assert.strictEqual(isPastSendTime(17, sample), false, "06:30 WIB is before 17:00");
assert.strictEqual(isPastSendTime(17, new Date("2026-08-19T11:00:00Z")), true, "18:00 WIB is past 17:00");

const [start, end] = wibDayRange(sample);
assert.strictEqual(start.toISOString(), "2026-08-19T17:00:00.000Z", "day range start = WIB midnight");
assert.strictEqual(end.toISOString(), "2026-08-20T17:00:00.000Z", "day range end = next WIB midnight");

assert.strictEqual(completionRate(12, 36), 33, "completionRate rounds");
assert.strictEqual(completionRate(0, 0), 0, "completionRate guards divide-by-zero");

// notStarted dedup contract (mirrors buildDigest): a student TODO on two tasks
// but started a third is NOT counted in "belum mulai".
const started = new Set(["s1"]);
const todo = new Set(["s1", "s2", "s3", "s2"]);
const notStarted = [...todo].filter((id) => !started.has(id)).length;
assert.strictEqual(notStarted, 2, "notStarted counts distinct students, excludes any who started");

console.log("digest helpers OK");
