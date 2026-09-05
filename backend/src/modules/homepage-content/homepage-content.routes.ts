import { Router } from "express";
import { z } from "zod";
import { HomepageContentKey } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.homepageContent.findMany();
    res.json(rows);
  })
);

router.put(
  "/:key",
  asyncHandler(async (req, res) => {
    const key = z.nativeEnum(HomepageContentKey).parse(req.params.key);
    const { content } = z.object({ content: z.string() }).parse(req.body);
    const row = await prisma.homepageContent.upsert({
      where: { key },
      update: { content },
      create: { key, content },
    });
    res.json(row);
  })
);

export default router;
