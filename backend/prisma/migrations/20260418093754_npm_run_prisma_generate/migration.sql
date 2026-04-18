-- DropIndex
DROP INDEX "Employee_salaryTypeId_idx";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdvanceLedger" (
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
    CONSTRAINT "AdvanceLedger_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AdvanceLedger" ("advance", "arrear", "createdAt", "employeeId", "fine", "id", "month", "others", "salaryRemark", "updatedAt") SELECT "advance", "arrear", "createdAt", "employeeId", "fine", "id", "month", "others", "salaryRemark", "updatedAt" FROM "AdvanceLedger";
DROP TABLE "AdvanceLedger";
ALTER TABLE "new_AdvanceLedger" RENAME TO "AdvanceLedger";
CREATE INDEX "AdvanceLedger_month_idx" ON "AdvanceLedger"("month");
CREATE UNIQUE INDEX "AdvanceLedger_employeeId_month_key" ON "AdvanceLedger"("employeeId", "month");
CREATE TABLE "new_AttendanceSummaryRemark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttendanceSummaryRemark_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AttendanceSummaryRemark" ("createdAt", "employeeId", "id", "month", "remark", "updatedAt") SELECT "createdAt", "employeeId", "id", "month", "remark", "updatedAt" FROM "AttendanceSummaryRemark";
DROP TABLE "AttendanceSummaryRemark";
ALTER TABLE "new_AttendanceSummaryRemark" RENAME TO "AttendanceSummaryRemark";
CREATE INDEX "AttendanceSummaryRemark_month_idx" ON "AttendanceSummaryRemark"("month");
CREATE UNIQUE INDEX "AttendanceSummaryRemark_employeeId_month_key" ON "AttendanceSummaryRemark"("employeeId", "month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
