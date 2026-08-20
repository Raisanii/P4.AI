// P4.AI — Badge types (P6-FE-1).
//
// Mirrors the Badge + BadgeAward models defined by P6-BE-1 in prisma/schema.
// The FE consumes two endpoints (all roles, AUTH required):
//   GET /api/badges                → Badge[] (catalog)
//   GET /api/students/[id]/badges  → StudentBadge[] (earned awards)

/** A badge definition in the catalog (positive-only per §7.16). */
export interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  emoji: string;
  criteria: unknown; // Json blob from BE — opaque to FE
}

/** A badge award belonging to a student. */
export interface BadgeAward {
  id: string;
  badgeId: string;
  userId: string;
  awardedAt: string; // ISO timestamp
}

/** Badge joined with its award info, as returned by /api/students/[id]/badges. */
export interface StudentBadge {
  badge: Badge;
  award: BadgeAward | null; // null = catalog badge not yet earned by this student
}

/** Shape of an error response body from the API. */
interface ApiErrorBody {
  error?: string;
}

export async function fetchBadges(): Promise<Badge[]> {
  const res = await fetch("/api/badges");
  if (!res.ok) {
    const body: ApiErrorBody = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to load badges (${res.status})`);
  }
  return res.json() as Promise<Badge[]>;
}

export async function fetchStudentBadges(
  studentId: string,
): Promise<StudentBadge[]> {
  const res = await fetch(
    `/api/students/${encodeURIComponent(studentId)}/badges`,
  );
  if (!res.ok) {
    const body: ApiErrorBody = await res.json().catch(() => ({}));
    throw new Error(
      body.error ?? `Failed to load student badges (${res.status})`,
    );
  }
  return res.json() as Promise<StudentBadge[]>;
}
