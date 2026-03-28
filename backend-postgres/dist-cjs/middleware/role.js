"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
function requireRole(roles) {
    return (req, res, next) => {
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
