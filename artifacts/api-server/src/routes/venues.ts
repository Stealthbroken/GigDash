import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, venuesTable } from "@workspace/db";
import { UpdateVenueMeBody, UpdateVenueMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.patch("/venues/me", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const parsed = UpdateVenueMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, address, description, size, moods } = parsed.data;

  const [venue] = await db
    .update(venuesTable)
    .set({
      name,
      address,
      description: description ?? null,
      size: size ?? null,
      moods,
    })
    .where(eq(venuesTable.userId, userId as number))
    .returning();

  if (!venue) {
    res.status(404).json({ error: "Venue profile not found." });
    return;
  }

  req.log.info({ userId }, "Venue profile updated");
  res.json(UpdateVenueMeResponse.parse({
    id: venue.id,
    name: venue.name,
    address: venue.address,
    description: venue.description,
    size: venue.size,
    moods: venue.moods,
    imageUrls: venue.imageUrls,
    lat: venue.lat,
    lng: venue.lng,
  }));
});

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
