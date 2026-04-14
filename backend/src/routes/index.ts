import { Router } from "express";
import attendanceRoutes from "./attendanceRoutes.js";
import employeeRoutes from "./employeeRoutes.js";
import masterRoutes from "./masterRoutes.js";
import reportsRoutes from "./reportsRoutes.js";
import companyInfoRoutes from "./companyInfoRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import authRoutes from "./authRoutes.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(authRoutes);
router.use(requireAuth);
router.use(attendanceRoutes);
router.use(employeeRoutes);
router.use(masterRoutes);
router.use(companyInfoRoutes);
router.use(reportsRoutes);
router.use(dashboardRoutes);

export default router;
