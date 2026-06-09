import type { User } from "@workspace/db";
import { isAppwriteFileUrl } from "./appwrite-storage";

export const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const AVATAR_MAX_LENGTH = 600_000;
const URL_MAX_LENGTH = 2048;

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(password)) return "Password must include a letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  return null;
}

export function validateUsername(username: string): string | null {
  if (username.length < 2 || username.length > 20) {
    return "Username must be 2–20 characters.";
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return "Username can only contain letters, numbers, and underscores.";
  }
  return null;
}

export function canChangeUsername(usernameChangedAt: Date | null): boolean {
  if (!usernameChangedAt) return true;
  return Date.now() - usernameChangedAt.getTime() >= USERNAME_COOLDOWN_MS;
}

export function nextUsernameChangeAt(usernameChangedAt: Date | null): Date | null {
  if (!usernameChangedAt) return null;
  const unlockAt = usernameChangedAt.getTime() + USERNAME_COOLDOWN_MS;
  if (Date.now() >= unlockAt) return null;
  return new Date(unlockAt);
}

export function validateImageUrl(url: string | null | undefined, opts?: { allowBase64?: boolean }): string | null {
  if (url == null || url === "") return null;
  if (/^https?:\/\/.+/i.test(url)) {
    if (url.length > URL_MAX_LENGTH) return "Image URL is too long.";
    if (isAppwriteFileUrl(url)) return null;
    return null;
  }
  if (opts?.allowBase64 !== false && /^data:image\/(jpeg|jpg|png|gif|webp);base64,[a-zA-Z0-9+/=]+$/i.test(url)) {
    if (url.length > AVATAR_MAX_LENGTH) {
      return "Image is too large. Upload via storage instead.";
    }
    return null;
  }
  return "Image must be an http(s) URL or an uploaded image file.";
}

export function validateAvatarUrl(avatarUrl: string | null | undefined): string | null {
  return validateImageUrl(avatarUrl);
}

export function validateImageUrlList(urls: string[] | undefined, max = 12): string | null {
  if (!urls) return null;
  if (urls.length > max) return `At most ${max} images allowed.`;
  for (const url of urls) {
    const err = validateImageUrl(url);
    if (err) return err;
  }
  return null;
}

export function toUserSession(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    locationLabel: user.locationLabel ?? null,
    locationLat: user.locationLat ?? null,
    locationLng: user.locationLng ?? null,
  };
}

export function toAccountSettings(user: User) {
  const changedAt = user.usernameChangedAt ?? null;
  return {
    ...toUserSession(user),
    usernameChangedAt: changedAt,
    canChangeUsername: canChangeUsername(changedAt),
    nextUsernameChangeAt: nextUsernameChangeAt(changedAt),
  };
}