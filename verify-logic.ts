
import { calculatePayroll } from "./src/lib/payroll";
import { getTaxReport } from "./src/lib/tax-engine";

console.log("=== Verifying PrecisionPay Logic ===\n");

// 1. Verify Tax Engine
console.log("--- Multi-Country Tax Engine ---");

const income = 60000;

const usaTax = getTaxReport(income, "USA");
console.log(`USA ($${income}): Tax $${usaTax.totalTax} (Eff. ${usaTax.effectiveRate}%)`);
console.log("Breakdown:", JSON.stringify(usaTax.breakdown, null, 2));

const ukTax = getTaxReport(income, "UK");
// UK has 0% up to 12.5k, 20% up to 50k, 40% after
console.log(`\nUK (£${income}): Tax £${ukTax.totalTax} (Eff. ${ukTax.effectiveRate}%)`);

const indiaTax = getTaxReport(income * 80, "IN"); // Converted approx to INR for scale
console.log(`\nIndia (₹${income * 80}): Tax ₹${indiaTax.totalTax} (Eff. ${indiaTax.effectiveRate}%)`);


console.log("\n=== Logic Verification Complete ===");
