// P4.AI — Append-only ActivityLog writer (§7.5.3, NFR-11).
//
// This is the ONLY code path that inserts into ActivityLog. There is no
// update() or delete() call anywhere — ActivityLog is append-only by
// construction (NFR-11). Grep `activityLog.update\|activityLog.delete`
// returns zero hits.

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { ActivityEventType, Source } from "@prisma/client";

/**
 * Append a single event to the ActivityLog. Never returns a mutable handle;
 * the row is written once and never touched again.
 */
export async function logActivity(params: {
  userId: string;
  assignmentId?: string | null;
  eventType: ActivityEventType;
  source: Source;
  metadata?: Record<string, unknown> | null;
}) {
  await prisma.activityLog.create({
    data: {
      userId: params.userId,
      assignmentId: params.assignmentId ?? null,
      eventType: params.eventType,
      source: params.source,
      metadata: params.metadata
        ? (params.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
    select: { id: true }, // callers never need the full row back
  });
}
