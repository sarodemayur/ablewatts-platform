import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { env } from "../../config/env";
import * as greenDataService from "./green-data.service";

greenDataService.ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.greenDataDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
  },
});
const upload = multer({ storage });

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const files = await greenDataService.listFiles(req.admin!.id);
    res.json(files);
  })
);

router.post(
  "/upload",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const record = await greenDataService.registerUpload(req.admin!.id, req.file.originalname, req.file.filename);
    res.status(201).json(record);
  })
);

export default router;
