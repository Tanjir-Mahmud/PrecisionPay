import { PrismaClient } from "@prisma/client";
import EmployeeList from "@/components/employees/EmployeeList";

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
    const prisma = new PrismaClient();

    const employees = await prisma.employee.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
    });

    return <EmployeeList initialData={employees} />;
}
