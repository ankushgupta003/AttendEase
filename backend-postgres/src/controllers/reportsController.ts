import type { Request, Response, NextFunction } from "express";
import ExcelJS from "exceljs";
import {
  getAttendanceSummary,
  getSalarySheet,
  upsertAdvanceLedger,
  upsertAttendanceSummaryRemark
} from "../services/attendanceService.js";
import { dayjs } from "../utils/date.js";

const DEFAULT_COMPANY_NAME = "Company Name";
const DEFAULT_COMPANY_ADDRESS = "Company Address";
const DEFAULT_COMPANY_PHONE = "Phone";
const DEFAULT_COMPANY_EMAIL = "Email";

function getCompanyInfoHeader() {
  return {
    name: process.env.COMPANY_NAME ?? DEFAULT_COMPANY_NAME,
    address: process.env.COMPANY_ADDRESS ?? DEFAULT_COMPANY_ADDRESS,
    contact: process.env.COMPANY_CONTACT ?? `${DEFAULT_COMPANY_PHONE} | ${DEFAULT_COMPANY_EMAIL}`
  };
}

function formatFlooredOtHours(minutes: number | null | undefined) {
  const safeMinutes = Number(minutes ?? 0);
  if (!Number.isFinite(safeMinutes)) return "0:00";
  const hours = Math.max(0, Math.floor(safeMinutes / 60));
  return `${hours}:00`;
}

function cellTextLength(value: unknown) {
  if (value == null) return 0;
  if (typeof value === "number") return String(value).length;
  if (typeof value === "string") return value.trim().length;
  return String(value).length;
}

function applyAutoFitWidths(
  worksheet: ExcelJS.Worksheet,
  columns: Array<{ header: string }>,
  rows: unknown[][],
  options?: { min?: number; max?: number; padding?: number }
) {
  const min = options?.min ?? 8;
  const max = options?.max ?? 36;
  const padding = options?.padding ?? 2;

  for (let idx = 0; idx < columns.length; idx += 1) {
    const headerLength = cellTextLength(columns[idx]?.header);
    const maxRowLength = rows.reduce((acc, row) => {
      const valueLength = cellTextLength(row[idx]);
      return Math.max(acc, valueLength);
    }, 0);
    const width = Math.min(max, Math.max(min, Math.max(headerLength, maxRowLength) + padding));
    worksheet.getColumn(idx + 1).width = width;
  }
}

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

export async function updateSalaryAdjustmentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeId } = req.params;
    const { month, fine, advance, others, arrear, salaryRemark } = req.body as {
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

export async function updateAttendanceRemarkHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeId } = req.params;
    const { month, remark } = req.body as { month: string; remark?: string | null };
    if (!employeeId || !month) {
      return res.status(400).json({ message: "employeeId and month are required." });
    }
    const row = await upsertAttendanceSummaryRemark({ employeeId, month, remark: remark ?? null });
    return res.json(row);
  } catch (error) {
    return next(error);
  }
}

export async function exportAttendanceSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const month = String(req.query.month ?? "");
    const department = req.query.department ? String(req.query.department) : undefined;
    const rows = await getAttendanceSummary(month, department);
    const companyHeader = getCompanyInfoHeader();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance Summary");

    const columns = [
      { header: "code", key: "code", width: 12 },
      { header: "name", key: "name", width: 24 },
      { header: "salary type", key: "salaryTypeName", width: 16 },
      { header: "dept", key: "dept", width: 16 },
      { header: "total days", key: "totalDays", width: 11 },
      { header: "present", key: "present", width: 10 },
      { header: "absent", key: "absent", width: 10 },
      { header: "late", key: "late", width: 10 },
      { header: "half day", key: "halfDay", width: 11 },
      { header: "leave", key: "leave", width: 10 },
      { header: "sunday", key: "sunday", width: 10 },
      { header: "holiday", key: "holiday", width: 10 },
      { header: "paid leave", key: "paidLeaveDays", width: 11 },
      { header: "base hours", key: "baseHrs", width: 12 },
      { header: "normal ot", key: "normalOt", width: 10 },
      { header: "suday/holiday OT", key: "sundayHolidayOt", width: 18 },
      { header: "total hours", key: "totalHrs", width: 12 }
    ] as const;

    const lastCol = "Q";
    worksheet.mergeCells(`A1:${lastCol}1`);
    worksheet.mergeCells(`A2:${lastCol}2`);
    worksheet.mergeCells(`A3:${lastCol}3`);
    worksheet.mergeCells(`A5:${lastCol}5`);
    worksheet.mergeCells(`A6:${lastCol}6`);

    worksheet.getCell("A1").value = companyHeader.name;
    worksheet.getCell("A2").value = companyHeader.address;
    worksheet.getCell("A3").value = companyHeader.contact;
    worksheet.getCell("A5").value = "Attendance Summary";
    worksheet.getCell("A6").value = `Month: ${month} | Department: ${department ?? "all"} | Generated: ${dayjs().format("DD MMM YYYY HH:mm A")}`;

    worksheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D3557" } };

    worksheet.getCell("A2").font = { bold: true, size: 12, color: { argb: "FF12304A" } };
    worksheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD8E7F5" } };

    worksheet.getCell("A3").font = { bold: true, size: 11, color: { argb: "FF2C3E50" } };
    worksheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell("A3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF5FB" } };

    worksheet.getCell("A5").font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    worksheet.getCell("A5").alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell("A5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2A9D8F" } };

    worksheet.getCell("A6").font = { bold: true, size: 11, color: { argb: "FF264653" } };
    worksheet.getCell("A6").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    worksheet.getCell("A6").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE9F6F5" } };

    const tableRows = rows.map((row) => ([
      row.code,
      row.name,
      row.salaryTypeName ?? "",
      row.dept,
      Number(row.totalDays ?? 0),
      Number(row.present ?? 0),
      Number(row.absent ?? 0),
      Number(row.late ?? 0),
      Number(row.halfDay ?? 0),
      Number(row.leave ?? 0),
      Number(row.payableSundays ?? 0),
      Number(row.payableHolidays ?? 0),
      Number(row.paidLeaveDays ?? 0),
      row.baseHrs ?? "0:00",
      formatFlooredOtHours(row.overtimeMinutesRegular),
      formatFlooredOtHours(row.overtimeMinutesWeekOff),
      row.totalHrs ?? "0:00"
    ]));

    worksheet.addTable({
      name: "AttendanceSummaryTable",
      ref: "A8",
      headerRow: true,
      totalsRow: false,
      style: {
        theme: "TableStyleMedium2",
        showRowStripes: true
      },
      columns: columns.map((col) => ({ name: col.header })),
      rows: tableRows
    });

    applyAutoFitWidths(worksheet, columns as unknown as Array<{ header: string }>, tableRows, { min: 8, max: 34, padding: 2 });

    for (let c = 1; c <= columns.length; c += 1) {
      const headerCell = worksheet.getCell(8, c);
      headerCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
      headerCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }
    worksheet.getRow(8).height = 22;

    const numericCols = [5, 6, 7, 8, 9, 10, 11, 12, 13];
    const timeCols = [14, 15, 16, 17];
    const dataStart = 9;
    const dataEnd = Math.max(dataStart, dataStart + tableRows.length - 1);

    for (let r = dataStart; r <= dataEnd; r += 1) {
      for (let c = 1; c <= columns.length; c += 1) {
        const cell = worksheet.getCell(r, c);
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } }
        };
      }

      numericCols.forEach((c) => {
        worksheet.getCell(r, c).alignment = { horizontal: "center", vertical: "middle" };
      });
      timeCols.forEach((c) => {
        worksheet.getCell(r, c).alignment = { horizontal: "center", vertical: "middle" };
      });

      worksheet.getCell(r, 1).alignment = { horizontal: "left", vertical: "middle" };
      worksheet.getCell(r, 2).alignment = { horizontal: "left", vertical: "middle" };
      worksheet.getCell(r, 3).alignment = { horizontal: "left", vertical: "middle" };
      worksheet.getCell(r, 4).alignment = { horizontal: "left", vertical: "middle" };
      worksheet.getCell(r, 11).alignment = { horizontal: "center", vertical: "middle" };
      worksheet.getCell(r, 12).alignment = { horizontal: "center", vertical: "middle" };
    }

    worksheet.views = [{ state: "frozen", ySplit: 8, showGridLines: false }];
    const buffer = await workbook.xlsx.writeBuffer();

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
    const companyHeader = getCompanyInfoHeader();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Salary Sheet");

    const columns = [
      { header: "code", key: "code", width: 12 },
      { header: "name", key: "name", width: 24 },
      { header: "salary type", key: "salaryTypeName", width: 16 },
      { header: "dept", key: "dept", width: 16 },
      { header: "monthly salary", key: "salary", width: 16 },
      { header: "present", key: "present", width: 10 },
      { header: "absent", key: "absent", width: 10 },
      { header: "week off", key: "weekOff", width: 11 },
      { header: "holiday", key: "holidayDays", width: 10 },
      { header: "sunday", key: "sunday", width: 10 },
      { header: "leave", key: "leave", width: 10 },
      { header: "paid leave", key: "paidLeaveDays", width: 11 },
      { header: "total paid days", key: "totalPaidDays", width: 14 },
      { header: "OT", key: "overtimeHrsRegular", width: 10 },
      { header: "sunday/holiday OT", key: "overtimeHrsWeekOff", width: 18 },
      { header: "Salary", key: "baseSalary", width: 14 },
      { header: "OT salary", key: "normalOtSalary", width: 14 },
      { header: "Sunday/holiday OT salary", key: "sundayHolidayOtSalary", width: 22 },
      { header: "Total OT salary", key: "totalOtSalary", width: 15 },
      { header: "Arrear", key: "arrear", width: 12 },
      { header: "Total", key: "totalBeforeDeductions", width: 14 },
      { header: "Fine", key: "fine", width: 12 },
      { header: "Advance", key: "advance", width: 12 },
      { header: "Others", key: "others", width: 12 },
      { header: "Total deductions", key: "deductions", width: 16 },
      { header: "Net salary", key: "netSalary", width: 14 }
    ] as const;

    const lastCol = "Z";
    worksheet.mergeCells(`A1:${lastCol}1`);
    worksheet.mergeCells(`A2:${lastCol}2`);
    worksheet.mergeCells(`A3:${lastCol}3`);
    worksheet.mergeCells(`A5:${lastCol}5`);
    worksheet.mergeCells(`A6:${lastCol}6`);

    worksheet.getCell("A1").value = companyHeader.name;
    worksheet.getCell("A2").value = companyHeader.address;
    worksheet.getCell("A3").value = companyHeader.contact;
    worksheet.getCell("A5").value = "Salary Sheet";
    worksheet.getCell("A6").value = `Month: ${month} | Department: ${department ?? "all"} | Generated: ${dayjs().format("DD MMM YYYY HH:mm A")}`;

    worksheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D3557" } };

    worksheet.getCell("A2").font = { bold: true, size: 12, color: { argb: "FF12304A" } };
    worksheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD8E7F5" } };

    worksheet.getCell("A3").font = { bold: true, size: 11, color: { argb: "FF2C3E50" } };
    worksheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell("A3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF5FB" } };

    worksheet.getCell("A5").font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    worksheet.getCell("A5").alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell("A5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2A9D8F" } };

    worksheet.getCell("A6").font = { bold: true, size: 11, color: { argb: "FF264653" } };
    worksheet.getCell("A6").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    worksheet.getCell("A6").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE9F6F5" } };

    const tableRows = rows.map((row) => ([
      row.code,
      row.name,
      row.salaryTypeName ?? "",
      row.dept,
      Number(row.salary ?? 0),
      Number(row.present ?? 0),
      Number(row.absent ?? 0),
      Number(row.weekOff ?? row.sundayDays ?? 0),
      Number(row.holidayDays ?? 0),
      Number(row.sunday ?? row.payableSundays ?? 0),
      Number(row.leave ?? 0),
      Number(row.paidLeaveDays ?? 0),
      Number(row.totalPaidDays ?? 0),
      formatFlooredOtHours(row.overtimeMinutesRegular),
      formatFlooredOtHours(row.overtimeMinutesWeekOff),
      Number(row.baseSalary ?? 0),
      Number(row.normalOtSalary ?? 0),
      Number(row.sundayHolidayOtSalary ?? 0),
      Number(row.totalOtSalary ?? 0),
      Number(row.arrear ?? 0),
      Number((row.baseSalary ?? 0) + (row.totalOtSalary ?? 0) + (row.arrear ?? 0)),
      Number(row.fine ?? 0),
      Number(row.advance ?? 0),
      Number(row.others ?? 0),
      Number(row.deductions ?? 0),
      Number(row.netSalary ?? 0)
    ]));

    worksheet.addTable({
      name: "SalarySheetTable",
      ref: "A8",
      headerRow: true,
      totalsRow: false,
      style: {
        theme: "TableStyleMedium2",
        showRowStripes: true
      },
      columns: columns.map((col) => ({ name: col.header })),
      rows: tableRows
    });

    applyAutoFitWidths(worksheet, columns as unknown as Array<{ header: string }>, tableRows, { min: 8, max: 40, padding: 2 });

    for (let c = 1; c <= columns.length; c += 1) {
      const headerCell = worksheet.getCell(8, c);
      headerCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
      headerCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }
    worksheet.getRow(8).height = 22;

    const currencyCols = [5, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];
    const dayCols = [6, 7, 8, 9, 10, 11, 12, 13];
    const dataStart = 9;
    const dataEnd = Math.max(dataStart, dataStart + tableRows.length - 1);

    for (let r = dataStart; r <= dataEnd; r += 1) {
      for (let c = 1; c <= columns.length; c += 1) {
        const cell = worksheet.getCell(r, c);
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } }
        };
      }

      currencyCols.forEach((c) => {
        const cell = worksheet.getCell(r, c);
        cell.numFmt = "#,##0.00";
        cell.alignment = { horizontal: "right", vertical: "middle" };
      });

      dayCols.forEach((c) => {
        const cell = worksheet.getCell(r, c);
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      worksheet.getCell(r, 1).alignment = { horizontal: "left", vertical: "middle" };
      worksheet.getCell(r, 2).alignment = { horizontal: "left", vertical: "middle" };
      worksheet.getCell(r, 3).alignment = { horizontal: "left", vertical: "middle" };
      worksheet.getCell(r, 4).alignment = { horizontal: "left", vertical: "middle" };
      worksheet.getCell(r, 14).alignment = { horizontal: "center", vertical: "middle" };
      worksheet.getCell(r, 15).alignment = { horizontal: "center", vertical: "middle" };
    }

    worksheet.views = [{ state: "frozen", ySplit: 8, showGridLines: false }];
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader("Content-Disposition", `attachment; filename=salary-sheet-${month}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}
