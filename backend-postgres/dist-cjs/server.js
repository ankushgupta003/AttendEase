"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const app_js_1 = __importDefault(require("./app.js"));
const dailyProcessor_js_1 = require("./cron/dailyProcessor.js");
function startServer(options = {}) {
    const port = options.port ?? Number(process.env.PORT ?? 5000);
    const server = app_js_1.default.listen(port, "0.0.0.0", () => {
        console.log(`AttendEase API running on port ${port}`);
        options.onListen?.(port);
    });
    const enableDailyCron = options.enableDailyCron ??
        String(process.env.ENABLE_DAILY_CRON ?? "false").toLowerCase() === "true";
    if (enableDailyCron) {
        (0, dailyProcessor_js_1.startDailyProcessor)();
    }
    return server;
}
