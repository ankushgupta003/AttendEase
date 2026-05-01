"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listShiftsHandler = listShiftsHandler;
exports.createShiftHandler = createShiftHandler;
exports.updateShiftHandler = updateShiftHandler;
exports.listHolidaysHandler = listHolidaysHandler;
exports.createHolidayHandler = createHolidayHandler;
exports.updateHolidayHandler = updateHolidayHandler;
exports.deleteHolidayHandler = deleteHolidayHandler;
exports.uploadHolidayHandler = uploadHolidayHandler;
exports.downloadHolidayTemplate = downloadHolidayTemplate;
exports.reprocessAttendanceHandler = reprocessAttendanceHandler;
exports.listLeaveTypesHandler = listLeaveTypesHandler;
exports.upsertLeaveTypeHandler = upsertLeaveTypeHandler;
exports.deleteLeaveTypeHandler = deleteLeaveTypeHandler;
exports.listSalaryTypesHandler = listSalaryTypesHandler;
exports.createSalaryTypeHandler = createSalaryTypeHandler;
exports.updateSalaryTypeHandler = updateSalaryTypeHandler;
exports.listAdvanceLedgerHandler = listAdvanceLedgerHandler;
exports.upsertAdvanceLedgerHandler = upsertAdvanceLedgerHandler;
exports.addAdvanceIssueHandler = addAdvanceIssueHandler;
exports.listAdvanceHistoryHandler = listAdvanceHistoryHandler;
const xlsx_1 = __importDefault(require("xlsx"));
const date_js_1 = require("../utils/date.js");
const attendanceService_js_1 = require("../services/attendanceService.js");
function toHolidayDto(holiday) {
    const type = String(holiday.type ?? "NATIONAL").toLowerCase();
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    return {
        id: holiday.id,
        name: holiday.name,
        date: holiday.date.toISOString().slice(0, 10),
        type: label
    };
}
async function listShiftsHandler(req, res, next) {
    try {
        const shifts = await (0, attendanceService_js_1.listShifts)();
        return res.json(shifts);
    }
    catch (error) {
        return next(error);
    }
}
async function createShiftHandler(req, res, next) {
    try {
        const { name, startTime, endTime, graceMinutes, lunchBreakMinutes } = req.body;
        const created = await (0, attendanceService_js_1.createShift)({
            name,
            startTime,
            endTime,
            graceMinutes,
            lunchBreakMinutes
        });
        return res.status(201).json(created);
    }
    catch (error) {
        return next(error);
    }
}
async function updateShiftHandler(req, res, next) {
    try {
        const { shiftId } = req.params;
        const updated = await (0, attendanceService_js_1.updateShift)(shiftId, req.body);
        return res.json(updated);
    }
    catch (error) {
        return next(error);
    }
}
async function listHolidaysHandler(req, res, next) {
    try {
        const holidays = await (0, attendanceService_js_1.listHolidays)();
        return res.json(holidays.map(toHolidayDto));
    }
    catch (error) {
        return next(error);
    }
}
async function createHolidayHandler(req, res, next) {
    try {
        const { name, date, type } = req.body;
        const parsed = (0, date_js_1.dayjs)(date, "YYYY-MM-DD", true);
        if (!parsed.isValid()) {
            return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
        }
        const safeDate = new Date(Date.UTC(parsed.year(), parsed.month(), parsed.date(), 12, 0, 0));
        const created = await (0, attendanceService_js_1.createHoliday)({
            name,
            date: safeDate,
            type: type?.toUpperCase() ?? "NATIONAL"
        });
        return res.status(201).json(toHolidayDto(created));
    }
    catch (error) {
        return next(error);
    }
}
async function updateHolidayHandler(req, res, next) {
    try {
        const { holidayId } = req.params;
        const { name, date, type } = req.body;
        const parsed = date ? (0, date_js_1.dayjs)(date, "YYYY-MM-DD", true) : null;
        if (date && (!parsed || !parsed.isValid())) {
            return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
        }
        const safeDate = parsed
            ? new Date(Date.UTC(parsed.year(), parsed.month(), parsed.date(), 12, 0, 0))
            : undefined;
        const updated = await (0, attendanceService_js_1.updateHoliday)(holidayId, {
            name,
            date: safeDate,
            type: type ? type.toUpperCase() : undefined
        });
        return res.json(toHolidayDto(updated));
    }
    catch (error) {
        return next(error);
    }
}
async function deleteHolidayHandler(req, res, next) {
    try {
        const { holidayId } = req.params;
        const deleted = await (0, attendanceService_js_1.deleteHoliday)(holidayId);
        return res.json(deleted);
    }
    catch (error) {
        return next(error);
    }
}
async function uploadHolidayHandler(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }
        const workbook = xlsx_1.default.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return res.status(400).json({ message: "No worksheet found." });
        }
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx_1.default.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
        let created = 0;
        for (const row of rows) {
            if (!row || row.length < 2)
                continue;
            const date = (0, date_js_1.parseFlexibleDate)(row[0]);
            const name = String(row[1] ?? "").trim();
            const type = String(row[2] ?? "").trim();
            if (!date || !date.isValid() || !name)
                continue;
            const safeDate = new Date(Date.UTC(date.year(), date.month(), date.date(), 12, 0, 0));
            await (0, attendanceService_js_1.createHoliday)({ name, date: safeDate, type: type.toUpperCase() || "NATIONAL" });
            created += 1;
        }
        return res.json({ message: "Holiday upload completed.", created });
    }
    catch (error) {
        return next(error);
    }
}
async function downloadHolidayTemplate(req, res, next) {
    try {
        const rows = [
            { Date: "2026-01-26", Name: "Republic Day", Type: "National" },
            { Date: "2026-03-08", Name: "Holi", Type: "National" }
        ];
        const worksheet = xlsx_1.default.utils.json_to_sheet(rows);
        const workbook = xlsx_1.default.utils.book_new();
        xlsx_1.default.utils.book_append_sheet(workbook, worksheet, "Holidays");
        const buffer = xlsx_1.default.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Disposition", "attachment; filename=holiday_template.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buffer);
    }
    catch (error) {
        return next(error);
    }
}
async function reprocessAttendanceHandler(req, res, next) {
    try {
        const { month } = req.body;
        if (!month) {
            return res.status(400).json({ message: "Month is required (format: YYYY-MM)." });
        }
        const result = await (0, attendanceService_js_1.reprocessAttendanceForHolidays)(month);
        return res.json({ message: "Attendance records reprocessed based on updated holidays.", ...result });
    }
    catch (error) {
        return next(error);
    }
}
async function listLeaveTypesHandler(req, res, next) {
    try {
        const leaveTypes = await (0, attendanceService_js_1.listLeaveTypes)();
        return res.json(leaveTypes);
    }
    catch (error) {
        return next(error);
    }
}
async function upsertLeaveTypeHandler(req, res, next) {
    try {
        const { code, name, paidLeave, maxDays } = req.body;
        const saved = await (0, attendanceService_js_1.upsertLeaveType)({ code, name, paidLeave, maxDays });
        return res.json(saved);
    }
    catch (error) {
        return next(error);
    }
}
async function deleteLeaveTypeHandler(req, res, next) {
    try {
        const { code } = req.params;
        if (!code) {
            return res.status(400).json({ message: 'Leave type code is required.' });
        }
        await (0, attendanceService_js_1.deleteLeaveType)(code);
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
}
async function listSalaryTypesHandler(req, res, next) {
    try {
        const includeInactive = req.query.includeInactive === "true";
        const rows = await (0, attendanceService_js_1.listSalaryTypes)(includeInactive);
        return res.json(rows);
    }
    catch (error) {
        return next(error);
    }
}
async function createSalaryTypeHandler(req, res, next) {
    try {
        const { name, isActive } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: "name is required." });
        }
        const row = await (0, attendanceService_js_1.createSalaryType)({ name: name.trim(), isActive });
        return res.status(201).json(row);
    }
    catch (error) {
        return next(error);
    }
}
async function updateSalaryTypeHandler(req, res, next) {
    try {
        const { salaryTypeId } = req.params;
        const { name, isActive } = req.body;
        const row = await (0, attendanceService_js_1.updateSalaryType)(salaryTypeId, {
            name: name?.trim(),
            isActive
        });
        return res.json(row);
    }
    catch (error) {
        return next(error);
    }
}
async function listAdvanceLedgerHandler(req, res, next) {
    try {
        const month = String(req.query.month ?? "");
        if (!month) {
            return res.status(400).json({ message: "month is required (YYYY-MM)." });
        }
        const department = req.query.department ? String(req.query.department) : undefined;
        const rows = await (0, attendanceService_js_1.listAdvanceLedger)(month, department);
        return res.json(rows);
    }
    catch (error) {
        return next(error);
    }
}
async function upsertAdvanceLedgerHandler(req, res, next) {
    try {
        const { employeeId, month, fine, advance, others, arrear, salaryRemark } = req.body;
        if (!employeeId || !month) {
            return res.status(400).json({ message: "employeeId and month are required." });
        }
        const row = await (0, attendanceService_js_1.upsertAdvanceLedger)({
            employeeId,
            month,
            fine: Number(fine ?? 0),
            advance: Number(advance ?? 0),
            others: Number(others ?? 0),
            arrear: Number(arrear ?? 0),
            salaryRemark: salaryRemark ?? null
        });
        return res.json(row);
    }
    catch (error) {
        return next(error);
    }
}
async function addAdvanceIssueHandler(req, res, next) {
    try {
        const { employeeId } = req.params;
        const { amount, entryDate, remark } = req.body;
        if (!employeeId) {
            return res.status(400).json({ message: "employeeId is required." });
        }
        const parsed = (0, date_js_1.dayjs)(entryDate, "YYYY-MM-DD", true);
        if (!parsed.isValid()) {
            return res.status(400).json({ message: "entryDate is required (YYYY-MM-DD)." });
        }
        const row = await (0, attendanceService_js_1.addAdvanceIssue)({
            employeeId,
            amount: Number(amount ?? 0),
            entryDate: new Date(Date.UTC(parsed.year(), parsed.month(), parsed.date(), 12, 0, 0)),
            remark: remark ?? null
        });
        return res.status(201).json(row);
    }
    catch (error) {
        return next(error);
    }
}
async function listAdvanceHistoryHandler(req, res, next) {
    try {
        const { employeeId } = req.params;
        if (!employeeId) {
            return res.status(400).json({ message: "employeeId is required." });
        }
        const rows = await (0, attendanceService_js_1.listAdvanceHistory)(employeeId);
        return res.json(rows);
    }
    catch (error) {
        return next(error);
    }
}
