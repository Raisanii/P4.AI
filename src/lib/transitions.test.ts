// Self-test: transition table + overdue logic (TASK-08, NFR-10, TASK-10).
// Run: npx tsx src/lib/transitions.test.ts
// Pure logic only — no DB import.

import {
  validateTransition,
  isSource,
  getTargetStatus,
  getEventType,
  getRequiredFrom,
} from "@/lib/transitions";
import { isOverdue, computeEffectiveStatus } from "@/services/overdue";

const asserts: string[] = [];
let failed = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failed++;
  asserts.push(`${pass ? "✓" : "✗"} ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

// --- validateTransition (TASK-08: forward-only) ---
// START: TODO → IN_PROGRESS
eq("START from TODO ok", validateTransition("START", "TODO"), {
  ok: true, from: "TODO", to: "IN_PROGRESS", action: "START",
});
// COMPLETE: IN_PROGRESS → DONE
eq("COMPLETE from IN_PROGRESS ok", validateTransition("COMPLETE", "IN_PROGRESS"), {
  ok: true, from: "IN_PROGRESS", to: "DONE", action: "COMPLETE",
});
// Forbidden: IN_PROGRESS → TODO
eq("START from IN_PROGRESS forbidden", validateTransition("START", "IN_PROGRESS").ok, false);
// Forbidden: DONE → IN_PROGRESS
eq("COMPLETE from DONE forbidden", validateTransition("COMPLETE", "DONE").ok, false);
// Forbidden: DONE → TODO (START on DONE)
eq("START from DONE forbidden", validateTransition("START", "DONE").ok, false);

// --- helper consistency ---
eq("getTargetStatus START", getTargetStatus("START"), "IN_PROGRESS");
eq("getTargetStatus COMPLETE", getTargetStatus("COMPLETE"), "DONE");
eq("getEventType START", getEventType("START"), "TASK_STARTED");
eq("getEventType COMPLETE", getEventType("COMPLETE"), "TASK_COMPLETED");
eq("getRequiredFrom START", getRequiredFrom("START"), "TODO");
eq("getRequiredFrom COMPLETE", getRequiredFrom("COMPLETE"), "IN_PROGRESS");

// --- isSource sanitizer ---
eq("WEB valid source", isSource("WEB"), true);
eq("WHATSAPP valid source", isSource("WHATSAPP"), true);
eq("ADMIN valid source", isSource("ADMIN"), true);
eq("SYSTEM valid source", isSource("SYSTEM"), true);
eq("WEBHOOK invalid source", isSource("WEBHOOK"), false);
eq("empty invalid source", isSource(""), false);
eq("number invalid source", isSource(42), false);

// --- isOverdue + computeEffectiveStatus (TASK-10) ---
const deadline = new Date("2026-08-25T23:59:59Z");
const before = new Date("2026-08-24T12:00:00Z");
const after = new Date("2026-08-26T12:00:00Z");

// DONE is never overdue even past deadline
eq("DONE past deadline not overdue", isOverdue("DONE", deadline, after), false);
// TODO before deadline → not overdue
eq("TODO before deadline not overdue", isOverdue("TODO", deadline, before), false);
// TODO after deadline → overdue
eq("TODO after deadline overdue", isOverdue("TODO", deadline, after), true);
// IN_PROGRESS after deadline → overdue
eq("IN_PROGRESS after deadline overdue", isOverdue("IN_PROGRESS", deadline, after), true);

// computeEffectiveStatus
eq("effective DONE past deadline stays DONE", computeEffectiveStatus("DONE", deadline, after), "DONE");
eq("effective TODO after deadline → OVERDUE", computeEffectiveStatus("TODO", deadline, after), "OVERDUE");
eq("effective IN_PROGRESS after deadline → OVERDUE", computeEffectiveStatus("IN_PROGRESS", deadline, after), "OVERDUE");
eq("effective TODO before deadline stays TODO", computeEffectiveStatus("TODO", deadline, before), "TODO");

console.log(asserts.join("\n"));
console.log(`\n${asserts.length - failed}/${asserts.length} passed`);
if (failed > 0) process.exitCode = 1;
