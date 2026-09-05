import path from "path";
import fs from "fs";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";

export async function listFiles(adminId?: number) {
  return prisma.greenDataFile.findMany({
    where: adminId ? { OR: [{ adminId }, { isSample: true }] } : {},
    orderBy: { uploadedAt: "desc" },
  });
}

export async function registerUpload(adminId: number, originalName: string, storedFileName: string) {
  return prisma.greenDataFile.create({
    data: {
      adminId,
      fileName: storedFileName,
      realFileName: originalName,
      storagePath: storedFileName,
      isSample: false,
    },
  });
}

export function ensureUploadDir() {
  if (!fs.existsSync(env.greenDataDir)) {
    fs.mkdirSync(env.greenDataDir, { recursive: true });
  }
}

export function resolvePath(storagePath: string) {
  return path.isAbsolute(storagePath) ? storagePath : path.join(env.greenDataDir, storagePath);
}
