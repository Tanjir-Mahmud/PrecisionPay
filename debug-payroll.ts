
import { prisma } from "./src/lib/prisma";

async function main() {
    console.log("Checking PayrollRun records...");
    const runs = await prisma.payrollRun.findMany();
    console.log(`Found ${runs.length} records.`);
    console.table(runs.map(r => ({
        id: r.id.substring(0, 8),
        monthYear: r.monthYear,
        status: r.status,
        empId: r.employeeId.substring(0, 8),
        netPay: r.netPay
    })));
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
