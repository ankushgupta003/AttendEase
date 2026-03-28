-- Keep this migration safe for existing SQLite DBs:
-- Just flip existing rows to true (default is handled in app logic).
UPDATE "Employee"
SET "overtimeEligible" = 1
WHERE "overtimeEligible" IS NULL OR "overtimeEligible" = 0;
