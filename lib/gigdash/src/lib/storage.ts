export type StoragePurpose = "avatar" | "venue" | "event" | "chat";

export interface StorageUploadResult {
  fileId: string;
  url: string;
}

export async function isStorageConfigured(): Promise<boolean> {
  try {
    const res = await fetch("/api/storage/status", { credentials: "include" });
    if (!res.ok) return false;
    const data = (await res.json()) as { configured?: boolean };
    return !!data.configured;
  } catch {
    return false;
  }
}

export async function uploadFile(file: File, purpose: StoragePurpose): Promise<StorageUploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", purpose);

  const res = await fetch("/api/storage/upload", {
    method: "POST",
    body: form,
    credentials: "include",
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Upload failed.");
  }

  return res.json() as Promise<StorageUploadResult>;
}

export async function uploadFiles(files: File[], purpose: StoragePurpose): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const result = await uploadFile(file, purpose);
    urls.push(result.url);
  }
  return urls;
}