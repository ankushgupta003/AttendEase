import { Router } from "express";
import { loginHandler, meHandler } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/auth/login", loginHandler);
router.get("/auth/me", requireAuth, meHandler);

export default router;
