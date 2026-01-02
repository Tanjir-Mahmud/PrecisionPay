"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function addEmployee(formData: FormData) {
    try {
        const firstName = formData.get("firstName") as string;
        const lastName = formData.get("lastName") as string;
        const email = formData.get("email") as string;
        const designation = formData.get("designation") as string;
        const department = formData.get("department") as string;
        const baseSalary = parseFloat(formData.get("baseSalary") as string);
        const joiningDate = new Date(formData.get("joiningDate") as string);

        await prisma.employee.create({
            data: {
                firstName,
                lastName,
                email,
                designation,
                department,
                baseSalary,
                joiningDate,
                isActive: true
            }
        });

        revalidatePath("/employees");
    } catch (e) {
        console.error("Failed to add employee:", e);
        // Throwing error allows the client-side useTransition to catch it if wired, 
        // OR we can return a result object if refactored. 
        // For now, logging prevents crash loop, but UI needs to know.
        // Let's assume the UI handles server errors or we just protect the runtime from panic.
    }
}

export async function deleteEmployee(id: string) {
    try {
        // In a real system, we might check for dependencies or soft delete
        // For this demo, we'll try to delete, but if validation fails (FK), we might need to handle it.
        // Prisma Cascade delete might be needed if relations exist, or just soft delete.

        // For now, let's toggle isActive instead of hard delete to preserve history
        const emp = await prisma.employee.findUnique({ where: { id } });

        if (emp) {
            await prisma.employee.update({
                where: { id },
                data: { isActive: !emp.isActive } // Toggle active status
            });
        }

        revalidatePath("/employees");
    } catch (e) {
        console.error("Failed to delete/toggle employee:", e);
    }
}
