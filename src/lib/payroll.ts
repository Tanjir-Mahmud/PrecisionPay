import { getTaxReport } from "@/lib/tax-engine";

export interface Earnings {
    baseSalary: number;
    hra: number;
    transport: number;
    overtimePay: number;
    bonus: number;
}

export interface Deductions {
    tax: number;
    pf: number;
    leaveDeduction: number;
}

export interface PayrollResult {
    earnings: Earnings;
    deductions: Deductions;
    netPay: number;
    taxBreakdown?: any[]; // For UI Waterfall
    currency?: string;
}

export function calculatePayroll(
    baseSalary: number,
    overtimeHours: number,
    unpaidLeaveDays: number,
    countryCode: string = "USA",
    bonusCents: number = 0
): PayrollResult {

    // Standard Allowances (Example: HRA 20% of Base, Transport Fixed 200)
    const hra = baseSalary * 0.20;
    const transport = 200;

    // Overtime
    const hourlyRate = baseSalary / 160; // 160 working hours
    const overtimePay = overtimeHours * (hourlyRate * 1.5);

    // Gross before deductions
    const grossPay = baseSalary + hra + transport + overtimePay + bonusCents;

    // Deductions
    // PF: 12% of Base (This could also be country specific, but keeping fixed for now per scope)
    const pf = baseSalary * 0.12;

    // Unpaid Leaves
    const dailyRate = baseSalary / 30; // 30 day basis
    const leaveDeduction = unpaidLeaveDays * dailyRate;

    // Taxable Income Calculation
    // Logic: Gross - PF - Leave Deduction = Taxable
    const taxableIncome = grossPay - pf - leaveDeduction;

    // --- NEW TAX ENGINE INTEGRATION ---
    const taxReport = getTaxReport(Math.max(0, taxableIncome), countryCode);
    const tax = taxReport.totalTax;

    const totalDeductions = pf + leaveDeduction + tax;
    const netPay = grossPay - totalDeductions;

    return {
        earnings: {
            baseSalary,
            hra,
            transport,
            overtimePay,
            bonus: bonusCents
        },
        deductions: {
            tax,
            pf,
            leaveDeduction
        },
        netPay,
        taxBreakdown: taxReport.breakdown,
        currency: taxReport.currency
    };
}
