import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, fansTable } from "@workspace/db";
import { GetFanResponse, UpdateFanMeBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.patch("/fans/me", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const parsed = UpdateFanMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { displayName, avatarUrl, location, genres } = parsed.data;

  const [fan] = await db
    .update(fansTable)
    .set({
      displayName,
      location: location ?? null,
      genres,
    })
    .where(eq(fansTable.userId, userId as number))
    .returning();

  if (!fan) {
    res.status(404).json({ error: "Fan profile not found." });
    return;
  }

  req.log.info({ userId }, "Fan profile updated");
  res.json(GetFanResponse.parse({ id: fan.id, displayName: fan.displayName, location: fan.location, genres: fan.genres }));
});

router.get("/fans/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid fan ID." });
    return;
  }

  const [fan] = await db
    .select()
    .from(fansTable)
    .where(eq(fansTable.id, id))
    .limit(1);

  if (!fan) {
    res.status(404).json({ error: "Fan not found." });
    return;
  }

  res.json(GetFanResponse.parse({ id: fan.id, displayName: fan.displayName, location: fan.location, genres: fan.genres }));
});

export default router;
