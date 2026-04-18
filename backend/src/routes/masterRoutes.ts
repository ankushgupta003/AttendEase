import { Router } from "express";
import multer from "multer";
import {
  listShiftsHandler,
  createShiftHandler,
  updateShiftHandler,
  listHolidaysHandler,
  createHolidayHandler,
  updateHolidayHandler,
  deleteHolidayHandler,
  uploadHolidayHandler,
  downloadHolidayTemplate,
  reprocessAttendanceHandler,
  listLeaveTypesHandler,
  upsertLeaveTypeHandler,
  deleteLeaveTypeHandler,
  getLeavePolicyHandler,
  updateLeavePolicyHandler,
  listSalaryTypesHandler,
  createSalaryTypeHandler,
  updateSalaryTypeHandler,
  listAdvanceLedgerHandler,
  upsertAdvanceLedgerHandler,
  addAdvanceIssueHandler,
  listAdvanceHistoryHandler
} from "../controllers/masterController.js";
import { requireRole } from "../middleware/role.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/shifts", listShiftsHandler);
router.post("/shifts", requireRole(["ADMIN", "HR"]), createShiftHandler);
router.patch("/shifts/:shiftId", requireRole(["ADMIN", "HR"]), updateShiftHandler);

router.get("/holidays", listHolidaysHandler);
router.post("/holidays", requireRole(["ADMIN", "HR"]), createHolidayHandler);
router.patch("/holidays/:holidayId", requireRole(["ADMIN", "HR"]), updateHolidayHandler);
router.delete("/holidays/:holidayId", requireRole(["ADMIN", "HR"]), deleteHolidayHandler);
router.post("/holidays/upload", requireRole(["ADMIN", "HR"]), upload.single("file"), uploadHolidayHandler);
router.get("/holidays/template", downloadHolidayTemplate);
router.post("/holidays/reprocess", requireRole(["ADMIN", "HR"]), reprocessAttendanceHandler);

router.get("/leave-types", listLeaveTypesHandler);
router.post("/leave-types", requireRole(["ADMIN", "HR"]), upsertLeaveTypeHandler);
router.patch("/leave-types", requireRole(["ADMIN", "HR"]), upsertLeaveTypeHandler);
router.delete("/leave-types/:code", requireRole(["ADMIN", "HR"]), deleteLeaveTypeHandler);

router.get("/leave-policy", getLeavePolicyHandler);
router.patch("/leave-policy", requireRole(["ADMIN", "HR"]), updateLeavePolicyHandler);

router.get("/salary-types", listSalaryTypesHandler);
router.post("/salary-types", requireRole(["ADMIN", "HR"]), createSalaryTypeHandler);
router.patch("/salary-types/:salaryTypeId", requireRole(["ADMIN", "HR"]), updateSalaryTypeHandler);

router.get("/advance-ledger", listAdvanceLedgerHandler);
router.post("/advance-ledger", requireRole(["ADMIN", "HR"]), upsertAdvanceLedgerHandler);
router.patch("/advance-ledger", requireRole(["ADMIN", "HR"]), upsertAdvanceLedgerHandler);
router.get("/advance-ledger/:employeeId/history", listAdvanceHistoryHandler);
router.post("/advance-ledger/:employeeId/issue", requireRole(["ADMIN", "HR"]), addAdvanceIssueHandler);

export default router;
