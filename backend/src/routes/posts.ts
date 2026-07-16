import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db";
import { AuthRequest, authenticate } from "../middleware/auth";

const router = Router();

const createPostSchema = z.object({
  content: z.string().min(1).max(280),
});

router.get("/", async (_req, res: Response) => {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: {
        select: { id: true, username: true, name: true },
      },
    },
  });

  res.json({ posts });
});

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

  res.status(201).json({ post });
});

router.get("/:id", async (req, res: Response) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.id },
    include: {
      author: {
        select: { id: true, username: true, name: true },
      },
    },
  });

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json({ post });
});

export default router;
