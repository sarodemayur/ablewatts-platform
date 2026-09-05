import { Router } from "express";
import { z } from "zod";
import * as authService from "./auth.service";
import { asyncHandler } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await authService.getProfile(req.admin!.id);
    res.json(profile);
  })
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.admin!.id, currentPassword, newPassword);
    res.json({ message: "Password updated" });
  })
);

export default router;
