import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
import minMax from "dayjs/plugin/minMax.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(minMax);
dayjs.extend(isSameOrBefore);

export { dayjs };

export const DATE_FORMAT = "YYYY-MM-DD";

export function parseFlexibleDate(value: unknown, fallbackYear?: number) {
  if (value instanceof Date) {
    return dayjs(value);
  }

  if (typeof value === "number") {
    const excelEpoch = dayjs("1899-12-30");
    return excelEpoch.add(value, "day");
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const normalized = raw.replace(/\./g, "-").replace(/\//g, "-");
  const formats = [
    "YYYY-M-D",
    "YYYY-MM-DD",
    "MM-DD-YYYY",
    "M-D-YYYY",
    "DD-MM-YYYY",
    "D-M-YYYY",
    "DD MMM YYYY",
    "DD MMM YY",
    "MM-DD",
    "M-D",
    "DD-MM",
    "D-M"
  ];

  for (const fmt of formats) {
    const parsed = dayjs(normalized, fmt, true);
    if (parsed.isValid()) {
      if ((fmt === "MM-DD" || fmt === "M-D" || fmt === "DD-MM" || fmt === "D-M") && fallbackYear) {
        return parsed.year(fallbackYear);
      }
      return parsed;
    }
  }

  return null;
}

export function parseTime(value: unknown) {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  const match = str.match(/\b(\d{1,2}:\d{2})\b/);
  return match ? match[1] : null;
}

export function computeWorkingMinutes(date: dayjs.Dayjs, inTime?: string | null, outTime?: string | null) {
  if (!inTime || !outTime) return null;
  const start = dayjs(`${date.format(DATE_FORMAT)} ${inTime}`, "YYYY-MM-DD HH:mm", true);
  const end = dayjs(`${date.format(DATE_FORMAT)} ${outTime}`, "YYYY-MM-DD HH:mm", true);
  if (!start.isValid() || !end.isValid()) return null;
  const diff = end.diff(start, "minute");
  if (diff <= 0) return null;
  return diff;
}

export function formatMinutes(minutes?: number | null) {
  if (minutes == null || Number.isNaN(minutes)) return "0:00";
  const hrs = Math.floor(minutes / 60);
  const mins = Math.abs(minutes % 60);
  return `${hrs}:${String(mins).padStart(2, "0")}`;
}

export function isSunday(date: dayjs.Dayjs) {
  return date.day() === 0;
}

export function toDateStart(date: dayjs.Dayjs) {
  return date.startOf("day").toDate();
}

export function monthRange(month: string) {
  const start = dayjs(`${month}-01`, "YYYY-MM-DD", true).startOf("month");
  if (!start.isValid()) {
    throw new Error("Invalid month format. Use YYYY-MM.");
  }
  return { start, end: start.endOf("month") };
}
