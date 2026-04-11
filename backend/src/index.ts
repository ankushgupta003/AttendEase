import dotenv from "dotenv";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./server.js";
import { prisma } from "./lib/prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function ensurePrismaEngine() {
  if (process.platform !== "win32") return;
  if (process.env.PRISMA_QUERY_ENGINE_LIBRARY) return;

  try {
    const engineName = "query_engine-windows.dll.node";
    const candidatePaths = [
      path.join(__dirname, "..", "node_modules", ".prisma", "client", engineName),
      path.join(__dirname, "node_modules", ".prisma", "client", engineName)
    ];

    const existing = candidatePaths.find((p) => fs.existsSync(p));
    if (existing) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = existing;
      return;
    }

    // Last resort: try copying beside node.exe (may require admin)
    const targetDir = path.dirname(process.execPath);
    const targetPath = path.join(targetDir, engineName);
    const fallbackSnapshotPath = candidatePaths[0];
    if (fs.existsSync(fallbackSnapshotPath) && !fs.existsSync(targetPath)) {
      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(fallbackSnapshotPath, targetPath);
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = targetPath;
    }
  } catch (err) {
    console.error("Failed to prepare Prisma engine:", err);
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
  ensurePrismaEngine();
  await ensureOvertimeEligibleColumn();
  startServer();
})();
