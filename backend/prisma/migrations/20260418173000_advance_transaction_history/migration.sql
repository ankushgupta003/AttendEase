-- Create advance transaction history table
CREATE TABLE "AdvanceTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "entryDate" DATETIME NOT NULL,
    "month" TEXT NOT NULL,
    "remark" TEXT,
    "source" TEXT NOT NULL,
    "sourceMonth" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdvanceTransaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AdvanceTransaction_employeeId_entryDate_idx" ON "AdvanceTransaction"("employeeId", "entryDate");
CREATE INDEX "AdvanceTransaction_employeeId_month_idx" ON "AdvanceTransaction"("employeeId", "month");
CREATE INDEX "AdvanceTransaction_source_sourceMonth_idx" ON "AdvanceTransaction"("source", "sourceMonth");
CREATE INDEX "AdvanceTransaction_type_idx" ON "AdvanceTransaction"("type");
CREATE UNIQUE INDEX "AdvanceTransaction_employeeId_source_sourceMonth_key" ON "AdvanceTransaction"("employeeId", "source", "sourceMonth");

-- Carry forward existing monthly advance amounts as opening due per employee.
INSERT INTO "AdvanceTransaction" (
    "id", "employeeId", "type", "amount", "entryDate", "month", "remark", "source", "sourceMonth", "createdAt", "updatedAt"
)
SELECT
    (
      lower(substr(hex(randomblob(16)), 1, 8)) || '-' ||
      lower(substr(hex(randomblob(16)), 1, 4)) || '-' ||
      lower(substr(hex(randomblob(16)), 1, 4)) || '-' ||
      lower(substr(hex(randomblob(16)), 1, 4)) || '-' ||
      lower(substr(hex(randomblob(16)), 1, 12))
    ) AS "id",
    latest."employeeId",
    'OPENING' AS "type",
    latest."advance" AS "amount",
    datetime(latest."month" || '-01 12:00:00') AS "entryDate",
    latest."month" AS "month",
    'Opening due migrated from legacy monthly advance deduction.' AS "remark",
    'MIGRATION' AS "source",
    NULL AS "sourceMonth",
    CURRENT_TIMESTAMP AS "createdAt",
    CURRENT_TIMESTAMP AS "updatedAt"
FROM (
    SELECT al."employeeId", al."month", al."advance"
    FROM "AdvanceLedger" al
    INNER JOIN (
        SELECT "employeeId", MAX("month") AS "latestMonth"
        FROM "AdvanceLedger"
        WHERE "advance" > 0
        GROUP BY "employeeId"
    ) recent
      ON recent."employeeId" = al."employeeId"
     AND recent."latestMonth" = al."month"
    WHERE al."advance" > 0
) latest;
