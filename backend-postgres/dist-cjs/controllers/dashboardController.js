"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardHandler = dashboardHandler;
const attendanceService_js_1 = require("../services/attendanceService.js");
async function dashboardHandler(req, res, next) {
    try {
        const date = req.query.date ? String(req.query.date) : undefined;
        const stats = await (0, attendanceService_js_1.getDashboardStats)(date);
        return res.json(stats);
    }
    catch (error) {
        return next(error);
    }
}
