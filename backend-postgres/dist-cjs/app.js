"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const index_js_1 = __importDefault(require("./routes/index.js"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "2mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/api", index_js_1.default);
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.use((err, _req, res, _next) => {
    const message = err?.message ?? "Unexpected error";
    const status = err?.statusCode ?? 500;
    res.status(status).json({ message });
});
exports.default = app;
