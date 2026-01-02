import { PrismaClient } from "@prisma/client";
import { format } from "date-fns";

const prisma = new PrismaClient();

export async function getDashboardStats() {
    const currentMonth = format(new Date(), "yyyy-MM");

    // 0. Compliance Context
    // Fallback if settings table empty or locked (using raw query approach in settings, but standard here for read)
    const settings = await prisma.companySettings.findFirst({ where: { id: "default" } });
    const compliance = {
        country: settings?.country || "USA",
        currency: (settings?.country === "UK" ? "£" : settings?.country === "DE" || settings?.country === "ES" ? "€" : settings?.country === "BD" ? "৳" : settings?.country === "IN" ? "₹" : "$"),
        taxYear: `FY${new Date().getFullYear()}`
    };

    // 1. Total Payout & Expense Distribution
    const payoutAggregate = await prisma.payrollRun.aggregate({
        _sum: {
            netPay: true,
            tax: true,
            pf: true,
            bonus: true,
            basePay: true
        },
        where: {
            monthYear: currentMonth,
            status: { in: ["APPROVED", "PAID"] }
        }
    });

    const expenses = {
        netSalaries: payoutAggregate._sum.netPay || 0,
        taxes: payoutAggregate._sum.tax || 0,
        benefits: payoutAggregate._sum.pf || 0,
        bonuses: payoutAggregate._sum.bonus || 0
    };

    // 2. Pending Payslips
    const pendingCount = await prisma.payrollRun.count({
        where: {
            monthYear: currentMonth,
            status: { in: ["DRAFT", "PENDING_REVIEW"] }
        }
    });

    // 3. Comparison
    const lastMonth = format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "yyyy-MM");
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

    // 4. Audit Engine
    const runs = await prisma.payrollRun.findMany({
        where: { monthYear: currentMonth },
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

    return {
        totalPayout: currentPayout,
        taxLiabilities: expenses.taxes,
        pendingPayslips: pendingCount,
        payoutChange,
        compliance,
        expenses,
        auditSummary,
        auditFlags: auditFlags.slice(0, 5) // Top 5
    };
}


