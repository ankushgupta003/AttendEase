-- Create salary types and default Nuvo value
CREATE TABLE "SalaryType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "SalaryType_name_key" ON "SalaryType"("name");

INSERT INTO "SalaryType" ("id", "name", "isActive", "createdAt", "updatedAt")
VALUES ('default-nuvo-salary-type', 'Nuvo', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Redefine Employee to include salaryTypeId with backfill to Nuvo
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "shiftId" TEXT,
    "salaryTypeId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "overtimeEligible" BOOLEAN NOT NULL DEFAULT true,
    "salary" INTEGER NOT NULL DEFAULT 0,
    "email" TEXT,
    "phone" TEXT,
    "designation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_salaryTypeId_fkey" FOREIGN KEY ("salaryTypeId") REFERENCES "SalaryType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("id", "code", "name", "department", "shiftId", "salaryTypeId", "active", "overtimeEligible", "salary", "email", "phone", "designation", "createdAt", "updatedAt")
SELECT
    "id",
    "code",
    "name",
    "department",
    "shiftId",
    (SELECT "id" FROM "SalaryType" WHERE "name" = "Nuvo" LIMIT 1),
    "active",
    "overtimeEligible",
    "salary",
    "email",
    "phone",
    "designation",
    "createdAt",
    "updatedAt"
FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");
CREATE INDEX "Employee_salaryTypeId_idx" ON "Employee"("salaryTypeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Create monthly advance ledger entries
CREATE TABLE "AdvanceLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "fine" INTEGER NOT NULL DEFAULT 0,
    "advance" INTEGER NOT NULL DEFAULT 0,
    "others" INTEGER NOT NULL DEFAULT 0,
    "arrear" INTEGER NOT NULL DEFAULT 0,
    "salaryRemark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdvanceLedger_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AdvanceLedger_employeeId_month_key" ON "AdvanceLedger"("employeeId", "month");
CREATE INDEX "AdvanceLedger_month_idx" ON "AdvanceLedger"("month");

-- Create monthly attendance remarks
CREATE TABLE "AttendanceSummaryRemark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttendanceSummaryRemark_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AttendanceSummaryRemark_employeeId_month_key" ON "AttendanceSummaryRemark"("employeeId", "month");
CREATE INDEX "AttendanceSummaryRemark_month_idx" ON "AttendanceSummaryRemark"("month");
