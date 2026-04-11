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
  listLeaveTypesHandler,
  upsertLeaveTypeHandler,
  deleteLeaveTypeHandler,
  getLeavePolicyHandler,
  updateLeavePolicyHandler
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

router.get("/leave-types", listLeaveTypesHandler);
router.post("/leave-types", requireRole(["ADMIN", "HR"]), upsertLeaveTypeHandler);
router.patch("/leave-types", requireRole(["ADMIN", "HR"]), upsertLeaveTypeHandler);
router.delete("/leave-types/:code", requireRole(["ADMIN", "HR"]), deleteLeaveTypeHandler);

router.get("/leave-policy", getLeavePolicyHandler);
router.patch("/leave-policy", requireRole(["ADMIN", "HR"]), updateLeavePolicyHandler);

export default router;
