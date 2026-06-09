import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import {
  db,
  artistsTable,
  usersTable,
  fanFollowsTable,
  eventsTable,
  eventArtistsTable,
  eventArtistOutreachTable,
  venuesTable,
  artistBlockedDatesTable,
  ratingsTable,
} from "@workspace/db";
import {
  UpdateArtistMeBody,
  UpdateArtistMeResponse,
  ListArtistsResponse,
  GetArtistResponse,
  ListBlockedDatesResponse,
  AddBlockedDateBody,
  ListArtistGigsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildArtistProfile(id: number) {
  const [artist] = await db
    .select({
      id: artistsTable.id,
      displayName: artistsTable.displayName,
      bio: artistsTable.bio,
      genres: artistsTable.genres,
      vibes: artistsTable.vibes,
      spotifyUrl: artistsTable.spotifyUrl,
      youtubeUrl: artistsTable.youtubeUrl,
      rateTier: artistsTable.rateTier,
      userId: artistsTable.userId,
    })
    .from(artistsTable)
    .where(eq(artistsTable.id, id))
    .limit(1);

  if (!artist) return null;

  const [user] = await db
    .select({ avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(eq(usersTable.id, artist.userId))
    .limit(1);

  const [followerCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(fanFollowsTable)
    .where(eq(fanFollowsTable.artistId, id));

  const venueRows = await db
    .selectDistinct({
      id: venuesTable.id,
      name: venuesTable.name,
      address: venuesTable.address,
    })
    .from(eventArtistsTable)
    .innerJoin(eventsTable, eq(eventArtistsTable.eventId, eventsTable.id))
    .innerJoin(venuesTable, eq(eventsTable.venueId, venuesTable.id))
    .where(eq(eventArtistsTable.artistId, id))
    .limit(10);

  const [ratingSummary] = await db
    .select({
      average: sql<number>`COALESCE(AVG(${ratingsTable.score}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(ratingsTable)
    .where(and(eq(ratingsTable.targetType, "artist"), eq(ratingsTable.targetId, id)));

  return GetArtistResponse.parse({
    id: artist.id,
    displayName: artist.displayName,
    bio: artist.bio,
    genres: artist.genres,
    vibes: artist.vibes,
    spotifyUrl: artist.spotifyUrl,
    youtubeUrl: artist.youtubeUrl,
    rateTier: artist.rateTier,
    avatarUrl: user?.avatarUrl ?? null,
    followerCount: Number(followerCount?.count ?? 0),
    venuesPlayed: venueRows,
    ratingAverage: Number(ratingSummary?.average ?? 0),
    ratingCount: Number(ratingSummary?.count ?? 0),
  });
}

router.get("/artists/me", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const [artist] = await db
    .select({ id: artistsTable.id })
    .from(artistsTable)
    .where(eq(artistsTable.userId, userId as number))
    .limit(1);

  if (!artist) {
    res.status(404).json({ error: "Artist profile not found." });
    return;
  }

  const profile = await buildArtistProfile(artist.id);
  if (!profile) {
    res.status(404).json({ error: "Artist not found." });
    return;
  }

  res.json(profile);
});

router.get("/artists/me/gigs", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  const role = session["role"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  if (role !== "artist") {
    res.status(403).json({ error: "Only artist accounts can view gigs." });
    return;
  }

  const [artist] = await db
    .select({ id: artistsTable.id })
    .from(artistsTable)
    .where(eq(artistsTable.userId, userId as number))
    .limit(1);

  if (!artist) {
    res.status(404).json({ error: "Artist profile not found." });
    return;
  }

  const now = new Date();

  const confirmedRows = await db
    .select({
      eventId: eventsTable.id,
      title: eventsTable.title,
      eventDate: eventsTable.eventDate,
      eventStatus: eventsTable.status,
      venueId: venuesTable.id,
      venueName: venuesTable.name,
      venueAddress: venuesTable.address,
      ownerUsername: usersTable.username,
    })
    .from(eventArtistsTable)
    .innerJoin(eventsTable, eq(eventArtistsTable.eventId, eventsTable.id))
    .innerJoin(venuesTable, eq(eventsTable.venueId, venuesTable.id))
    .innerJoin(usersTable, eq(venuesTable.userId, usersTable.id))
    .where(
      and(
        eq(eventArtistsTable.artistId, artist.id),
        sql`${eventsTable.eventDate} >= ${now}`,
        sql`${eventsTable.status} != 'completed'`,
      ),
    );

  const pendingRows = await db
    .select({
      outreachId: eventArtistOutreachTable.id,
      eventId: eventsTable.id,
      title: eventsTable.title,
      eventDate: eventsTable.eventDate,
      eventStatus: eventsTable.status,
      venueId: venuesTable.id,
      venueName: venuesTable.name,
      venueAddress: venuesTable.address,
      ownerUsername: usersTable.username,
    })
    .from(eventArtistOutreachTable)
    .innerJoin(eventsTable, eq(eventArtistOutreachTable.eventId, eventsTable.id))
    .innerJoin(venuesTable, eq(eventsTable.venueId, venuesTable.id))
    .innerJoin(usersTable, eq(venuesTable.userId, usersTable.id))
    .where(
      and(
        eq(eventArtistOutreachTable.artistId, artist.id),
        eq(eventArtistOutreachTable.status, "pending"),
        sql`${eventsTable.eventDate} >= ${now}`,
        sql`${eventsTable.status} != 'completed'`,
      ),
    );

  const confirmedIds = new Set(confirmedRows.map((r) => r.eventId));

  const gigs = [
    ...confirmedRows.map((r) => ({
      eventId: r.eventId,
      outreachId: null,
      title: r.title,
      eventDate: r.eventDate,
      eventStatus: r.eventStatus,
      gigStatus: "confirmed" as const,
      venue: {
        id: r.venueId,
        name: r.venueName,
        address: r.venueAddress,
        ownerUsername: r.ownerUsername,
      },
    })),
    ...pendingRows
      .filter((r) => !confirmedIds.has(r.eventId))
      .map((r) => ({
        eventId: r.eventId,
        outreachId: r.outreachId,
        title: r.title,
        eventDate: r.eventDate,
        eventStatus: r.eventStatus,
        gigStatus: "pending" as const,
        venue: {
          id: r.venueId,
          name: r.venueName,
          address: r.venueAddress,
          ownerUsername: r.ownerUsername,
        },
      })),
  ].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  res.json(ListArtistGigsResponse.parse({ gigs }));
});

router.get("/artists", async (req, res): Promise<void> => {
  const { genre, minRate, maxRate, q, eventDate, limit = "20" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 20, 50);

  let query = db
    .select({
      id: artistsTable.id,
      displayName: artistsTable.displayName,
      username: usersTable.username,
      bio: artistsTable.bio,
      genres: artistsTable.genres,
      vibes: artistsTable.vibes,
      spotifyUrl: artistsTable.spotifyUrl,
      youtubeUrl: artistsTable.youtubeUrl,
      rateTier: artistsTable.rateTier,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(artistsTable)
    .innerJoin(usersTable, eq(artistsTable.userId, usersTable.id))
    .$dynamic();

  if (q?.trim()) {
    query = query.where(ilike(artistsTable.displayName, `%${q.trim()}%`));
  }

  const rows = await query.limit(lim * 3);

  let blockedArtistIds = new Set<number>();
  if (eventDate) {
    // Client sends the event's calendar day as YYYY-MM-DD (local TZ). Older callers may
    // still send a full ISO timestamp — fall back to its UTC date in that case.
    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(eventDate)
      ? eventDate
      : (() => {
          const d = new Date(eventDate);
          return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
        })();

    if (dateStr) {
      const blocked = await db
        .select({ artistId: artistBlockedDatesTable.artistId })
        .from(artistBlockedDatesTable)
        .where(eq(artistBlockedDatesTable.blockedDate, dateStr));
      blockedArtistIds = new Set(blocked.map((b) => b.artistId));
    }
  }

  const filtered = rows
    .filter((r) => !blockedArtistIds.has(r.id))
    .filter((r) => {
      if (!genre) return true;
      return r.genres.some((g) => g.toLowerCase().includes(genre.toLowerCase()));
    })
    .filter((r) => {
      const tier = r.rateTier ?? 2;
      if (minRate && tier < parseInt(minRate, 10)) return false;
      if (maxRate && tier > parseInt(maxRate, 10)) return false;
      return true;
    })
    .slice(0, lim);

  res.json(
    ListArtistsResponse.parse({
      artists: filtered.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        username: r.username,
        bio: r.bio,
        genres: r.genres,
        vibes: r.vibes,
        spotifyUrl: r.spotifyUrl,
        youtubeUrl: r.youtubeUrl,
        rateTier: r.rateTier,
        avatarUrl: r.avatarUrl,
      })),
    }),
  );
});

router.get("/artists/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid artist ID." });
    return;
  }

  const profile = await buildArtistProfile(id);
  if (!profile) {
    res.status(404).json({ error: "Artist not found." });
    return;
  }

  res.json(profile);
});

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
  res.json(
    UpdateArtistMeResponse.parse({
      id: artist.id,
      displayName: artist.displayName,
      bio: artist.bio,
      genres: artist.genres,
      vibes: artist.vibes,
      spotifyUrl: artist.spotifyUrl,
      youtubeUrl: artist.youtubeUrl,
    }),
  );
});

router.get("/artists/me/blocked-dates", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const [artist] = await db
    .select({ id: artistsTable.id })
    .from(artistsTable)
    .where(eq(artistsTable.userId, userId as number))
    .limit(1);

  if (!artist) {
    res.status(404).json({ error: "Artist profile not found." });
    return;
  }

  const rows = await db
    .select({ date: artistBlockedDatesTable.blockedDate })
    .from(artistBlockedDatesTable)
    .where(eq(artistBlockedDatesTable.artistId, artist.id))
    .orderBy(desc(artistBlockedDatesTable.blockedDate));

  res.json(ListBlockedDatesResponse.parse({ dates: rows.map((r) => r.date) }));
});

router.post("/artists/me/blocked-dates", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const parsed = AddBlockedDateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [artist] = await db
    .select({ id: artistsTable.id })
    .from(artistsTable)
    .where(eq(artistsTable.userId, userId as number))
    .limit(1);

  if (!artist) {
    res.status(404).json({ error: "Artist profile not found." });
    return;
  }

  const dateStr =
    parsed.data.date instanceof Date
      ? parsed.data.date.toISOString().slice(0, 10)
      : String(parsed.data.date);

  try {
    await db.insert(artistBlockedDatesTable).values({
      artistId: artist.id,
      blockedDate: dateStr,
    });
  } catch {
    res.status(409).json({ error: "Date already blocked." });
    return;
  }

  res.status(201).json({ date: dateStr });
});

router.delete("/artists/me/blocked-dates/:date", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const dateStr = Array.isArray(req.params.date) ? req.params.date[0] : req.params.date;

  const [artist] = await db
    .select({ id: artistsTable.id })
    .from(artistsTable)
    .where(eq(artistsTable.userId, userId as number))
    .limit(1);

  if (!artist) {
    res.status(404).json({ error: "Artist profile not found." });
    return;
  }

  await db
    .delete(artistBlockedDatesTable)
    .where(
      and(
        eq(artistBlockedDatesTable.artistId, artist.id),
        eq(artistBlockedDatesTable.blockedDate, dateStr),
      ),
    );

  res.status(204).send();
});

export default router;