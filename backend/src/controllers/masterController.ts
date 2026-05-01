import type { Request, Response, NextFunction } from "express";
import xlsx from "xlsx";
import { dayjs, parseFlexibleDate } from "../utils/date.js";
import {
  listShifts,
  createShift,
  updateShift,
  listHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  reprocessAttendanceForHolidays,
  listLeaveTypes,
  upsertLeaveType,
  deleteLeaveType,
  getLeavePolicy,
  updateLeavePolicy,
  listSalaryTypes,
  createSalaryType,
  updateSalaryType,
  listAdvanceLedger,
  upsertAdvanceLedger,
  addAdvanceIssue,
  listAdvanceHistory
} from "../services/attendanceService.js";

function toHolidayDto(holiday: any) {
  const type = String(holiday.type ?? "NATIONAL").toLowerCase();
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return {
    id: holiday.id,
    name: holiday.name,
    date: holiday.date.toISOString().slice(0, 10),
    type: label
  };
}

export async function listShiftsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const shifts = await listShifts();
    return res.json(shifts);
  } catch (error) {
    return next(error);
  }
}

export async function createShiftHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, startTime, endTime, graceMinutes, lunchBreakMinutes } = req.body as {
      name: string;
      startTime: string;
      endTime: string;
      graceMinutes: number;
      lunchBreakMinutes?: number;
    };
    const created = await createShift({
      name,
      startTime,
      endTime,
      graceMinutes,
      lunchBreakMinutes
    });
    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
}

export async function updateShiftHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { shiftId } = req.params;
    const updated = await updateShift(shiftId, req.body);
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

export async function listHolidaysHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const holidays = await listHolidays();
    return res.json(holidays.map(toHolidayDto));
  } catch (error) {
    return next(error);
  }
}

export async function createHolidayHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, date, type } = req.body as { name: string; date: string; type?: string };
    const parsed = dayjs(date, "YYYY-MM-DD", true);
    if (!parsed.isValid()) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }
    const safeDate = new Date(Date.UTC(parsed.year(), parsed.month(), parsed.date(), 12, 0, 0));
    const created = await createHoliday({
      name,
      date: safeDate,
      type: (type?.toUpperCase() as any) ?? "NATIONAL"
    });
    return res.status(201).json(toHolidayDto(created));
  } catch (error) {
    return next(error);
  }
}

export async function updateHolidayHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { holidayId } = req.params;
    const { name, date, type } = req.body as { name?: string; date?: string; type?: string };
    const parsed = date ? dayjs(date, "YYYY-MM-DD", true) : null;
    if (date && (!parsed || !parsed.isValid())) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }
    const safeDate = parsed
      ? new Date(Date.UTC(parsed.year(), parsed.month(), parsed.date(), 12, 0, 0))
      : undefined;
    const updated = await updateHoliday(holidayId, {
      name,
      date: safeDate,
      type: type ? (type.toUpperCase() as any) : undefined
    });
    return res.json(toHolidayDto(updated));
  } catch (error) {
    return next(error);
  }
}

export async function deleteHolidayHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { holidayId } = req.params;
    const deleted = await deleteHoliday(holidayId);
    return res.json(deleted);
  } catch (error) {
    return next(error);
  }
}

export async function uploadHolidayHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ message: "No worksheet found." });
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }) as unknown[][];

    let created = 0;
    for (const row of rows) {
      if (!row || row.length < 2) continue;
      const date = parseFlexibleDate(row[0]);
      const name = String(row[1] ?? "").trim();
      const type = String(row[2] ?? "").trim();
      if (!date || !date.isValid() || !name) continue;
      const safeDate = new Date(Date.UTC(date.year(), date.month(), date.date(), 12, 0, 0));
      await createHoliday({ name, date: safeDate, type: (type.toUpperCase() as any) || "NATIONAL" });
      created += 1;
    }

    return res.json({ message: "Holiday upload completed.", created });
  } catch (error) {
    return next(error);
  }
}

export async function downloadHolidayTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = [
      { Date: "2026-01-26", Name: "Republic Day", Type: "National" },
      { Date: "2026-03-08", Name: "Holi", Type: "National" }
    ];
    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Holidays");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=holiday_template.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}

export async function reprocessAttendanceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { month } = req.body as { month: string };
    if (!month) {
      return res.status(400).json({ message: "Month is required (format: YYYY-MM)." });
    }
    const result = await reprocessAttendanceForHolidays(month);
    return res.json({ message: "Attendance records reprocessed based on updated holidays.", ...result });
  } catch (error) {
    return next(error);
  }
}

export async function listLeaveTypesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const leaveTypes = await listLeaveTypes();
    return res.json(leaveTypes);
  } catch (error) {
    return next(error);
  }
}

export async function upsertLeaveTypeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, name, paidLeave, carryForward, paymentOnLapse, maxDays } = req.body as {
      code: string;
      name: string;
      paidLeave: boolean;
      carryForward: boolean;
      paymentOnLapse: boolean;
      maxDays: number;
    };
    const saved = await upsertLeaveType({
      code,
      name,
      paidLeave: paidLeave ?? true,
      carryForward: carryForward ?? false,
      paymentOnLapse: paymentOnLapse ?? false,
      maxDays: Number.isFinite(maxDays) ? maxDays : 0
    });
    return res.json(saved);
  } catch (error) {
    return next(error);
  }
}

export async function deleteLeaveTypeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ message: 'Leave type code is required.' });
    }
    await deleteLeaveType(code);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function getLeavePolicyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const policy = await getLeavePolicy();
    return res.json(policy);
  } catch (error) {
    return next(error);
  }
}

export async function updateLeavePolicyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { yearType } = req.body as { yearType: "CALENDAR" | "FINANCIAL" };
    if (yearType !== "CALENDAR" && yearType !== "FINANCIAL") {
      return res.status(400).json({ message: "Invalid yearType. Use CALENDAR or FINANCIAL." });
    }
    const policy = await updateLeavePolicy({ yearType });
    return res.json(policy);
  } catch (error) {
    return next(error);
  }
}

export async function listSalaryTypesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const rows = await listSalaryTypes(includeInactive);
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

export async function createSalaryTypeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, isActive } = req.body as { name: string; isActive?: boolean };
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "name is required." });
    }
    const row = await createSalaryType({ name: name.trim(), isActive });
    return res.status(201).json(row);
  } catch (error) {
    return next(error);
  }
}

export async function updateSalaryTypeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { salaryTypeId } = req.params;
    const { name, isActive } = req.body as { name?: string; isActive?: boolean };
    const row = await updateSalaryType(salaryTypeId, {
      name: name?.trim(),
      isActive
    });
    return res.json(row);
  } catch (error) {
    return next(error);
  }
}

export async function listAdvanceLedgerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const month = String(req.query.month ?? "");
    if (!month) {
      return res.status(400).json({ message: "month is required (YYYY-MM)." });
    }
    const department = req.query.department ? String(req.query.department) : undefined;
    const rows = await listAdvanceLedger(month, department);
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

export async function upsertAdvanceLedgerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      employeeId,
      month,
      fine,
      advance,
      others,
      arrear,
      salaryRemark
    } = req.body as {
      employeeId: string;
      month: string;
      fine?: number;
      advance?: number;
      others?: number;
      arrear?: number;
      salaryRemark?: string | null;
    };

    if (!employeeId || !month) {
      return res.status(400).json({ message: "employeeId and month are required." });
    }

    const row = await upsertAdvanceLedger({
      employeeId,
      month,
      fine: Number(fine ?? 0),
      advance: Number(advance ?? 0),
      others: Number(others ?? 0),
      arrear: Number(arrear ?? 0),
      salaryRemark: salaryRemark ?? null
    });
    return res.json(row);
  } catch (error) {
    return next(error);
  }
}

export async function addAdvanceIssueHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeId } = req.params;
    const { amount, entryDate, remark } = req.body as {
      amount: number;
      entryDate: string;
      remark?: string | null;
    };

    if (!employeeId) {
      return res.status(400).json({ message: "employeeId is required." });
    }

    const parsed = dayjs(entryDate, "YYYY-MM-DD", true);
    if (!parsed.isValid()) {
      return res.status(400).json({ message: "entryDate is required (YYYY-MM-DD)." });
    }

    const row = await addAdvanceIssue({
      employeeId,
      amount: Number(amount ?? 0),
      entryDate: new Date(Date.UTC(parsed.year(), parsed.month(), parsed.date(), 12, 0, 0)),
      remark: remark ?? null
    });
    return res.status(201).json(row);
  } catch (error) {
    return next(error);
  }
}

export async function listAdvanceHistoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeId } = req.params;
    if (!employeeId) {
      return res.status(400).json({ message: "employeeId is required." });
    }
    const rows = await listAdvanceHistory(employeeId);
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}
