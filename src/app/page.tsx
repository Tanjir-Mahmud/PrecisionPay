"use client";

import {
  Banknote,
  Scale,
  FileText,
  Calendar,
  Loader2
} from "lucide-react";
import {
  StatsCard,
  PayrollTrendChart,
  PerformersCard,
} from "@/components/dashboard/Widgets";
import {
  AuditSummary,
  ExpenseDonut,
  ComplianceBadge
} from "@/components/dashboard/AuditWidgets";
import RealTimeStats from "@/components/dashboard/RealTimeStats";
import AttendanceLogger from "@/components/attendance/AttendanceLogger";
import DynamicLowAttendance from "@/components/dashboard/DynamicLowAttendance";
import { getDashboardStats } from "@/lib/dashboard-service";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      if (!authLoading) setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const token = await user.getIdToken();
        const data = await getDashboardStats(token);
        setStats(data);
      } catch (e) {
        console.error("Dashboard Load Error:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, authLoading]);

  if (authLoading || (loading && user)) {
    return <div className="flex h-96 items-center justify-center text-slate-400"><Loader2 className="animate-spin w-8 h-8" /></div>;
  }

  // If not logged in, show welcome or redirect
  if (!user) {
    return <div className="p-10 text-center text-slate-400">Please log in to view the dashboard.</div>;
  }

  // Fallback if stats fail
  if (!stats) {
    return <div className="p-10 text-center text-red-400">Failed to load dashboard data.</div>;
  }

  const today = format(new Date(), "MMMM d, yyyy");

  // Reconstruct ComplianceBadge props from stats
  // stats.compliance = { country, currency, taxYear }
  // ComplianceBadge props: country, year, currency

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

      {/* Top Stats Row (Real-Time Postgres Engine) */}
      <RealTimeStats stats={stats} />

      {/* Audit & Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pro Auditor Widget */}
        <AuditSummary summary={stats.auditSummary} />

        {/* Financial Distribution */}
        <ExpenseDonut expenses={stats.expenses} />

        {/* Enhanced Performers (Bonus Eligible) */}
        <PerformersCard /> {/* It fetches its own data securely now */}
      </div>

      {/* Bottom Grid: Trends & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2">
          <PayrollTrendChart /> {/* It fetches its own data securely now */}
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
