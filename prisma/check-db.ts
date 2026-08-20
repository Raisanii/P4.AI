import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient();
  const u = await p.user.count();
  const s = await p.schedule.count();
  const users = await p.user.findMany({ select: { name: true, role: true } });
  console.log("users:", u, "schedules:", s);
  console.log("user list:", JSON.stringify(users, null, 2));
  await p.$disconnect();
}
main();
