import { Router } from "express";
import { getCompanyInfoHandler, updateCompanyInfoHandler } from "../controllers/companyInfoController.js";
import { requireRole } from "../middleware/role.js";

const router = Router();

router.get("/company-info", requireRole(["ADMIN"]), getCompanyInfoHandler);
router.patch("/company-info", requireRole(["ADMIN"]), updateCompanyInfoHandler);

export default router;
