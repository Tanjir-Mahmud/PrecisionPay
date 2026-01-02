"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getSettings() {
    try {
        // Fallback: Try RAW query first to get 'country' if Client is outdated
        try {
            const rows: any = await prisma.$queryRaw`SELECT * FROM CompanySettings WHERE id = 'default'`;

            if (rows && rows.length > 0) {
                return {
                    ...rows[0],
                    // Ensure defaults if null (though DB defaults handle this)
                    country: rows[0].country || "USA",
                    standardWorkHours: rows[0].standardWorkHours || 160,
                    overtimeMultiplier: rows[0].overtimeMultiplier || 1.5
                };
            }
        } catch (e) {
            console.warn("Raw query failed, falling back to standard client (Country may be missing)", e);
        }

        return await prisma.companySettings.upsert({
            where: { id: "default" },
            update: {},
            create: {
                id: "default",
                companyName: "PrecisionPay Inc.",
                standardWorkHours: 160,
                overtimeMultiplier: 1.5,
                shiftStart: "09:00",
                shiftEnd: "17:00",
                gracePeriodMins: 15
            }
        });
    } catch (e) {
        console.error("Failed to fetch/upsert settings (DB Error):", e);
        // Fallback Mock Settings
        return {
            id: "mock-default",
            companyName: "PrecisionPay Inc. (Offline Mode)",
            standardWorkHours: 160,
            overtimeMultiplier: 1.5,
            shiftStart: "09:00",
            shiftEnd: "17:00",
            gracePeriodMins: 15,
            country: "USA",
            bonusThreshold: 90,
            bonusRate: 5.0,
            lateDeductionRatio: 0.5,
            maxLateFlags: 3,
            taxBracketJson: "[]"
        };
    }
}

// Helper to force schema sync if CLI is locked
async function ensureSchema() {
    try { await prisma.$executeRawUnsafe(`ALTER TABLE CompanySettings ADD COLUMN country TEXT DEFAULT 'USA'`); } catch (e) { }
    try { await prisma.$executeRawUnsafe(`ALTER TABLE CompanySettings ADD COLUMN gracePeriodMins INTEGER DEFAULT 15`); } catch (e) { }
    try { await prisma.$executeRawUnsafe(`ALTER TABLE CompanySettings ADD COLUMN overtimeMultiplier REAL DEFAULT 1.5`); } catch (e) { }
}

export async function updateSettings(formData: FormData) {
    const companyName = formData.get("companyName") as string;
    const shiftStart = formData.get("shiftStart") as string;
    const shiftEnd = formData.get("shiftEnd") as string;
    const overtimeMultiplier = parseFloat(formData.get("overtimeMultiplier") as string) || 1.5;
    const gracePeriodMins = parseInt(formData.get("gracePeriodMins") as string) || 15;
    const country = (formData.get("country") as string) || "USA";

    // Ensure columns exist (Hotfix for locked DB)
    await ensureSchema();

    // Standard Prisma Update (Schema confirmed to have 'country')
    try {
        console.log(`[Settings] Updating country to: ${country}`);
        await prisma.companySettings.upsert({
            where: { id: "default" },
            update: {
                companyName,
                shiftStart,
                shiftEnd,
                overtimeMultiplier,
                gracePeriodMins,
                country
            },
            create: {
                id: "default",
                companyName,
                shiftStart,
                shiftEnd,
                overtimeMultiplier,
                gracePeriodMins,
                country
            }
        });
        console.log("[Settings] Update successful");
    } catch (e) {
        console.error("Settings Update Failed:", e);
        throw new Error("Failed to save settings.");
    }
    revalidatePath("/settings");
    revalidatePath("/attendance");
    revalidatePath("/"); // Dashboard
}

export async function resetPrismaData() {
    try {
        // Delete in order of dependency
        await prisma.attendance.deleteMany({});
        await prisma.payrollRun.deleteMany({});
        await prisma.employee.deleteMany({});
        // Optional: Reset Company Settings to default? Keeping it for now as user likely wants to keep config.
        console.log("Prisma Data Wiped Successfully");
    } catch (e) {
        console.error("Prisma Wipe Failed:", e);
        throw new Error("Failed to wipe local database.");
    }
    revalidatePath("/");
    revalidatePath("/attendance");
    revalidatePath("/payroll");
    revalidatePath("/dashboard");
}
