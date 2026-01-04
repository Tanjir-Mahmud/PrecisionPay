"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/firebase-admin";

export async function addEmployee(idToken: string, formData: FormData) {
    const userId = await verifyAuth(idToken);

    if (!userId) {
        console.error("Unauthorized addEmployee attempt");
        return;
    }
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
                userId, // [NEW] Link to User
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

export async function getEmployees(idToken: string) {
    const userId = await verifyAuth(idToken);
    if (!userId) return { error: "Unauthorized" };

    try {
        const employees = await prisma.employee.findMany({
            where: {
                userId,
                isActive: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return { data: employees };
    } catch (e) {
        console.error("Failed to fetch employees:", e);
        return { error: "Failed to fetch data" };
    }
}
