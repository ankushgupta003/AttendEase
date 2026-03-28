import app from "./app.js";
import { startDailyProcessor } from "./cron/dailyProcessor.js";

export type StartServerOptions = {
  port?: number;
  enableDailyCron?: boolean;
  onListen?: (port: number) => void;
};

export function startServer(options: StartServerOptions = {}) {
  const port = options.port ?? Number(process.env.PORT ?? 5000);
  const server = app.listen(port, () => {
    console.log(`Focus HR Track API running on port ${port}`);
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
