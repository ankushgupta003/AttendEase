-- Add new fields to LeaveType
ALTER TABLE "LeaveType" ADD COLUMN "carryForward" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LeaveType" ADD COLUMN "paymentOnLapse" BOOLEAN NOT NULL DEFAULT false;

-- Create LeavePolicy table
CREATE TABLE "LeavePolicy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "yearType" TEXT NOT NULL DEFAULT 'CALENDAR',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

