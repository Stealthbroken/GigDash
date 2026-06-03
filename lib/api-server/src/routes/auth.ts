import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { db, usersTable, fansTable, artistsTable, venuesTable } from "@workspace/db";
import { SignupBody, LoginBody, LoginResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, email, password, role, displayName, location, genres } = parsed.data;

  const passwordStr = String(password);
  if (passwordStr.length < 8 || !/[a-zA-Z]/.test(passwordStr) || !/[0-9]/.test(passwordStr)) {
    res.status(400).json({ error: "Password must be 8+ characters and include a letter and a number." });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.username, username), eq(usersTable.email, email)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Username or email is already taken." });
    return;
  }

  const passwordHash = await bcrypt.hash(passwordStr, 10);
  const roleVal = (role === "artist" || role === "venue" || role === "fan") ? role : "fan";

  const [user] = await db
    .insert(usersTable)
    .values({ username, email, passwordHash, role: roleVal })
    .returning();

  if (roleVal === "fan") {
    await db.insert(fansTable).values({
      userId: user.id,
      displayName: displayName ?? username,
      location: location ?? null,
      genres: genres ?? [],
    });
  } else if (roleVal === "artist") {
    await db.insert(artistsTable).values({
      userId: user.id,
      displayName: displayName ?? username,
      genres: genres ?? [],
      vibes: [],
    });
  } else if (roleVal === "venue") {
    await db.insert(venuesTable).values({
      userId: user.id,
      name: displayName ?? username,
      address: location ?? "TBD",
      moods: [],
      imageUrls: [],
    });
  }

  const session = req.session as unknown as Record<string, unknown>;
  session["userId"] = user.id;
  session["role"] = user.role;

  req.log.info({ userId: user.id, role: user.role }, "User signed up");

  res.status(201).json(LoginResponse.parse({ id: user.id, username: user.username, email: user.email, role: user.role }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const match = await bcrypt.compare(String(password), user.passwordHash);
  if (!match) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const session = req.session as unknown as Record<string, unknown>;
  session["userId"] = user.id;
  session["role"] = user.role;

  req.log.info({ userId: user.id }, "User logged in");

  res.json(LoginResponse.parse({ id: user.id, username: user.username, email: user.email, role: user.role }));
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.sendStatus(204);
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId as number))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  res.json(LoginResponse.parse({ id: user.id, username: user.username, email: user.email, role: user.role }));
});

export default router;
