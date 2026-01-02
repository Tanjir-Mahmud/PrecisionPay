"use server";

import { PrismaClient } from "@prisma/client";
import { format, differenceInMinutes, parse, addMinutes } from "date-fns";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

// --- Types ---
export interface AttendanceResult {
    success: boolean;
    message: string;
    isLate?: boolean;
    lateMinutes?: number;
    flagCount?: number;
    penaltyApplied?: boolean;
}

// --- Helper: Parse Time String "HH:mm" to Date for today ---
function parseTimeToday(timeStr: string): Date {
    return parse(timeStr, 'HH:mm', new Date());
}

/**
 * Process a Clock-In Event
 * Checks shift rules, grace period, and updates late flags.
 */
export async function clockInEmployee(employeeId: string, clockInTime: Date): Promise<AttendanceResult> {
    const today = new Date();
    const dateStr = format(today, 'yyyy-MM-dd');

    // 1. Fetch Company Settings & Employee
    const settings = await prisma.companySettings.findUnique({ where: { id: 'default' } });
    if (!settings) throw new Error("Company Settings not configured");

    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: { attendance: true }
    });
    if (!employee) return { success: false, message: "Employee not found" };

    // 2. Determine Shift & Logic
    const shiftStart = parseTimeToday(settings.shiftStart);
    const graceLimit = addMinutes(shiftStart, settings.gracePeriodMins);

    // Calculate Lateness
    let isLate = false;
    let lateMinutes = 0;

    if (clockInTime > graceLimit) {
        isLate = true;
        lateMinutes = differenceInMinutes(clockInTime, shiftStart);
    }

    // 3. Check Existing Record
    const existing = await prisma.attendance.findUnique({
        where: {
            employeeId_date: {
                employeeId,
                date: today // Ideally strip time, but Prisma DateTime vs JS Date needs care (using dateStr for logic usually better but utilizing native Date here)
            }
        }
    });

    // Simplification: In a real app we'd strip time from 'today' for the query. 
    // For this engine we assume 'date' field in DB stores midnight.
    // Let's rely on upsert logic in a real database or assume 'today' is set to midnight by caller or here.
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    // 4. Calculate Total Flags for Deduction Logic
    // We need to count *previous* lates + this one if late.
    // Efficiently: Count records where isLate=true for this employee in current month/period.

    // For simplicity of this module: 3 lates = deduction.
    // We'll count total lates this month.
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lateCount = await prisma.attendance.count({
        where: {
            employeeId,
            date: { gte: startOfMonth },
            isLate: true
        }
    });

    const currentFlagCount = isLate ? lateCount + 1 : lateCount;
    let penaltyApplied = false;

    // Rule: Every 3rd late mark triggers deduction
    if (isLate && currentFlagCount % settings.maxLateFlags === 0) {
        penaltyApplied = true;
        // In a real app, we'd insert a deduction record into PayrollRun here or mark attendance status as HALF_DAY
    }

    // 5. Save Record
    await prisma.attendance.upsert({
        where: {
            employeeId_date: {
                employeeId,
                date: startOfDay
            }
        },
        update: {
            clockIn: clockInTime,
            isLate,
            lateMinutes,
            status: penaltyApplied ? "HALF_DAY_DEDUCTION" : (isLate ? "LATE" : "PRESENT")
        },
        create: {
            employeeId,
            date: startOfDay,
            clockIn: clockInTime,
            isLate,
            lateMinutes,
            status: penaltyApplied ? "HALF_DAY_DEDUCTION" : (isLate ? "LATE" : "PRESENT")
        }
    });

    revalidatePath("/attendance");
    return {
        success: true,
        message: isLate ? `Marked Late (${lateMinutes} min). Flag #${currentFlagCount}` : "Clocked In On Time",
        isLate,
        lateMinutes,
        flagCount: currentFlagCount,
        penaltyApplied
    };
}

/**
 * Fetch Attendance Logs for UI
 */
export async function getAttendanceLogs() {
    return await prisma.attendance.findMany({
        orderBy: { date: 'desc' },
        take: 50,
        include: { employee: true }
    });
}
