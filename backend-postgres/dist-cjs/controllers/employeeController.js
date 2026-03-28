"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEmployeesHandler = listEmployeesHandler;
exports.createEmployeeHandler = createEmployeeHandler;
exports.updateEmployeeHandler = updateEmployeeHandler;
exports.updateEmployeeShiftHandler = updateEmployeeShiftHandler;
exports.getEmployeeLeaveSummaryHandler = getEmployeeLeaveSummaryHandler;
exports.getEmployeeAttendanceSummaryHandler = getEmployeeAttendanceSummaryHandler;
const attendanceService_js_1 = require("../services/attendanceService.js");
function toEmployeeDto(employee) {
    return {
        id: employee.id,
        code: employee.code,
        name: employee.name,
        department: employee.department,
        shift: employee.shift?.name ?? "General",
        active: employee.active,
        overtimeEligible: employee.overtimeEligible ?? false,
        email: employee.email ?? null,
        phone: employee.phone ?? null,
        designation: employee.designation ?? null
    };
}
async function listEmployeesHandler(req, res, next) {
    try {
        const employees = await (0, attendanceService_js_1.listEmployees)();
        return res.json(employees.map(toEmployeeDto));
    }
    catch (error) {
        return next(error);
    }
}
async function createEmployeeHandler(req, res, next) {
    try {
        const { code, name, department, shiftName, active, overtimeEligible, email, phone, designation } = req.body;
        const created = await (0, attendanceService_js_1.createEmployee)({ code, name, department, shiftName, active, overtimeEligible, email, phone, designation });
        return res.status(201).json(toEmployeeDto(created));
    }
    catch (error) {
        return next(error);
    }
}
async function updateEmployeeHandler(req, res, next) {
    try {
        const { employeeId } = req.params;
        const updated = await (0, attendanceService_js_1.updateEmployee)(employeeId, req.body);
        return res.json(toEmployeeDto(updated));
    }
    catch (error) {
        return next(error);
    }
}
async function updateEmployeeShiftHandler(req, res, next) {
    try {
        const { employeeId } = req.params;
        const { shiftName } = req.body;
        if (!shiftName) {
            return res.status(400).json({ message: "shiftName is required." });
        }
        const updated = await (0, attendanceService_js_1.updateEmployeeShift)(employeeId, shiftName);
        return res.json(toEmployeeDto(updated));
    }
    catch (error) {
        return next(error);
    }
}
async function getEmployeeLeaveSummaryHandler(req, res, next) {
    try {
        const { employeeId } = req.params;
        const year = req.query.year ? Number(req.query.year) : undefined;
        const month = req.query.month ? Number(req.query.month) : undefined;
        const period = req.query.period === 'monthly' ? 'monthly' : 'annual';
        const summary = await (0, attendanceService_js_1.getEmployeeLeaveSummary)(employeeId, { year, month, period });
        return res.json(summary);
    }
    catch (error) {
        return next(error);
    }
}
async function getEmployeeAttendanceSummaryHandler(req, res, next) {
    try {
        const { employeeId } = req.params;
        const month = req.query.month;
        const period = req.query.period === "quarterly"
            ? "quarterly"
            : req.query.period === "yearly"
                ? "yearly"
                : "monthly";
        if (!month) {
            return res.status(400).json({ error: "Month parameter required (YYYY-MM format)" });
        }
        const summary = await (0, attendanceService_js_1.getEmployeeAttendanceSummary)(employeeId, month, period);
        return res.json(summary);
    }
    catch (error) {
        return next(error);
    }
}
