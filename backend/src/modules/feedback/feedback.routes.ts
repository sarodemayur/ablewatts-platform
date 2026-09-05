import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const take = limit ? Number(limit) : 25;
    const skip = page ? (Number(page) - 1) * take : 0;

    const [rows, total] = await Promise.all([
      prisma.feedback.findMany({
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: { appUser: { select: { email: true, firstName: true, lastName: true } } },
      }),
      prisma.feedback.count(),
    ]);

    res.json({ rows, total, page: page ? Number(page) : 1, limit: take });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.feedback.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

export default router;
