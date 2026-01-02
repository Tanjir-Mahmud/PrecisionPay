"use server";

import { prisma } from "@/lib/prisma";
import { startOfYear, subMonths, format, startOfMonth, endOfMonth } from "date-fns";

export interface DashboardAnalytics {
    variance: {
        percentChange: number; // e.g., 15.5
        status: "CRITICAL" | "OPTIMIZED" | "STABLE";
        currentTotal: number;
        previousTotal: number;
        overtimeCost: number; // NEW: Explicit OT Cost for current month
    };
    roi: {
        id: string;
        name: string;
        role: string;
        cost: number;
        kpi: number;
        roiScore: number; // (KPI / Cost) * 10000 (scaled)
    }[];
    ytdTax: {
        totalLiabilities: number;
        country: string;
    };
    trend: {
        month: string;
        payroll: number;
    }[];
}

/**
 * Calculates Month-over-Month Variance for Payroll
 */
export async function getPayrollAnalytics(adminId: string): Promise<DashboardAnalytics> {
    // Note: adminId param kept for signature compatibility, but strict scoping might be redundant if single tenant 
    // or handled by RLS. For now, we query purely based on DB state.

    // 1. Setup Dates
    const today = new Date();
    const currentMonthStr = format(today, "yyyy-MM");
    const prevMonthStr = format(subMonths(today, 1), "yyyy-MM");
    const currentYear = today.getFullYear();

    // 2. Fetch All Payroll Runs (Paid/Approved)
    // Optimization: In a real app, verify scope or date range. Fetching all might be heavy eventually.
    // For now, fetching everything to compute trends and YTD is acceptable.
    const runs = await prisma.payrollRun.findMany({
        where: {
            status: "PAID" // STRICT reporting on PAID only
        },
        include: { employee: true }
    });

    // 3. Process Data
    let currentTotal = 0;
    let prevTotal = 0;
    let currentOT = 0;
    let ytdTax = 0;
    const monthlyMap: Record<string, number> = {};

    runs.forEach(run => {
        const amount = run.netPay;

        // Trend Data
        monthlyMap[run.monthYear] = (monthlyMap[run.monthYear] || 0) + amount;

        // Variance Data
        if (run.monthYear === currentMonthStr) {
            currentTotal += amount;
            currentOT += (run.overtimePay || 0);
        }
        if (run.monthYear === prevMonthStr) {
            prevTotal += amount;
        }

        // YTD Tax
        // Parse "YYYY-MM" to check year
        if (run.monthYear.startsWith(currentYear.toString())) {
            ytdTax += run.tax;
        }
    });

    // 4. Calculate Variance
    let percentChange = 0;
    if (prevTotal > 0) {
        percentChange = ((currentTotal - prevTotal) / prevTotal) * 100;
    } else if (currentTotal > 0) {
        percentChange = 100;
    }

    const varianceStatus = percentChange > 15 ? "CRITICAL" : percentChange < 0 ? "OPTIMIZED" : "STABLE";

    // 5. ROI Matrix (Active Employees from Runs)
    // We only have KPI if recorded. Using mock calculation or data from run if available.
    // Schema has 'performanceScore' on Employee.
    const uniqueEmpIds = Array.from(new Set(runs.map(r => r.employeeId)));

    // Fetch fresh employee data for current KPI
    const employees = await prisma.employee.findMany({
        where: { id: { in: uniqueEmpIds }, isActive: true }
    });

    const roi = employees.map(emp => {
        const cost = emp.baseSalary;
        const kpi = emp.performanceScore || 75; // Default if missing
        const roiScore = cost > 0 ? (kpi / cost) * 100000 : 0;

        return {
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            role: emp.designation,
            cost,
            kpi,
            roiScore
        };
    }).sort((a, b) => b.roiScore - a.roiScore).slice(0, 5);


    // 6. Trend Array (Last 6 Months)
    const trend = [];
    for (let i = 5; i >= 0; i--) {
        const d = subMonths(today, i);
        const k = format(d, "yyyy-MM");
        trend.push({
            month: format(d, "MMM"),
            payroll: monthlyMap[k] || 0
        });
    }

    return {
        variance: {
            percentChange,
            status: varianceStatus,
            currentTotal,
            previousTotal: prevTotal,
            overtimeCost: currentOT
        },
        roi,
        ytdTax: {
            totalLiabilities: ytdTax,
            country: "USA"
        },
        trend
    };
}
