import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { AdminType } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth, requireAccessLevel } from "../../middleware/auth";
import { ApiError } from "../../middleware/errorHandler";

const router = Router();
router.use(requireAuth);

const SAFE_SELECT = {
  id: true,
  type: true,
  firstName: true,
  lastName: true,
  email: true,
  username: true,
  accessLevel: true,
  active: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.admin.findMany({ select: SAFE_SELECT, orderBy: { createdAt: "desc" } });
    res.json(rows);
  })
);

const createSchema = z.object({
  type: z.nativeEnum(AdminType).default(AdminType.admin),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  accessLevel: z.number().int().min(0).max(100).optional(),
  password: z.string().min(6).optional(),
});

router.post(
  "/",
  requireAccessLevel(90),
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const tempPassword = input.password ?? crypto.randomBytes(6).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const admin = await prisma.admin.create({
      data: {
        type: input.type,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        username: input.username,
        accessLevel: input.accessLevel ?? 50,
        passwordHash,
      },
      select: SAFE_SELECT,
    });

    res.status(201).json({ ...admin, temporaryPassword: input.password ? undefined : tempPassword });
  })
);

const updateSchema = createSchema.omit({ password: true }).partial();

router.put(
  "/:id",
  requireAccessLevel(90),
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    const admin = await prisma.admin.update({
      where: { id: Number(req.params.id) },
      data: input,
      select: SAFE_SELECT,
    });
    res.json(admin);
  })
);

router.post(
  "/:id/set-active",
  requireAccessLevel(90),
  asyncHandler(async (req, res) => {
    const { active } = z.object({ active: z.boolean() }).parse(req.body);
    const admin = await prisma.admin.update({
      where: { id: Number(req.params.id) },
      data: { active },
      select: SAFE_SELECT,
    });
    res.json(admin);
  })
);

router.post(
  "/:id/reset-password",
  requireAccessLevel(90),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) throw new ApiError(404, "Admin not found");

    const tempPassword = crypto.randomBytes(6).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.admin.update({ where: { id }, data: { passwordHash } });

    res.json({ temporaryPassword: tempPassword });
  })
);

router.delete(
  "/:id",
  requireAccessLevel(99),
  asyncHandler(async (req, res) => {
    await prisma.admin.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

export default router;
