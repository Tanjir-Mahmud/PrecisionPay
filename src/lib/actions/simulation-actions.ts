"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { calculatePayroll } from "@/lib/payroll";

const prisma = new PrismaClient();

export async function simulateScenario(countryCode: string) {
    const currentMonth = format(new Date(), "yyyy-MM");

    // 1. Update Settings to Target Country (Using Raw to bypass lock if needed, but standard for simplicity in seed)
    try {
        await prisma.$executeRaw`UPDATE CompanySettings SET country = ${countryCode} WHERE id = 'default'`;
    } catch (e) {
        console.error("Failed to set country", e);
    }

    // 2. Clear current month's runs to avoid duplicates/mess
    await prisma.payrollRun.deleteMany({
        where: { monthYear: currentMonth }
    });

    // 3. Get Active Employees
    const employees = await prisma.employee.findMany({ where: { isActive: true } });

    // 4. Generate Mock Runs with "Issues" for Audit Demo
    for (const emp of employees) {
        // Randomize scenarios
        const isTaxMissCandidate = Math.random() > 0.8;
        const isHighBonus = Math.random() > 0.9;

        let bonus = 0;
        if (isHighBonus) bonus = emp.baseSalary * 0.6; // Trigger Anomaly

        // Calculate (Engine will pick up new Country Code automatically via settings? 
        // No, calculatePayroll takes countryCode as arg. I should pass it.)

        // Mock Overtime
        const overtimeHours = Math.floor(Math.random() * 5);

        const result = calculatePayroll(emp.baseSalary, overtimeHours, 0, countryCode, bonus);

        // Inject Tax Miss artificially if candidate (and not 0 tax country)
        let finalTax = result.deductions.tax;
        if (isTaxMissCandidate && countryCode === "USA") {
            finalTax = 0; // Artificial error for Audit Tool to catch
        }

        await prisma.payrollRun.create({
            data: {
                employeeId: emp.id,
                monthYear: currentMonth,
                basePay: result.earnings.baseSalary,
                hra: result.earnings.hra,
                transport: result.earnings.transport,
                overtimeHours: overtimeHours,
                overtimePay: result.earnings.overtimePay,
                bonus: result.earnings.bonus,
                tax: finalTax,
                pf: result.deductions.pf,
                leaveDeduction: result.deductions.leaveDeduction,
                netPay: result.netPay + (result.deductions.tax - finalTax), // Adjust net if we removed tax
                status: "PENDING_REVIEW",
                flaggedForReview: isTaxMissCandidate // Pre-flag for effect
            }
        });
    }

    revalidatePath("/");
    revalidatePath("/payroll");
}
