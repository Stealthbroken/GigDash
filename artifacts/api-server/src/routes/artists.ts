import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, artistsTable } from "@workspace/db";
import { UpdateArtistMeBody, UpdateArtistMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.patch("/artists/me", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const parsed = UpdateArtistMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { displayName, bio, genres, vibes, spotifyUrl, youtubeUrl } = parsed.data;

  const [artist] = await db
    .update(artistsTable)
    .set({
      displayName,
      bio: bio ?? null,
      genres,
      vibes,
      spotifyUrl: spotifyUrl ?? null,
      youtubeUrl: youtubeUrl ?? null,
    })
    .where(eq(artistsTable.userId, userId as number))
    .returning();

  if (!artist) {
    res.status(404).json({ error: "Artist profile not found." });
    return;
  }

  req.log.info({ userId }, "Artist profile updated");
  res.json(UpdateArtistMeResponse.parse({
    id: artist.id,
    displayName: artist.displayName,
    bio: artist.bio,
    genres: artist.genres,
    vibes: artist.vibes,
    spotifyUrl: artist.spotifyUrl,
    youtubeUrl: artist.youtubeUrl,
  }));
});

export default router;
