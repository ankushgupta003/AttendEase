import type { Request, Response, NextFunction } from "express";
import { getDashboardStats } from "../services/attendanceService.js";

export async function dashboardHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const date = req.query.date ? String(req.query.date) : undefined;
    const stats = await getDashboardStats(date);
    return res.json(stats);
  } catch (error) {
    return next(error);
  }
}
