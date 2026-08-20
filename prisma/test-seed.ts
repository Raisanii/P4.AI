// P4.AI — test seed: 3 users (1 per role) + schedule entries (A/B/null weekType).
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  // Wipe (db push already reset, but be safe).
  await prisma.schedule.deleteMany();
  await prisma.user.deleteMany();

  // 3 users — one per role. nis must be unique; whatsappNumber unique.
  const admin = await prisma.user.create({
    data: {
      name: "Admin Test",
      nis: "00001",
      passwordHash: hashPassword("adminpass"),
      role: "SUPER_ADMIN",
      whatsappNumber: "628000000001",
    },
  });
  const secretary = await prisma.user.create({
    data: {
      name: "Secretary Test",
      nis: "00002",
      passwordHash: hashPassword("secretpass"),
      role: "SECRETARY",
      whatsappNumber: "628000000002",
    },
  });
  const student = await prisma.user.create({
    data: {
      name: "Student Test",
      nis: "00003",
      passwordHash: hashPassword("studentpass"),
      role: "STUDENT",
      whatsappNumber: "628000000003",
    },
  });

  console.log("Seeded users:", admin.id, secretary.id, student.id);

  // Schedule entries:
  // - Week A Monday: Matematika
  // - Week B Monday: Fisika
  // - NULL (every week) Monday: Upacara
  // - Week A Tuesday: B.Inggris
  // - Week B Tuesday: B.Indonesia
  // - NULL Tuesday: Olahraga
  const entries = [
    { dayOfWeek: "monday",    weekType: "A",  subject: "Matematika",  teacher: "Pak Budi",  startTime: "07:30", endTime: "09:00", room: "R101" },
    { dayOfWeek: "monday",    weekType: "B",  subject: "Fisika",      teacher: "Bu Siti",    startTime: "07:30", endTime: "09:00", room: "R101" },
    { dayOfWeek: "monday",    weekType: null, subject: "Upacara",     teacher: null,         startTime: "07:00", endTime: "07:30", room: null },
    { dayOfWeek: "tuesday",   weekType: "A",  subject: "B.Inggris",   teacher: "Ms Jane",    startTime: "08:00", endTime: "09:30", room: "R202" },
    { dayOfWeek: "tuesday",   weekType: "B",  subject: "B.Indonesia", teacher: "Pak Andi",   startTime: "08:00", endTime: "09:30", room: "R202" },
    { dayOfWeek: "tuesday",   weekType: null, subject: "Olahraga",     teacher: "Pak Rian",   startTime: "15:00", endTime: "16:30", room: null },
    { dayOfWeek: "friday",    weekType: "A",  subject: "Sejarah",     teacher: "Bu Dewi",     startTime: "10:00", endTime: "11:30", room: "R303" },
    { dayOfWeek: "friday",    weekType: null, subject: "Sholat Jumat",teacher: null,         startTime: "11:45", endTime: "12:30", room: null },
  ];

  for (const e of entries) {
    await prisma.schedule.create({ data: e });
  }

  console.log(`Seeded ${entries.length} schedule entries`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
