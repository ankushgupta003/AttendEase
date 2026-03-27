import { Router } from "express";
import multer from "multer";
import {
  listAttendanceHandler,
  exportAttendance,
  updateAttendanceHandler,
  bulkActionHandler,
  uploadAttendance,
  uploadPreview,
  downloadAttendanceTemplate,
  getFinalizationStatus,
  finalizeMonth,
  lockMonth,
  unlockMonth
} from "../controllers/attendanceController.js";
import { requireRole } from "../middleware/role.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/attendance", listAttendanceHandler);
router.get("/attendance/export", requireRole(["ADMIN", "HR"]), exportAttendance);
router.patch("/attendance/:attendanceId", requireRole(["ADMIN", "HR"]), updateAttendanceHandler);
router.post("/attendance/bulk", requireRole(["ADMIN", "HR"]), bulkActionHandler);
router.post("/attendance/upload/preview", requireRole(["ADMIN", "HR"]), upload.single("file"), uploadPreview);
router.post("/attendance/upload", requireRole(["ADMIN", "HR"]), upload.single("file"), uploadAttendance);
router.get("/attendance/template", downloadAttendanceTemplate);

router.get("/attendance/finalization", getFinalizationStatus);
router.post("/attendance/finalize", requireRole(["ADMIN", "HR"]), finalizeMonth);
router.post("/attendance/lock", requireRole(["ADMIN", "HR"]), lockMonth);
router.post("/attendance/unlock", requireRole(["ADMIN", "HR"]), unlockMonth);

export default router;
