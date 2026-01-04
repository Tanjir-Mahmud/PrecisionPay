import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { verifyAuth } from "@/lib/firebase-admin";

export async function getDashboardStats(idToken: string) {
    try {
        const userId = await verifyAuth(idToken);
        // If auth fails, return null or throw. The client will handle empty state.
        if (!userId) throw new Error("Unauthorized");

        let targetMonth = format(new Date(), "yyyy-MM");

        // 0. Compliance Context
        const settings = await prisma.companySettings.findUnique({ where: { userId } });

        // Context defaults if no settings
        const compliance = {
            country: settings?.country || "USA",
            currency: (settings?.country === "UK" ? "£" : settings?.country === "DE" || settings?.country === "ES" ? "€" : settings?.country === "BD" ? "৳" : settings?.country === "IN" ? "₹" : "$"),
            taxYear: `FY${new Date().getFullYear()}`
        };

        // 1. Total Payout & Expense Distribution
        // "Smart Dashboard" - If current month has no data, find the latest month that DOES for this user.
        const currentMonthCheck = await prisma.payrollRun.findFirst({
            where: {
                monthYear: targetMonth,
                status: "PAID",
                employee: { userId } // Scoped
            }
        });

        if (!currentMonthCheck) {
            const latestRun = await prisma.payrollRun.findFirst({
                where: {
                    status: "PAID",
                    employee: { userId } // Scoped
                },
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
                status: "PAID",
                employee: { userId } // Scoped
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
                monthYear: format(new Date(), "yyyy-MM"),
                status: { in: ["DRAFT", "PENDING_REVIEW"] },
                employee: { userId } // Scoped
            }
        });

        // 3. Comparison (Target Month vs Month Before Target)
        const lastMonthDate = new Date(targetMonth + "-01");
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonth = format(lastMonthDate, "yyyy-MM");

        const lastMonthPayout = await prisma.payrollRun.aggregate({
            _sum: { netPay: true },
            where: {
                monthYear: lastMonth,
                status: { in: ["APPROVED", "PAID"] },
                employee: { userId } // Scoped
            }
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
            where: {
                monthYear: targetMonth,
                employee: { userId } // Scoped
            },
            include: { employee: true }
        });

        const auditSummary = {
            taxMisses: 0,
            salaryAnomalies: 0,
            attendanceAlerts: 0
        };

        const auditFlags: string[] = [];

        for (const run of runs) {
            if (run.netPay > 1000 && run.tax === 0) {
                auditSummary.taxMisses++;
                auditFlags.push(`Tax Miss: ${run.employee.firstName} (Income > 1k, Tax 0)`);
            }
            if (run.bonus > (run.basePay * 0.5)) {
                auditSummary.salaryAnomalies++;
                auditFlags.push(`High Bonus: ${run.employee.firstName} (Bonus > 50% Base)`);
            }
        }

        // Real Attendance Alerts
        const lateEmployees = await prisma.attendance.groupBy({
            by: ['employeeId'],
            where: {
                employee: { userId }, // Scoped
                OR: [
                    { isLate: true },
                    { status: { in: ["ABSENT", "LATE", "HALF_DAY_DEDUCTION"] } }
                ]
            }
        });
        auditSummary.attendanceAlerts = lateEmployees.length;

        // 5. Total Employees
        const employeesCount = await prisma.employee.count({
            where: {
                userId, // Scoped
                isActive: true
            }
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
            auditFlags: auditFlags.slice(0, 5)
        };
    } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        // Return null or error structure, allow client to show error state
        throw error;
    }
}


