import { randomUUID } from "node:crypto";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { env } from "../../config/env.js";
import { requireSeller } from "../seller/auth.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

/**
 * Image storage is deliberately swappable. This reference writes files to a
 * local `UPLOAD_DIR` served as static assets; in production you would point the
 * same endpoint at S3/OCI Object Storage and return the CDN/PAR URL instead.
 * The rest of the app only ever deals with the returned `url`.
 */
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

const storage = multer.diskStorage({
  destination: env.UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".img";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(ApiError.badRequest(`unsupported image type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

export const uploadRouter = Router();

uploadRouter.post(
  "/",
  requireSeller,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest("expected a `file` field (multipart/form-data)");
    const url = `${env.PUBLIC_BASE_URL}/${env.UPLOAD_DIR}/${req.file.filename}`;
    res.status(201).json({ url, bytes: req.file.size, mime: req.file.mimetype });
  }),
);
