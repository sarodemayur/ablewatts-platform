import { Router } from "express";
import { z } from "zod";
import { AppUserType, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { type, active, page, limit } = req.query;
    const take = limit ? Number(limit) : 25;
    const skip = page ? (Number(page) - 1) * take : 0;

    const where: Prisma.AppUserWhereInput = {
      ...(type ? { type: type as AppUserType } : {}),
      ...(active !== undefined ? { active: active === "true" } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.appUser.findMany({ where, orderBy: { createdAt: "desc" }, take, skip }),
      prisma.appUser.count({ where }),
    ]);

    res.json({ rows, total, page: page ? Number(page) : 1, limit: take });
  })
);

const upsertSchema = z.object({
  type: z.nativeEnum(AppUserType),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = upsertSchema.parse(req.body);
    const user = await prisma.appUser.create({ data: input });
    res.status(201).json(user);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = upsertSchema.partial().parse(req.body);
    const user = await prisma.appUser.update({ where: { id: Number(req.params.id) }, data: input });
    res.json(user);
  })
);

router.post(
  "/:id/set-active",
  asyncHandler(async (req, res) => {
    const { active } = z.object({ active: z.boolean() }).parse(req.body);
    const user = await prisma.appUser.update({ where: { id: Number(req.params.id) }, data: { active } });
    res.json(user);
  })
);

router.post(
  "/:id/convert",
  asyncHandler(async (req, res) => {
    // Mirrors the original's demo/beta/guest -> registered "conversion" action.
    const user = await prisma.appUser.update({
      where: { id: Number(req.params.id) },
      data: { isConverted: true, type: AppUserType.registered },
    });
    res.json(user);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.appUser.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

export default router;
