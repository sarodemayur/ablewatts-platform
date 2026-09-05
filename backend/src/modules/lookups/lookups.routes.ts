import { Router } from "express";
import { z } from "zod";
import { LookupCategory } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

const categoryParam = z.nativeEnum(LookupCategory);

const upsertSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  active: z.boolean().optional(),
});

router.get(
  "/:category",
  asyncHandler(async (req, res) => {
    const category = categoryParam.parse(req.params.category);
    const rows = await prisma.lookup.findMany({ where: { category }, orderBy: { label: "asc" } });
    res.json(rows);
  })
);

router.post(
  "/:category",
  asyncHandler(async (req, res) => {
    const category = categoryParam.parse(req.params.category);
    const input = upsertSchema.parse(req.body);
    const row = await prisma.lookup.create({ data: { category, ...input } });
    res.status(201).json(row);
  })
);

router.put(
  "/:category/:id",
  asyncHandler(async (req, res) => {
    const category = categoryParam.parse(req.params.category);
    const input = upsertSchema.partial().parse(req.body);
    const row = await prisma.lookup.update({
      where: { id: Number(req.params.id) },
      data: { ...input, category },
    });
    res.json(row);
  })
);

router.delete(
  "/:category/:id",
  asyncHandler(async (req, res) => {
    await prisma.lookup.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

export default router;
