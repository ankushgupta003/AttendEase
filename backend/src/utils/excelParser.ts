import xlsx from "xlsx";
import { dayjs, parseFlexibleDate, parseTime } from "./date.js";

export type ParsedScheduleEntry = {
  date: dayjs.Dayjs;
  weekDay?: string;
  times: string[];
  inTime: string | null;
  outTime: string | null;
};

export type ParsedScheduleImportMode = "simple-template" | "schedule-block";

export type ParsedScheduleBlock = {
  empCode: string;
  name: string;
  department: string;
  shiftName: string;
  importMode: ParsedScheduleImportMode;
  rangeStart?: dayjs.Dayjs | null;
  rangeEnd?: dayjs.Dayjs | null;
  entries: ParsedScheduleEntry[];
};

const idRegex = /ID:\s*([^\s]+)/i;
const nameRegex = /Name:\s*([^\n]+?)(?=\s+Dept\.?:|\s+Shift:|\s+Date:|$)/i;
const deptRegex = /Dept\.?\s*:\s*([^\n]+?)(?=\s+Shift:|\s+Date:|$)/i;
const shiftRegex = /Shift:\s*([^\n]+?)(?=\s+Date:|$)/i;
const dateRangeRegex = /Date:\s*([^\n]+?)\s*(?:to|~|-)\s*([^\n]+)/i;

const SIMPLE_HEADER_ALIASES = {
  employeeId: ["employeeid", "empid", "empcode", "employeecode", "code", "employee code", "employee id"],
  name: ["name", "employeename", "employee name", "employee"],
  department: ["department", "dept"],
  date: ["date", "attendancedate", "attendance date"],
  punchIn: ["punchin", "in", "intime", "in time", "timein", "punch in"],
  punchOut: ["punchout", "out", "outtime", "out time", "timeout", "punch out"]
} as const;

function rowToText(row: unknown[]) {
  return row.map((cell) => String(cell ?? "").trim()).join(" ").trim();
}

function isEmptyRow(row: unknown[]) {
  return row.every((cell) => String(cell ?? "").trim() === "");
}

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./]+/g, "");
}

function findHeaderIndex(headers: string[], aliases: readonly string[]) {
  const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));
  return headers.findIndex((header) => normalizedAliases.includes(header));
}

function detectSimpleTemplate(rows: unknown[][]) {
  const maxScan = Math.min(rows.length, 20);
  for (let i = 0; i < maxScan; i += 1) {
    const row = rows[i] ?? [];
    const headers = row.map((cell) => normalizeHeader(cell));
    if (!headers.some((h) => h)) continue;

    const employeeIdIndex = findHeaderIndex(headers, SIMPLE_HEADER_ALIASES.employeeId);
    const nameIndex = findHeaderIndex(headers, SIMPLE_HEADER_ALIASES.name);
    const departmentIndex = findHeaderIndex(headers, SIMPLE_HEADER_ALIASES.department);
    const dateIndex = findHeaderIndex(headers, SIMPLE_HEADER_ALIASES.date);
    const punchInIndex = findHeaderIndex(headers, SIMPLE_HEADER_ALIASES.punchIn);
    const punchOutIndex = findHeaderIndex(headers, SIMPLE_HEADER_ALIASES.punchOut);

    if ([employeeIdIndex, nameIndex, departmentIndex, dateIndex, punchInIndex, punchOutIndex].every((idx) => idx >= 0)) {
      return {
        rowIndex: i,
        indices: { employeeIdIndex, nameIndex, departmentIndex, dateIndex, punchInIndex, punchOutIndex }
      };
    }
  }
  return null;
}

function parseSimpleTemplate(rows: unknown[][], header: {
  rowIndex: number;
  indices: {
    employeeIdIndex: number;
    nameIndex: number;
    departmentIndex: number;
    dateIndex: number;
    punchInIndex: number;
    punchOutIndex: number;
  };
}) {
  const byEmployee = new Map<string, ParsedScheduleBlock>();
  for (let i = header.rowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || isEmptyRow(row)) continue;

    const rawCode = String(row[header.indices.employeeIdIndex] ?? "").trim();
    if (!rawCode) continue;

    const name = String(row[header.indices.nameIndex] ?? "").trim() || "Unknown";
    const department = String(row[header.indices.departmentIndex] ?? "").trim() || "Unknown";
    const dateCell = row[header.indices.dateIndex];
    const date = parseFlexibleDate(dateCell);
    if (!date || !date.isValid()) continue;

    const inTime = parseTime(row[header.indices.punchInIndex]);
    const outTime = parseTime(row[header.indices.punchOutIndex]);

    let block = byEmployee.get(rawCode);
    if (!block) {
      block = {
        empCode: rawCode,
        name,
        department,
        shiftName: "General",
        importMode: "simple-template",
        rangeStart: null,
        rangeEnd: null,
        entries: []
      };
      byEmployee.set(rawCode, block);
    } else {
      if (block.name === "Unknown" && name !== "Unknown") block.name = name;
      if (block.department === "Unknown" && department !== "Unknown") block.department = department;
    }

    block.entries.push({
      date,
      times: [inTime, outTime].filter((t): t is string => Boolean(t)),
      inTime: inTime ?? null,
      outTime: outTime ?? null
    });
  }

  return Array.from(byEmployee.values());
}

export function parseScheduleWorkbook(buffer: Buffer) {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("No worksheet found in uploaded file.");
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }) as unknown[][];

  const simpleHeader = detectSimpleTemplate(rows);
  if (simpleHeader) {
    return parseSimpleTemplate(rows, simpleHeader);
  }

  const blocks: ParsedScheduleBlock[] = [];
  let current: ParsedScheduleBlock | null = null;
  let inTable = false;
  let timeStartIndex = 2;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowText = rowToText(row);

    if (idRegex.test(rowText)) {
      if (current) {
        blocks.push(current);
      }

      const idMatch = rowText.match(idRegex);
      const nameMatch = rowText.match(nameRegex);
      const empCode = idMatch ? idMatch[1] : "";
      const name = nameMatch ? nameMatch[1].trim() : "Unknown";

      const candidateRows = [
        rowText,
        rowToText(rows[i + 1] ?? []),
        rowToText(rows[i + 2] ?? [])
      ];

      const deptMatch = candidateRows.map((t) => t.match(deptRegex)).find(Boolean);
      const shiftMatch = candidateRows.map((t) => t.match(shiftRegex)).find(Boolean);
      const rangeMatch = candidateRows.map((t) => t.match(dateRangeRegex)).find(Boolean);

      const department = deptMatch ? deptMatch[1].trim() : "Unknown";
      const shiftName = shiftMatch ? shiftMatch[1].trim() : "General";
      const rangeStart = rangeMatch ? parseFlexibleDate(rangeMatch[1]) : null;
      const rangeEnd = rangeMatch ? parseFlexibleDate(rangeMatch[2]) : null;

      current = {
        empCode,
        name,
        department,
        shiftName,
        importMode: "schedule-block",
        rangeStart,
        rangeEnd,
        entries: []
      };

      inTable = false;
      continue;
    }

    if (!current) {
      continue;
    }

    if (/^Date\b/i.test(String(row[0] ?? "")) && /Week/i.test(rowText)) {
      inTable = true;
      const weekIndex = row.findIndex((cell) => String(cell ?? "").toLowerCase().includes("week"));
      timeStartIndex = weekIndex >= 0 ? weekIndex + 1 : 2;
      continue;
    }

    if (!inTable) {
      continue;
    }

    if (isEmptyRow(row) || /ID:\s*/i.test(rowText) || /Schedule/i.test(rowText)) {
      inTable = false;
      continue;
    }

    const dateCell = row[0];
    const baseYear = current.rangeStart?.year();
    const date = parseFlexibleDate(dateCell, baseYear);
    if (!date || !date.isValid()) {
      continue;
    }

    const weekDay = String(row[1] ?? "").trim();
    const timeCells = row.slice(timeStartIndex);
    const times: string[] = [];
    timeCells.forEach((cell) => {
      const parsed = parseTime(cell);
      if (parsed) {
        times.push(parsed);
      }
    });

    const inTime = times.length ? times[0] : null;
    const outTime = times.length ? times[times.length - 1] : null;

    current.entries.push({
      date,
      weekDay,
      times,
      inTime,
      outTime
    });
  }

  if (current) {
    blocks.push(current);
  }

  return blocks.filter((block) => block.empCode);
}
