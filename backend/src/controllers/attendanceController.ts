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
  setFinalization,
  getLockedMonths
} from "../services/attendanceService.js";
import { dayjs } from "../utils/date.js";

function collectMonths(blocks: Array<{ entries: Array<{ date: dayjs.Dayjs }>; rangeStart?: dayjs.Dayjs | null; rangeEnd?: dayjs.Dayjs | null; }>) {
  const months = new Set<string>();
  for (const block of blocks) {
    if (block.entries.length) {
      block.entries.forEach((entry) => months.add(entry.date.format("YYYY-MM")));
      continue;
    }
    if (block.rangeStart && block.rangeEnd) {
      let cursor = block.rangeStart.startOf("month");
      const last = block.rangeEnd.endOf("month");
      while (cursor.isSameOrBefore(last, "month")) {
        months.add(cursor.format("YYYY-MM"));
        cursor = cursor.add(1, "month");
      }
    }
  }
  return Array.from(months);
}

function buildLockedWarning(lockedMonths: string[]) {
  if (!lockedMonths.length) return null;
  return `Warning: month(s) ${lockedMonths.join(", ")} are locked. Upload will be blocked for these months.`;
}

function slugifyFilenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function buildAttendanceExportFilename(params: {
  month: string;
  search?: string;
  department?: string;
  status?: string;
  exceptionsOnly?: boolean;
}) {
  const parts = ["attendance", params.month];
  const search = params.search?.trim();
  const department = params.department && params.department !== "all" ? params.department : undefined;
  const status = !params.exceptionsOnly && params.status && params.status !== "all" ? params.status : undefined;

  if (status) {
    const statusSlug = slugifyFilenamePart(status);
    if (statusSlug) parts.push(`status-${statusSlug}`);
  }

  if (department) {
    const departmentSlug = slugifyFilenamePart(department);
    if (departmentSlug) parts.push(`department-${departmentSlug}`);
  }

  if (search) {
    const searchSlug = slugifyFilenamePart(search);
    if (searchSlug) parts.push(`search-${searchSlug}`);
  }

  if (params.exceptionsOnly) {
    parts.push("exceptions-only");
  }

  return `${parts.join("-")}.xlsx`;
}

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
    const { action, employeeCodes, dateFrom, dateTo, shiftName, leaveTypeCode } = req.body as {
      action: "mark-leave" | "mark-present" | "change-shift" | "fix-missing";
      employeeCodes: string[];
      dateFrom: string;
      dateTo: string;
      shiftName?: string;
      leaveTypeCode?: string;
    };
    const result = await bulkAction({ action, employeeCodes, dateFrom, dateTo, shiftName, leaveTypeCode });
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
    const months = collectMonths(blocks);
    const lockedMonths = await getLockedMonths(months);
    const warning = buildLockedWarning(lockedMonths);
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
      missingPunch: flattened.filter((row) => !row.inTime || !row.outTime).length,
      warning,
      lockedMonths
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

    const months = collectMonths(blocks);
    const lockedMonths = await getLockedMonths(months);
    if (lockedMonths.length) {
      return res.status(423).send(`Upload blocked: month(s) ${lockedMonths.join(", ")} are locked.`);
    }
    const summary = await processScheduleBlocks(blocks);
    return res.json({ message: "Attendance processed successfully.", summary, lockedMonths });
  } catch (error) {
    return next(error);
  }
}

export async function downloadAttendanceTemplate(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = [
      ["employeeId", "name", "department", "date", "punchIn", "punchOut"],
      ["EMP001", "Arjun Sharma", "Engineering", "2026-02-02", "09:05", "18:10"],
      ["EMP002", "Neha Iyer", "Sales", "2026-02-02", "", ""]
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
    const search = req.query.search ? String(req.query.search) : undefined;
    const department = req.query.department ? String(req.query.department) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const exceptionsOnly = req.query.exceptionsOnly === "true";
    const sortKey = req.query.sortKey ? (String(req.query.sortKey) as any) : undefined;
    const sortDir = req.query.sortDir ? (String(req.query.sortDir) as any) : undefined;
    const rows = await listAttendance({
      month,
      search,
      department,
      status: status as any,
      exceptionsOnly,
      sortKey,
      sortDir,
      includeNonWorking: true
    });

    const exportRows = rows.map((row: any) => ({
      employeeId: row.employeeCode,
      name: row.employeeName,
      department: row.department,
      date: row.date,
      punchIn: row.inTime || "",
      punchOut: row.outTime || ""
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Attendance");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    const filename = buildAttendanceExportFilename({ month, search, department, status, exceptionsOnly });

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}
