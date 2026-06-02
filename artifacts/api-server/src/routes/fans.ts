import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, fansTable } from "@workspace/db";
import { GetFanResponse } from "@workspace/api-zod";

const router: IRouter = Router();

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
