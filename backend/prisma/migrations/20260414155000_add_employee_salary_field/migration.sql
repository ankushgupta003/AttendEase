-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "shiftId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "overtimeEligible" BOOLEAN NOT NULL DEFAULT true,
    "salary" INTEGER NOT NULL DEFAULT 0,
    "email" TEXT,
    "phone" TEXT,
    "designation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("active", "code", "createdAt", "department", "designation", "email", "id", "name", "overtimeEligible", "phone", "shiftId", "updatedAt") SELECT "active", "code", "createdAt", "department", "designation", "email", "id", "name", "overtimeEligible", "phone", "shiftId", "updatedAt" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
