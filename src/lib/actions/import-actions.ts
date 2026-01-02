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

        // Convert to JSON with raw values to detect dates
        const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

        if (jsonData.length === 0) throw new Error("Sheet is empty");

        // Transaction to ensure atomicity
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

                // Date Parsing (handle numeric Excel date or string)
                let joiningDate = new Date();
                const rawJoining = row["Joining"] || row["Joining Date"];
                if (typeof rawJoining === "number") {
                    // Excel serial date
                    joiningDate = new Date(Math.round((rawJoining - 25569) * 86400 * 1000));
                } else if (typeof rawJoining === "string") {
                    const parsed = new Date(rawJoining);
                    if (isValid(parsed)) joiningDate = parsed;
                }

                if (!email || basic === 0) continue; // Skip invalid rows

                const employee = await tx.employee.upsert({
                    where: { email },
                    update: {
                        baseSalary: basic,
                        designation: desig,
                        department: dept,
                        firstName,
                        lastName
                    },
                    create: {
                        firstName,
                        lastName,
                        email,
                        department: dept,
                        designation: desig,
                        baseSalary: basic,
                        joiningDate,
                        paymentMethod: "BANK_TRANSFER"
                    }
                });

                // 2. History / Payroll Mapping
                // Iterate keys to find Date-like columns (e.g., "Jan-2024", "2023-11")
                // We assume value in that column is NET PAY received
                for (const key of Object.keys(row)) {
                    // Skip known non-date keys
                    if (["Name", "Email", "Basic", "Gross", "Dept", "Designation", "Joining", "Joining Date"].includes(key)) continue;

                    // Try to parse key as date "MMM-yyyy" or "yyyy-MM"
                    let monthYear = "";
                    const payoutAmount = parseFloat(row[key]);

                    if (isNaN(payoutAmount) || payoutAmount <= 0) continue;

                    // Heuristic: Check if key matches date pattern
                    // Simple regex for "Jan-24", "Jan 2024", "2024-01"
                    if (/^[A-Za-z]{3}[-\s]\d{2,4}$/.test(key) || /^\d{4}-\d{2}$/.test(key)) {
                        // Normalize to "yyyy-MM"
                        const parsedDate = new Date(key);
                        if (isValid(parsedDate)) {
                            monthYear = format(parsedDate, "yyyy-MM");
                        }
                    }

                    if (monthYear) {
                        // Create Historic Payroll Run
                        await tx.payrollRun.upsert({
                            where: {
                                employeeId_monthYear: {
                                    employeeId: employee.id,
                                    monthYear: monthYear
                                }
                            },
                            update: {
                                netPay: payoutAmount,
                                status: "PAID" // Historic = Paid
                            },
                            create: {
                                employeeId: employee.id,
                                monthYear: monthYear,
                                basePay: basic, // Assume historical base same as current for simplicity (or we'd need history col)
                                netPay: payoutAmount,
                                status: "PAID", // Historic = Paid
                                // Fill required with defaults/estimates
                                hra: 0,
                                transport: 0,
                                overtimeHours: 0,
                                overtimePay: 0,
                                bonus: 0,
                                tax: basic * 0.1, // Mock tax for history needed for reports? Or just 0.
                                pf: 0,
                                leaveDeduction: 0,
                                generatedAt: new Date(monthYear + "-01"),
                                paidAt: new Date(monthYear + "-28")
                            }
                        });
                    }
                }
            }
        });

        revalidatePath("/");
        revalidatePath("/employees");
        revalidatePath("/settings");
        return { success: true, message: `Imported ${jsonData.length} records successfully.` };

    } catch (e: any) {
        console.error("Import Error:", e);
        return { success: false, message: e.message };
    }
}
