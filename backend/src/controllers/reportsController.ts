import type { Request, Response, NextFunction } from "express";
import xlsx from "xlsx";
import { getAttendanceSummary, getSalarySheet } from "../services/attendanceService.js";
import { prisma } from "../lib/prisma.js";
import { dayjs } from "../utils/date.js";

const DEFAULT_COMPANY_NAME = "Company Name";
const DEFAULT_COMPANY_ADDRESS = "Company Address";
const DEFAULT_COMPANY_PHONE = "Phone";
const DEFAULT_COMPANY_EMAIL = "Email";

async function getCompanyInfoHeader() {
  const companyInfo = await prisma.companyInfo.findFirst();
  return {
    name: companyInfo?.name ?? DEFAULT_COMPANY_NAME,
    address: companyInfo?.address ?? DEFAULT_COMPANY_ADDRESS,
    contact: [companyInfo?.phone, companyInfo?.email].filter(Boolean).join(" | ") || `${DEFAULT_COMPANY_PHONE} | ${DEFAULT_COMPANY_EMAIL}`,
  };
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

export async function exportAttendanceSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const month = String(req.query.month ?? "");
    const department = req.query.department ? String(req.query.department) : undefined;
    const rows = await getAttendanceSummary(month, department);
    
    const workbook = xlsx.utils.book_new();
    const companyHeader = await getCompanyInfoHeader();

    // Build header data
    const headerData: (string | number)[][] = [
      [companyHeader.name],
      [companyHeader.address],
      [companyHeader.contact],
      [],
      [`Attendance Summary Report - ${month}`, `Generated: ${dayjs().format("DD MMM YYYY HH:mm A")}`],
      []
    ];
    
    // Add column headers
    const columnHeaders = ["code", "name", "dept", "totalDays", "present", "absent", "late", "halfDay", "leave", "totalHrs", "baseHrs", "overtimeHrs"];
    headerData.push(columnHeaders);
    
    // Add data rows
    for (const row of rows) {
      headerData.push(columnHeaders.map((col) => {
        const value = row[col as keyof typeof row];
        return value === undefined || value === null ? "" : String(value);
      }));
    }
    
    const ws = xlsx.utils.aoa_to_sheet(headerData);
    
    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }
    ];
    
    // Style company name (row 0, col 0)
    ws["A1"].font = { bold: true, size: 14, color: { rgb: "FF1F4E78" } };
    
    // Style header row (row 6)
    const headerRowIndex = 6;
    for (let i = 0; i < columnHeaders.length; i++) {
      const cellRef = xlsx.utils.encode_cell({ r: headerRowIndex, c: i });
      ws[cellRef] = {
        v: columnHeaders[i],
        t: "s",
        font: { bold: true, color: { rgb: "FFFFFFFF" } },
        fill: { type: "solid", fgColor: { rgb: "FF1F4E78" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }
    
    // Alternate row colors for data
    for (let rowNum = 7; rowNum < headerData.length; rowNum++) {
      for (let col = 0; col < columnHeaders.length; col++) {
        const cellRef = xlsx.utils.encode_cell({ r: rowNum, c: col });
        if (ws[cellRef]) {
          if ((rowNum - 7) % 2 === 0) {
            ws[cellRef].fill = { type: "solid", fgColor: { rgb: "FFF9F9F9" } };
          }
          ws[cellRef].alignment = { horizontal: col <= 1 ? "left" : "center", vertical: "center" };
        }
      }
    }
    
    // Freeze header rows
    ws["!freeze"] = { xSplit: 0, ySplit: 7 };
    
    xlsx.utils.book_append_sheet(workbook, ws, "Attendance Summary");
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
    
    const workbook = xlsx.utils.book_new();
    const companyHeader = await getCompanyInfoHeader();

    // Build header data
    const headerData: (string | number)[][] = [
      [companyHeader.name],
      [companyHeader.address],
      [companyHeader.contact],
      [],
      [`Salary Sheet - ${month}`, `Generated: ${dayjs().format("DD MMM YYYY HH:mm A")}`],
      []
    ];
    
    // Add column headers and keys
    const columnKeys = [
      "code",
      "name",
      "dept",
      "salary",
      "normalOtSalary",
      "sundayHolidayOtSalary",
      "totalOtSalary",
      "grossSalary",
      "deductions",
      "netSalary"
    ] as const;
    const columnHeaders = [
      "Code",
      "Name",
      "Department",
      "Monthly Salary",
      "Normal OT Salary",
      "Sunday/Holiday OT Salary",
      "Total OT Salary",
      "Gross Salary",
      "Deductions",
      "Net Salary"
    ];
    headerData.push(columnHeaders);
    
    // Add data rows
    for (const row of rows) {
      headerData.push(columnKeys.map((col) => {
        const value = row[col as keyof typeof row];
        return value === undefined || value === null ? "" : String(value);
      }));
    }
    
    const ws = xlsx.utils.aoa_to_sheet(headerData);
    
    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 14 }, { wch: 14 },
      { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
    ];
    
    // Style company name (row 0, col 0)
    ws["A1"].font = { bold: true, size: 14, color: { rgb: "FF1F4E78" } };
    
    // Style header row (row 6)
    const headerRowIndex = 6;
    for (let i = 0; i < columnHeaders.length; i++) {
      const cellRef = xlsx.utils.encode_cell({ r: headerRowIndex, c: i });
      ws[cellRef] = {
        v: columnHeaders[i],
        t: "s",
        font: { bold: true, color: { rgb: "FFFFFFFF" } },
        fill: { type: "solid", fgColor: { rgb: "FF1F4E78" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }
    
    // Alternate row colors for data and format currency
    for (let rowNum = 7; rowNum < headerData.length; rowNum++) {
      for (let col = 0; col < columnHeaders.length; col++) {
        const cellRef = xlsx.utils.encode_cell({ r: rowNum, c: col });
        if (ws[cellRef]) {
          if ((rowNum - 7) % 2 === 0) {
            ws[cellRef].fill = { type: "solid", fgColor: { rgb: "FFF9F9F9" } };
          }
          
          // Format currency columns
          if (col >= 3 && typeof ws[cellRef].v === "number") {
            ws[cellRef].numFmt = "#,##0.00";
          }
          
          ws[cellRef].alignment = { horizontal: col <= 2 ? "left" : "right", vertical: "center" };
        }
      }
    }
    
    // Freeze header rows
    ws["!freeze"] = { xSplit: 0, ySplit: 7 };
    
    xlsx.utils.book_append_sheet(workbook, ws, "Salary Sheet");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=salary-sheet-${month}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}
