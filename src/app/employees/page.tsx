import { prisma } from "@/lib/prisma";
import EmployeeList from "@/components/employees/EmployeeList";
import { Employee } from "@prisma/client";

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
    let employees: Employee[] = [];
    try {
        employees = await prisma.employee.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
    } catch (e) {
        console.error("Failed to fetch employees (likely DB connection issue):", e);
        // Fallback or empty list
        employees = [];
    }

    return <EmployeeList initialData={employees} />;
}
