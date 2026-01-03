import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export async function getDashboardStats() {
    try {
        let targetMonth = format(new Date(), "yyyy-MM");

        // 0. Compliance Context
        // Fallback if settings table empty or locked (using raw query approach in settings, but standard here for read)
        const settings = await prisma.companySettings.findFirst({ where: { id: "default" } });
        const compliance = {
            country: settings?.country || "USA",
            currency: (settings?.country === "UK" ? "£" : settings?.country === "DE" || settings?.country === "ES" ? "€" : settings?.country === "BD" ? "৳" : settings?.country === "IN" ? "₹" : "$"),
            taxYear: `FY${new Date().getFullYear()}`
        };

        // 1. Total Payout & Expense Distribution
        // "Smart Dashboard" - If current month has no data, find the latest month that DOES.
        // This ensures the charts are never empty if we have history.
        const currentMonthCheck = await prisma.payrollRun.findFirst({
            where: { monthYear: targetMonth, status: "PAID" }
        });

        if (!currentMonthCheck) {
            const latestRun = await prisma.payrollRun.findFirst({
                where: { status: "PAID" },
                orderBy: { monthYear: 'desc' }
            });
            if (latestRun) {
                targetMonth = latestRun.monthYear;
            }
        }

        const payoutAggregate = await prisma.payrollRun.aggregate({
            _sum: {
                netPay: true,
                tax: true,
                pf: true,
                bonus: true,
                basePay: true
            },
            where: {
                monthYear: targetMonth,
                status: "PAID"
            }
        });

        const expenses = {
            netSalaries: payoutAggregate._sum.netPay || 0,
            taxes: payoutAggregate._sum.tax || 0,
            benefits: payoutAggregate._sum.pf || 0,
            bonuses: payoutAggregate._sum.bonus || 0
        };

        // 2. Pending Payslips (Always current month, or maybe target month? Let's keep pending as "Current Action Items")
        const pendingCount = await prisma.payrollRun.count({
            where: {
                monthYear: format(new Date(), "yyyy-MM"), // Pending is always about "Now"
                status: { in: ["DRAFT", "PENDING_REVIEW"] }
            }
        });

        // 3. Comparison (Target Month vs Month Before Target)
        const lastMonthDate = new Date(targetMonth + "-01"); // Append day to parse
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonth = format(lastMonthDate, "yyyy-MM");

        const lastMonthPayout = await prisma.payrollRun.aggregate({
            _sum: { netPay: true },
            where: { monthYear: lastMonth, status: { in: ["APPROVED", "PAID"] } }
        });

        const currentPayout = expenses.netSalaries;
        const lastPayout = lastMonthPayout._sum.netPay || 0;

        let payoutChange = "0% vs Last Month";
        if (lastPayout > 0) {
            const change = ((currentPayout - lastPayout) / lastPayout) * 100;
            payoutChange = `${change > 0 ? "+" : ""}${change.toFixed(1)}% vs Last Month`;
        }

        // 4. Audit Engine (Run on the displayed data)
        const runs = await prisma.payrollRun.findMany({
            where: { monthYear: targetMonth },
            include: { employee: true }
        });

        const auditSummary = {
            taxMisses: 0,
            salaryAnomalies: 0,
            attendanceAlerts: 0
        };

        const auditFlags: string[] = [];

        for (const run of runs) {
            // A. Tax Miss
            if (run.netPay > 1000 && run.tax === 0) {
                auditSummary.taxMisses++;
                auditFlags.push(`Tax Miss: ${run.employee.firstName} (Income > 1k, Tax 0)`);
            }

            // B. Anomaly (simplified: if bonus > 50% of base)
            if (run.bonus > (run.basePay * 0.5)) {
                auditSummary.salaryAnomalies++;
                auditFlags.push(`High Bonus: ${run.employee.firstName} (Bonus > 50% Base)`);
            }
        }

        // Real Attendance Alerts (Count unique employees with at least 1 late or absent)
        const lateEmployees = await prisma.attendance.groupBy({
            by: ['employeeId'],
            where: {
                OR: [
                    { isLate: true },
                    { status: { in: ["ABSENT", "LATE", "HALF_DAY_DEDUCTION"] } } // Broaden check
                ]
            }
        });
        auditSummary.attendanceAlerts = lateEmployees.length;

        // 5. Total Employees
        const employeesCount = await prisma.employee.count({
            where: { isActive: true }
        });

        return {
            totalPayout: currentPayout,
            taxLiabilities: expenses.taxes,
            pendingPayslips: pendingCount,
            employeesCount,
            payoutChange,
            compliance,
            expenses,
            auditSummary,
            auditFlags: auditFlags.slice(0, 5) // Top 5
        };
    } catch (error) {
        console.error("Failed to fetch dashboard stats (likely DB connection issue):", error);
        // Fallback Mock Data
        return {
            totalPayout: 125000,
            taxLiabilities: 24000,
            pendingPayslips: 3,
            employeesCount: 12,
            payoutChange: "+12.5% vs Last Month",
            compliance: { country: "USA", currency: "$", taxYear: "FY2025" },
            expenses: { netSalaries: 85000, taxes: 24000, benefits: 12000, bonuses: 4000 },
            auditSummary: { taxMisses: 1, salaryAnomalies: 2, attendanceAlerts: 5 },
            auditFlags: ["System Demo Mode: Database Connection Failed", "Using Mock Data"],
        };
    }
}


