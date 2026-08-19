import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let db = "unreachable";
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "reachable";
  } catch (err) {
    console.error("health: DB connectivity check failed", err);
  }

  return NextResponse.json({
    status: db === "reachable" ? "ok" : "degraded",
    db,
  });
}
