// P4.AI — dashboard home (DASH-01).
// Server component: fetches announcements, birthdays, milestone countdown,
// today's schedule, class analytics, and today's attendance recap from the
// service layer and passes them to DashboardGrid (DASH-07 attendance,
// DASH-09 task progress + DASH-10 daily activity).

import DashboardGrid from "@/components/dashboard/DashboardGrid";
import DashboardAutoRefresh from "@/components/dashboard/DashboardAutoRefresh";
import { auth } from "@/lib/auth";
import { getActiveMilestones } from "@/services/milestone";
import { getTodaySchedule } from "@/services/schedule";
import { getActiveAnnouncements } from "@/services/announcement";
import { getTodaysBirthdays } from "@/services/user";
import { computeClassMetrics } from "@/services/analytics";
import { getStudentBadges } from "@/services/badges/compute";
import { getAttendanceRecap } from "@/services/attendance";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Current user — used to load their earned badges.
  const session = await auth();
  const userId = session?.user?.id;

  // Fetch all data in parallel — each hits the DB once.
  const [milestones, schedule, announcements, birthdays, classMetrics, attendance] =
    await Promise.all([
      getActiveMilestones(),
      getTodaySchedule(),
      getActiveAnnouncements(),
      getTodaysBirthdays(),
      computeClassMetrics(),
      getAttendanceRecap(new Date()),
    ]);

  // Student badges only make sense for a student viewing their own dashboard.
  const studentBadges = userId ? await getStudentBadges(userId) : null;

  const taskProgress = {
    notStarted: classMetrics.notStarted,
    inProgress: classMetrics.inProgress,
    done: classMetrics.totalProgressRecords - classMetrics.notStarted - classMetrics.inProgress,
    total: classMetrics.totalProgressRecords,
  };

  const dailyActivity = {
    startedToday: classMetrics.startedToday,
    completedToday: classMetrics.completedToday,
    notStarted: classMetrics.notStarted,
    inProgress: classMetrics.inProgress,
  };

  const attendanceRecap = {
    hadir: attendance.recap.HADIR,
    sakit: attendance.recap.SAKIT,
    izin: attendance.recap.IZIN,
    alfa: attendance.recap.ALFA,
    totalStudents: attendance.total,
  };

  return (
    <main className="page">
      <h1 className="dash-title">Dashboard</h1>
      <DashboardAutoRefresh />
      <DashboardGrid
        milestones={milestones}
        schedule={schedule}
        announcements={announcements}
        birthdays={birthdays}
        taskProgress={taskProgress}
        dailyActivity={dailyActivity}
        studentBadges={studentBadges}
        attendanceRecap={attendanceRecap}
      />
    </main>
  );
}
