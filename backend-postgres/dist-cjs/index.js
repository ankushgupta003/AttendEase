"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const server_js_1 = require("./server.js");
const prisma_js_1 = require("./lib/prisma.js");
function resolveAppRoot() {
    const candidates = [
        process.cwd(),
        node_path_1.default.resolve(process.cwd(), "backend-postgres"),
        node_path_1.default.dirname(process.execPath),
        node_path_1.default.join(node_path_1.default.dirname(process.execPath), "backend-postgres")
    ];
    for (const dir of candidates) {
        if (node_fs_1.default.existsSync(node_path_1.default.join(dir, "package.json"))) {
            return dir;
        }
    }
    return process.cwd();
}
const appRoot = resolveAppRoot();
function loadEnv() {
    dotenv_1.default.config({ path: node_path_1.default.join(appRoot, ".env"), override: true });
    const argIndex = process.argv.findIndex((arg) => arg === "--config");
    const configPath = argIndex >= 0 ? process.argv[argIndex + 1] : undefined;
    const fallbackPath = node_path_1.default.join(appRoot, "config.env");
    const resolvedPath = configPath ?? (node_fs_1.default.existsSync(fallbackPath) ? fallbackPath : undefined);
    if (resolvedPath) {
        dotenv_1.default.config({ path: resolvedPath, override: true });
    }
}
function ensurePrismaEngine() {
    if (process.platform !== "win32")
        return;
    if (process.env.PRISMA_QUERY_ENGINE_LIBRARY)
        return;
    try {
        const engineName = "query_engine-windows.dll.node";
        const targetDir = node_path_1.default.dirname(process.execPath);
        const targetPath = node_path_1.default.join(targetDir, engineName);
        if (!node_fs_1.default.existsSync(targetPath)) {
            const engineCandidates = [
                node_path_1.default.join(appRoot, "node_modules", ".prisma", "client", engineName),
                node_path_1.default.join(targetDir, "node_modules", ".prisma", "client", engineName),
                node_path_1.default.join(process.cwd(), "node_modules", ".prisma", "client", engineName)
            ];
            for (const sourcePath of engineCandidates) {
                if (node_fs_1.default.existsSync(sourcePath)) {
                    node_fs_1.default.mkdirSync(targetDir, { recursive: true });
                    node_fs_1.default.copyFileSync(sourcePath, targetPath);
                    break;
                }
            }
        }
        if (node_fs_1.default.existsSync(targetPath)) {
            process.env.PRISMA_QUERY_ENGINE_LIBRARY = targetPath;
        }
    }
    catch (err) {
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
        const columns = await prisma_js_1.prisma.$queryRawUnsafe(`PRAGMA table_info("Employee")`);
        const hasColumn = Array.isArray(columns) && columns.some((col) => col?.name === "overtimeEligible");
        if (!hasColumn) {
            await prisma_js_1.prisma.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN "overtimeEligible" BOOLEAN NOT NULL DEFAULT 1`);
        }
    }
    catch (err) {
        console.error("Failed to ensure overtimeEligible column:", err);
    }
}
void (async () => {
    loadEnv();
    ensurePrismaEngine();
    await ensureOvertimeEligibleColumn();
    (0, server_js_1.startServer)();
})();
