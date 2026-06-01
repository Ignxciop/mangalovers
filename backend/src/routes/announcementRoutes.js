import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { optionalAuthenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/announcements/pending", optionalAuthenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const seenParam = req.query.seen;
    const seenIds = seenParam
      ? seenParam.split(",").map(Number).filter((n) => !isNaN(n))
      : [];

    const where = {
      active: true,
      publishAt: { lte: now },
      expiresAt: { gte: now },
    };

    if (req.user?.userId) {
      const userSeen = await prisma.userAnnouncement.findMany({
        where: { userId: req.user.userId },
        select: { announcementId: true },
      });
      const dbSeenIds = userSeen.map((ua) => ua.announcementId);
      const allSeen = [...new Set([...seenIds, ...dbSeenIds])];
      if (allSeen.length > 0) {
        where.id = { notIn: allSeen };
      }
    } else {
      if (seenIds.length > 0) {
        where.id = { notIn: seenIds };
      }
    }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: { publishAt: "desc" },
    });

    res.json({ success: true, data: announcements });
  } catch (error) {
    next(error);
  }
});

router.post("/announcements/:id/dismiss", optionalAuthenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    if (req.user?.userId) {
      await prisma.userAnnouncement.upsert({
        where: {
          userId_announcementId: {
            userId: req.user.userId,
            announcementId: id,
          },
        },
        create: {
          userId: req.user.userId,
          announcementId: id,
        },
        update: {},
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
