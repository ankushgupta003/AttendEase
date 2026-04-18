-- Create salary type master
CREATE TABLE "SalaryType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SalaryType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalaryType_name_key" ON "SalaryType"("name");

-- Add salary type to employees and backfill
ALTER TABLE "Employee" ADD COLUMN "salaryTypeId" TEXT;

INSERT INTO "SalaryType" ("id", "name", "isActive", "createdAt", "updatedAt")
VALUES ('default-nuvo-salary-type', 'Nuvo', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

UPDATE "Employee"
SET "salaryTypeId" = (SELECT "id" FROM "SalaryType" WHERE "name" = 'Nuvo' LIMIT 1)
WHERE "salaryTypeId" IS NULL;

ALTER TABLE "Employee" ALTER COLUMN "salaryTypeId" SET NOT NULL;

ALTER TABLE "Employee"
ADD CONSTRAINT "Employee_salaryTypeId_fkey"
FOREIGN KEY ("salaryTypeId") REFERENCES "SalaryType"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Employee_salaryTypeId_idx" ON "Employee"("salaryTypeId");

-- Create monthly advance ledger entries
CREATE TABLE "AdvanceLedger" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "fine" INTEGER NOT NULL DEFAULT 0,
    "advance" INTEGER NOT NULL DEFAULT 0,
    "others" INTEGER NOT NULL DEFAULT 0,
    "arrear" INTEGER NOT NULL DEFAULT 0,
    "salaryRemark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdvanceLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdvanceLedger_employeeId_month_key" ON "AdvanceLedger"("employeeId", "month");
CREATE INDEX "AdvanceLedger_month_idx" ON "AdvanceLedger"("month");

ALTER TABLE "AdvanceLedger"
ADD CONSTRAINT "AdvanceLedger_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Create monthly attendance summary remarks
CREATE TABLE "AttendanceSummaryRemark" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AttendanceSummaryRemark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceSummaryRemark_employeeId_month_key" ON "AttendanceSummaryRemark"("employeeId", "month");
CREATE INDEX "AttendanceSummaryRemark_month_idx" ON "AttendanceSummaryRemark"("month");

ALTER TABLE "AttendanceSummaryRemark"
ADD CONSTRAINT "AttendanceSummaryRemark_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
