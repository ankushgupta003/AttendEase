"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_js_1 = require("../controllers/authController.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.post("/auth/login", authController_js_1.loginHandler);
router.get("/auth/me", auth_js_1.requireAuth, authController_js_1.meHandler);
exports.default = router;
