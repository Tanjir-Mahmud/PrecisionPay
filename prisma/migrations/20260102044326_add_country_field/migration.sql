-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CompanySettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'My Company',
    "standardWorkHours" INTEGER NOT NULL DEFAULT 160,
    "overtimeMultiplier" REAL NOT NULL DEFAULT 1.5,
    "taxBracketJson" TEXT NOT NULL DEFAULT '[]',
    "country" TEXT NOT NULL DEFAULT 'USA',
    "shiftStart" TEXT NOT NULL DEFAULT '09:00',
    "shiftEnd" TEXT NOT NULL DEFAULT '17:00',
    "gracePeriodMins" INTEGER NOT NULL DEFAULT 15,
    "maxLateFlags" INTEGER NOT NULL DEFAULT 3,
    "lateDeductionRatio" REAL NOT NULL DEFAULT 0.5,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CompanySettings" ("companyName", "gracePeriodMins", "id", "lateDeductionRatio", "maxLateFlags", "overtimeMultiplier", "shiftEnd", "shiftStart", "standardWorkHours", "taxBracketJson", "updatedAt") SELECT "companyName", "gracePeriodMins", "id", "lateDeductionRatio", "maxLateFlags", "overtimeMultiplier", "shiftEnd", "shiftStart", "standardWorkHours", "taxBracketJson", "updatedAt" FROM "CompanySettings";
DROP TABLE "CompanySettings";
ALTER TABLE "new_CompanySettings" RENAME TO "CompanySettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
