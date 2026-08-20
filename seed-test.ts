// Test seed: 2 users (1 whitelisted student, 1 non-whitelisted), 1 admin,
// 1 assignment (Matematika), 1 schedule entry, 1 announcement, 1 BotSkill.
// Run: npx tsx seed-test.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pw = await bcrypt.hash("12345", 10);

  // Super Admin (for task creation + admin bot routes)
  const admin = await prisma.user.upsert({
    where: { nis: "00001" },
    update: {},
    create: {
      name: "Admin Test",
      nis: "00001",
      passwordHash: pw,
      role: "SUPER_ADMIN",
      whatsappNumber: "+628111000001",
    },
  });

  // Whitelisted student — has a registered whatsappNumber
  const student = await prisma.user.upsert({
    where: { nis: "10001" },
    update: {},
    create: {
      name: "Ayyi Test",
      nis: "10001",
      passwordHash: pw,
      role: "STUDENT",
      whatsappNumber: "+628111100001",
    },
  });

  // Non-whitelisted user — number NOT in DB (we just won't seed them).
  // Tests will send from a JID that doesn't match any User.whatsappNumber.

  // Assignment: Matematika Bab 4 (deadline future, so it's "active")
  const assignment = await prisma.assignment.upsert({
    where: { id: "assign-mtk-4" },
    update: {},
    create: {
      id: "assign-mtk-4",
      title: "Matematika Bab 4",
      subject: "Matematika",
      description: "Soal halaman 45-50, kerjakan di buku tulis.",
      deadline: new Date("2026-12-31T23:59:00Z"),
      type: "INDIVIDUAL",
      submissionFormat: "Buku Tulis",
      criteria: "Semua soal terjawab",
      reference: "Buku Matematika Bab 4",
      knowledgeBase: {
        title: "Matematika Bab 4",
        subject: "Matematika",
        description: "Soal halaman 45-50, kerjakan di buku tulis.",
        deadline: "2026-12-31T23:59:00Z",
        type: "INDIVIDUAL",
        submissionFormat: "Buku Tulis",
        criteria: "Semua soal terjawab",
        reference: "Buku Matematika Bab 4",
      },
      createdById: admin.id,
    },
  });

  // Second assignment for edge-case testing
  const assignment2 = await prisma.assignment.upsert({
    where: { id: "assign-eng-2" },
    update: {},
    create: {
      id: "assign-eng-2",
      title: "Bahasa Inggris Essay",
      subject: "Bahasa Inggris",
      description: "Write a 200-word essay about your hobby.",
      deadline: new Date("2026-12-15T23:59:00Z"),
      type: "INDIVIDUAL",
      submissionFormat: "PDF",
      criteria: "Min 200 words",
      reference: "Textbook Unit 5",
      knowledgeBase: {},
      createdById: admin.id,
    },
  });

  // Schedule: today's day of week
  const today = new Date();
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const dayKey = days[today.getDay()];

  await prisma.schedule.upsert({
    where: { id: "sched-mtk-today" },
    update: {},
    create: {
      id: "sched-mtk-today",
      dayOfWeek: dayKey,
      subject: "Matematika",
      teacher: "Pak Budi",
      startTime: "07:30",
      endTime: "09:00",
      room: "R1",
    },
  });

  // Announcement
  await prisma.announcement.upsert({
    where: { id: "ann-test-1" },
    update: {},
    create: {
      id: "ann-test-1",
      title: "Ujian Matematika",
      content: "Besok ada ujian matematika bab 4.",
      priority: "URGENT",
      authorId: admin.id,
    },
  });

  // BotSkill
  await prisma.botSkill.upsert({
    where: { id: "skill-tugas-qna" },
    update: {},
    create: {
      id: "skill-tugas-qna",
      name: "tugas-qna",
      description: "Jawab pertanyaan tugas dari knowledge base.",
      prompt: "Jawab pertanyaan tugas berdasarkan knowledge base tugas.",
      active: true,
    },
  });

  // BotRule
  await prisma.botRule.upsert({
    where: { id: "rule-no-spoof" },
    update: {},
    create: {
      id: "rule-no-spoof",
      name: "no-spoof",
      condition: "user claims teacher",
      action: "deny",
      active: true,
    },
  });

  console.log("Seed complete:");
  console.log("  Admin:", admin.id, admin.whatsappNumber);
  console.log("  Student:", student.id, student.whatsappNumber);
  console.log("  Assignment:", assignment.id, assignment.title);
  console.log("  Assignment2:", assignment2.id, assignment2.title);
  console.log("  Schedule day:", dayKey);
}

main()
  .catch((e) => {
    console.error("SEED ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
