-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'My Company',
    "standardWorkHours" INTEGER NOT NULL DEFAULT 160,
    "overtimeMultiplier" REAL NOT NULL DEFAULT 1.5,
    "taxBracketJson" TEXT NOT NULL DEFAULT '[]',
    "shiftStart" TEXT NOT NULL DEFAULT '09:00',
    "shiftEnd" TEXT NOT NULL DEFAULT '17:00',
    "gracePeriodMins" INTEGER NOT NULL DEFAULT 15,
    "maxLateFlags" INTEGER NOT NULL DEFAULT 3,
    "lateDeductionRatio" REAL NOT NULL DEFAULT 0.5,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "clockIn" DATETIME,
    "clockOut" DATETIME,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Attendance" ("clockIn", "clockOut", "date", "employeeId", "id", "status") SELECT "clockIn", "clockOut", "date", "employeeId", "id", "status" FROM "Attendance";
DROP TABLE "Attendance";
ALTER TABLE "new_Attendance" RENAME TO "Attendance";
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");
CREATE TABLE "new_PayrollRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "monthYear" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "varianceFlag" BOOLEAN NOT NULL DEFAULT false,
    "basePay" REAL NOT NULL,
    "hra" REAL NOT NULL,
    "transport" REAL NOT NULL,
    "overtimeHours" REAL NOT NULL,
    "overtimePay" REAL NOT NULL,
    "bonus" REAL NOT NULL,
    "tax" REAL NOT NULL,
    "pf" REAL NOT NULL,
    "leaveDeduction" REAL NOT NULL,
    "netPay" REAL NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    CONSTRAINT "PayrollRun_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PayrollRun" ("basePay", "bonus", "employeeId", "generatedAt", "hra", "id", "leaveDeduction", "monthYear", "netPay", "overtimeHours", "overtimePay", "pf", "status", "tax", "transport") SELECT "basePay", "bonus", "employeeId", "generatedAt", "hra", "id", "leaveDeduction", "monthYear", "netPay", "overtimeHours", "overtimePay", "pf", "status", "tax", "transport" FROM "PayrollRun";
DROP TABLE "PayrollRun";
ALTER TABLE "new_PayrollRun" RENAME TO "PayrollRun";
CREATE UNIQUE INDEX "PayrollRun_employeeId_monthYear_key" ON "PayrollRun"("employeeId", "monthYear");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
