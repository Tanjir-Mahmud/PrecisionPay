import { getDashboardStats } from "@/lib/dashboard-service";
import { StatsCard } from "./Widgets";
import { Banknote, Scale, FileText } from "lucide-react";

export default async function RealTimeStats() {
    // Fetch data from Server Action / Service
    const stats = await getDashboardStats();

    // Format currency helper
    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: stats.compliance.currency || 'USD', maximumFractionDigits: 0 }).format(n);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatsCard
                title="Total Company Payout"
                value={fmt(stats.totalPayout)}
                subtext={`Paid in ${new Date().toLocaleString('default', { month: 'long' })}`}
                isPositive={true}
                icon={<Banknote className="w-5 h-5 text-amber-400" />}
            />
            <StatsCard
                title="Monthly Tax Liabilities"
                value={fmt(stats.taxLiabilities)}
                icon={<Scale className="w-5 h-5 text-indigo-400" />}
            />
            <StatsCard
                title="Total Employees"
                value={stats.employeesCount.toString()}
                subtext="Active in Database"
                icon={<FileText className="w-5 h-5 text-emerald-400" />}
            />
        </div>
    );
}
