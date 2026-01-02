"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { format, parse, isValid } from "date-fns";

export async function importData(formData: FormData) {
    try {
        const file = formData.get("file") as File;
        if (!file) throw new Error("No file uploaded");

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(Buffer.from(buffer), { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];
        if (jsonData.length === 0) throw new Error("Sheet is empty");

        // Fetch Settings from Prisma to apply Rules
        const settings = await prisma.companySettings.findFirst() || {
            maxLateFlags: 3,
            latePenaltyAmount: 50, // Default fallback
            overtimeMultiplier: 1.5
        };

        const currentMonth = format(new Date(), "yyyy-MM");

        await prisma.$transaction(async (tx) => {
            for (const row of jsonData) {
                // 1. Employee Mapping
                const fullName = row["Name"] || row["Employee Name"] || "Unknown";
                const [firstName, ...rest] = fullName.split(" ");
                const lastName = rest.join(" ") || "Employee";

                const email = row["Email"] || row["Email Address"] || `temp_${Date.now()}_${Math.random()}@company.com`;
                const dept = row["Dept"] || row["Department"] || "General";
                const desig = row["Designation"] || row["Role"] || "Staff";
                const basic = parseFloat(row["Basic"] || row["Gross"] || row["Base Salary"] || "0");

                // Advanced Logic Inputs from Sheet
                const lateDays = parseInt(row["Late Days"] || row["Attendance Status"] || "0");
                const bonusInput = parseFloat(row["Bonus"] || row["Performance Bonus"] || "0");
                const otHours = parseFloat(row["OT Hours"] || row["Overtime"] || "0");

                // Date Parsing
                let joiningDate = new Date();
                const rawJoining = row["Joining"] || row["Joining Date"];
                if (typeof rawJoining === "number") {
                    joiningDate = new Date(Math.round((rawJoining - 25569) * 86400 * 1000));
                } else if (typeof rawJoining === "string") {
                    const parsed = new Date(rawJoining);
                    if (isValid(parsed)) joiningDate = parsed;
                }

                if (!email || basic === 0) continue;

                const employee = await tx.employee.upsert({
                    where: { email },
                    update: { baseSalary: basic, designation: desig, department: dept, firstName, lastName },
                    create: {
                        firstName, lastName, email, department: dept, designation: desig, baseSalary: basic, joiningDate,
                        paymentMethod: "BANK_TRANSFER"
                    }
                });

                // 2. Draft Generation with Rules

                // A) Late Penalty Logic
                let leaveDeduction = 0;
                if (lateDays > settings.maxLateFlags) {
                    // Use User-Defined Penalty Amount from Settings
                    leaveDeduction = settings.latePenaltyAmount || 50;
                }

                // B) Overtime Calculation
                const hourlyRate = (basic / 160); // Standard 160h work month
                const overtimePay = otHours * hourlyRate * (settings.overtimeMultiplier || 1.5);

                // C) Tax & Net Pay (Simplified for Draft)
                const grossPay = basic + overtimePay + bonusInput;
                const mockTax = grossPay * 0.1;
                const mockPF = basic * 0.05;
                const netPay = grossPay - mockTax - mockPF - leaveDeduction;

                await tx.payrollRun.upsert({
                    where: { employeeId_monthYear: { employeeId: employee.id, monthYear: currentMonth } },
                    update: {
                        basePay: basic,
                        bonus: bonusInput,
                        overtimeHours: otHours,
                        overtimePay: overtimePay,
                        leaveDeduction: leaveDeduction,
                        netPay: netPay,
                        status: "DRAFT"
                    },
                    create: {
                        employeeId: employee.id,
                        monthYear: currentMonth,
                        basePay: basic,
                        hra: 0,
                        transport: 0,
                        overtimeHours: otHours,
                        overtimePay: overtimePay,
                        bonus: bonusInput,
                        tax: mockTax,
                        pf: mockPF,
                        leaveDeduction: leaveDeduction,
                        netPay: netPay,
                        status: "DRAFT"
                    }
                });

                // 3. Historical Data
                for (const key of Object.keys(row)) {
                    if (["Name", "Email", "Basic", "Gross", "Dept", "Designation", "Joining", "Late Days", "Bonus", "OT Hours", "Overtime", "Attendance Status", "Performance Bonus"].includes(key)) continue;

                    let monthYear = "";
                    const payoutAmount = parseFloat(row[key]);
                    if (isNaN(payoutAmount) || payoutAmount <= 0) continue;

                    if (/^[A-Za-z]{3}[-\s]\d{2,4}$/.test(key) || /^\d{4}-\d{2}$/.test(key)) {
                        const parsedDate = new Date(key);
                        if (isValid(parsedDate) && format(parsedDate, "yyyy-MM") !== currentMonth) {
                            monthYear = format(parsedDate, "yyyy-MM");
                        }
                    }

                    if (monthYear) {
                        await tx.payrollRun.upsert({
                            where: { employeeId_monthYear: { employeeId: employee.id, monthYear: monthYear } },
                            update: { netPay: payoutAmount, status: "PAID" },
                            create: {
                                employeeId: employee.id, monthYear: monthYear, basePay: basic, netPay: payoutAmount, status: "PAID",
                                hra: 0, transport: 0, overtimeHours: 0, overtimePay: 0, bonus: 0,
                                tax: basic * 0.1, pf: 0, leaveDeduction: 0,
                                generatedAt: new Date(monthYear + "-01"), paidAt: new Date(monthYear + "-28")
                            }
                        });
                    }
                }
            }
        });

        revalidatePath("/");
        revalidatePath("/employees");
        revalidatePath("/settings");
        revalidatePath("/payroll");
        revalidatePath("/reports");

        return { success: true, message: `Imported ${jsonData.length} records. Applied Settings: Late Fee $${settings.latePenaltyAmount || 50}, OT x${settings.overtimeMultiplier}.` };

    } catch (e: any) {
        console.error("Import Error:", e);
        return { success: false, message: e.message };
    }
}
