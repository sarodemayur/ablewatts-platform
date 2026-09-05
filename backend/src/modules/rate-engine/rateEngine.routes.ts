import { Router } from "express";
import { z } from "zod";
import path from "path";
import { prisma } from "../../db/prisma";
import { calculateBill } from "./rateEngine.service";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";
import { env } from "../../config/env";

const router = Router();
router.use(requireAuth);

const calculateSchema = z.object({
  utility: z.string().min(1),
  sector: z.string().min(1),
  name: z.string().min(1),
  greenDataFileId: z.number(),
  responseType: z.enum(["monthly", "daily"]).optional(),
});

router.post(
  "/calculate",
  asyncHandler(async (req, res) => {
    const input = calculateSchema.parse(req.body);
    const file = await prisma.greenDataFile.findUnique({ where: { id: input.greenDataFileId } });
    if (!file) return res.status(404).json({ message: "Green-data file not found" });

    const filePath = path.isAbsolute(file.storagePath) ? file.storagePath : path.join(env.greenDataDir, file.storagePath);

    const result = await calculateBill({
      utility: input.utility,
      sector: input.sector,
      name: input.name,
      filePath,
      responseType: input.responseType,
    });
    res.json(result);
  })
);

export default router;
