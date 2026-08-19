// P4.AI — role definitions (single source of truth for RBAC roles).
// Matches the `Role` enum in prisma/schema.prisma (SUPER_ADMIN | SECRETARY | STUDENT).

export const ROLES = ["SUPER_ADMIN", "SECRETARY", "STUDENT"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
