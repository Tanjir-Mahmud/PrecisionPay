
import { getDashboardStats } from "./src/lib/dashboard-service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verify() {
    console.log("=== Verifying Audit Engine ===");

    // 1. Fetch Stats
    const stats = await getDashboardStats();
    console.log("Current Compliance:", stats.compliance);
    console.log("Audit Summary:", stats.auditSummary);
    console.log("Flags:", stats.auditFlags);
    console.log("Expenses:", stats.expenses);

    // 2. Simulate an issue if none
    if (stats.auditSummary.taxMisses === 0) {
        console.log("\nSimulating Tax Miss...");
        // find a run and update tax to 0
        const run = await prisma.payrollRun.findFirst();
        if (run) {
            await prisma.payrollRun.update({
                where: { id: run.id },
                data: { tax: 0, netPay: run.netPay + run.tax } // Increasing net pay, 0 tax -> should flag
            });
            console.log(`Updated Run ${run.id} to have 0 Tax.`);

            const newStats = await getDashboardStats();
            console.log("New Audit Summary:", newStats.auditSummary);
            if (newStats.auditSummary.taxMisses > 0) {
                console.log("SUCCESS: Tax Miss Detected!");
            } else {
                console.log("FAIL: Tax Miss NOT Detected (Income might be too low?)");
            }
        }
    }
}

verify();
