"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase"; // Firestore
import { collection, doc, setDoc, writeBatch } from "firebase/firestore";

const prisma = new PrismaClient();

export async function performStressTest(adminId: string) {
    console.log(`[StressTest] Starting 20-Employee Injection for Admin: ${adminId}...`);

    try {
        // 1. Wipe Data (Prisma)
        await prisma.attendance.deleteMany({});
        await prisma.payrollRun.deleteMany({});
        await prisma.employee.deleteMany({});

        // 1b. Wipe Data (Firestore) - Handled by Client usually, but we should try to batch delete here if possible?
        // We assume Client handled it or we just overwrite.

        // 2. Inject 20 Employees
        const departments = ["Engineering", "Sales", "HR", "Marketing", "Finance"];
        const employees = [];
        const batch = writeBatch(db); // Firestore Batch

        for (let i = 1; i <= 20; i++) {
            const salary = Math.floor(Math.random() * (15000 - 3000 + 1)) + 3000; // 3k-15k
            const dept = departments[i % departments.length];
            const firstName = `DemoUser${i}`;
            const lastName = `Test${i}`;
            const email = `user${i}.${adminId.slice(0, 4)}@stress.test`;

            // Prisma Write
            const emp = await prisma.employee.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    joiningDate: new Date("2024-01-01"),
                    designation: `Associate ${i}`,
                    department: dept,
                    baseSalary: salary,
                    isActive: true
                }
            });
            employees.push(emp);

            // Firestore Write (Sync)
            const empRef = doc(db, "employees", emp.id); // Use Prisma ID
            batch.set(empRef, {
                firstName,
                lastName,
                email,
                department: dept,
                designation: `Associate ${i}`,
                baseSalary: salary,
                joiningDate: "2024-01-01",
                isActive: true, // Important for Dashboard count
                adminId: adminId, // Critical for Firestore Rules/Queries
                createdAt: new Date().toISOString() // Store as string or timestamp
            });
        }

        // Commit Payroll Batch 1 (Employees)
        await batch.commit();
        console.log("[StressTest] Employees synced to Firestore.");

        // 3. Simulate Attendance (5 Employees with Penalty)
        const targetEmployees = employees.slice(0, 5);
        const today = new Date();
        const logBatch = writeBatch(db);

        for (const emp of targetEmployees) {
            // Create 4 Late Logs
            for (let d = 1; d <= 4; d++) {
                const date = new Date(today);
                date.setDate(date.getDate() - d);

                // Set clock in to 09:45 (Late)
                const clockIn = new Date(date);
                clockIn.setHours(9, 45, 0, 0);

                const clockOut = new Date(date);
                clockOut.setHours(17, 30, 0, 0);

                const status = d === 3 ? "HALF_DAY_DEDUCTION" : "LATE";

                // Prisma Write
                await prisma.attendance.create({
                    data: {
                        employeeId: emp.id,
                        date: new Date(date.setHours(0, 0, 0, 0)), // Midnight
                        clockIn: clockIn,
                        clockOut: clockOut,
                        status: status,
                        isLate: true,
                        lateMinutes: 30
                    }
                });

                // Firestore Write (Optional, if Dashboard lists recent logs)
                const logId = `${emp.id}-${date.toISOString().split('T')[0]}`;
                const logRef = doc(db, "attendance_logs", logId);
                logBatch.set(logRef, {
                    employeeId: emp.id,
                    employeeName: `${emp.firstName} ${emp.lastName}`,
                    date: date.toISOString(), // Standardize
                    clockIn: clockIn.toISOString(),
                    status: status,
                    isLate: true,
                    adminId: adminId
                });
            }
        }
        await logBatch.commit();

        console.log("[StressTest] Injection Complete.");

    } catch (e) {
        console.error("Stress Test Failed:", e);
        throw new Error("Stress Test Failed");
    }

    revalidatePath("/");
    revalidatePath("/payroll");
    revalidatePath("/attendance");
    revalidatePath("/employees");
}
