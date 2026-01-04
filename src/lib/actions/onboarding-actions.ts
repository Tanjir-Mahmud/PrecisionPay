"use server";

import { db } from "@/lib/firebase"; // Firestore
import { prisma } from "@/lib/prisma";
import { doc, setDoc } from "firebase/firestore";
import { revalidatePath } from "next/cache";

export async function completeOnboarding(data: any, uid: string) {
    console.log(`[Onboarding] Starting for User ${uid}`, data);

    try {
        // 1. Save to Firestore (Access Control Source of Truth)
        await setDoc(doc(db, "payroll_settings", uid), {
            ...data,
            adminId: uid,
            createdAt: new Date()
        });

        // 2. Save to Prisma (Dashboard & Payroll Engine Source of Truth)
        // Multi-tenant: Upsert by UserID
        await prisma.companySettings.upsert({
            where: { userId: uid }, // Changed from id: "default"
            update: {
                companyName: data.companyName,
                country: data.country,
                standardWorkHours: 160, // Ensure strictly set updates
                gracePeriodMins: parseTime(data.gracePeriod),
            },
            create: {
                userId: uid, // [NEW]
                companyName: data.companyName,
                country: data.country,
                standardWorkHours: 160,
                gracePeriodMins: 15
            }
        });

        // Update specific fields that match
        const shiftStart = "09:00";
        const graceMins = 15;

        // Optimization: Single Upsert above is enough usually, but keeping logic consistent with previous 2-step if needed
        // Merging into one update for simplicity
        await prisma.companySettings.update({
            where: { userId: uid },
            data: {
                lateDeductionRatio: data.absentDeductionRate ? (data.absentDeductionRate / 100) : 0.5,
                maxLateFlags: data.lateThreshold,
            }
        });

        // 3. (Optional) Load Demo Data
        if (data.loadDemoData) {
            await seedDemoData(uid);
            console.log("Demo Data requested - Seeding triggered");
        }

        revalidatePath("/");
        return { success: true };
    } catch (e) {
        console.error("Onboarding Error:", e);
        throw new Error("Failed to save onboarding configuration.");
    }
}

// Helper to parse "HH:MM" to minutes if needed, or just use default.
function parseTime(timeStr: string) {
    if (!timeStr) return 15;
    const [h, m] = timeStr.split(":").map(Number);
    const shiftStartMins = 9 * 60; // 09:00
    const inputMins = (h || 0) * 60 + (m || 0);
    const diff = inputMins - shiftStartMins;
    return diff > 0 ? diff : 15;
}

async function seedDemoData(uid: string) {
    // 1. Create 2 Employees
    const emp1 = await prisma.employee.create({
        data: {
            userId: uid, // [NEW]
            firstName: "Alice",
            lastName: "Smith",
            email: `alice.${uid.slice(0, 5)}@demo.com`,
            joiningDate: new Date("2023-01-15"),
            designation: "Senior Developer",
            department: "Engineering",
            baseSalary: 85000,
            isActive: true,
        }
    });

    const emp2 = await prisma.employee.create({
        data: {
            userId: uid, // [NEW]
            firstName: "Bob",
            lastName: "Jones",
            email: `bob.${uid.slice(0, 5)}@demo.com`,
            joiningDate: new Date("2023-03-10"),
            designation: "Sales Executive",
            department: "Sales",
            baseSalary: 62000,
            isActive: true,
        }
    });

    // 2. Create sample Attendance Logs (Late / On Time)
    const today = new Date();
    // Yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Day before
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);

    await prisma.attendance.createMany({
        data: [
            // Alice (Good attendance)
            { employeeId: emp1.id, date: yesterday, clockIn: setTime(yesterday, 8, 55), clockOut: setTime(yesterday, 17, 5), status: "PRESENT" },
            { employeeId: emp1.id, date: dayBefore, clockIn: setTime(dayBefore, 9, 0), clockOut: setTime(dayBefore, 17, 0), status: "PRESENT" },

            // Bob (Late)
            { employeeId: emp2.id, date: yesterday, clockIn: setTime(yesterday, 9, 45), clockOut: setTime(yesterday, 17, 30), status: "PRESENT", isLate: true, lateMinutes: 45 },
            { employeeId: emp2.id, date: dayBefore, clockIn: setTime(dayBefore, 9, 30), clockOut: setTime(dayBefore, 17, 0), status: "PRESENT", isLate: true, lateMinutes: 30 },
        ]
    });

    console.log("Demo Data Seeded!");
}

function setTime(date: Date, h: number, m: number) {
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
}
