"use server";

import { format, differenceInMinutes, parse, addMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/firebase-admin";

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
export async function clockInEmployee(idToken: string, employeeId: string, clockInTime: Date): Promise<AttendanceResult> {
    const userId = await verifyAuth(idToken);
    if (!userId) throw new Error("Unauthorized");

    const today = new Date();
    // 1. Fetch Company Settings for this User
    const settings = await prisma.companySettings.findUnique({ where: { userId } });

    // Fallback defaults if no settings configured yet
    const shiftStartStr = settings?.shiftStart || "09:00";
    const gracePeriodMins = settings?.gracePeriodMins || 15;
    const maxLateFlags = settings?.maxLateFlags || 3;

    // Verify employee belongs to this user
    const employee = await prisma.employee.findFirst({
        where: { id: employeeId, userId },
        include: { attendance: true }
    });
    if (!employee) return { success: false, message: "Employee not found or unauthorized" };

    // 2. Determine Shift & Logic
    const shiftStart = parseTimeToday(shiftStartStr);
    const graceLimit = addMinutes(shiftStart, gracePeriodMins);

    // Calculate Lateness
    let isLate = false;
    let lateMinutes = 0;

    if (clockInTime > graceLimit) {
        isLate = true;
        lateMinutes = differenceInMinutes(clockInTime, shiftStart);
    }

    // 3. Check Existing Record
    // We treat 'userId' implicitly via 'employeeId' scope
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    // 4. Calculate Total Flags for Deduction Logic
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

    if (isLate && currentFlagCount % maxLateFlags === 0) {
        penaltyApplied = true;
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
export async function getAttendanceLogs(idToken: string) {
    const userId = await verifyAuth(idToken);
    if (!userId) return [];

    return await prisma.attendance.findMany({
        where: {
            employee: {
                userId: userId // Ensure we only see logs for ONE user's employees
            }
        },
        orderBy: { date: 'desc' },
        take: 50,
        include: { employee: true }
    });
}
