// P4.AI — dashboard home (DASH-01).
// Server component: fetches announcements, birthdays, milestone countdown,
// and today's schedule from the service layer and passes them to DashboardGrid.

import DashboardGrid from "@/components/dashboard/DashboardGrid";
import { getActiveMilestones } from "@/services/milestone";
import { getTodaySchedule } from "@/services/schedule";
import { getActiveAnnouncements } from "@/services/announcement";
import { getTodaysBirthdays } from "@/services/user";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
 // Fetch all four in parallel — each hits the DB once.
 const [milestones, schedule, announcements, birthdays] = await Promise.all([
 getActiveMilestones(),
 getTodaySchedule(),
 getActiveAnnouncements(),
 getTodaysBirthdays(),
 ]);

 return (
 <main className="page">
 <h1 className="dash-title">Dashboard</h1>
 <DashboardGrid
 milestones={milestones}
 schedule={schedule}
 announcements={announcements}
 birthdays={birthdays}
 />
 </main>
 );
}
