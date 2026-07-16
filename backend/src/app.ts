import { Router, Response, NextFunction } from "express";
import postRoutes from "./routes/posts";
import authRoutes from "./routes/auth";

const router = Router();

router.use((req, res: Response, next: NextFunction) => {
  res.setHeader("X-Service", "write-service");
  res.setHeader("X-Instance-Id", process.env.INSTANCE_ID || "write-1");
  next();
});

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "write-service",
    instance: process.env.INSTANCE_ID || "write-1",
    phase: "2-3",
    role: "write-heavy",
    timestamp: new Date().toISOString(),
  });
});

router.use("/api/auth", authRoutes);
router.use("/api/posts", postRoutes);

export default router;
