import { Client, Storage, ID, Permission, Role } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

export type StoragePurpose = "avatar" | "venue" | "event" | "chat";

const PURPOSE_MAX_BYTES: Record<StoragePurpose, number> = {
  avatar: 2_000_000,
  venue: 5_000_000,
  event: 5_000_000,
  chat: 500_000,
};

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const CHAT_MIME = new Set([
  ...IMAGE_MIME,
  "application/pdf",
  "text/plain",
]);

interface AppwriteConfig {
  endpoint: string;
  projectId: string;
  apiKey: string;
  bucketId: string;
}

function getConfig(): AppwriteConfig | null {
  const endpoint = process.env.APPWRITE_ENDPOINT?.trim();
  const projectId = process.env.APPWRITE_PROJECT_ID?.trim();
  const apiKey = process.env.APPWRITE_API_KEY?.trim();
  const bucketId = process.env.APPWRITE_BUCKET_ID?.trim();
  if (!endpoint || !projectId || !apiKey || !bucketId) return null;
  return { endpoint, projectId, apiKey, bucketId };
}

export function isAppwriteStorageConfigured(): boolean {
  return getConfig() !== null;
}

export function getPurposeMaxBytes(purpose: StoragePurpose): number {
  return PURPOSE_MAX_BYTES[purpose];
}

export function validateUploadMime(purpose: StoragePurpose, mimeType: string): string | null {
  const mime = mimeType.toLowerCase();
  if (purpose === "chat") {
    return CHAT_MIME.has(mime) ? null : "Unsupported file type for chat.";
  }
  return IMAGE_MIME.has(mime) ? null : "Only JPEG, PNG, WebP, and GIF images are allowed.";
}

export function buildAppwriteFileViewUrl(fileId: string): string | null {
  const cfg = getConfig();
  if (!cfg) return null;
  const base = cfg.endpoint.replace(/\/$/, "");
  return `${base}/storage/buckets/${cfg.bucketId}/files/${fileId}/view?project=${cfg.projectId}`;
}

export function isAppwriteFileUrl(url: string): boolean {
  const cfg = getConfig();
  if (!cfg) return false;
  const base = cfg.endpoint.replace(/\/$/, "");
  return url.startsWith(`${base}/storage/buckets/${cfg.bucketId}/files/`);
}

export async function uploadToAppwriteBucket(
  file: Buffer,
  filename: string,
  mimeType: string,
  userId: number,
  purpose: StoragePurpose,
): Promise<{ fileId: string; url: string }> {
  const cfg = getConfig();
  if (!cfg) {
    throw new Error("File storage is not configured.");
  }

  const client = new Client()
    .setEndpoint(cfg.endpoint)
    .setProject(cfg.projectId)
    .setKey(cfg.apiKey);

  const storage = new Storage(client);
  const fileId = ID.unique();
  const safeName = `user-${userId}/${purpose}/${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  await storage.createFile(
    cfg.bucketId,
    fileId,
    InputFile.fromBuffer(file, safeName),
    [Permission.read(Role.any())],
  );

  const url = buildAppwriteFileViewUrl(fileId);
  if (!url) throw new Error("Could not build file URL.");
  return { fileId, url };
}