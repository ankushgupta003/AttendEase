export const AttendanceStatus = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  LATE: "LATE",
  HALF_DAY: "HALF_DAY",
  MISSING_PUNCH: "MISSING_PUNCH",
  WEEK_OFF: "WEEK_OFF",
  HOLIDAY: "HOLIDAY",
  LEAVE: "LEAVE"
} as const;

export type AttendanceStatus = typeof AttendanceStatus[keyof typeof AttendanceStatus];

export const FinalizationStatus = {
  DRAFT: "DRAFT",
  FINALIZED: "FINALIZED",
  LOCKED: "LOCKED"
} as const;

export type FinalizationStatus = typeof FinalizationStatus[keyof typeof FinalizationStatus];

export const HolidayType = {
  NATIONAL: "NATIONAL",
  REGIONAL: "REGIONAL",
  OPTIONAL: "OPTIONAL"
} as const;

export type HolidayType = typeof HolidayType[keyof typeof HolidayType];

export const UserRole = {
  ADMIN: "ADMIN",
  HR: "HR"
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];
