import { Router } from "express";
import { createEmployeeHandler, listEmployeesHandler, updateEmployeeHandler, updateEmployeeShiftHandler, getEmployeeLeaveSummaryHandler, getEmployeeAttendanceSummaryHandler, applyLeaveRangeHandler, removeLeaveRangeHandler } from "../controllers/employeeController.js";
import { requireRole } from "../middleware/role.js";

const router = Router();

router.get("/employees", listEmployeesHandler);
router.get("/employees/:employeeId/leave-summary", getEmployeeLeaveSummaryHandler);
router.get("/employees/:employeeId/attendance-summary", getEmployeeAttendanceSummaryHandler);
router.post("/employees", requireRole(["ADMIN", "HR"]), createEmployeeHandler);
router.patch("/employees/:employeeId", requireRole(["ADMIN", "HR"]), updateEmployeeHandler);
router.patch("/employees/:employeeId/shift", requireRole(["ADMIN", "HR"]), updateEmployeeShiftHandler);
router.post("/employees/:employeeId/leave-range", requireRole(["ADMIN", "HR"]), applyLeaveRangeHandler);
router.post("/employees/:employeeId/leave-range/remove", requireRole(["ADMIN", "HR"]), removeLeaveRangeHandler);

export default router;
