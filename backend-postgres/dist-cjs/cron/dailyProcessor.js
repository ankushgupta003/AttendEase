"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDailyProcessor = startDailyProcessor;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_js_1 = require("../lib/prisma.js");
const date_js_1 = require("../utils/date.js");
const enums_js_1 = require("../constants/enums.js");
function startDailyProcessor() {
    node_cron_1.default.schedule("0 1 * * *", async () => {
        const today = (0, date_js_1.dayjs)().startOf("day");
        const todayDate = (0, date_js_1.toDateStart)(today);
        const employees = await prisma_js_1.prisma.employee.findMany();
        for (const employee of employees) {
            const exists = await prisma_js_1.prisma.attendance.findUnique({
                where: { employeeId_date: { employeeId: employee.id, date: todayDate } }
            });
            if (exists)
                continue;
            const status = (0, date_js_1.isSunday)(today) ? enums_js_1.AttendanceStatus.WEEK_OFF : enums_js_1.AttendanceStatus.ABSENT;
            await prisma_js_1.prisma.attendance.create({
                data: {
                    employeeId: employee.id,
                    date: todayDate,
                    status,
                    isLate: false
                }
            });
        }
    });
}
