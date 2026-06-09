import { Router, type IRouter } from "express";
import multer from "multer";
import {
  getPurposeMaxBytes,
  isAppwriteStorageConfigured,
  uploadToAppwriteBucket,
  validateUploadMime,
  type StoragePurpose,
} from "../lib/appwrite-storage";
import { requireUser } from "../lib/session";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5_000_000 },
});

const PURPOSES = new Set<StoragePurpose>(["avatar", "venue", "event", "chat"]);

router.post("/storage/upload", upload.single("file"), async (req, res): Promise<void> => {
  const user = await requireUser(req, res);
  if (!user) return;

  if (!isAppwriteStorageConfigured()) {
    res.status(503).json({
      error: "File storage is not configured. Set APPWRITE_* environment variables.",
    });
    return;
  }

  const purpose = String(req.body?.purpose ?? "") as StoragePurpose;
  if (!PURPOSES.has(purpose)) {
    res.status(400).json({ error: "Invalid upload purpose." });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded." });
    return;
  }

  const maxBytes = getPurposeMaxBytes(purpose);
  if (file.size > maxBytes) {
    res.status(400).json({ error: `File too large. Max ${Math.round(maxBytes / 1024)} KB for ${purpose}.` });
    return;
  }

  const mimeErr = validateUploadMime(purpose, file.mimetype);
  if (mimeErr) {
    res.status(400).json({ error: mimeErr });
    return;
  }

  try {
    const result = await uploadToAppwriteBucket(
      file.buffer,
      file.originalname || "upload",
      file.mimetype,
      user.id,
      purpose,
    );
    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err, purpose, userId: user.id }, "Appwrite upload failed");
    res.status(502).json({ error: "Upload failed. Try again in a moment." });
  }
});

router.get("/storage/status", async (_req, res): Promise<void> => {
  res.json({ configured: isAppwriteStorageConfigured() });
});

export default router;