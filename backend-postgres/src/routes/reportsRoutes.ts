import { Router } from "express";
import {
  attendanceSummaryHandler,
  salarySheetHandler,
  exportAttendanceSummary,
  exportSalarySheet,
  updateSalaryAdjustmentHandler,
  updateAttendanceRemarkHandler
} from "../controllers/reportsController.js";
import { requireRole } from "../middleware/role.js";

const router = Router();

router.get("/reports/attendance-summary", attendanceSummaryHandler);
router.get("/reports/salary-sheet", salarySheetHandler);
router.get("/reports/attendance-summary/export", requireRole(["ADMIN", "HR"]), exportAttendanceSummary);
router.get("/reports/salary-sheet/export", requireRole(["ADMIN", "HR"]), exportSalarySheet);
router.patch("/reports/salary-sheet/:employeeId/adjustment", requireRole(["ADMIN", "HR"]), updateSalaryAdjustmentHandler);
router.patch("/reports/attendance-summary/:employeeId/remark", requireRole(["ADMIN", "HR"]), updateAttendanceRemarkHandler);

export default router;
