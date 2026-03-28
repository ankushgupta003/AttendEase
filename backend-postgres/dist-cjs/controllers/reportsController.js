"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceSummaryHandler = attendanceSummaryHandler;
exports.salarySheetHandler = salarySheetHandler;
exports.exportAttendanceSummary = exportAttendanceSummary;
exports.exportSalarySheet = exportSalarySheet;
const xlsx_1 = __importDefault(require("xlsx"));
const attendanceService_js_1 = require("../services/attendanceService.js");
async function attendanceSummaryHandler(req, res, next) {
    try {
        const month = String(req.query.month ?? "");
        const department = req.query.department ? String(req.query.department) : undefined;
        const summary = await (0, attendanceService_js_1.getAttendanceSummary)(month, department);
        return res.json(summary);
    }
    catch (error) {
        return next(error);
    }
}
async function salarySheetHandler(req, res, next) {
    try {
        const month = String(req.query.month ?? "");
        const department = req.query.department ? String(req.query.department) : undefined;
        const sheet = await (0, attendanceService_js_1.getSalarySheet)(month, department);
        return res.json(sheet);
    }
    catch (error) {
        return next(error);
    }
}
async function exportAttendanceSummary(req, res, next) {
    try {
        const month = String(req.query.month ?? "");
        const department = req.query.department ? String(req.query.department) : undefined;
        const rows = await (0, attendanceService_js_1.getAttendanceSummary)(month, department);
        const worksheet = xlsx_1.default.utils.json_to_sheet(rows);
        const workbook = xlsx_1.default.utils.book_new();
        xlsx_1.default.utils.book_append_sheet(workbook, worksheet, "Attendance Summary");
        const buffer = xlsx_1.default.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Disposition", `attachment; filename=attendance-summary-${month}.xlsx`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buffer);
    }
    catch (error) {
        return next(error);
    }
}
async function exportSalarySheet(req, res, next) {
    try {
        const month = String(req.query.month ?? "");
        const department = req.query.department ? String(req.query.department) : undefined;
        const rows = await (0, attendanceService_js_1.getSalarySheet)(month, department);
        const worksheet = xlsx_1.default.utils.json_to_sheet(rows);
        const workbook = xlsx_1.default.utils.book_new();
        xlsx_1.default.utils.book_append_sheet(workbook, worksheet, "Salary Sheet");
        const buffer = xlsx_1.default.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Disposition", `attachment; filename=salary-sheet-${month}.xlsx`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buffer);
    }
    catch (error) {
        return next(error);
    }
}
