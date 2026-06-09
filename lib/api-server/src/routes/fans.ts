import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  fansTable,
  fanFollowsTable,
  fanFollowsVenuesTable,
  artistsTable,
  usersTable,
  eventsTable,
  eventArtistsTable,
  venuesTable,
  ratingsTable,
} from "@workspace/db";
import {
  GetFanResponse,
  ListFollowedArtistsResponse,
  ListFollowedVenuesResponse,
  UpdateFanMeBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function fanProfilePayload(fan: {
  id: number;
  displayName: string;
  location: string | null;
  genres: string[];
  spotifyUrl?: string | null;
  appleMusicUrl?: string | null;
  tidalUrl?: string | null;
}) {
  return GetFanResponse.parse({
    id: fan.id,
    displayName: fan.displayName,
    location: fan.location,
    genres: fan.genres,
    spotifyUrl: fan.spotifyUrl ?? null,
    appleMusicUrl: fan.appleMusicUrl ?? null,
    tidalUrl: fan.tidalUrl ?? null,
  });
}

async function getFanForUser(userId: number) {
  const [fan] = await db
    .select()
    .from(fansTable)
    .where(eq(fansTable.userId, userId))
    .limit(1);
  return fan ?? null;
}

router.get("/fans/me/followed-artists", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const fan = await getFanForUser(userId as number);
  if (!fan) {
    res.status(404).json({ error: "Fan profile not found." });
    return;
  }

  const followed = await db
    .select({
      id: artistsTable.id,
      displayName: artistsTable.displayName,
      genres: artistsTable.genres,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(fanFollowsTable)
    .innerJoin(artistsTable, eq(fanFollowsTable.artistId, artistsTable.id))
    .innerJoin(usersTable, eq(artistsTable.userId, usersTable.id))
    .where(eq(fanFollowsTable.fanId, fan.id));

  const artistIds = followed.map((a) => a.id);
  const recentByArtist = new Map<
    number,
    {
      eventId: number;
      title: string;
      venueName: string;
      venueAddress: string;
      eventDate: Date;
      status: string;
    }
  >();

  if (artistIds.length > 0) {
    const gigRows = await db
      .select({
        artistId: eventArtistsTable.artistId,
        eventId: eventsTable.id,
        title: eventsTable.title,
        eventDate: eventsTable.eventDate,
        status: eventsTable.status,
        venueName: venuesTable.name,
        venueAddress: venuesTable.address,
      })
      .from(eventArtistsTable)
      .innerJoin(eventsTable, eq(eventArtistsTable.eventId, eventsTable.id))
      .innerJoin(venuesTable, eq(eventsTable.venueId, venuesTable.id))
      .where(
        and(
          inArray(eventArtistsTable.artistId, artistIds),
          eq(eventsTable.status, "completed"),
        ),
      )
      .orderBy(desc(eventsTable.eventDate));

    for (const row of gigRows) {
      if (!recentByArtist.has(row.artistId)) {
        recentByArtist.set(row.artistId, {
          eventId: row.eventId,
          title: row.title,
          venueName: row.venueName,
          venueAddress: row.venueAddress,
          eventDate: row.eventDate,
          status: row.status,
        });
      }
    }
  }

  const artists = followed.map((a) => {
    const gig = recentByArtist.get(a.id);
    return {
      id: a.id,
      displayName: a.displayName,
      avatarUrl: a.avatarUrl,
      genres: a.genres,
      recentGig: gig
        ? {
            eventId: gig.eventId,
            title: gig.title,
            venueName: gig.venueName,
            venueAddress: gig.venueAddress,
            eventDate: gig.eventDate,
            status: gig.status,
          }
        : null,
    };
  });

  res.json(ListFollowedArtistsResponse.parse({ artists }));
});

router.get("/fans/me", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const fan = await getFanForUser(userId as number);
  if (!fan) {
    res.status(404).json({ error: "Fan profile not found." });
    return;
  }

  res.json(fanProfilePayload(fan));
});

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

  const { displayName, location, genres, spotifyUrl, appleMusicUrl, tidalUrl } = parsed.data;

  const [fan] = await db
    .update(fansTable)
    .set({
      displayName,
      location: location ?? null,
      genres,
      spotifyUrl: spotifyUrl ?? null,
      appleMusicUrl: appleMusicUrl ?? null,
      tidalUrl: tidalUrl ?? null,
    })
    .where(eq(fansTable.userId, userId as number))
    .returning();

  if (!fan) {
    res.status(404).json({ error: "Fan profile not found." });
    return;
  }

  req.log.info({ userId }, "Fan profile updated");
  res.json(fanProfilePayload(fan));
});

router.post("/fans/me/follow/:artistId", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const raw = Array.isArray(req.params.artistId) ? req.params.artistId[0] : req.params.artistId;
  const artistId = parseInt(raw, 10);
  if (isNaN(artistId)) {
    res.status(400).json({ error: "Invalid artist ID." });
    return;
  }

  const fan = await getFanForUser(userId as number);
  if (!fan) {
    res.status(404).json({ error: "Fan profile not found." });
    return;
  }

  const [artist] = await db
    .select({ id: artistsTable.id })
    .from(artistsTable)
    .where(eq(artistsTable.id, artistId))
    .limit(1);

  if (!artist) {
    res.status(404).json({ error: "Artist not found." });
    return;
  }

  try {
    await db.insert(fanFollowsTable).values({ fanId: fan.id, artistId });
  } catch {
    res.status(409).json({ error: "Already following this artist." });
    return;
  }

  res.status(201).json({ ok: true });
});

router.delete("/fans/me/follow/:artistId", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const raw = Array.isArray(req.params.artistId) ? req.params.artistId[0] : req.params.artistId;
  const artistId = parseInt(raw, 10);

  const fan = await getFanForUser(userId as number);
  if (!fan) {
    res.status(404).json({ error: "Fan profile not found." });
    return;
  }

  await db
    .delete(fanFollowsTable)
    .where(and(eq(fanFollowsTable.fanId, fan.id), eq(fanFollowsTable.artistId, artistId)));

  res.status(204).send();
});

router.get("/fans/me/followed-venues", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const fan = await getFanForUser(userId as number);
  if (!fan) {
    res.status(404).json({ error: "Fan profile not found." });
    return;
  }

  const rows = await db
    .select({
      id: venuesTable.id,
      name: venuesTable.name,
      address: venuesTable.address,
      description: venuesTable.description,
      lat: venuesTable.lat,
      lng: venuesTable.lng,
    })
    .from(fanFollowsVenuesTable)
    .innerJoin(venuesTable, eq(fanFollowsVenuesTable.venueId, venuesTable.id))
    .where(eq(fanFollowsVenuesTable.fanId, fan.id));

  res.json(ListFollowedVenuesResponse.parse({ venues: rows }));
});

router.post("/fans/me/follow-venue/:venueId", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const raw = Array.isArray(req.params.venueId) ? req.params.venueId[0] : req.params.venueId;
  const venueId = parseInt(raw, 10);

  const fan = await getFanForUser(userId as number);
  if (!fan) {
    res.status(404).json({ error: "Fan profile not found." });
    return;
  }

  const [venue] = await db
    .select({ id: venuesTable.id })
    .from(venuesTable)
    .where(eq(venuesTable.id, venueId))
    .limit(1);

  if (!venue) {
    res.status(404).json({ error: "Venue not found." });
    return;
  }

  try {
    await db.insert(fanFollowsVenuesTable).values({ fanId: fan.id, venueId });
  } catch {
    res.status(409).json({ error: "Already following this venue." });
    return;
  }

  res.status(201).json({ ok: true });
});

router.delete("/fans/me/follow-venue/:venueId", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const raw = Array.isArray(req.params.venueId) ? req.params.venueId[0] : req.params.venueId;
  const venueId = parseInt(raw, 10);

  const fan = await getFanForUser(userId as number);
  if (!fan) {
    res.status(404).json({ error: "Fan profile not found." });
    return;
  }

  await db
    .delete(fanFollowsVenuesTable)
    .where(and(eq(fanFollowsVenuesTable.fanId, fan.id), eq(fanFollowsVenuesTable.venueId, venueId)));

  res.status(204).send();
});

router.get("/fans/me/rating-summary", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const [summary] = await db
    .select({
      average: sql<number>`COALESCE(AVG(${ratingsTable.score}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(ratingsTable)
    .where(and(eq(ratingsTable.raterUserId, userId as number), eq(ratingsTable.raterRole, "fan")));

  res.json({
    average: Number(summary?.average ?? 0),
    count: Number(summary?.count ?? 0),
  });
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

  res.json(fanProfilePayload(fan));
});

export default router;