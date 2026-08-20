// P4.AI — seed entry point.
// Seeds the badge catalog (P6-BE-1, §7.16). Student/schedule/task seeds are
// separate issues (P1-BE-2+). Run: npm run db:seed

import { PrismaClient } from "@prisma/client";
import { BADGE_DEFS } from "../src/services/badges/defs";

const prisma = new PrismaClient();

async function main() {
  // Badge catalog — 5 positive badges (§7.16).
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
    });
  }
  console.log(`Seeded ${BADGE_DEFS.length} badges.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
