"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATE_FORMAT = exports.dayjs = void 0;
exports.parseFlexibleDate = parseFlexibleDate;
exports.parseTime = parseTime;
exports.computeWorkingMinutes = computeWorkingMinutes;
exports.formatMinutes = formatMinutes;
exports.isSunday = isSunday;
exports.toDateStart = toDateStart;
exports.monthRange = monthRange;
const dayjs_1 = __importDefault(require("dayjs"));
exports.dayjs = dayjs_1.default;
const customParseFormat_js_1 = __importDefault(require("dayjs/plugin/customParseFormat.js"));
const utc_js_1 = __importDefault(require("dayjs/plugin/utc.js"));
const minMax_js_1 = __importDefault(require("dayjs/plugin/minMax.js"));
const isSameOrBefore_js_1 = __importDefault(require("dayjs/plugin/isSameOrBefore.js"));
dayjs_1.default.extend(customParseFormat_js_1.default);
dayjs_1.default.extend(utc_js_1.default);
dayjs_1.default.extend(minMax_js_1.default);
dayjs_1.default.extend(isSameOrBefore_js_1.default);
exports.DATE_FORMAT = "YYYY-MM-DD";
function parseFlexibleDate(value, fallbackYear) {
    if (value instanceof Date) {
        return (0, dayjs_1.default)(value);
    }
    if (typeof value === "number") {
        const excelEpoch = (0, dayjs_1.default)("1899-12-30");
        return excelEpoch.add(value, "day");
    }
    const raw = String(value ?? "").trim();
    if (!raw)
        return null;
    const normalized = raw.replace(/\./g, "-").replace(/\//g, "-");
    const formats = [
        "YYYY-M-D",
        "YYYY-MM-DD",
        "MM-DD-YYYY",
        "M-D-YYYY",
        "DD-MM-YYYY",
        "D-M-YYYY",
        "DD MMM YYYY",
        "DD MMM YY",
        "MM-DD",
        "M-D",
        "DD-MM",
        "D-M"
    ];
    for (const fmt of formats) {
        const parsed = (0, dayjs_1.default)(normalized, fmt, true);
        if (parsed.isValid()) {
            if ((fmt === "MM-DD" || fmt === "M-D" || fmt === "DD-MM" || fmt === "D-M") && fallbackYear) {
                return parsed.year(fallbackYear);
            }
            return parsed;
        }
    }
    return null;
}
function parseTime(value) {
    if (value == null)
        return null;
    const str = String(value).trim();
    if (!str)
        return null;
    const match = str.match(/\b(\d{1,2}:\d{2})\b/);
    return match ? match[1] : null;
}
function computeWorkingMinutes(date, inTime, outTime) {
    if (!inTime || !outTime)
        return null;
    const start = (0, dayjs_1.default)(`${date.format(exports.DATE_FORMAT)} ${inTime}`, "YYYY-MM-DD HH:mm", true);
    const end = (0, dayjs_1.default)(`${date.format(exports.DATE_FORMAT)} ${outTime}`, "YYYY-MM-DD HH:mm", true);
    if (!start.isValid() || !end.isValid())
        return null;
    const diff = end.diff(start, "minute");
    if (diff <= 0)
        return null;
    return diff;
}
function formatMinutes(minutes) {
    if (minutes == null || Number.isNaN(minutes))
        return "0:00";
    const hrs = Math.floor(minutes / 60);
    const mins = Math.abs(minutes % 60);
    return `${hrs}:${String(mins).padStart(2, "0")}`;
}
function isSunday(date) {
    return date.day() === 0;
}
function toDateStart(date) {
    return date.startOf("day").toDate();
}
function monthRange(month) {
    const start = (0, dayjs_1.default)(`${month}-01`, "YYYY-MM-DD", true).startOf("month");
    if (!start.isValid()) {
        throw new Error("Invalid month format. Use YYYY-MM.");
    }
    return { start, end: start.endOf("month") };
}
