import dotenv from "dotenv";
import fs from "node:fs";
import { startServer } from "./server.js";

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

void (async () => {
  loadEnv();
  await startServer();
})();
