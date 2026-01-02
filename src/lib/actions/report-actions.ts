"use server";

import { PrismaClient } from "@prisma/client";
import { format, subMonths, startOfYear, endOfYear } from "date-fns";

const prisma = new PrismaClient();

export interface ReportData {
    taxLiability: { month: string; amount: number }[];
    variance: {
        category: string;
        current: number;
        previous: number;
        diffPct: number;
        status: "OK" | "Warning" | "Critical"
    }[];
    topPerformers: { name: string; dept: string; score: number; cost: number }[];
}

export async function getReportData(): Promise<ReportData> {
    const currentMonth = format(new Date(), "yyyy-MM");
    const lastMonth = format(subMonths(new Date(), 1), "yyyy-MM");

    // 1. Tax Liability (Yearly Trend)
    // Fetch aggregate tax per month for the current year
    const runs = await prisma.payrollRun.groupBy({
        by: ['monthYear'],
        _sum: { tax: true },
        where: {
            monthYear: { startsWith: format(new Date(), "yyyy") } // '2025'
        },
        orderBy: { monthYear: 'asc' }
    });

    const taxLiability = runs.map(r => ({
        month: r.monthYear,
        amount: r._sum.tax || 0
    }));

    // 2. Variance Analysis (Current vs Last Month Totals)
    const currentStats = await prisma.payrollRun.aggregate({
        where: { monthYear: currentMonth },
        _sum: { netPay: true, overtimePay: true, tax: true }
    });

    const lastStats = await prisma.payrollRun.aggregate({
        where: { monthYear: lastMonth },
        _sum: { netPay: true, overtimePay: true, tax: true }
    });

    const calcVariance = (curr: number, prev: number, label: string) => {
        const diff = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
        let status: "OK" | "Warning" | "Critical" = "OK";
        if (Math.abs(diff) > 10) status = "Warning";
        if (Math.abs(diff) > 20) status = "Critical"; // >20% change is high

        return {
            category: label,
            current: curr,
            previous: prev,
            diffPct: parseFloat(diff.toFixed(1)),
            status
        };
    };

    const variance = [
        calcVariance(currentStats._sum.netPay || 0, lastStats._sum.netPay || 0, "Total Net Payout"),
        calcVariance(currentStats._sum.overtimePay || 0, lastStats._sum.overtimePay || 0, "Overtime Costs"),
        calcVariance(currentStats._sum.tax || 0, lastStats._sum.tax || 0, "Tax Liabilities"),
    ];

    // 3. Top Performers vs Cost
    // In a real app, 'score' would come from the Auditor module.
    // We'll fetch top 5 highest paid employees and mock a score for now or join with Auditor if it existed as a table.
    // Since Auditor is Logic-only right now, we'll simulate scores for the high earners.
    const topEarners = await prisma.employee.findMany({
        orderBy: { baseSalary: 'desc' },
        take: 5,
        select: { firstName: true, lastName: true, department: true, baseSalary: true }
    });

    const topPerformers = topEarners.map(e => ({
        name: `${e.firstName} ${e.lastName}`,
        dept: e.department,
        cost: e.baseSalary,
        score: Math.floor(Math.random() * (100 - 85) + 85) // Mock 85-100 score
    }));

    return { taxLiability, variance, topPerformers };
}
