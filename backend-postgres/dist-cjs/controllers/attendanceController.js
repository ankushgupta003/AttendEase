"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAttendanceHandler = listAttendanceHandler;
exports.updateAttendanceHandler = updateAttendanceHandler;
exports.bulkActionHandler = bulkActionHandler;
exports.uploadPreview = uploadPreview;
exports.uploadAttendance = uploadAttendance;
exports.downloadAttendanceTemplate = downloadAttendanceTemplate;
exports.getFinalizationStatus = getFinalizationStatus;
exports.finalizeMonth = finalizeMonth;
exports.lockMonth = lockMonth;
exports.unlockMonth = unlockMonth;
exports.exportAttendance = exportAttendance;
const xlsx_1 = __importDefault(require("xlsx"));
const excelParser_js_1 = require("../utils/excelParser.js");
const attendanceService_js_1 = require("../services/attendanceService.js");
const attendanceService_js_2 = require("../services/attendanceService.js");
const date_js_1 = require("../utils/date.js");
async function listAttendanceHandler(req, res, next) {
    try {
        const month = String(req.query.month ?? "");
        const data = await (0, attendanceService_js_2.listAttendance)({
            month,
            search: req.query.search ? String(req.query.search) : undefined,
            department: req.query.department ? String(req.query.department) : undefined,
            status: req.query.status ? String(req.query.status) : undefined,
            exceptionsOnly: req.query.exceptionsOnly === "true",
            sortKey: req.query.sortKey ? String(req.query.sortKey) : undefined,
            sortDir: req.query.sortDir ? String(req.query.sortDir) : undefined,
            includeNonWorking: req.query.includeNonWorking === "true"
        });
        return res.json(data);
    }
    catch (error) {
        return next(error);
    }
}
async function updateAttendanceHandler(req, res, next) {
    try {
        const { attendanceId } = req.params;
        const { inTime, outTime, status, isLate, leaveTypeCode } = req.body;
        const updated = await (0, attendanceService_js_2.updateAttendanceRecord)(attendanceId, {
            inTime,
            outTime,
            status: status,
            isLate,
            leaveTypeCode: leaveTypeCode ?? null
        });
        return res.json(updated);
    }
    catch (error) {
        return next(error);
    }
}
async function bulkActionHandler(req, res, next) {
    try {
        const { action, employeeCodes, dateFrom, dateTo, shiftName } = req.body;
        const result = await (0, attendanceService_js_2.bulkAction)({ action, employeeCodes, dateFrom, dateTo, shiftName });
        return res.json(result);
    }
    catch (error) {
        return next(error);
    }
}
async function uploadPreview(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }
        const blocks = (0, excelParser_js_1.parseScheduleWorkbook)(req.file.buffer);
        const holidays = await (0, attendanceService_js_1.listHolidays)();
        const holidaySet = new Set(holidays.map((h) => (0, date_js_1.dayjs)(h.date).format("YYYY-MM-DD")));
        const flattened = blocks.flatMap((block) => block.entries.map((entry) => {
            const dateStr = entry.date.format("YYYY-MM-DD");
            let status = "OK";
            if (entry.date.day() === 0)
                status = "Week Off";
            else if (holidaySet.has(dateStr))
                status = "Holiday";
            else if (!entry.inTime || !entry.outTime || entry.inTime === entry.outTime)
                status = "Missing Punch";
            return {
                code: block.empCode,
                date: dateStr,
                inTime: entry.inTime ?? "",
                outTime: entry.outTime ?? "",
                status
            };
        }));
        const preview = flattened.slice(0, 50);
        return res.json({
            preview,
            totalRows: flattened.length,
            missingPunch: flattened.filter((row) => !row.inTime || !row.outTime).length
        });
    }
    catch (error) {
        return next(error);
    }
}
async function uploadAttendance(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }
        const blocks = (0, excelParser_js_1.parseScheduleWorkbook)(req.file.buffer);
        if (!blocks.length) {
            return res.status(400).json({ message: "No employee blocks found in file." });
        }
        const summary = await (0, attendanceService_js_2.processScheduleBlocks)(blocks);
        return res.json({ message: "Attendance processed successfully.", summary });
    }
    catch (error) {
        return next(error);
    }
}
async function downloadAttendanceTemplate(_req, res, next) {
    try {
        const rows = [
            ["Schedule"],
            ["ID: 1", "Name: Arjun Sharma"],
            ["Dept: Engineering", "Shift: General", "Date: 2026-02-01 to 2026-02-28"],
            ["Date", "Week", "Sec1 In", "Sec1 Out", "Sec2 In", "Sec2 Out", "Sec3 In", "Sec3 Out"],
            ["02-01", "SUN", "", "", "", "", "", ""],
            ["02-02", "MON", "09:05", "12:45", "13:30", "18:10", "", ""],
            ["02-03", "TUE", "09:12", "18:02", "", "", "", ""]
        ];
        const worksheet = xlsx_1.default.utils.aoa_to_sheet(rows);
        const workbook = xlsx_1.default.utils.book_new();
        xlsx_1.default.utils.book_append_sheet(workbook, worksheet, "Attendance");
        const buffer = xlsx_1.default.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Disposition", "attachment; filename=attendance_template.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buffer);
    }
    catch (error) {
        return next(error);
    }
}
async function getFinalizationStatus(req, res, next) {
    try {
        const month = String(req.query.month ?? "");
        const finalization = await (0, attendanceService_js_2.getFinalization)(month);
        return res.json(finalization);
    }
    catch (error) {
        return next(error);
    }
}
async function finalizeMonth(req, res, next) {
    try {
        const month = String(req.query.month ?? "");
        const finalization = await (0, attendanceService_js_2.setFinalization)(month, "FINALIZED");
        return res.json(finalization);
    }
    catch (error) {
        return next(error);
    }
}
async function lockMonth(req, res, next) {
    try {
        const month = String(req.query.month ?? "");
        const finalization = await (0, attendanceService_js_2.setFinalization)(month, "LOCKED");
        return res.json(finalization);
    }
    catch (error) {
        return next(error);
    }
}
async function unlockMonth(req, res, next) {
    try {
        const month = String(req.query.month ?? "");
        const finalization = await (0, attendanceService_js_2.setFinalization)(month, "DRAFT");
        return res.json(finalization);
    }
    catch (error) {
        return next(error);
    }
}
async function exportAttendance(req, res, next) {
    try {
        const month = String(req.query.month ?? "");
        const rows = await (0, attendanceService_js_2.listAttendance)({ month, includeNonWorking: true });
        const worksheet = xlsx_1.default.utils.json_to_sheet(rows);
        const workbook = xlsx_1.default.utils.book_new();
        xlsx_1.default.utils.book_append_sheet(workbook, worksheet, "Attendance");
        const buffer = xlsx_1.default.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Disposition", `attachment; filename=attendance-${month}.xlsx`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buffer);
    }
    catch (error) {
        return next(error);
    }
}
