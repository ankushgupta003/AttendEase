import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./server.js";
import { prisma } from "./lib/prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  dotenv.config({ path: path.join(__dirname, "..", ".env"), override: true });
  const argIndex = process.argv.findIndex((arg) => arg === "--config");
  const configPath = argIndex >= 0 ? process.argv[argIndex + 1] : undefined;
  const fallbackPath = path.join(__dirname, "..", "config.env");
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

function resolveDbPathFromEnv() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) return null;
  const rawPath = url.replace(/^file:/, "");
  if (!rawPath) return null;
  const normalized = rawPath.replace(/\\/g, "/");
  if (normalized.startsWith("/")) {
    return path.normalize(normalized);
  }
  return path.resolve(process.cwd(), normalized);
}

function appendMigrationLog(line: string) {
  try {
    const dbPath = resolveDbPathFromEnv();
    const logDir = dbPath ? path.dirname(dbPath) : process.cwd();
    const logPath = path.join(logDir, "migration.log");
    const stamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${stamp}] ${line}\n`);
  } catch (err) {
    console.error("Failed to write migration log:", err);
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

async function ensureSalaryColumn() {
  try {
    const columns = await prisma.$queryRawUnsafe<any[]>(`PRAGMA table_info("Employee")`);
    const hasColumn = Array.isArray(columns) && columns.some((col) => col?.name === "salary");
    if (!hasColumn) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN "salary" INTEGER NOT NULL DEFAULT 0`);
    }
  } catch (err) {
    console.error("Failed to ensure salary column:", err);
  }
}

async function ensureShiftLunchBreakColumn() {
  try {
    const columns = await prisma.$queryRawUnsafe<any[]>(`PRAGMA table_info("Shift")`);
    const hasColumn = Array.isArray(columns) && columns.some((col) => col?.name === "lunchBreakMinutes");
    if (!hasColumn) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Shift" ADD COLUMN "lunchBreakMinutes" INTEGER NOT NULL DEFAULT 0`);
    }
  } catch (err) {
    console.error("Failed to ensure lunchBreakMinutes column:", err);
  }
}

async function runSafeMigrationsIfNeeded() {
  const shouldMigrate =
    process.env.MIGRATE_ON_START === "1" ||
    process.env.MIGRATE_ON_START === "true";

  if (!shouldMigrate) return;

  appendMigrationLog("Starting migration run.");
  await runSqlMigrations();
  await ensureOvertimeEligibleColumn();
  await ensureSalaryColumn();
  await ensureShiftLunchBreakColumn();
  appendMigrationLog("Migration run complete.");
}

function findMigrationsDir() {
  const candidates = [
    path.join(__dirname, "..", "prisma", "migrations"),
    path.join(process.cwd(), "prisma", "migrations")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function splitSqlStatements(sql: string) {
  const statements: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        current += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        i += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingle && !inDouble) {
      if (char === "-" && next === "-") {
        i += 1;
        inLineComment = true;
        continue;
      }
      if (char === "/" && next === "*") {
        i += 1;
        inBlockComment = true;
        continue;
      }
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      current += char;
      continue;
    }
    if (char === `"` && !inSingle) {
      inDouble = !inDouble;
      current += char;
      continue;
    }

    if (char === ";" && !inSingle && !inDouble) {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) {
    statements.push(tail);
  }

  return statements;
}

async function runSqlMigrations() {
  const migrationsDir = findMigrationsDir();
  if (!migrationsDir) {
    appendMigrationLog("Migration directory not found. Skipping SQL migrations.");
    console.warn("Migration directory not found. Skipping SQL migrations.");
    return;
  }
  appendMigrationLog(`Using migrations directory: ${migrationsDir}`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MigrationHistory" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const entries = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  appendMigrationLog(`Found ${entries.length} migration folders.`);

  for (const id of entries) {
    const safeId = id.replace(/'/g, "''");
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "MigrationHistory" WHERE id='${safeId}' LIMIT 1`
    );
    if (Array.isArray(existing) && existing.length > 0) {
      appendMigrationLog(`Skipping already applied migration: ${id}`);
      continue;
    }

    const migrationPath = path.join(migrationsDir, id, "migration.sql");
    if (!fs.existsSync(migrationPath)) {
      appendMigrationLog(`Migration SQL missing for ${id}. Skipping.`);
      console.warn(`Migration SQL missing for ${id}. Skipping.`);
      continue;
    }

    const sql = fs.readFileSync(migrationPath, "utf-8");
    const statements = splitSqlStatements(sql);
    appendMigrationLog(`Applying migration ${id} (${statements.length} statements).`);

    try {
      await prisma.$executeRawUnsafe("BEGIN");
      for (const statement of statements) {
        try {
          await prisma.$executeRawUnsafe(statement);
        } catch (stmtErr: any) {
          // If schema element already exists, skip it silently
          // This can happen if migrations were partially applied
          if (
            stmtErr?.code === "P2010" &&
            (stmtErr?.meta?.message?.includes("already exists") ||
             stmtErr?.meta?.message?.includes("UNIQUE constraint failed") ||
             stmtErr?.meta?.message?.includes("duplicate column name"))
          ) {
            appendMigrationLog(`  Already applied: ${statement.substring(0, 50)}...`);
            continue;
          }
          throw stmtErr;
        }
      }
      await prisma.$executeRawUnsafe(
        `INSERT INTO "MigrationHistory"(id) VALUES ('${safeId}')`
      );
      await prisma.$executeRawUnsafe("COMMIT");
      appendMigrationLog(`Migration ${id} applied successfully.`);
    } catch (err: any) {
      try {
        await prisma.$executeRawUnsafe("ROLLBACK");
      } catch {
        // Rollback might fail if transaction wasn't started; ignore
      }
      appendMigrationLog(`Migration ${id} failed: ${String(err)}`);
      console.error(`Migration failed for ${id}:`, err);
      throw err;
    }
  }
}

void (async () => {
  loadEnv();
  ensurePrismaEngine();
  await runSafeMigrationsIfNeeded();
  await ensureShiftLunchBreakColumn();
  startServer();
})();
