import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { startServer } from "./server.js";
import { prisma } from "./lib/prisma.js";

function resolveAppRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), "backend-postgres"),
    path.dirname(process.execPath),
    path.join(path.dirname(process.execPath), "backend-postgres")
  ];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
  }
  return process.cwd();
}

const appRoot = resolveAppRoot();

function loadEnv() {
  dotenv.config({ path: path.join(appRoot, ".env"), override: true });
  const argIndex = process.argv.findIndex((arg) => arg === "--config");
  const configPath = argIndex >= 0 ? process.argv[argIndex + 1] : undefined;
  const fallbackPath = path.join(appRoot, "config.env");
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
    const targetDir = path.dirname(process.execPath);
    const targetPath = path.join(targetDir, engineName);

    if (!fs.existsSync(targetPath)) {
      const engineCandidates = [
        path.join(appRoot, "node_modules", ".prisma", "client", engineName),
        path.join(targetDir, "node_modules", ".prisma", "client", engineName),
        path.join(process.cwd(), "node_modules", ".prisma", "client", engineName)
      ];

      for (const sourcePath of engineCandidates) {
        if (fs.existsSync(sourcePath)) {
          fs.mkdirSync(targetDir, { recursive: true });
          fs.copyFileSync(sourcePath, targetPath);
          break;
        }
      }
    }

    if (fs.existsSync(targetPath)) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = targetPath;
    }
  } catch (err) {
    console.error("Failed to prepare Prisma engine:", err);
  }
}

async function ensureOvertimeEligibleColumn() {
  try {
    // Only run for SQLite. PostgreSQL should be migrated via Prisma migrate.
    const url = process.env.DATABASE_URL ?? "";
    if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
      return;
    }
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
