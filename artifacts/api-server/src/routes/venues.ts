import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, venuesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/venues/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid venue ID." });
    return;
  }

  const [venue] = await db
    .select()
    .from(venuesTable)
    .where(eq(venuesTable.id, id))
    .limit(1);

  if (!venue) {
    res.status(404).json({ error: "Venue not found." });
    return;
  }

  res.json({
    id: venue.id,
    name: venue.name,
    address: venue.address,
    description: venue.description,
    size: venue.size,
    moods: venue.moods,
    imageUrls: venue.imageUrls,
    lat: venue.lat,
    lng: venue.lng,
  });
});

export default router;
