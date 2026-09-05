import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { ApiError } from "../../middleware/errorHandler";

export async function login(email: string, password: string) {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (!admin.active) {
    throw new ApiError(403, "This account has been deactivated");
  }

  const passwordOk = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordOk) {
    throw new ApiError(401, "Invalid email or password");
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const payload = {
    id: admin.id,
    email: admin.email,
    accessLevel: admin.accessLevel,
    type: admin.type,
  };

  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });

  return {
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      username: admin.username,
      firstName: admin.firstName,
      lastName: admin.lastName,
      type: admin.type,
      accessLevel: admin.accessLevel,
    },
  };
}

export async function changePassword(adminId: number, currentPassword: string, newPassword: string) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new ApiError(404, "Admin not found");

  const currentOk = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!currentOk) throw new ApiError(401, "Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.admin.update({ where: { id: adminId }, data: { passwordHash } });
}

export async function getProfile(adminId: number) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new ApiError(404, "Admin not found");
  return {
    id: admin.id,
    email: admin.email,
    username: admin.username,
    firstName: admin.firstName,
    lastName: admin.lastName,
    type: admin.type,
    accessLevel: admin.accessLevel,
  };
}
