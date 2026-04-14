import app from "./app.js";
import { startDailyProcessor } from "./cron/dailyProcessor.js";
import { bootstrapDatabaseOnStart } from "./lib/dbBootstrap.js";

export type StartServerOptions = {
  port?: number;
  enableDailyCron?: boolean;
  onListen?: (port: number) => void;
};

export async function startServer(options: StartServerOptions = {}) {
  await bootstrapDatabaseOnStart();

  const port = options.port ?? Number(process.env.PORT ?? 5000);
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`AttendEase API running on port ${port}`);
    options.onListen?.(port);
  });

  const enableDailyCron =
    options.enableDailyCron ??
    String(process.env.ENABLE_DAILY_CRON ?? "false").toLowerCase() === "true";

  if (enableDailyCron) {
    startDailyProcessor();
  }

  return server;
}
