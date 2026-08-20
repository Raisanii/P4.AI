// P4.AI — /jadwal page (SCHD-03/04/06).
// Server component: fetches today's or weekly schedule from the service layer,
// role-gates CRUD buttons. Toggle via ?week=today|weekly searchParams.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { getTodaySchedule, getWeeklySchedule, detectWeekType } from "@/services/schedule";
import ScheduleTable from "@/components/schedule/ScheduleTable";
import type { Role } from "@/lib/roles";

export const dynamic = "force-dynamic";

const CAN_EDIT: Role[] = ["SUPER_ADMIN", "SECRETARY"];

export default async function JadwalPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const mode = week === "weekly" ? "weekly" : "today";

  const entries = mode === "weekly"
    ? await getWeeklySchedule()
    : await getTodaySchedule();

  const session = await auth();
  const role = session?.user?.role;
  const canEdit = role ? CAN_EDIT.includes(role) : false;
  const currentWeek = detectWeekType();

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">Jadwal</h1>
        <div className="view-toggle" role="tablist">
          <Link
            href="/jadwal"
            className={`toggle-btn ${mode === "today" ? "active" : ""}`}
            role="tab"
          >
            Hari Ini
          </Link>
          <Link
            href="/jadwal?week=weekly"
            className={`toggle-btn ${mode === "weekly" ? "active" : ""}`}
            role="tab"
          >
            Mingguan
          </Link>
        </div>
      </div>

      {mode === "weekly" && (
        <p className="week-label">Pekan {currentWeek}</p>
      )}

      <ScheduleTable entries={entries} canEdit={canEdit} mode={mode} />
    </main>
  );
}
