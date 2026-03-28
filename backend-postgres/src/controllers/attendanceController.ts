import type { Request, Response, NextFunction } from "express";
import xlsx from "xlsx";
import { parseScheduleWorkbook } from "../utils/excelParser.js";
import { listHolidays } from "../services/attendanceService.js";
import {
  listAttendance,
  updateAttendanceRecord,
  bulkAction,
  processScheduleBlocks,
  getFinalization,
  setFinalization
} from "../services/attendanceService.js";
import { dayjs } from "../utils/date.js";

export async function listAttendanceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const month = String(req.query.month ?? "");
    const data = await listAttendance({
      month,
      search: req.query.search ? String(req.query.search) : undefined,
      department: req.query.department ? String(req.query.department) : undefined,
      status: req.query.status ? (String(req.query.status) as any) : undefined,
      exceptionsOnly: req.query.exceptionsOnly === "true",
      sortKey: req.query.sortKey ? (String(req.query.sortKey) as any) : undefined,
      sortDir: req.query.sortDir ? (String(req.query.sortDir) as any) : undefined,
      includeNonWorking: req.query.includeNonWorking === "true"
    });
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

export async function updateAttendanceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { attendanceId } = req.params;
    const { inTime, outTime, status, isLate, leaveTypeCode } = req.body as {
      inTime?: string | null;
      outTime?: string | null;
      status?: string;
      isLate?: boolean;
      leaveTypeCode?: string | null;
    };
    const updated = await updateAttendanceRecord(attendanceId, {
      inTime,
      outTime,
      status: status as any,
      isLate,
      leaveTypeCode: leaveTypeCode ?? null
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

export async function bulkActionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { action, employeeCodes, dateFrom, dateTo, shiftName } = req.body as {
      action: "mark-leave" | "mark-present" | "change-shift" | "fix-missing";
      employeeCodes: string[];
      dateFrom: string;
      dateTo: string;
      shiftName?: string;
    };
    const result = await bulkAction({ action, employeeCodes, dateFrom, dateTo, shiftName });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function uploadPreview(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    const blocks = parseScheduleWorkbook(req.file.buffer);
    const holidays = await listHolidays();
    const holidaySet = new Set(holidays.map((h) => dayjs(h.date).format("YYYY-MM-DD")));

    const flattened = blocks.flatMap((block) =>
      block.entries.map((entry) => {
        const dateStr = entry.date.format("YYYY-MM-DD");
        let status = "OK";
        if (entry.date.day() === 0) status = "Week Off";
        else if (holidaySet.has(dateStr)) status = "Holiday";
        else if (!entry.inTime || !entry.outTime || entry.inTime === entry.outTime) status = "Missing Punch";
        return {
          code: block.empCode,
          date: dateStr,
          inTime: entry.inTime ?? "",
          outTime: entry.outTime ?? "",
          status
        };
      })
    );

    const preview = flattened.slice(0, 50);

    return res.json({
      preview,
      totalRows: flattened.length,
      missingPunch: flattened.filter((row) => !row.inTime || !row.outTime).length
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    const blocks = parseScheduleWorkbook(req.file.buffer);
    if (!blocks.length) {
      return res.status(400).json({ message: "No employee blocks found in file." });
    }

    const summary = await processScheduleBlocks(blocks);
    return res.json({ message: "Attendance processed successfully.", summary });
  } catch (error) {
    return next(error);
  }
}

export async function downloadAttendanceTemplate(_req: Request, res: Response, next: NextFunction) {
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
    const worksheet = xlsx.utils.aoa_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Attendance");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=attendance_template.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}

export async function getFinalizationStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const month = String(req.query.month ?? "");
    const finalization = await getFinalization(month);
    return res.json(finalization);
  } catch (error) {
    return next(error);
  }
}

export async function finalizeMonth(req: Request, res: Response, next: NextFunction) {
  try {
    const month = String(req.query.month ?? "");
    const finalization = await setFinalization(month, "FINALIZED");
    return res.json(finalization);
  } catch (error) {
    return next(error);
  }
}

export async function lockMonth(req: Request, res: Response, next: NextFunction) {
  try {
    const month = String(req.query.month ?? "");
    const finalization = await setFinalization(month, "LOCKED");
    return res.json(finalization);
  } catch (error) {
    return next(error);
  }
}

export async function unlockMonth(req: Request, res: Response, next: NextFunction) {
  try {
    const month = String(req.query.month ?? "");
    const finalization = await setFinalization(month, "DRAFT");
    return res.json(finalization);
  } catch (error) {
    return next(error);
  }
}


export async function exportAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const month = String(req.query.month ?? "");
    const rows = await listAttendance({ month, includeNonWorking: true });
    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Attendance");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=attendance-${month}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}
