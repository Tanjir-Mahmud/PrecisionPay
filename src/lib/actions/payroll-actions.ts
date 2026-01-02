"use server";

import { format, subMonths } from "date-fns";
import { revalidatePath } from "next/cache";
import { calculatePayroll } from "@/lib/payroll";
import { prisma } from "@/lib/prisma";

// ... existing interfaces ...

export async function runNewCalculation() {
    const currentMonth = format(new Date(), "yyyy-MM");
    const employees = await prisma.employee.findMany({ where: { isActive: true } });

    for (const emp of employees) {
        // 1. Fetch Attendance Stats (Mocking Overtime, Real Penalty Check)
        const penaltyCount = await prisma.attendance.count({
            where: {
                employeeId: emp.id,
                date: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                },
                status: "HALF_DAY_DEDUCTION"
            }
        });

        // 2 unpaid leave days = 4 penalties (example logic) or just direct deduction
        const unpaidLeaveDays = penaltyCount * 0.5;

        // Mock Overtime for variety (in real app, sum(clockOut - shiftEnd))
        const overtimeHours = Math.floor(Math.random() * 5);

        // 2. Calculate
        const result = calculatePayroll(emp.baseSalary, overtimeHours, unpaidLeaveDays);

        // 3. Save
        await prisma.payrollRun.upsert({
            where: {
                employeeId_monthYear: {
                    employeeId: emp.id,
                    monthYear: currentMonth
                }
            },
            update: {
                basePay: result.earnings.baseSalary,
                hra: result.earnings.hra,
                transport: result.earnings.transport,
                overtimeHours: overtimeHours,
                overtimePay: result.earnings.overtimePay,
                bonus: result.earnings.bonus,
                tax: result.deductions.tax,
                pf: result.deductions.pf,
                leaveDeduction: result.deductions.leaveDeduction,
                netPay: result.netPay,
                // Status remains same if exists, or reset to DRAFT? Usually reset if re-running.
                status: "DRAFT",
                flaggedForReview: false
            },
            create: {
                employeeId: emp.id,
                monthYear: currentMonth,
                basePay: result.earnings.baseSalary,
                hra: result.earnings.hra,
                transport: result.earnings.transport,
                overtimeHours: overtimeHours,
                overtimePay: result.earnings.overtimePay,
                bonus: result.earnings.bonus,
                tax: result.deductions.tax,
                pf: result.deductions.pf,
                leaveDeduction: result.deductions.leaveDeduction,
                netPay: result.netPay,
                status: "DRAFT",
                flaggedForReview: false
            }
        });
    }

    revalidatePath("/payroll"); // Refresh the list
    revalidatePath("/"); // Update Dashboard stats
}

export interface PayrollWithVariance {
    id: string;
    employeeName: string;
    department: string;
    monthYear: string;
    netPay: number;
    basePay: number;
    hra: number;
    transport: number;
    overtimePay: number;
    bonus: number;
    tax: number;
    pf: number;
    leaveDeduction: number;
    status: string;
    flaggedForReview: boolean;
    variancePct: number; // Percentage change from last month (e.g. 15.5)
}

export async function getPendingPayrolls(): Promise<PayrollWithVariance[]> {
    try {
        const currentMonth = format(new Date(), "yyyy-MM");
        const lastMonth = format(subMonths(new Date(), 1), "yyyy-MM");

        // Fetch Current PENDING/DRAFT
        const currentRuns = await prisma.payrollRun.findMany({
            where: {
                monthYear: currentMonth,
                status: { in: ["DRAFT", "PENDING_REVIEW"] }
            },
            include: {
                employee: true
            }
        });

        // Fetch Last Month's Net Pay for comparison
        const employeeIds = currentRuns.map(r => r.employeeId);
        const lastRuns = await prisma.payrollRun.findMany({
            where: {
                monthYear: lastMonth,
                employeeId: { in: employeeIds }
            },
            select: {
                employeeId: true,
                netPay: true
            }
        });

        // Map for quick lookup
        const lastMonthMap = new Map(lastRuns.map(r => [r.employeeId, r.netPay]));

        // Build Result
        return currentRuns.map(run => {
            const lastNet = lastMonthMap.get(run.employeeId) || 0;
            let variance = 0;
            if (lastNet > 0) {
                variance = ((run.netPay - lastNet) / lastNet) * 100;
            }

            return {
                id: run.id,
                employeeName: `${run.employee.firstName} ${run.employee.lastName}`,
                department: run.employee.department,
                monthYear: run.monthYear,
                netPay: run.netPay,
                basePay: run.basePay,
                hra: run.hra,
                transport: run.transport,
                overtimePay: run.overtimePay,
                bonus: run.bonus,
                tax: run.tax,
                pf: run.pf,
                leaveDeduction: run.leaveDeduction,
                status: run.status,
                flaggedForReview: run.flaggedForReview,
                variancePct: parseFloat(variance.toFixed(1))
            };
        });
    } catch (e) {
        console.error("Failed to fetch pending payrolls:", e);
        return [];
    }
}

export async function approvePayroll(id: string) {
    await prisma.payrollRun.update({
        where: { id },
        data: { status: "APPROVED", flaggedForReview: false }
    });
    revalidatePath("/payroll");
}

export async function flagPayroll(id: string) {
    const run = await prisma.payrollRun.findUnique({ where: { id } });
    await prisma.payrollRun.update({
        where: { id },
        data: { flaggedForReview: !run?.flaggedForReview }
    });
    revalidatePath("/payroll");
}

export async function bulkApprove() {
    const currentMonth = format(new Date(), "yyyy-MM");

    // Approve all that are NOT flagged
    await prisma.payrollRun.updateMany({
        where: {
            monthYear: currentMonth,
            status: { in: ["DRAFT", "PENDING_REVIEW"] },
            flaggedForReview: false
        },
        data: { status: "APPROVED" }
    });
    revalidatePath("/payroll");
}
