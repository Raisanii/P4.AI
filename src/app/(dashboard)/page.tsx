// P4.AI — dashboard home (DASH-01).
// Server component: fetches today's attendance recap from the attendance
// service and passes it to DashboardGrid for DASH-07.

import DashboardGrid from "@/components/dashboard/DashboardGrid";
import { getAttendanceRecap } from "@/services/attendance";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { recap, total } = await getAttendanceRecap(new Date());

  const attendanceRecap = {
    hadir: recap.HADIR,
    sakit: recap.SAKIT,
    izin: recap.IZIN,
    alfa: recap.ALFA,
    totalStudents: total,
  };

  return (
    <main className="page">
      <h1 className="dash-title">Dashboard</h1>
      <DashboardGrid attendanceRecap={attendanceRecap} />
    </main>
  );
}
