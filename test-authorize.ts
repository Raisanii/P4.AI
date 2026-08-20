import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function test() {
  try {
    console.log("1. Creating adapter...");
    const adapter = new PrismaLibSQL({ url: "file:./prisma/local.db" });
    console.log("2. Creating PrismaClient...");
    const prisma = new PrismaClient({ adapter });
    console.log("3. Querying user...");
    const user = await prisma.user.findFirst({ where: { name: "Admin Raisani" } });
    console.log("4. User:", JSON.stringify(user, null, 2));
    if (user) {
      console.log("5. Verifying password...");
      const ok = bcrypt.compareSync("10001", user.passwordHash);
      console.log("6. Password match:", ok);
    }
    await prisma.$disconnect();
  } catch (e) {
    console.error("ERROR:", e);
  }
}
test();
