import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSQL({
  url: "file:./dev.db",
  authToken: undefined,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findFirst({ where: { name: "Student Test" } });
  console.log("User found:", JSON.stringify(user, null, 2));
  if (user) {
    console.log("bcrypt verify (12345):", bcrypt.compareSync("12345", user.passwordHash));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
