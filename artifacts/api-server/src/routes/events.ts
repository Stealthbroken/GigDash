import { Router, type IRouter } from "express";
import { eq, ilike, sql } from "drizzle-orm";
import { db, eventsTable, venuesTable, eventArtistsTable, artistsTable } from "@workspace/db";
import { ListEventsResponse, GetEventResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events", async (req, res): Promise<void> => {
  const { genre, location, limit = "20", offset = "0" } = req.query as Record<string, string>;

  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const off = parseInt(offset, 10) || 0;

  let query = db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      description: eventsTable.description,
      genres: eventsTable.genres,
      isPaid: eventsTable.isPaid,
      eventDate: eventsTable.eventDate,
      durationMinutes: eventsTable.durationMinutes,
      status: eventsTable.status,
      venueId: venuesTable.id,
      venueName: venuesTable.name,
      venueAddress: venuesTable.address,
      venueDescription: venuesTable.description,
      venueSize: venuesTable.size,
      venueMoods: venuesTable.moods,
      venueImageUrls: venuesTable.imageUrls,
      venueLat: venuesTable.lat,
      venueLng: venuesTable.lng,
      artistCount: sql<number>`(SELECT COUNT(*) FROM event_artists WHERE event_artists.event_id = ${eventsTable.id})`.as("artistCount"),
    })
    .from(eventsTable)
    .innerJoin(venuesTable, eq(eventsTable.venueId, venuesTable.id))
    .$dynamic();

  if (location) {
    query = query.where(ilike(venuesTable.address, `%${location}%`));
  }

  const rows = await query.limit(lim).offset(off);

  const events = rows
    .filter((r) => {
      if (!genre) return true;
      return r.genres.some((g: string) => g.toLowerCase().includes(genre.toLowerCase()));
    })
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      genres: r.genres,
      isPaid: r.isPaid,
      eventDate: r.eventDate,
      durationMinutes: r.durationMinutes,
      status: r.status,
      artistCount: Number(r.artistCount) || 0,
      venue: {
        id: r.venueId,
        name: r.venueName,
        address: r.venueAddress,
        description: r.venueDescription,
        size: r.venueSize,
        moods: r.venueMoods,
        imageUrls: r.venueImageUrls,
        lat: r.venueLat,
        lng: r.venueLng,
      },
    }));

  res.json(ListEventsResponse.parse({ events, total: events.length }));
});

router.get("/events/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid event ID." });
    return;
  }

  const [row] = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      description: eventsTable.description,
      genres: eventsTable.genres,
      isPaid: eventsTable.isPaid,
      eventDate: eventsTable.eventDate,
      durationMinutes: eventsTable.durationMinutes,
      status: eventsTable.status,
      venueId: venuesTable.id,
      venueName: venuesTable.name,
      venueAddress: venuesTable.address,
      venueDescription: venuesTable.description,
      venueSize: venuesTable.size,
      venueMoods: venuesTable.moods,
      venueImageUrls: venuesTable.imageUrls,
      venueLat: venuesTable.lat,
      venueLng: venuesTable.lng,
    })
    .from(eventsTable)
    .innerJoin(venuesTable, eq(eventsTable.venueId, venuesTable.id))
    .where(eq(eventsTable.id, id))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Event not found." });
    return;
  }

  const artistRows = await db
    .select({
      id: artistsTable.id,
      displayName: artistsTable.displayName,
      genres: artistsTable.genres,
      bio: eventArtistsTable.bio,
    })
    .from(eventArtistsTable)
    .innerJoin(artistsTable, eq(eventArtistsTable.artistId, artistsTable.id))
    .where(eq(eventArtistsTable.eventId, id));

  const artistCount = artistRows.length;

  res.json(
    GetEventResponse.parse({
      id: row.id,
      title: row.title,
      description: row.description,
      genres: row.genres,
      isPaid: row.isPaid,
      eventDate: row.eventDate,
      durationMinutes: row.durationMinutes,
      status: row.status,
      artistCount,
      venue: {
        id: row.venueId,
        name: row.venueName,
        address: row.venueAddress,
        description: row.venueDescription,
        size: row.venueSize,
        moods: row.venueMoods,
        imageUrls: row.venueImageUrls,
        lat: row.venueLat,
        lng: row.venueLng,
      },
      artists: artistRows,
    }),
  );
});

export default router;
