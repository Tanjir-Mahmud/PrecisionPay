"use server";

import { prisma } from "@/lib/prisma";

export async function getRiskDetails() {
    // Fetch unique employees with late/absent flags
    const risks = await prisma.attendance.groupBy({
        by: ['employeeId'],
        where: {
            OR: [
                { isLate: true },
                { status: { in: ["ABSENT", "LATE", "HALF_DAY_DEDUCTION"] } }
            ]
        },
        _count: {
            _all: true
        }
    });

    // We need names, so let's fetch employee details for these IDs
    const enrichedRisks = await Promise.all(risks.map(async (r) => {
        const emp = await prisma.employee.findUnique({
            where: { id: r.employeeId },
            select: { firstName: true, lastName: true }
        });
        return {
            name: emp ? `${emp.firstName} ${emp.lastName}` : r.employeeId,
            count: r._count._all
        };
    }));

    return enrichedRisks.sort((a, b) => b.count - a.count);
}
