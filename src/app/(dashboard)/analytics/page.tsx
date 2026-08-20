// P4.AI — Analytics page: class progress + analytics dashboard (§7.8 ACT, §7.9 ANALYTICS).
// Route: /analytics — SUPER_ADMIN, SECRETARY only.
// Server component: fetches class metrics + per-student table from the
// analytics service (derived from ActivityLog + AssignmentProgress).
// PRD: TASK-11, ACT, ANALYTICS, DASH-09/10.

import { computeClassMetrics, computeStudentTable } from "@/services/analytics";
import ProgressBar from "@/components/analytics/ProgressBar";
import ClassActivitySummary from "@/components/analytics/ClassActivitySummary";
import PerStudentTable from "@/components/analytics/PerStudentTable";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [classMetrics, students] = await Promise.all([
    computeClassMetrics(),
    computeStudentTable(),
  ]);

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">📊 Class Analytics</h1>
      </div>

      <div className="analytics-grid">
        {/* Class progress bars (§7.9) */}
        <section className="widget" aria-label="Class Progress">
          <h2 className="widget-label">📈 Class Progress</h2>
          <ProgressBar
            label="Completion Rate"
            value={classMetrics.completionRate}
          />
          <ProgressBar
            label="On-Time Rate"
            value={classMetrics.onTimeRate}
          />
          <ul className="analytics-stats">
            <li>
              <span className="stat-label">Started Today</span>
              <span className="stat-value">{classMetrics.startedToday} / {classMetrics.totalStudents}</span>
            </li>
            <li>
              <span className="stat-label">Completed Today</span>
              <span className="stat-value">{classMetrics.completedToday} / {classMetrics.totalStudents}</span>
            </li>
            <li>
              <span className="stat-label">In Progress</span>
              <span className="stat-value">{classMetrics.inProgress}</span>
            </li>
            <li>
              <span className="stat-label">Not Started</span>
              <span className="stat-value">{classMetrics.notStarted}</span>
            </li>
            <li>
              <span className="stat-label">Overdue</span>
              <span className="stat-value stat-overdue">{classMetrics.overdue}</span>
            </li>
            <li>
              <span className="stat-label">Avg Completion Time</span>
              <span className="stat-value">{classMetrics.avgCompletionTimeLabel}</span>
            </li>
          </ul>
        </section>

        {/* Daily activity summary (§7.8 ACT) */}
        <ClassActivitySummary
          summary={{
            startedToday: classMetrics.startedToday,
            completedToday: classMetrics.completedToday,
            notStarted: classMetrics.notStarted,
            inProgress: classMetrics.inProgress,
            totalStudents: classMetrics.totalStudents,
            completionRate: classMetrics.completionRate,
            onTimeRate: classMetrics.onTimeRate,
          }}
        />
      </div>

      {/* Per-student table (§7.9) */}
      <section className="widget analytics-student-section" aria-label="Per Student Progress">
        <h2 className="widget-label">👥 Per Student Progress</h2>
        <PerStudentTable students={students} />
      </section>
    </main>
  );
}
