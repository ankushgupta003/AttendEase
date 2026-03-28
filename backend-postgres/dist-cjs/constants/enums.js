"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = exports.HolidayType = exports.FinalizationStatus = exports.AttendanceStatus = void 0;
exports.AttendanceStatus = {
    PRESENT: "PRESENT",
    ABSENT: "ABSENT",
    LATE: "LATE",
    HALF_DAY: "HALF_DAY",
    MISSING_PUNCH: "MISSING_PUNCH",
    WEEK_OFF: "WEEK_OFF",
    HOLIDAY: "HOLIDAY",
    LEAVE: "LEAVE"
};
exports.FinalizationStatus = {
    DRAFT: "DRAFT",
    FINALIZED: "FINALIZED",
    LOCKED: "LOCKED"
};
exports.HolidayType = {
    NATIONAL: "NATIONAL",
    REGIONAL: "REGIONAL",
    OPTIONAL: "OPTIONAL"
};
exports.UserRole = {
    ADMIN: "ADMIN",
    HR: "HR"
};
