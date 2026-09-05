import { Router } from "express";
import multer from "multer";
import { AppUserType } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler, ApiError } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";
import { toCsv, parseCsv } from "./csv.utils";

const router = Router();
router.use(requireAuth);
const upload = multer({ storage: multer.memoryStorage() });

router.get(
  "/export/app-users",
  asyncHandler(async (req, res) => {
    const type = req.query.type as AppUserType | undefined;
    const rows = await prisma.appUser.findMany({
      where: type ? { type } : {},
      orderBy: { createdAt: "desc" },
    });
    const csv = toCsv(
      rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      ["id", "type", "email", "firstName", "lastName", "isConverted", "active", "createdAt"]
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="app-users.csv"');
    res.send(csv);
  })
);

router.get(
  "/export/feedback",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.feedback.findMany({ orderBy: { createdAt: "desc" } });
    const csv = toCsv(
      rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      ["id", "name", "email", "message", "createdAt"]
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="feedback.csv"');
    res.send(csv);
  })
);

// Bulk-imports app users from a CSV with header row: type,email,firstName,lastName
router.post(
  "/import/app-users",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No file uploaded");
    const text = req.file.buffer.toString("utf-8");
    const [header, ...rows] = parseCsv(text);
    if (!header) throw new ApiError(400, "Empty CSV file");

    const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
    const typeIdx = col("type");
    const emailIdx = col("email");
    const firstNameIdx = col("firstname");
    const lastNameIdx = col("lastname");
    if (emailIdx === -1 || typeIdx === -1) {
      throw new ApiError(400, "CSV must have at least 'type' and 'email' columns");
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const email = row[emailIdx]?.trim();
      const type = row[typeIdx]?.trim() as AppUserType;
      if (!email || !type) {
        skipped++;
        continue;
      }
      if (!Object.values(AppUserType).includes(type)) {
        errors.push(`Invalid type "${type}" for ${email}`);
        skipped++;
        continue;
      }
      try {
        await prisma.appUser.create({
          data: {
            email,
            type,
            firstName: firstNameIdx !== -1 ? row[firstNameIdx]?.trim() || undefined : undefined,
            lastName: lastNameIdx !== -1 ? row[lastNameIdx]?.trim() || undefined : undefined,
          },
        });
        created++;
      } catch {
        errors.push(`Could not import ${email} (likely a duplicate)`);
        skipped++;
      }
    }

    res.json({ created, skipped, errors });
  })
);

export default router;
