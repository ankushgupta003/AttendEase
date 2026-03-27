import type { Request, Response, NextFunction } from "express";

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = String(req.user?.role ?? "").toUpperCase();
    if (!role) {
      return res.status(401).json({ message: "Unauthorized." });
    }
    if (!roles.includes(role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role." });
    }
    return next();
  };
}
