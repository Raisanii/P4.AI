
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const prisma = new PrismaClient({
  adapter: new PrismaLibSQL({ url: "file:./dev.db" }),
});

async function main() {
  const users = await prisma.user.findMany();
  console.log("Users in DB:", JSON.stringify(users.map(u => ({name: u.name, role: u.role, nis: u.nis})), null, 2));
  
  const admin = await prisma.user.findFirst({ where: { name: "Test Admin" } });
  console.log("Admin found:", admin?.name, admin?.role);
  
  const { verifyPassword } = await import("./src/lib/password.js");
  const valid = verifyPassword("12345", admin.passwordHash);
  console.log("Password verify:", valid);
}

main().catch(console.error).finally(() => prisma.$disconnect());
