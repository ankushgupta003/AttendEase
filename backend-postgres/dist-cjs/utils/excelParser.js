"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseScheduleWorkbook = parseScheduleWorkbook;
const xlsx_1 = __importDefault(require("xlsx"));
const date_js_1 = require("./date.js");
const idRegex = /ID:\s*([^\s]+)/i;
const nameRegex = /Name:\s*([^\n]+?)(?=\s+Dept\.?:|\s+Shift:|\s+Date:|$)/i;
const deptRegex = /Dept\.?\s*:\s*([^\n]+?)(?=\s+Shift:|\s+Date:|$)/i;
const shiftRegex = /Shift:\s*([^\n]+?)(?=\s+Date:|$)/i;
const dateRangeRegex = /Date:\s*([^\n]+?)\s*(?:to|~|-)\s*([^\n]+)/i;
function rowToText(row) {
    return row.map((cell) => String(cell ?? "").trim()).join(" ").trim();
}
function isEmptyRow(row) {
    return row.every((cell) => String(cell ?? "").trim() === "");
}
function parseScheduleWorkbook(buffer) {
    const workbook = xlsx_1.default.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error("No worksheet found in uploaded file.");
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx_1.default.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
    const blocks = [];
    let current = null;
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
            const rangeStart = rangeMatch ? (0, date_js_1.parseFlexibleDate)(rangeMatch[1]) : null;
            const rangeEnd = rangeMatch ? (0, date_js_1.parseFlexibleDate)(rangeMatch[2]) : null;
            current = {
                empCode,
                name,
                department,
                shiftName,
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
        const date = (0, date_js_1.parseFlexibleDate)(dateCell, baseYear);
        if (!date || !date.isValid()) {
            continue;
        }
        const weekDay = String(row[1] ?? "").trim();
        const timeCells = row.slice(timeStartIndex);
        const times = [];
        timeCells.forEach((cell) => {
            const parsed = (0, date_js_1.parseTime)(cell);
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
