// Self-test: claimReminder P2002 detection (SUN-37).
// Run: npx tsx src/services/reminder/dedup.test.ts
//
// claimReminder must:
//  - return true when ReminderLog.create succeeds (first claim wins)
//  - return false on Prisma P2002 (unique violation → already claimed)
//  - re-throw any other error (connection drop, schema error, etc.)
//
// No live DB needed — we inject a fake create onto the prisma singleton the
// module imports, then call the real claimReminder so its try/catch + P2002
// mapping is exercised.

import { Prisma } from "@prisma/client";
import { claimReminder } from "@/services/reminder/dedup";
import { prisma } from "@/lib/db";

const asserts: string[] = [];
function check(name: string, pass: boolean) {
  asserts.push(`${pass ? "✓" : "✗"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const claim = {
  userId: "u1",
  assignmentId: "a1",
  reminderType: "T_MINUS_1_DAY" as const,
};

// Two calls: first succeeds, second throws P2002 (unique constraint).
let createCalls = 0;
const fakeCreate = async () => {
  createCalls++;
  if (createCalls === 2) {
    throw new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`userId`,`assignmentId`,`reminderType`)",
      { code: "P2002", clientVersion: "6.19.3" },
    );
  }
  return { id: "log-1" };
};

// Swap create on the shared singleton (dedup.ts imports the same object).
const realCreate = prisma.reminderLog.create;
(prisma.reminderLog as unknown as { create: typeof fakeCreate }).create = fakeCreate;

async function main() {
  // 1st call → create succeeds → claim wins → true
  const first = await claimReminder(claim);
  check("first claim returns true", first === true);

  // 2nd call → create throws P2002 → already claimed → false (NOT a throw)
  const second = await claimReminder(claim);
  check("second claim returns false (P2002)", second === false);

  // non-P2002 error must re-throw, not be swallowed into "false"
  (prisma.reminderLog as unknown as { create: () => Promise<never> }).create = async () => {
    throw new Prisma.PrismaClientKnownRequestError("boom", { code: "P2025", clientVersion: "6.19.3" });
  };
  let threw = false;
  try {
    await claimReminder(claim);
  } catch {
    threw = true;
  }
  check("non-P2002 Prisma error re-throws", threw === true);

  // restore
  (prisma.reminderLog as unknown as { create: typeof realCreate }).create = realCreate;

  console.log(asserts.join("\n"));
  console.log(asserts.every((l) => l.startsWith("✓")) ? "\nALL PASSED" : "\nFAILURES");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
