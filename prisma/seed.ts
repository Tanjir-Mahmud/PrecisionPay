import { PrismaClient } from '@prisma/client';
import { subMonths, subDays, startOfMonth, endOfMonth, format } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Seed...');

    const ADMIN_ID = "default_admin_id"; // Seed specific admin ID

    // 1. Company Settings
    const settings = await prisma.companySettings.upsert({
        where: { userId: ADMIN_ID }, // Updated unique constraint
        update: {},
        create: {
            userId: ADMIN_ID, // [NEW]
            companyName: 'PrecisionPay Inc.',
            standardWorkHours: 160,
            overtimeMultiplier: 1.5,
            shiftStart: '09:00',
            shiftEnd: '17:00',
            gracePeriodMins: 15,
        },
    });
    console.log('✅ Company Settings created');

    // 2. Admin User
    const admin = await prisma.user.upsert({
        where: { email: 'admin@precisionpay.com' },
        update: {},
        create: {
            email: 'admin@precisionpay.com',
            password: 'hashed_password_placeholder', // In real app, hash this
            name: 'Admin User',
            role: 'ADMIN',
        },
    });
    console.log('✅ Admin User created');

    // 3. Employees (Mock Data)
    const employeesData = [
        { firstName: 'John', lastName: 'Doe', email: 'john@example.com', baseSalary: 5000, designation: 'Senior Engineer', dept: 'Engineering' },
        { firstName: 'Sarah', lastName: 'Smith', email: 'sarah@example.com', baseSalary: 4500, designation: 'Product Manager', dept: 'Product' },
        { firstName: 'David', lastName: 'Brown', email: 'david@example.com', baseSalary: 3800, designation: 'Designer', dept: 'Design' },
        { firstName: 'Emily', lastName: 'Davis', email: 'emily@example.com', baseSalary: 4200, designation: 'QA Lead', dept: 'Engineering' },
        { firstName: 'Michael', lastName: 'Wilson', email: 'michael@example.com', baseSalary: 6000, designation: 'Director', dept: 'Management' },
    ];

    for (const emp of employeesData) {
        const employee = await prisma.employee.upsert({
            where: {
                email_userId: { // Updated compound unique
                    email: emp.email,
                    userId: ADMIN_ID
                }
            },
            update: {},
            create: {
                firstName: emp.firstName,
                lastName: emp.lastName,
                email: emp.email,
                userId: ADMIN_ID, // [NEW]
                joiningDate: new Date('2024-01-15'),
                designation: emp.designation,
                department: emp.dept,
                baseSalary: emp.baseSalary,
                isActive: true,
            },
        });

        // 4. Payroll Runs (Current Month - Draft/Approved)
        // Mocking output for current month
        const currentMonth = format(new Date(), 'yyyy-MM');

        // Randomize status
        const statuses = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PAID'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        // Simple mock calc
        const gross = emp.baseSalary + 500; // Mock HRA/Transport
        const tax = gross * 0.1;
        const net = gross - tax;

        await prisma.payrollRun.upsert({
            where: {
                employeeId_monthYear: {
                    employeeId: employee.id,
                    monthYear: currentMonth
                }
            },
            update: {},
            create: {
                employeeId: employee.id,
                monthYear: currentMonth,
                basePay: emp.baseSalary,
                hra: 300,
                transport: 200,
                overtimeHours: Math.floor(Math.random() * 10),
                overtimePay: 0,
                bonus: 0,
                tax: tax,
                pf: emp.baseSalary * 0.12,
                leaveDeduction: 0,
                netPay: net,
                status: status,
                flaggedForReview: Math.random() > 0.8, // 20% chance
            },
        });
    }

    console.log(`✅ Seeded ${employeesData.length} employees and payrolls`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
