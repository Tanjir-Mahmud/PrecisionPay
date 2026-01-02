
import { getTaxReport } from "./src/lib/tax-engine";

function verifyLogic() {
    console.log("=== Verifying Day 2 Final Logic ===");

    // 1. Tax Verification (USA) - 0-11k at 10%
    // Salary 150,000 (Mock CEO)
    const ceoTax = getTaxReport(150000, "USA");
    console.log("CEO (150k USA) Tax:", ceoTax.totalTax);

    // Salary 10,000 (Very Low) -> 10% * 10k = 1000
    const internTax = getTaxReport(10000, "USA");
    console.log("Intern (10k USA) Tax:", internTax.totalTax, "(Expected ~1000)");

    // 2. Audit Penalty Logic Check
    const mocks = [
        { name: "Desi Designer", salary: 45000, status: "Late 5x" },
        { name: "Absent Andy", salary: 30000, status: "Absent 3d" },
        { name: "Good Guy", salary: 50000, status: "Present" }
    ];

    mocks.forEach(m => {
        let penalty = 0;
        if (m.status.includes("Absent") || m.status.includes("Late")) {
            penalty = m.salary * 0.05; // 5% Deduction
        }
        console.log(`${m.name} (${m.status}): Penalty = ${penalty} (Net Est: ${m.salary - penalty})`);
    });

    console.log("Logic Verification Complete ✅");
}

verifyLogic();
