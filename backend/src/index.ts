import dotenv from "dotenv";
import fs from "node:fs";
import { startServer } from "./server.js";
import { prisma } from "./lib/prisma.js";

function loadEnv() {
  dotenv.config();
  const argIndex = process.argv.findIndex((arg) => arg === "--config");
  const configPath = argIndex >= 0 ? process.argv[argIndex + 1] : undefined;
  const fallbackPath = "config.env";
  const resolvedPath = configPath ?? (fs.existsSync(fallbackPath) ? fallbackPath : undefined);
  if (resolvedPath) {
    dotenv.config({ path: resolvedPath, override: true });
  }
}

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
  loadEnv();
  await ensureOvertimeEligibleColumn();
  startServer();
})();
