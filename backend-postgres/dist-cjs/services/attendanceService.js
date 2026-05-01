"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAttendance = listAttendance;
exports.getFinalization = getFinalization;
exports.setFinalization = setFinalization;
exports.updateAttendanceRecord = updateAttendanceRecord;
exports.bulkAction = bulkAction;
exports.processScheduleBlocks = processScheduleBlocks;
exports.getDashboardStats = getDashboardStats;
exports.getEmployeeLeaveSummary = getEmployeeLeaveSummary;
exports.getEmployeeAttendanceSummary = getEmployeeAttendanceSummary;
exports.listEmployees = listEmployees;
exports.createEmployee = createEmployee;
exports.updateEmployee = updateEmployee;
exports.updateEmployeeShift = updateEmployeeShift;
exports.listShifts = listShifts;
exports.listSalaryTypes = listSalaryTypes;
exports.createSalaryType = createSalaryType;
exports.updateSalaryType = updateSalaryType;
exports.createShift = createShift;
exports.updateShift = updateShift;
exports.listHolidays = listHolidays;
exports.createHoliday = createHoliday;
exports.updateHoliday = updateHoliday;
exports.deleteHoliday = deleteHoliday;
exports.reprocessAttendanceForHolidays = reprocessAttendanceForHolidays;
exports.listLeaveTypes = listLeaveTypes;
exports.upsertLeaveType = upsertLeaveType;
exports.deleteLeaveType = deleteLeaveType;
exports.listAdvanceLedger = listAdvanceLedger;
exports.upsertAdvanceLedger = upsertAdvanceLedger;
exports.addAdvanceIssue = addAdvanceIssue;
exports.listAdvanceHistory = listAdvanceHistory;
exports.upsertAttendanceSummaryRemark = upsertAttendanceSummaryRemark;
exports.getAttendanceSummary = getAttendanceSummary;
exports.getSalarySheet = getSalarySheet;
exports.getSandwichDeductions = getSandwichDeductions;
const prisma_js_1 = require("../lib/prisma.js");
const enums_js_1 = require("../constants/enums.js");
const date_js_1 = require("../utils/date.js");
const DEFAULT_SHIFT = {
    name: "General",
    startTime: "09:00",
    endTime: "18:00",
    graceMinutes: 15,
    lunchBreakMinutes: 0
};
const UI_TO_DB_STATUS = {
    Present: enums_js_1.AttendanceStatus.PRESENT,
    Absent: enums_js_1.AttendanceStatus.ABSENT,
    Late: enums_js_1.AttendanceStatus.LATE,
    "Half Day": enums_js_1.AttendanceStatus.HALF_DAY,
    "Missing Punch": enums_js_1.AttendanceStatus.MISSING_PUNCH,
    "Week Off": enums_js_1.AttendanceStatus.WEEK_OFF,
    Holiday: enums_js_1.AttendanceStatus.HOLIDAY,
    Leave: enums_js_1.AttendanceStatus.LEAVE
};
const DB_TO_UI_STATUS = {
    [enums_js_1.AttendanceStatus.PRESENT]: "Present",
    [enums_js_1.AttendanceStatus.ABSENT]: "Absent",
    [enums_js_1.AttendanceStatus.LATE]: "Late",
    [enums_js_1.AttendanceStatus.HALF_DAY]: "Half Day",
    [enums_js_1.AttendanceStatus.MISSING_PUNCH]: "Missing Punch",
    [enums_js_1.AttendanceStatus.WEEK_OFF]: "Week Off",
    [enums_js_1.AttendanceStatus.HOLIDAY]: "Holiday",
    [enums_js_1.AttendanceStatus.LEAVE]: "Leave"
};
function resolveUiStatus(status) {
    return DB_TO_UI_STATUS[status] ?? "Absent";
}
async function getDefaultSalaryTypeId() {
    const existing = await prisma_js_1.prisma.salaryType.findUnique({ where: { name: "Nuvo" } });
    if (existing)
        return existing.id;
    const created = await prisma_js_1.prisma.salaryType.create({
        data: { name: "Nuvo", isActive: true }
    });
    return created.id;
}
function toUiAttendanceRow(row, leaveTypeCode) {
    return {
        id: row.id,
        employeeCode: row.employee.code,
        employeeName: row.employee.name,
        department: row.employee.department,
        date: (0, date_js_1.dayjs)(row.date).format("YYYY-MM-DD"),
        inTime: row.inTime ?? "",
        outTime: row.outTime ?? "",
        workingHours: (0, date_js_1.formatMinutes)(row.workingMinutes),
        status: resolveUiStatus(row.status),
        isLate: row.isLate,
        shiftName: row.employee.shift?.name ?? DEFAULT_SHIFT.name,
        rawStatus: row.status,
        leaveTypeCode: leaveTypeCode ?? null
    };
}
function sameDay(a, b) {
    return a.isSame(b, "day");
}
async function findLeaveForDate(client, employeeId, date) {
    return client.leave.findFirst({
        where: {
            employeeId,
            fromDate: { lte: date },
            toDate: { gte: date }
        },
        orderBy: { fromDate: "asc" }
    });
}
async function upsertLeaveForDate(client, employeeId, date, typeCode) {
    const day = (0, date_js_1.dayjs)(date).startOf("day");
    const existing = await findLeaveForDate(client, employeeId, day.toDate());
    if (!existing) {
        await client.leave.create({
            data: { employeeId, fromDate: day.toDate(), toDate: day.toDate(), typeCode }
        });
        return;
    }
    const from = (0, date_js_1.dayjs)(existing.fromDate).startOf("day");
    const to = (0, date_js_1.dayjs)(existing.toDate).startOf("day");
    if (sameDay(from, day) && sameDay(to, day)) {
        if (existing.typeCode !== typeCode) {
            await client.leave.update({ where: { id: existing.id }, data: { typeCode } });
        }
        return;
    }
    const segments = [];
    if (from.isBefore(day)) {
        segments.push({ fromDate: from.toDate(), toDate: day.subtract(1, "day").toDate(), typeCode: existing.typeCode });
    }
    if (day.isBefore(to)) {
        segments.push({ fromDate: day.add(1, "day").toDate(), toDate: to.toDate(), typeCode: existing.typeCode });
    }
    await client.leave.delete({ where: { id: existing.id } });
    await client.leave.create({ data: { employeeId, fromDate: day.toDate(), toDate: day.toDate(), typeCode } });
    for (const seg of segments) {
        await client.leave.create({ data: { employeeId, ...seg } });
    }
}
async function removeLeaveForDate(client, employeeId, date) {
    const day = (0, date_js_1.dayjs)(date).startOf("day");
    const existing = await findLeaveForDate(client, employeeId, day.toDate());
    if (!existing)
        return;
    const from = (0, date_js_1.dayjs)(existing.fromDate).startOf("day");
    const to = (0, date_js_1.dayjs)(existing.toDate).startOf("day");
    if (sameDay(from, day) && sameDay(to, day)) {
        await client.leave.delete({ where: { id: existing.id } });
        return;
    }
    const segments = [];
    if (from.isBefore(day)) {
        segments.push({ fromDate: from.toDate(), toDate: day.subtract(1, "day").toDate(), typeCode: existing.typeCode });
    }
    if (day.isBefore(to)) {
        segments.push({ fromDate: day.add(1, "day").toDate(), toDate: to.toDate(), typeCode: existing.typeCode });
    }
    await client.leave.delete({ where: { id: existing.id } });
    for (const seg of segments) {
        await client.leave.create({ data: { employeeId, ...seg } });
    }
}
function computeStatus(params) {
    const { inTime, outTime, workingMinutes, isLate } = params;
    if (!inTime && !outTime)
        return enums_js_1.AttendanceStatus.ABSENT;
    if (!inTime || !outTime)
        return enums_js_1.AttendanceStatus.MISSING_PUNCH;
    if (workingMinutes == null)
        return enums_js_1.AttendanceStatus.MISSING_PUNCH;
    if (workingMinutes != null && workingMinutes < 240)
        return enums_js_1.AttendanceStatus.HALF_DAY;
    if (isLate)
        return enums_js_1.AttendanceStatus.LATE;
    return enums_js_1.AttendanceStatus.PRESENT;
}
async function getOrCreateDefaultShift() {
    return prisma_js_1.prisma.shift.upsert({
        where: { name: DEFAULT_SHIFT.name },
        create: DEFAULT_SHIFT,
        update: {}
    });
}
async function getOrCreateShiftByName(name) {
    if (!name)
        return getOrCreateDefaultShift();
    return prisma_js_1.prisma.shift.upsert({
        where: { name },
        create: { ...DEFAULT_SHIFT, name },
        update: {}
    });
}
function computeLateFlag(date, inTime, shift) {
    if (!inTime || !shift)
        return false;
    const shiftStart = (0, date_js_1.dayjs)(`${(0, date_js_1.dayjs)(date).format("YYYY-MM-DD")} ${shift.startTime}`, "YYYY-MM-DD HH:mm", true);
    const graceStart = shiftStart.add(shift.graceMinutes, "minute");
    const inMoment = (0, date_js_1.dayjs)(`${(0, date_js_1.dayjs)(date).format("YYYY-MM-DD")} ${inTime}`, "YYYY-MM-DD HH:mm", true);
    if (!shiftStart.isValid() || !graceStart.isValid() || !inMoment.isValid())
        return false;
    return inMoment.isAfter(graceStart);
}
function computeShiftMinutes(date, shift) {
    if (!shift?.startTime || !shift?.endTime)
        return null;
    const start = (0, date_js_1.dayjs)(`${date.format("YYYY-MM-DD")} ${shift.startTime}`, "YYYY-MM-DD HH:mm", true);
    const end = (0, date_js_1.dayjs)(`${date.format("YYYY-MM-DD")} ${shift.endTime}`, "YYYY-MM-DD HH:mm", true);
    if (!start.isValid() || !end.isValid())
        return null;
    const diff = end.diff(start, "minute");
    if (diff <= 0)
        return null;
    return diff;
}
function computeNetShiftMinutes(date, shift) {
    const shiftMinutes = computeShiftMinutes(date, shift);
    if (shiftMinutes == null)
        return null;
    const lunchBreakMinutes = Math.max(0, Number(shift?.lunchBreakMinutes ?? 0));
    return Math.max(0, shiftMinutes - lunchBreakMinutes);
}
function computeWeekOffOtMinutes(workingMinutes, shift) {
    const lunchBreakMinutes = Math.max(0, Number(shift?.lunchBreakMinutes ?? 0));
    if (workingMinutes > 240) {
        return Math.max(0, workingMinutes - lunchBreakMinutes);
    }
    return workingMinutes;
}
async function listAttendance(params) {
    const { start, end } = (0, date_js_1.monthRange)(params.month);
    const search = params.search?.trim();
    const department = params.department && params.department !== "all" ? params.department : undefined;
    const where = {
        date: { gte: start.toDate(), lte: end.toDate() }
    };
    const and = [];
    if (!params.includeNonWorking) {
        and.push({ status: { notIn: [enums_js_1.AttendanceStatus.WEEK_OFF, enums_js_1.AttendanceStatus.HOLIDAY, enums_js_1.AttendanceStatus.LEAVE] } });
    }
    if (department) {
        and.push({ employee: { is: { department } } });
    }
    if (search) {
        and.push({
            employee: {
                is: {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { code: { contains: search, mode: "insensitive" } }
                    ]
                }
            }
        });
    }
    if (params.exceptionsOnly) {
        and.push({
            status: {
                in: [enums_js_1.AttendanceStatus.ABSENT, enums_js_1.AttendanceStatus.LATE, enums_js_1.AttendanceStatus.HALF_DAY, enums_js_1.AttendanceStatus.MISSING_PUNCH]
            }
        });
    }
    else if (params.status && params.status !== "all") {
        and.push({ status: UI_TO_DB_STATUS[params.status] });
    }
    if (and.length)
        where.AND = and;
    const orderBy = [];
    const dir = params.sortDir ?? "asc";
    switch (params.sortKey) {
        case "employeeCode":
            orderBy.push({ employee: { code: dir } });
            break;
        case "employeeName":
            orderBy.push({ employee: { name: dir } });
            break;
        case "status":
            orderBy.push({ status: dir });
            break;
        default:
            orderBy.push({ date: dir });
    }
    const rows = await prisma_js_1.prisma.attendance.findMany({
        where,
        include: { employee: { include: { shift: true } } },
        orderBy
    });
    const employeeIds = Array.from(new Set(rows.map((row) => row.employeeId)));
    const leaveMap = new Map();
    if (employeeIds.length) {
        const leaves = await prisma_js_1.prisma.leave.findMany({
            where: {
                employeeId: { in: employeeIds },
                fromDate: { lte: end.toDate() },
                toDate: { gte: start.toDate() }
            }
        });
        for (const leave of leaves) {
            const list = leaveMap.get(leave.employeeId) ?? [];
            list.push({ fromDate: leave.fromDate, toDate: leave.toDate, typeCode: leave.typeCode });
            leaveMap.set(leave.employeeId, list);
        }
    }
    return rows.map((row) => {
        let leaveTypeCode = null;
        if (row.status === enums_js_1.AttendanceStatus.LEAVE) {
            const list = leaveMap.get(row.employeeId) ?? [];
            const rowDate = (0, date_js_1.dayjs)(row.date).startOf("day");
            const hit = list.find((l) => {
                const from = (0, date_js_1.dayjs)(l.fromDate).startOf("day");
                const to = (0, date_js_1.dayjs)(l.toDate).startOf("day");
                return (rowDate.isSame(from, "day") || rowDate.isAfter(from, "day")) &&
                    (rowDate.isSame(to, "day") || rowDate.isBefore(to, "day"));
            });
            leaveTypeCode = hit?.typeCode ?? null;
        }
        return toUiAttendanceRow(row, leaveTypeCode);
    });
}
async function getFinalization(month) {
    const existing = await prisma_js_1.prisma.attendanceFinalization.findUnique({ where: { month } });
    return existing ?? prisma_js_1.prisma.attendanceFinalization.create({ data: { month, status: enums_js_1.FinalizationStatus.DRAFT } });
}
async function setFinalization(month, status) {
    const data = { status };
    if (status === "FINALIZED") {
        data.finalizedAt = new Date();
        data.lockedAt = null;
    }
    if (status === "LOCKED") {
        data.lockedAt = new Date();
    }
    if (status === "DRAFT") {
        data.finalizedAt = null;
        data.lockedAt = null;
    }
    return prisma_js_1.prisma.attendanceFinalization.upsert({
        where: { month },
        create: { month, ...data },
        update: data
    });
}
async function updateAttendanceRecord(attendanceId, payload) {
    const record = await prisma_js_1.prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: { employee: { include: { shift: true } } }
    });
    if (!record)
        throw new Error("Attendance record not found.");
    let inTime = payload.inTime ?? record.inTime;
    let outTime = payload.outTime ?? record.outTime;
    let workingMinutes = (0, date_js_1.computeWorkingMinutes)((0, date_js_1.dayjs)(record.date), inTime, outTime);
    let isLate = payload.isLate ?? record.isLate;
    if (payload.isLate === undefined) {
        isLate = computeLateFlag(record.date, inTime, record.employee.shift ?? null);
    }
    let status = record.status;
    if (payload.status) {
        status = UI_TO_DB_STATUS[payload.status];
    }
    else {
        status = computeStatus({ inTime, outTime, workingMinutes, isLate });
    }
    const leaveTypeCode = payload.leaveTypeCode ?? null;
    if (status === enums_js_1.AttendanceStatus.LEAVE && !leaveTypeCode) {
        throw new Error("leaveTypeCode is required when status is Leave.");
    }
    if (status === enums_js_1.AttendanceStatus.LEAVE) {
        inTime = null;
        outTime = null;
        workingMinutes = null;
        isLate = false;
    }
    const updated = await prisma_js_1.prisma.$transaction(async (tx) => {
        if (status === enums_js_1.AttendanceStatus.LEAVE) {
            await upsertLeaveForDate(tx, record.employeeId, record.date, leaveTypeCode);
        }
        else {
            await removeLeaveForDate(tx, record.employeeId, record.date);
        }
        return tx.attendance.update({
            where: { id: attendanceId },
            data: {
                inTime,
                outTime,
                workingMinutes,
                status,
                isLate
            },
            include: { employee: { include: { shift: true } } }
        });
    });
    return toUiAttendanceRow(updated, status === enums_js_1.AttendanceStatus.LEAVE ? leaveTypeCode : null);
}
async function bulkAction(params) {
    const from = (0, date_js_1.dayjs)(params.dateFrom, "YYYY-MM-DD", true);
    const to = (0, date_js_1.dayjs)(params.dateTo, "YYYY-MM-DD", true);
    if (!from.isValid() || !to.isValid()) {
        throw new Error("Invalid date range. Use YYYY-MM-DD.");
    }
    const employees = await prisma_js_1.prisma.employee.findMany({
        where: { code: { in: params.employeeCodes } },
        include: { shift: true }
    });
    if (params.action === "change-shift") {
        const shift = await getOrCreateShiftByName(params.shiftName ?? DEFAULT_SHIFT.name);
        await prisma_js_1.prisma.employee.updateMany({
            where: { id: { in: employees.map((e) => e.id) } },
            data: { shiftId: shift.id }
        });
        return { updated: employees.length };
    }
    let updated = 0;
    for (const employee of employees) {
        const shift = employee.shift ?? (await getOrCreateDefaultShift());
        for (let d = from.clone(); d.isSameOrBefore(to, "day"); d = d.add(1, "day")) {
            const date = (0, date_js_1.toDateStart)(d);
            let status = enums_js_1.AttendanceStatus.PRESENT;
            let inTime = shift.startTime;
            let outTime = shift.endTime;
            let isLate = false;
            let workingMinutes = (0, date_js_1.computeWorkingMinutes)(d, inTime, outTime);
            if (params.action === "mark-leave") {
                status = enums_js_1.AttendanceStatus.LEAVE;
                inTime = null;
                outTime = null;
                workingMinutes = null;
                isLate = false;
            }
            if (params.action === "fix-missing") {
                status = enums_js_1.AttendanceStatus.PRESENT;
            }
            await prisma_js_1.prisma.attendance.upsert({
                where: { employeeId_date: { employeeId: employee.id, date } },
                create: {
                    employeeId: employee.id,
                    date,
                    inTime,
                    outTime,
                    workingMinutes,
                    status,
                    isLate
                },
                update: {
                    inTime,
                    outTime,
                    workingMinutes,
                    status,
                    isLate
                }
            });
            updated += 1;
        }
    }
    return { updated };
}
async function processScheduleBlocks(blocks) {
    const seenEmployees = new Set();
    let processed = 0;
    let exceptions = 0;
    const defaultSalaryTypeId = await getDefaultSalaryTypeId();
    for (const block of blocks) {
        const shift = await getOrCreateShiftByName(block.shiftName);
        const employee = await prisma_js_1.prisma.employee.upsert({
            where: { code: block.empCode },
            create: {
                code: block.empCode,
                name: block.name,
                department: block.department,
                shiftId: shift.id,
                salaryTypeId: defaultSalaryTypeId,
                active: true
            },
            update: {
                name: block.name,
                department: block.department,
                shiftId: shift.id,
                active: true
            }
        });
        seenEmployees.add(employee.id);
        for (const entry of block.entries) {
            const attendanceDate = (0, date_js_1.toDateStart)(entry.date);
            const [holiday, leave] = await Promise.all([
                prisma_js_1.prisma.holiday.findUnique({ where: { date: attendanceDate } }),
                prisma_js_1.prisma.leave.findFirst({
                    where: {
                        employeeId: employee.id,
                        fromDate: { lte: attendanceDate },
                        toDate: { gte: attendanceDate }
                    }
                })
            ]);
            let status = enums_js_1.AttendanceStatus.ABSENT;
            let inTime = entry.inTime;
            let outTime = entry.outTime;
            let workingMinutes = null;
            let isLate = false;
            if (holiday) {
                status = enums_js_1.AttendanceStatus.HOLIDAY;
                workingMinutes = (0, date_js_1.computeWorkingMinutes)(entry.date, inTime, outTime);
                if (!workingMinutes || workingMinutes <= 0) {
                    inTime = null;
                    outTime = null;
                    workingMinutes = null;
                }
            }
            else if ((0, date_js_1.isSunday)(entry.date)) {
                status = enums_js_1.AttendanceStatus.WEEK_OFF;
                workingMinutes = (0, date_js_1.computeWorkingMinutes)(entry.date, inTime, outTime);
                if (!workingMinutes || workingMinutes <= 0) {
                    inTime = null;
                    outTime = null;
                    workingMinutes = null;
                }
            }
            else if (leave) {
                status = enums_js_1.AttendanceStatus.LEAVE;
                inTime = null;
                outTime = null;
            }
            else {
                workingMinutes = (0, date_js_1.computeWorkingMinutes)(entry.date, inTime, outTime);
                isLate = computeLateFlag(attendanceDate, inTime, shift);
                status = computeStatus({ inTime, outTime, workingMinutes, isLate });
            }
            if (status === enums_js_1.AttendanceStatus.ABSENT || status === enums_js_1.AttendanceStatus.MISSING_PUNCH || status === enums_js_1.AttendanceStatus.LATE) {
                exceptions += 1;
            }
            await prisma_js_1.prisma.attendance.upsert({
                where: {
                    employeeId_date: {
                        employeeId: employee.id,
                        date: attendanceDate
                    }
                },
                create: {
                    employeeId: employee.id,
                    date: attendanceDate,
                    inTime,
                    outTime,
                    workingMinutes,
                    status,
                    isLate
                },
                update: {
                    inTime,
                    outTime,
                    workingMinutes,
                    status,
                    isLate
                }
            });
            processed += 1;
        }
    }
    return { processed, exceptions, employees: seenEmployees.size };
}
async function getDashboardStats(dateStr) {
    const date = dateStr ? (0, date_js_1.dayjs)(dateStr, "YYYY-MM-DD", true) : (0, date_js_1.dayjs)();
    if (!date.isValid()) {
        throw new Error("Invalid date format. Use YYYY-MM-DD.");
    }
    const targetDate = date.startOf("day").toDate();
    const [totalEmployees, presentToday, absentToday, lateToday, missingPunch, onLeave] = await Promise.all([
        prisma_js_1.prisma.employee.count(),
        prisma_js_1.prisma.attendance.count({ where: { date: targetDate, status: enums_js_1.AttendanceStatus.PRESENT } }),
        prisma_js_1.prisma.attendance.count({ where: { date: targetDate, status: enums_js_1.AttendanceStatus.ABSENT } }),
        prisma_js_1.prisma.attendance.count({ where: { date: targetDate, status: enums_js_1.AttendanceStatus.LATE } }),
        prisma_js_1.prisma.attendance.count({ where: { date: targetDate, status: enums_js_1.AttendanceStatus.MISSING_PUNCH } }),
        prisma_js_1.prisma.leave.count({ where: { fromDate: { lte: targetDate }, toDate: { gte: targetDate } } })
    ]);
    return { presentToday, absentToday, lateToday, missingPunch, totalEmployees, onLeave };
}
function countInclusiveDays(fromDate, toDate) {
    const start = (0, date_js_1.dayjs)(fromDate).startOf('day');
    const end = (0, date_js_1.dayjs)(toDate).startOf('day');
    if (!start.isValid() || !end.isValid() || end.isBefore(start))
        return 0;
    return end.diff(start, 'day') + 1;
}
async function getEmployeeLeaveSummary(employeeId, opts) {
    const employee = await prisma_js_1.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
        throw new Error('Employee not found.');
    }
    const year = opts?.year ?? (0, date_js_1.dayjs)().year();
    const month = opts?.month;
    const period = opts?.period ?? 'annual';
    const leaveMasterMode = process.env.LEAVE_MASTER_MODE === 'monthly' ? 'monthly' : 'annual';
    const leaveTypes = await listLeaveTypes();
    let startDate = (0, date_js_1.dayjs)(`${year}-01-01`, 'YYYY-MM-DD', true).startOf('day');
    let endDate = (0, date_js_1.dayjs)(`${year}-12-31`, 'YYYY-MM-DD', true).endOf('day');
    if (period === 'monthly' && month) {
        startDate = (0, date_js_1.dayjs)(`${year}-${String(month).padStart(2, '0')}-01`, 'YYYY-MM-DD', true).startOf('month');
        endDate = startDate.endOf('month');
    }
    const leaves = await prisma_js_1.prisma.leave.findMany({
        where: {
            employeeId,
            fromDate: { lte: endDate.toDate() },
            toDate: { gte: startDate.toDate() }
        }
    });
    let totalTaken = 0;
    const byType = new Map();
    for (const leave of leaves) {
        const overlapStart = date_js_1.dayjs.max((0, date_js_1.dayjs)(leave.fromDate), startDate);
        const overlapEnd = date_js_1.dayjs.min((0, date_js_1.dayjs)(leave.toDate), endDate);
        const days = countInclusiveDays(overlapStart.toDate(), overlapEnd.toDate());
        if (days <= 0)
            continue;
        totalTaken += days;
        byType.set(leave.typeCode, (byType.get(leave.typeCode) ?? 0) + days);
    }
    const detailByType = leaveTypes.map((t) => {
        const taken = byType.get(t.code) ?? 0;
        const allowance = period === 'monthly' ? Math.floor(t.maxDays / 12) : t.maxDays;
        return {
            code: t.code,
            name: t.name,
            maxDays: allowance,
            taken,
            balance: Math.max(0, allowance - taken),
            paidLeave: t.paidLeave
        };
    });
    const leaveAllowance = detailByType.reduce((sum, row) => sum + row.maxDays, 0);
    const leaveBalance = Math.max(0, leaveAllowance - totalTaken);
    const attendance = await prisma_js_1.prisma.attendance.findMany({
        where: {
            employeeId,
            date: { gte: startDate.toDate(), lte: endDate.toDate() }
        }
    });
    const absentDays = attendance.filter((row) => row.status === enums_js_1.AttendanceStatus.ABSENT).length;
    const lateDays = attendance.filter((row) => row.status === enums_js_1.AttendanceStatus.LATE).length;
    const statusByDate = new Map();
    for (const row of attendance) {
        statusByDate.set((0, date_js_1.dayjs)(row.date).format("YYYY-MM-DD"), row.status);
    }
    let sandwichDeductionDays = 0;
    for (const [dateStr, status] of statusByDate.entries()) {
        const date = (0, date_js_1.dayjs)(dateStr, "YYYY-MM-DD", true);
        if (!date.isValid() || !(0, date_js_1.isSunday)(date))
            continue;
        const saturday = date.subtract(1, "day").format("YYYY-MM-DD");
        const monday = date.add(1, "day").format("YYYY-MM-DD");
        const satStatus = statusByDate.get(saturday);
        const monStatus = statusByDate.get(monday);
        if (satStatus === enums_js_1.AttendanceStatus.ABSENT && monStatus === enums_js_1.AttendanceStatus.ABSENT) {
            sandwichDeductionDays += 1;
        }
    }
    const lopDays = absentDays + sandwichDeductionDays;
    const grossSalary = Number(process.env.DEFAULT_GROSS_SALARY ?? 50000);
    const { start, end } = (0, date_js_1.monthRange)(`${year}-${String(month).padStart(2, '0')}`);
    const monthlyDays = end.diff(start, "day") + 1;
    const latePenalty = Number(process.env.LATE_PENALTY ?? 200);
    const deductions = Math.round((lopDays * grossSalary / monthlyDays) + (lateDays * latePenalty));
    const netSalary = Math.round(grossSalary - deductions);
    return {
        year,
        month,
        employeeId,
        leaveTaken: totalTaken,
        leaveAllowance,
        leaveBalance,
        period,
        detailByType,
        leaveMasterMode,
        absentDays,
        lateDays,
        sandwichDeductionDays,
        lopDays,
        grossSalary,
        deductions,
        netSalary
    };
}
function rangeFromPeriod(month, period) {
    const base = (0, date_js_1.dayjs)(`${month}-01`, "YYYY-MM-DD", true);
    if (!base.isValid()) {
        throw new Error("Invalid month format. Use YYYY-MM.");
    }
    if (period === "monthly") {
        return { start: base.startOf("month"), end: base.endOf("month") };
    }
    if (period === "quarterly") {
        const quarterStartMonth = Math.floor(base.month() / 3) * 3; // 0-based
        const start = base.month(quarterStartMonth).startOf("month");
        const end = start.add(2, "month").endOf("month");
        return { start, end };
    }
    return { start: base.startOf("year"), end: base.endOf("year") };
}
async function getSandwichDeductionsForRange(start, end, department) {
    const records = await prisma_js_1.prisma.attendance.findMany({
        where: {
            date: { gte: start.toDate(), lte: end.toDate() },
            employee: department && department !== "all" ? { department } : undefined
        },
        include: {
            employee: true
        }
    });
    const byEmployee = new Map();
    for (const row of records) {
        const empMap = byEmployee.get(row.employee.code) ?? new Map();
        empMap.set((0, date_js_1.dayjs)(row.date).format("YYYY-MM-DD"), row.status);
        byEmployee.set(row.employee.code, empMap);
    }
    const deductions = new Map();
    for (const [code, statusByDate] of byEmployee.entries()) {
        let total = 0;
        let sunday = 0;
        let holiday = 0;
        for (const [dateStr, status] of statusByDate.entries()) {
            const date = (0, date_js_1.dayjs)(dateStr, "YYYY-MM-DD", true);
            if (!date.isValid())
                continue;
            const isSandwichGap = (0, date_js_1.isSunday)(date) ||
                status === enums_js_1.AttendanceStatus.HOLIDAY ||
                status === enums_js_1.AttendanceStatus.WEEK_OFF;
            if (!isSandwichGap)
                continue;
            const previousDay = date.subtract(1, "day").format("YYYY-MM-DD");
            const nextDay = date.add(1, "day").format("YYYY-MM-DD");
            const prevStatus = statusByDate.get(previousDay);
            const nextStatus = statusByDate.get(nextDay);
            if (prevStatus === enums_js_1.AttendanceStatus.ABSENT && nextStatus === enums_js_1.AttendanceStatus.ABSENT) {
                total += 1;
                if (status === enums_js_1.AttendanceStatus.HOLIDAY)
                    holiday += 1;
                else if (status === enums_js_1.AttendanceStatus.WEEK_OFF || (0, date_js_1.isSunday)(date))
                    sunday += 1;
            }
        }
        deductions.set(code, { total, sunday, holiday });
    }
    return deductions;
}
async function getEmployeeAttendanceSummary(employeeId, month, period = "monthly") {
    const { start, end } = rangeFromPeriod(month, period);
    // Get all attendance records for this employee in this range
    const records = await prisma_js_1.prisma.attendance.findMany({
        where: {
            employeeId,
            date: { gte: start.toDate(), lte: end.toDate() }
        },
        include: {
            employee: { include: { shift: true } }
        },
        orderBy: { date: "asc" }
    });
    // Get holidays for this range
    const holidays = await prisma_js_1.prisma.holiday.findMany({
        where: {
            date: { gte: start.toDate(), lte: end.toDate() }
        }
    });
    const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));
    // Count statuses
    let present = 0, absent = 0, late = 0, halfDay = 0;
    let sundayCount = 0, holidayCount = 0;
    let totalHrs = 0;
    const recordsByDate = {};
    for (const record of records) {
        const dateStr = record.date.toISOString().split('T')[0];
        const dateValue = (0, date_js_1.dayjs)(record.date);
        recordsByDate[dateStr] = record;
        const status = DB_TO_UI_STATUS[record.status] || record.status;
        if (status === "Present")
            present++;
        else if (status === "Absent")
            absent++;
        else if (status === "Late")
            late++;
        else if (status === "Half Day")
            halfDay++;
        if (status === "Present" || status === "Late" || status === "Half Day") {
            totalHrs += (record.workingMinutes || 0) / 60; // convert minutes to hours
        }
        if ((0, date_js_1.isSunday)(dateValue))
            sundayCount++;
        if (holidayDates.has(dateStr))
            holidayCount++;
    }
    // Calculate sandwich deductions
    const sandwichMap = await getSandwichDeductionsForRange(start, end, undefined);
    const employeeCode = records[0]?.employee?.code
        ?? (await prisma_js_1.prisma.employee.findUnique({ where: { id: employeeId }, select: { code: true } }))?.code
        ?? '';
    const employeeSandwich = sandwichMap.get(employeeCode) || { total: 0, sunday: 0, holiday: 0 };
    // Calculate payable sundays and holidays
    const payableSundays = sundayCount - (employeeSandwich.sunday || 0);
    const payableHolidays = holidayCount - (employeeSandwich.holiday || 0);
    // LOP = absent days + sandwich deductions
    const lopDays = absent + employeeSandwich.total;
    return {
        present,
        absent,
        late,
        halfDay,
        sundayDays: sundayCount,
        payableSundays: Math.max(0, payableSundays),
        holidayDays: holidayCount,
        payableHolidays: Math.max(0, payableHolidays),
        sandwichDays: employeeSandwich.total,
        sandwichSundayDays: employeeSandwich.sunday || 0,
        sandwichHolidayDays: employeeSandwich.holiday || 0,
        lopDays,
        totalHrs
    };
}
async function listEmployees() {
    return prisma_js_1.prisma.employee.findMany({
        include: { shift: true, salaryType: true },
        orderBy: { name: "asc" }
    });
}
async function createEmployee(payload) {
    const shift = payload.shiftName ? await getOrCreateShiftByName(payload.shiftName) : await getOrCreateDefaultShift();
    const salaryTypeId = payload.salaryTypeId ?? await getDefaultSalaryTypeId();
    return prisma_js_1.prisma.employee.create({
        data: {
            code: payload.code,
            name: payload.name,
            department: payload.department,
            shiftId: shift.id,
            salaryTypeId,
            active: payload.active ?? true,
            overtimeEligible: payload.overtimeEligible ?? true,
            email: payload.email,
            phone: payload.phone,
            designation: payload.designation,
            salary: payload.salary ?? 0
        },
        include: { shift: true, salaryType: true }
    });
}
async function updateEmployee(employeeId, payload) {
    return prisma_js_1.prisma.employee.update({
        where: { id: employeeId },
        data: payload,
        include: { shift: true, salaryType: true }
    });
}
async function updateEmployeeShift(employeeId, shiftName) {
    const shift = await getOrCreateShiftByName(shiftName);
    return prisma_js_1.prisma.employee.update({
        where: { id: employeeId },
        data: { shiftId: shift.id },
        include: { shift: true, salaryType: true }
    });
}
async function listShifts() {
    return prisma_js_1.prisma.shift.findMany({ orderBy: { name: "asc" } });
}
async function listSalaryTypes(includeInactive = false) {
    await getDefaultSalaryTypeId();
    return prisma_js_1.prisma.salaryType.findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: { name: "asc" }
    });
}
async function createSalaryType(payload) {
    return prisma_js_1.prisma.salaryType.create({
        data: {
            name: payload.name,
            isActive: payload.isActive ?? true
        }
    });
}
async function updateSalaryType(salaryTypeId, payload) {
    return prisma_js_1.prisma.salaryType.update({
        where: { id: salaryTypeId },
        data: payload
    });
}
async function createShift(payload) {
    return prisma_js_1.prisma.shift.create({
        data: {
            ...payload,
            lunchBreakMinutes: Math.max(0, Number(payload.lunchBreakMinutes ?? 0))
        }
    });
}
async function updateShift(shiftId, payload) {
    return prisma_js_1.prisma.shift.update({
        where: { id: shiftId },
        data: {
            ...payload,
            ...(payload.lunchBreakMinutes !== undefined
                ? { lunchBreakMinutes: Math.max(0, Number(payload.lunchBreakMinutes)) }
                : {})
        }
    });
}
async function listHolidays() {
    return prisma_js_1.prisma.holiday.findMany({ orderBy: { date: "asc" } });
}
async function createHoliday(payload) {
    const created = await prisma_js_1.prisma.holiday.create({ data: payload });
    await reprocessAttendanceForHolidays((0, date_js_1.dayjs)(created.date).format("YYYY-MM"));
    return created;
}
async function updateHoliday(holidayId, payload) {
    const existing = await prisma_js_1.prisma.holiday.findUnique({ where: { id: holidayId } });
    if (!existing) {
        throw new Error("Holiday not found.");
    }
    const updated = await prisma_js_1.prisma.holiday.update({ where: { id: holidayId }, data: payload });
    const monthsToReprocess = new Set([
        (0, date_js_1.dayjs)(existing.date).format("YYYY-MM"),
        (0, date_js_1.dayjs)(updated.date).format("YYYY-MM")
    ]);
    for (const month of monthsToReprocess) {
        await reprocessAttendanceForHolidays(month);
    }
    return updated;
}
async function deleteHoliday(holidayId) {
    const deleted = await prisma_js_1.prisma.holiday.delete({ where: { id: holidayId } });
    await reprocessAttendanceForHolidays((0, date_js_1.dayjs)(deleted.date).format("YYYY-MM"));
    return deleted;
}
async function reprocessAttendanceForHolidays(month) {
    const { start, end } = (0, date_js_1.monthRange)(month);
    // Get all holidays in this period
    const holidays = await prisma_js_1.prisma.holiday.findMany({
        where: {
            date: { gte: start.toDate(), lte: end.toDate() }
        }
    });
    const holidayDates = new Set(holidays.map(h => (0, date_js_1.dayjs)(h.date).format("YYYY-MM-DD")));
    // Get all attendance records for this period
    const records = await prisma_js_1.prisma.attendance.findMany({
        where: {
            date: { gte: start.toDate(), lte: end.toDate() }
        },
        include: { employee: true }
    });
    // Get unique employees who have attendance in this month
    const employeesInMonth = new Set(records.map(r => r.employeeId));
    // Update existing attendance status based on holidays
    for (const record of records) {
        const dateStr = (0, date_js_1.dayjs)(record.date).format("YYYY-MM-DD");
        const isHoliday = holidayDates.has(dateStr);
        // Only update if status should be HOLIDAY and isn't, or should not be HOLIDAY but is
        if (isHoliday && record.status !== enums_js_1.AttendanceStatus.HOLIDAY) {
            // If it's now a holiday, update it
            await prisma_js_1.prisma.attendance.update({
                where: { id: record.id },
                data: { status: enums_js_1.AttendanceStatus.HOLIDAY }
            });
        }
        else if (!isHoliday && record.status === enums_js_1.AttendanceStatus.HOLIDAY) {
            // If it was marked as holiday but no longer is, reset to ABSENT
            await prisma_js_1.prisma.attendance.update({
                where: { id: record.id },
                data: { status: enums_js_1.AttendanceStatus.ABSENT }
            });
        }
    }
    // Create HOLIDAY records for holiday dates that don't have records for employees in the month
    for (const employeeId of employeesInMonth) {
        for (const holiday of holidays) {
            const dateStr = (0, date_js_1.dayjs)(holiday.date).format("YYYY-MM-DD");
            const existingRecord = records.find(r => r.employeeId === employeeId && (0, date_js_1.dayjs)(r.date).format("YYYY-MM-DD") === dateStr);
            if (!existingRecord) {
                // Create HOLIDAY record
                await prisma_js_1.prisma.attendance.create({
                    data: {
                        employeeId,
                        date: holiday.date,
                        status: enums_js_1.AttendanceStatus.HOLIDAY,
                        inTime: null,
                        outTime: null,
                        workingMinutes: null
                    }
                });
            }
        }
    }
    return { updated: records.length, month };
}
async function listLeaveTypes() {
    return prisma_js_1.prisma.leaveType.findMany({ orderBy: { code: "asc" } });
}
async function upsertLeaveType(payload) {
    return prisma_js_1.prisma.leaveType.upsert({
        where: { code: payload.code },
        create: payload,
        update: { name: payload.name, paidLeave: payload.paidLeave, maxDays: payload.maxDays }
    });
}
async function deleteLeaveType(identifier) {
    // Try code first, then id
    const codeResult = await prisma_js_1.prisma.leaveType.findUnique({ where: { code: identifier } });
    if (codeResult) {
        return prisma_js_1.prisma.leaveType.delete({ where: { code: identifier } });
    }
    const idResult = await prisma_js_1.prisma.leaveType.findUnique({ where: { id: identifier } });
    if (idResult) {
        return prisma_js_1.prisma.leaveType.delete({ where: { id: identifier } });
    }
    throw new Error("Leave type not found.");
}
function toMonthKey(date) {
    return (0, date_js_1.dayjs)(date).format("YYYY-MM");
}
function toNoonDate(month) {
    return (0, date_js_1.dayjs)(`${month}-01`, "YYYY-MM-DD", true).hour(12).minute(0).second(0).millisecond(0).toDate();
}
function toPositiveInt(value, label) {
    const normalized = Math.trunc(Number(value));
    if (!Number.isFinite(normalized) || normalized <= 0) {
        const err = new Error(`${label} must be greater than 0.`);
        err.statusCode = 400;
        throw err;
    }
    return normalized;
}
function toNonNegativeInt(value, label) {
    const normalized = Math.trunc(Number(value));
    if (!Number.isFinite(normalized) || normalized < 0) {
        const err = new Error(`${label} cannot be negative.`);
        err.statusCode = 400;
        throw err;
    }
    return normalized;
}
function sortTransactionsByDate(rows) {
    return [...rows].sort((a, b) => {
        const dateDelta = (0, date_js_1.dayjs)(a.entryDate).valueOf() - (0, date_js_1.dayjs)(b.entryDate).valueOf();
        if (dateDelta !== 0)
            return dateDelta;
        return (0, date_js_1.dayjs)(a.createdAt).valueOf() - (0, date_js_1.dayjs)(b.createdAt).valueOf();
    });
}
async function getOutstandingByEmployeeIds(employeeIds) {
    if (!employeeIds.length)
        return new Map();
    const grouped = await prisma_js_1.prisma.advanceTransaction.groupBy({
        by: ["employeeId", "type"],
        where: { employeeId: { in: employeeIds } },
        _sum: { amount: true }
    });
    const totals = new Map();
    for (const row of grouped) {
        const current = totals.get(row.employeeId) ?? { issueLike: 0, recovery: 0 };
        const amount = row._sum.amount ?? 0;
        if (row.type === "RECOVERY")
            current.recovery += amount;
        else
            current.issueLike += amount;
        totals.set(row.employeeId, current);
    }
    return new Map(employeeIds.map((employeeId) => {
        const row = totals.get(employeeId) ?? { issueLike: 0, recovery: 0 };
        return [employeeId, Math.max(0, row.issueLike - row.recovery)];
    }));
}
async function ensureRecoveryWithinOutstanding(employeeId, month, recoveryAmount) {
    const [outstandingMap, existingRecovery] = await Promise.all([
        getOutstandingByEmployeeIds([employeeId]),
        prisma_js_1.prisma.advanceTransaction.findUnique({
            where: {
                employeeId_source_sourceMonth: {
                    employeeId,
                    source: "SALARY",
                    sourceMonth: month
                }
            },
            select: { amount: true }
        })
    ]);
    const outstanding = outstandingMap.get(employeeId) ?? 0;
    const existingAmount = existingRecovery?.amount ?? 0;
    const allowed = outstanding + existingAmount;
    if (recoveryAmount > allowed) {
        const err = new Error(`Advance recovery ${recoveryAmount} exceeds outstanding advance ${allowed}.`);
        err.statusCode = 400;
        throw err;
    }
}
async function listAdvanceLedger(month, department) {
    const rows = await prisma_js_1.prisma.employee.findMany({
        where: department && department !== "all" ? { department } : undefined,
        include: {
            advanceLedgers: {
                where: { month },
                take: 1
            }
        },
        orderBy: { name: "asc" }
    });
    const outstandingByEmployee = await getOutstandingByEmployeeIds(rows.map((employee) => employee.id));
    return rows.map((employee) => {
        const ledger = employee.advanceLedgers[0];
        return {
            employeeId: employee.id,
            code: employee.code,
            name: employee.name,
            department: employee.department,
            month,
            fine: ledger?.fine ?? 0,
            advance: ledger?.advance ?? 0,
            recoveryThisMonth: ledger?.advance ?? 0,
            others: ledger?.others ?? 0,
            arrear: ledger?.arrear ?? 0,
            salaryRemark: ledger?.salaryRemark ?? "",
            outstandingAdvance: outstandingByEmployee.get(employee.id) ?? 0
        };
    });
}
async function upsertAdvanceLedger(payload) {
    const advance = payload.advance == null ? undefined : toNonNegativeInt(payload.advance, "Advance recovery");
    if (advance !== undefined) {
        await ensureRecoveryWithinOutstanding(payload.employeeId, payload.month, advance);
    }
    return prisma_js_1.prisma.$transaction(async (tx) => {
        const ledger = await tx.advanceLedger.upsert({
            where: {
                employeeId_month: {
                    employeeId: payload.employeeId,
                    month: payload.month
                }
            },
            create: {
                employeeId: payload.employeeId,
                month: payload.month,
                fine: payload.fine ?? 0,
                advance: payload.advance ?? 0,
                others: payload.others ?? 0,
                arrear: payload.arrear ?? 0,
                salaryRemark: payload.salaryRemark ?? null
            },
            update: {
                fine: payload.fine,
                advance: payload.advance,
                others: payload.others,
                arrear: payload.arrear,
                salaryRemark: payload.salaryRemark ?? null
            }
        });
        if (advance !== undefined) {
            if (advance === 0) {
                await tx.advanceTransaction.deleteMany({
                    where: {
                        employeeId: payload.employeeId,
                        type: "RECOVERY",
                        source: "SALARY",
                        sourceMonth: payload.month
                    }
                });
            }
            else {
                await tx.advanceTransaction.upsert({
                    where: {
                        employeeId_source_sourceMonth: {
                            employeeId: payload.employeeId,
                            source: "SALARY",
                            sourceMonth: payload.month
                        }
                    },
                    create: {
                        employeeId: payload.employeeId,
                        type: "RECOVERY",
                        amount: advance,
                        entryDate: toNoonDate(payload.month),
                        month: payload.month,
                        remark: payload.salaryRemark ?? null,
                        source: "SALARY",
                        sourceMonth: payload.month
                    },
                    update: {
                        amount: advance,
                        remark: payload.salaryRemark ?? null,
                        entryDate: toNoonDate(payload.month),
                        month: payload.month
                    }
                });
            }
        }
        return ledger;
    });
}
async function addAdvanceIssue(payload) {
    const amount = toPositiveInt(payload.amount, "Advance issue amount");
    const month = toMonthKey(payload.entryDate);
    return prisma_js_1.prisma.advanceTransaction.create({
        data: {
            employeeId: payload.employeeId,
            type: "ISSUE",
            amount,
            entryDate: payload.entryDate,
            month,
            remark: payload.remark ?? null,
            source: "MANUAL",
            sourceMonth: null
        }
    });
}
async function listAdvanceHistory(employeeId) {
    const rows = await prisma_js_1.prisma.advanceTransaction.findMany({
        where: { employeeId },
        select: {
            id: true,
            type: true,
            amount: true,
            entryDate: true,
            month: true,
            remark: true,
            source: true,
            sourceMonth: true,
            createdAt: true
        }
    });
    let runningOutstanding = 0;
    return sortTransactionsByDate(rows).map((row) => {
        if (row.type === "RECOVERY")
            runningOutstanding -= row.amount;
        else
            runningOutstanding += row.amount;
        runningOutstanding = Math.max(0, runningOutstanding);
        return {
            id: row.id,
            type: row.type,
            source: row.source,
            sourceMonth: row.sourceMonth,
            amount: row.amount,
            date: (0, date_js_1.dayjs)(row.entryDate).format("YYYY-MM-DD"),
            month: row.month,
            remark: row.remark ?? "",
            runningOutstanding
        };
    });
}
async function upsertAttendanceSummaryRemark(payload) {
    return prisma_js_1.prisma.attendanceSummaryRemark.upsert({
        where: {
            employeeId_month: {
                employeeId: payload.employeeId,
                month: payload.month
            }
        },
        create: {
            employeeId: payload.employeeId,
            month: payload.month,
            remark: payload.remark ?? null
        },
        update: {
            remark: payload.remark ?? null
        }
    });
}
async function getAttendanceSummary(month, department) {
    const { start, end } = (0, date_js_1.monthRange)(month);
    const totalDays = end.diff(start, "day") + 1;
    const rows = await prisma_js_1.prisma.attendance.findMany({
        where: {
            date: { gte: start.toDate(), lte: end.toDate() },
            employee: department && department !== "all" ? { department } : undefined
        },
        include: {
            employee: {
                select: {
                    id: true,
                    code: true,
                    name: true,
                    department: true,
                    overtimeEligible: true,
                    salary: true,
                    shift: true,
                    salaryType: {
                        select: {
                            name: true
                        }
                    }
                }
            }
        }
    });
    const paidLeaveTypes = await prisma_js_1.prisma.leaveType.findMany({
        where: { paidLeave: true },
        select: { code: true }
    });
    const paidTypeSet = new Set(paidLeaveTypes.map((t) => t.code));
    const paidLeaves = await prisma_js_1.prisma.leave.findMany({
        where: {
            typeCode: { in: paidLeaveTypes.map((t) => t.code) },
            fromDate: { lte: end.toDate() },
            toDate: { gte: start.toDate() },
            employee: department && department !== "all" ? { department } : undefined
        },
        include: { employee: true }
    });
    const paidLeaveDaysByEmployee = new Map();
    for (const leave of paidLeaves) {
        if (!paidTypeSet.has(leave.typeCode))
            continue;
        const overlapStart = date_js_1.dayjs.max((0, date_js_1.dayjs)(leave.fromDate), start);
        const overlapEnd = date_js_1.dayjs.min((0, date_js_1.dayjs)(leave.toDate), end);
        const days = countInclusiveDays(overlapStart.toDate(), overlapEnd.toDate());
        if (days <= 0)
            continue;
        const current = paidLeaveDaysByEmployee.get(leave.employeeId) ?? 0;
        paidLeaveDaysByEmployee.set(leave.employeeId, current + days);
    }
    const summary = new Map();
    for (const row of rows) {
        const key = row.employeeId;
        const current = summary.get(key) ?? {
            code: row.employee.code,
            name: row.employee.name,
            salaryTypeName: row.employee.salaryType?.name ?? "Nuvo",
            dept: row.employee.department,
            totalDays,
            present: 0,
            absent: 0,
            late: 0,
            halfDay: 0,
            leave: 0,
            paidLeaveDays: 0,
            sundayDays: 0,
            holidayDays: 0,
            totalMinutes: 0,
            overtimeMinutesTotal: 0,
            overtimeMinutesWeekOff: 0,
            overtimeMinutesRegular: 0,
            baseMinutes: 0,
            shiftMinutes: computeShiftMinutes((0, date_js_1.dayjs)(row.date), row.employee.shift ?? null) ?? 480,
            shiftNetMinutes: computeNetShiftMinutes((0, date_js_1.dayjs)(row.date), row.employee.shift ?? null) ?? 480,
            overtimeEligible: row.employee.overtimeEligible ?? false,
            salary: row.employee.salary ?? Number(process.env.DEFAULT_GROSS_SALARY ?? 50000)
        };
        if (row.status === enums_js_1.AttendanceStatus.PRESENT || row.status === enums_js_1.AttendanceStatus.LATE || row.status === enums_js_1.AttendanceStatus.HALF_DAY) {
            current.present += 1;
        }
        if (row.status === enums_js_1.AttendanceStatus.ABSENT)
            current.absent += 1;
        if (row.status === enums_js_1.AttendanceStatus.LEAVE)
            current.leave += 1;
        if (row.status === enums_js_1.AttendanceStatus.LATE)
            current.late += 1;
        if (row.status === enums_js_1.AttendanceStatus.HALF_DAY)
            current.halfDay += 1;
        if (row.status === enums_js_1.AttendanceStatus.WEEK_OFF)
            current.sundayDays += 1;
        if (row.status === enums_js_1.AttendanceStatus.HOLIDAY)
            current.holidayDays += 1;
        if (row.workingMinutes)
            current.totalMinutes += row.workingMinutes;
        if (row.workingMinutes) {
            const shiftMinutes = computeShiftMinutes((0, date_js_1.dayjs)(row.date), row.employee.shift ?? null);
            if (row.status === enums_js_1.AttendanceStatus.WEEK_OFF || row.status === enums_js_1.AttendanceStatus.HOLIDAY) {
                current.overtimeMinutesWeekOff += computeWeekOffOtMinutes(row.workingMinutes, row.employee.shift ?? null);
            }
            else if (shiftMinutes != null && row.workingMinutes > shiftMinutes) {
                current.overtimeMinutesRegular += (row.workingMinutes - shiftMinutes);
            }
        }
        current.overtimeMinutesTotal = current.overtimeMinutesWeekOff + current.overtimeMinutesRegular;
        current.baseMinutes = Math.max(0, current.totalMinutes - current.overtimeMinutesTotal);
        summary.set(key, current);
    }
    const rawSummary = Array.from(summary.entries()).map(([employeeId, row]) => ({
        employeeId,
        ...row,
        paidLeaveDays: paidLeaveDaysByEmployee.get(employeeId) ?? 0,
        totalHrs: (0, date_js_1.formatMinutes)(row.totalMinutes),
        overtimeMinutes: row.overtimeMinutesTotal,
        overtimeMinutesWeekOff: row.overtimeMinutesWeekOff,
        overtimeMinutesRegular: row.overtimeMinutesRegular,
        overtimeHrs: (0, date_js_1.formatMinutes)(row.overtimeMinutesTotal),
        overtimeHrsWeekOff: (0, date_js_1.formatMinutes)(row.overtimeMinutesWeekOff),
        overtimeHrsRegular: (0, date_js_1.formatMinutes)(row.overtimeMinutesRegular),
        baseMinutes: row.baseMinutes,
        baseHrs: (0, date_js_1.formatMinutes)(row.baseMinutes)
    }));
    const attendanceRemarks = await prisma_js_1.prisma.attendanceSummaryRemark.findMany({
        where: {
            month,
            employeeId: {
                in: rawSummary.map((row) => row.employeeId)
            }
        }
    });
    const attendanceRemarkByEmployee = new Map(attendanceRemarks.map((remark) => [remark.employeeId, remark.remark ?? ""]));
    const sandwichMap = await getSandwichDeductions(month, department);
    return rawSummary.map((row) => {
        const sandwichInfo = sandwichMap.get(row.code) ?? { total: 0, sunday: 0, holiday: 0 };
        const sandwichDays = sandwichInfo.total;
        const sandwichSundayDays = sandwichInfo.sunday;
        const sandwichHolidayDays = sandwichInfo.holiday;
        const payableSundays = Math.max(0, row.sundayDays - sandwichSundayDays);
        const payableHolidays = Math.max(0, row.holidayDays - sandwichHolidayDays);
        const lopDays = row.absent + sandwichDays;
        const totalPaidDays = (row.present - (row.halfDay * 0.5)) +
            (row.paidLeaveDays ?? 0) +
            payableSundays +
            payableHolidays;
        return {
            ...row,
            sandwichDays,
            sandwichSundayDays,
            sandwichHolidayDays,
            payableSundays,
            payableHolidays,
            lopDays,
            totalPaidDays,
            attendanceRemark: attendanceRemarkByEmployee.get(row.employeeId) ?? ""
        };
    });
}
async function getSalarySheet(month, department) {
    const summary = await getAttendanceSummary(month, department);
    const { start, end } = (0, date_js_1.monthRange)(month);
    const monthlyDays = end.diff(start, "day") + 1;
    const ledgers = await prisma_js_1.prisma.advanceLedger.findMany({
        where: {
            month,
            employeeId: { in: summary.map((row) => row.employeeId) }
        }
    });
    const ledgerByEmployee = new Map(ledgers.map((ledger) => [ledger.employeeId, ledger]));
    const outstandingByEmployee = await getOutstandingByEmployeeIds(summary.map((row) => row.employeeId));
    return summary.map((row) => {
        const ledger = ledgerByEmployee.get(row.employeeId);
        const monthlySalary = row.salary ?? Number(process.env.DEFAULT_GROSS_SALARY ?? 50000);
        const shiftHours = (row.shiftNetMinutes ?? row.shiftMinutes ?? 480) / 60 || 8;
        const normalHourRate = monthlySalary / monthlyDays / 8;
        const shiftHourRate = monthlySalary / monthlyDays / shiftHours;
        const overtimeEligible = row.overtimeEligible ?? false;
        const normalOtSalary = overtimeEligible ? Math.round(Math.floor(row.overtimeMinutesRegular / 60) * normalHourRate * 1.5) : 0;
        const sundayHolidayOtSalary = overtimeEligible ? Math.round(Math.floor(row.overtimeMinutesWeekOff / 60) * shiftHourRate * 1.0) : 0;
        const totalOtSalary = normalOtSalary + sundayHolidayOtSalary;
        const baseSalary = Math.round((monthlySalary / monthlyDays) * (row.totalPaidDays ?? 0));
        const totalSalary = Math.round(baseSalary + totalOtSalary);
        const fine = ledger?.fine ?? 0;
        const advance = ledger?.advance ?? 0;
        const others = ledger?.others ?? 0;
        const arrear = ledger?.arrear ?? 0;
        const deductions = fine + advance + others;
        const netSalary = Math.round(totalSalary - deductions + arrear);
        return {
            ...row,
            weekOff: row.sundayDays,
            sunday: row.payableSundays,
            salary: monthlySalary,
            baseSalary,
            normalOtSalary,
            sundayHolidayOtSalary,
            totalOtSalary,
            grossSalary: totalSalary,
            totalSalary,
            fine,
            advance,
            others,
            arrear,
            salaryRemark: ledger?.salaryRemark ?? "",
            outstandingAdvance: outstandingByEmployee.get(row.employeeId) ?? 0,
            deductions,
            netSalary
        };
    });
}
async function getSandwichDeductions(month, department) {
    const { start, end } = (0, date_js_1.monthRange)(month);
    return getSandwichDeductionsForRange(start, end, department);
}
