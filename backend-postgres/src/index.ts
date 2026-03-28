import "dotenv/config";
import { startServer } from "./server.js";
import { prisma } from "./lib/prisma.js";

async function ensureOvertimeEligibleColumn() {
  try {
    const columns = await prisma.$queryRawUnsafe<any[]>(`PRAGMA table_info("Employee")`);
    const hasColumn = Array.isArray(columns) && columns.some((col) => col?.name === "overtimeEligible");
    if (!hasColumn) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN "overtimeEligible" BOOLEAN NOT NULL DEFAULT 1`);
    }
  } catch (err) {
    console.error("Failed to ensure overtimeEligible column:", err);
  }
}

void (async () => {
  await ensureOvertimeEligibleColumn();
  startServer();
})();
