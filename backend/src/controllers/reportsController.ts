import type { Request, Response, NextFunction } from "express";
import xlsx from "xlsx";
import { getAttendanceSummary, getSalarySheet } from "../services/attendanceService.js";

export async function attendanceSummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const month = String(req.query.month ?? "");
    const department = req.query.department ? String(req.query.department) : undefined;
    const summary = await getAttendanceSummary(month, department);
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
}

export async function salarySheetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const month = String(req.query.month ?? "");
    const department = req.query.department ? String(req.query.department) : undefined;
    const sheet = await getSalarySheet(month, department);
    return res.json(sheet);
  } catch (error) {
    return next(error);
  }
}

export async function exportAttendanceSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const month = String(req.query.month ?? "");
    const department = req.query.department ? String(req.query.department) : undefined;
    const rows = await getAttendanceSummary(month, department);
    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Attendance Summary");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=attendance-summary-${month}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}

export async function exportSalarySheet(req: Request, res: Response, next: NextFunction) {
  try {
    const month = String(req.query.month ?? "");
    const department = req.query.department ? String(req.query.department) : undefined;
    const rows = await getSalarySheet(month, department);
    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Salary Sheet");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=salary-sheet-${month}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}
