import {
  Banknote,
  Scale,
  FileText,
  Calendar
} from "lucide-react";
import {
  StatsCard,
  PayrollTrendChart,
  PerformersCard,
  AttendanceAlert,
  RecentActivity
} from "@/components/dashboard/Widgets";
import {
  ComplianceBadge,
  AuditSummary,
  ExpenseDonut
} from "@/components/dashboard/AuditWidgets";
import RealTimeStats from "@/components/dashboard/RealTimeStats";
import AttendanceLogger from "@/components/attendance/AttendanceLogger";
import DynamicLowAttendance from "@/components/dashboard/DynamicLowAttendance";
import { getDashboardStats } from "@/lib/dashboard-service";
import { format } from "date-fns";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  // Format currency
  const fmt = (n: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: stats.compliance.currency === "$" ? "USD" : stats.compliance.country === "UK" ? "GBP" : stats.compliance.country === "BD" ? "BDT" : "EUR",
      maximumFractionDigits: 0
    }).format(n).replace("BDT", "৳").replace("USD", "$"); // Simple manual override for display if needed
  };

  const today = format(new Date(), "MMMM d, yyyy");

  return (
    <div className="space-y-6">
      {/* Header Row: Context & Tools */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="bg-slate-800/50 p-2 rounded-lg text-slate-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard Overview</h1>
            <p className="text-xs text-slate-500">{today}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <ComplianceBadge
            country={stats.compliance.country}
            year={stats.compliance.taxYear}
            currency={stats.compliance.currency}
          />

        </div>
      </div>

      {/* Top Stats Row (Real-Time Firebase Engine) */}
      <RealTimeStats />

      {/* Fallback/Legacy View (Hidden or Removed) - Replaced by RealTimeStats */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> ... </div> */}

      {/* Audit & Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pro Auditor Widget */}
        <AuditSummary summary={stats.auditSummary} />

        {/* Financial Distribution */}
        <ExpenseDonut expenses={stats.expenses} />

        {/* Enhanced Performers (Bonus Eligible) */}
        <PerformersCard />
      </div>

      {/* Bottom Grid: Trends & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2">
          <PayrollTrendChart />
        </div>

        {/* Day 4 Dynamic Modules */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <AttendanceLogger />
          <DynamicLowAttendance />
        </div>
      </div>
    </div>
  );
}
