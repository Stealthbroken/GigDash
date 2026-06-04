import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, fansTable } from "@workspace/db";
import {
  ChangeUsernameBody,
  ChangePasswordBody,
  ChangeAvatarBody,
  ChangeLocationBody,
  GetAccountSettingsResponse,
  ChangeUsernameResponse,
  ChangePasswordResponse,
  ChangeAvatarResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/session";
import { isValidCoordinates, resolvePlace, verifyPlace, type GeoPlace } from "../lib/geocode";
import {
  canChangeUsername,
  nextUsernameChangeAt,
  toAccountSettings,
  toUserSession,
  validateAvatarUrl,
  validatePassword,
  validateUsername,
} from "../lib/account";

const router: IRouter = Router();

router.get("/auth/settings", async (req, res): Promise<void> => {
  const user = await requireUser(req, res);
  if (!user) return;
  res.json(GetAccountSettingsResponse.parse(toAccountSettings(user)));
});

router.patch("/auth/settings/username", async (req, res): Promise<void> => {
  const user = await requireUser(req, res);
  if (!user) return;

  const parsed = ChangeUsernameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username } = parsed.data;
  const usernameErr = validateUsername(username);
  if (usernameErr) {
    res.status(400).json({ error: usernameErr });
    return;
  }

  if (username === user.username) {
    res.json(GetAccountSettingsResponse.parse(toAccountSettings(user)));
    return;
  }

  if (!canChangeUsername(user.usernameChangedAt)) {
    const nextAt = nextUsernameChangeAt(user.usernameChangedAt);
    res.status(429).json({
      error: `Username can only be changed once every 30 days. Try again after ${nextAt?.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}.`,
    });
    return;
  }

  const [taken] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (taken && taken.id !== user.id) {
    res.status(409).json({ error: "That username is already taken." });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({
      username,
      usernameChangedAt: new Date(),
    })
    .where(eq(usersTable.id, user.id))
    .returning();

  req.log.info({ userId: user.id }, "Username changed");
  res.json(ChangeUsernameResponse.parse(toAccountSettings(updated)));
});

router.patch("/auth/settings/password", async (req, res): Promise<void> => {
  const user = await requireUser(req, res);
  if (!user) return;

  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;
  const pwErr = validatePassword(String(newPassword));
  if (pwErr) {
    res.status(400).json({ error: pwErr });
    return;
  }

  const match = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!match) {
    res.status(401).json({ error: "Current password is incorrect." });
    return;
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

  req.log.info({ userId: user.id }, "Password changed");
  res.json(ChangePasswordResponse.parse({ ok: true }));
});

router.patch("/auth/settings/avatar", async (req, res): Promise<void> => {
  const user = await requireUser(req, res);
  if (!user) return;

  const parsed = ChangeAvatarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const avatarUrl = parsed.data.avatarUrl ?? null;
  const avatarErr = validateAvatarUrl(avatarUrl);
  if (avatarErr) {
    res.status(400).json({ error: avatarErr });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ avatarUrl })
    .where(eq(usersTable.id, user.id))
    .returning();

  req.log.info({ userId: user.id }, "Avatar updated");
  res.json(ChangeAvatarResponse.parse(toUserSession(updated)));
});

async function syncFanLocation(userId: number, label: string | null) {
  await db
    .update(fansTable)
    .set({ location: label })
    .where(eq(fansTable.userId, userId));
}

async function resolveLocationInput(
  body: { query?: string; locationLabel?: string; lat?: number; lng?: number },
): Promise<GeoPlace | null | "invalid"> {
  const query = body.query?.trim();
  if (query === "") return null;

  if (query && query.length >= 2) {
    const place = await resolvePlace(query);
    return place ?? "invalid";
  }

  const label = body.locationLabel?.trim();
  const lat = body.lat;
  const lng = body.lng;
  if (label && lat != null && lng != null && isValidCoordinates(lat, lng)) {
    const ok = await verifyPlace(label, lat, lng);
    return ok ? { label, lat, lng } : "invalid";
  }

  return "invalid";
}

router.patch("/auth/settings/location", async (req, res): Promise<void> => {
  const user = await requireUser(req, res);
  if (!user) return;

  const parsed = ChangeLocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let place: GeoPlace | null;
  try {
    const resolved = await resolveLocationInput(parsed.data);
    if (resolved === "invalid") {
      res.status(400).json({
        error: "Could not find that location. Pick a city, town, or postal code from the suggestions.",
      });
      return;
    }
    place = resolved;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Location lookup failed.";
    res.status(502).json({ error: message });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({
      locationLabel: place?.label ?? null,
      locationLat: place?.lat ?? null,
      locationLng: place?.lng ?? null,
    })
    .where(eq(usersTable.id, user.id))
    .returning();

  if (updated.role === "fan") {
    await syncFanLocation(updated.id, place?.label ?? null);
  }

  req.log.info({ userId: user.id }, "Home location updated");
  res.json(GetAccountSettingsResponse.parse(toAccountSettings(updated)));
});

export default router;