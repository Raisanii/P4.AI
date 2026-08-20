// Helper: fetch user ID by role from DB
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const role = process.argv[2] || "STUDENT";
async function main() {
  const u = await prisma.user.findFirst({ where: { role } });
  console.log(u?.id || "");
  await prisma.$disconnect();
}
main();
