import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";

export function getSessionUserId(req: Request): number | null {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  return typeof userId === "number" ? userId : null;
}

export async function requireUser(req: Request, res: Response): Promise<User | null> {
  const userId = getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return null;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Not authenticated." });
    return null;
  }

  return user;
}