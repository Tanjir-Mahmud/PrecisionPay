"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

import { verifyAuth } from "@/lib/firebase-admin";

export async function getSettings(idToken: string) {
    try {
        const userId = await verifyAuth(idToken);
        if (!userId) {
            console.error("getSettings: verifyAuth failed (returned null/undefined)");
            return { error: "Authentication failed. Invalid token." };
        }

        const data = await prisma.companySettings.upsert({
            where: { userId },
            update: {},
            create: {
                userId,
                id: crypto.randomUUID(), // Ensure UUID
                companyName: "PrecisionPay Inc.",
                standardWorkHours: 160,
                overtimeMultiplier: 1.5,
                shiftStart: "09:00",
                shiftEnd: "17:00",
                gracePeriodMins: 15,
                country: "USA"
            }
        });
        return { data };
    } catch (e: any) {
        console.error("Failed to fetch settings:", e);
        return { error: e.message || "Database connection failed." };
    }
}

export async function updateSettings(idToken: string, formData: FormData) {
    const userId = await verifyAuth(idToken);
    if (!userId) throw new Error("Unauthorized");

    const companyName = formData.get("companyName") as string;
    const shiftStart = formData.get("shiftStart") as string;
    const shiftEnd = formData.get("shiftEnd") as string;
    const overtimeMultiplier = parseFloat(formData.get("overtimeMultiplier") as string) || 1.5;
    const gracePeriodMins = parseInt(formData.get("gracePeriodMins") as string) || 15;
    const country = (formData.get("country") as string) || "USA";

    try {
        await prisma.companySettings.upsert({
            where: { userId },
            update: {
                companyName,
                shiftStart,
                shiftEnd,
                overtimeMultiplier,
                gracePeriodMins,
                country
            },
            create: {
                userId,
                companyName,
                shiftStart,
                shiftEnd,
                overtimeMultiplier,
                gracePeriodMins,
                country
            }
        });
        revalidatePath("/settings");
        revalidatePath("/attendance");
        revalidatePath("/");
    } catch (e) {
        console.error("Settings Update Failed:", e);
        throw new Error("Failed to save settings.");
    }
}

export async function resetPrismaData(idToken: string) {
    const userId = await verifyAuth(idToken);
    if (!userId) throw new Error("Unauthorized");

    try {
        // Delete in order of dependency - SCOPED
        // Attendance & Payroll are linked to Employee, so usually filtered via Employee, but deleteMany needs explicit logic or cascade.
        // Prisma Schema doesn't strictly enforce cascade here unless defined.
        // Safer to delete child records by finding employees first?
        // Or deleteMany where employee.userId == userId.

        await prisma.attendance.deleteMany({
            where: { employee: { userId } }
        });
        await prisma.payrollRun.deleteMany({
            where: { employee: { userId } }
        });
        await prisma.employee.deleteMany({
            where: { userId }
        });

        // Optional: Reset Company Settings to default? Keeping it for now as user likely wants to keep config.
        console.log("Prisma Data Wiped Successfully for User:", userId);
    } catch (e) {
        console.error("Prisma Wipe Failed:", e);
        throw new Error("Failed to wipe local database.");
    }
    revalidatePath("/");
    revalidatePath("/attendance");
    revalidatePath("/payroll");
    revalidatePath("/dashboard");
}
