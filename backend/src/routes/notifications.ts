import { Router, Response } from "express";
import { prisma } from "../config/db";
import { AuthRequest, authenticate } from "../middleware/auth";

const router = Router();

// GET /api/notifications - List notifications for current user
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: {
          select: { id: true, username: true, name: true },
        },
      },
    }),
    prisma.notification.count({
      where: { userId: req.userId!, read: false },
    }),
  ]);

  res.json({ notifications, unreadCount });
});

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch("/:id/read", authenticate, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification || notification.userId !== req.userId) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  res.json({ notification: updated });
});

// POST /api/notifications/read-all - Mark all as read
router.post("/read-all", authenticate, async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId!, read: false },
    data: { read: true },
  });

  res.json({ success: true });
});

export default router;
