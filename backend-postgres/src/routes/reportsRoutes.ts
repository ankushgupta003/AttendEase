import { Router } from "express";
import { attendanceSummaryHandler, salarySheetHandler, exportAttendanceSummary, exportSalarySheet } from "../controllers/reportsController.js";
import { requireRole } from "../middleware/role.js";

const router = Router();

router.get("/reports/attendance-summary", attendanceSummaryHandler);
router.get("/reports/salary-sheet", salarySheetHandler);
router.get("/reports/attendance-summary/export", requireRole(["ADMIN", "HR"]), exportAttendanceSummary);
router.get("/reports/salary-sheet/export", requireRole(["ADMIN", "HR"]), exportSalarySheet);

export default router;
