// P4.AI — seed entry point (stub).
// The full 36-student seed is a separate issue (P1-BE-2+).
// Run: npm run db:seed

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // TODO(P1-BE-2): seed students, schedule, tasks, attendance, announcements.
  console.log("Seed stub — no models yet. Nothing to seed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
