import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db";
import { invalidatePostCaches } from "../config/redis";
import { AuthRequest, authenticate } from "../middleware/auth";

const router = Router();

const createPostSchema = z.object({
  content: z.string().min(1).max(280),
});

// Write-heavy: only mutations live here. Reads go to Python read-service.
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = createPostSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const post = await prisma.post.create({
    data: {
      content: parsed.data.content,
      authorId: req.userId!,
    },
    include: {
      author: {
        select: { id: true, username: true, name: true },
      },
    },
  });

  await invalidatePostCaches(post.id);

  res.status(201).json({ post });
});

export default router;
