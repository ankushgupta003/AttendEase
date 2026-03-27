import { Router } from "express";
import { dashboardHandler } from "../controllers/dashboardController.js";

const router = Router();

router.get("/dashboard", dashboardHandler);

export default router;
