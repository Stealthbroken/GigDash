import { Router, type IRouter } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, eventsTable, venuesTable, eventArtistsTable, artistsTable } from "@workspace/db";
import { ListEventsResponse, GetEventResponse, CreateEventBody } from "@workspace/api-zod";
import { distanceKm, isValidCoordinates } from "../lib/geocode";

const router: IRouter = Router();

router.get("/events", async (req, res): Promise<void> => {
  const { genre, location, nearLat, nearLng, radiusKm, limit = "20", offset = "0" } =
    req.query as Record<string, string>;

  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const off = parseInt(offset, 10) || 0;

  let query = db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      description: eventsTable.description,
      artistRequirements: eventsTable.artistRequirements,
      imageUrls: eventsTable.imageUrls,
      genres: eventsTable.genres,
      isPaid: eventsTable.isPaid,
      payAmount: eventsTable.payAmount,
      isCompetition: eventsTable.isCompetition,
      competitionLevel: eventsTable.competitionLevel,
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
    const pattern = `%${location}%`;
    query = query.where(
      or(ilike(venuesTable.address, pattern), ilike(venuesTable.name, pattern)),
    );
  }

  const rows = await query.limit(lim).offset(off);

  const centerLat = nearLat != null ? Number(nearLat) : NaN;
  const centerLng = nearLng != null ? Number(nearLng) : NaN;
  const radius = Math.min(Math.max(Number(radiusKm) || 10, 1), 10);
  const useProximity = isValidCoordinates(centerLat, centerLng);

  const events = rows
    .filter((r) => {
      if (!genre) return true;
      return r.genres.some((g: string) => g.toLowerCase().includes(genre.toLowerCase()));
    })
    .filter((r) => {
      if (!useProximity) return true;
      if (r.venueLat == null || r.venueLng == null) return false;
      return distanceKm(centerLat, centerLng, r.venueLat, r.venueLng) <= radius;
    })
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      artistRequirements: r.artistRequirements,
      imageUrls: r.imageUrls,
      genres: r.genres,
      isPaid: r.isPaid,
      payAmount: r.payAmount,
      isCompetition: r.isCompetition,
      competitionLevel: r.competitionLevel,
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
        lat: r.venueLat != null ? Number(r.venueLat) : null,
        lng: r.venueLng != null ? Number(r.venueLng) : null,
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
      artistRequirements: eventsTable.artistRequirements,
      imageUrls: eventsTable.imageUrls,
      genres: eventsTable.genres,
      isPaid: eventsTable.isPaid,
      payAmount: eventsTable.payAmount,
      isCompetition: eventsTable.isCompetition,
      competitionLevel: eventsTable.competitionLevel,
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
      artistRequirements: row.artistRequirements,
      imageUrls: row.imageUrls,
      genres: row.genres,
      isPaid: row.isPaid,
      payAmount: row.payAmount,
      isCompetition: row.isCompetition,
      competitionLevel: row.competitionLevel,
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
        lat: row.venueLat != null ? Number(row.venueLat) : null,
        lng: row.venueLng != null ? Number(row.venueLng) : null,
      },
      artists: artistRows,
    }),
  );
});

router.post("/events", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  const role = session["role"];
  if (!userId || role !== "venue") {
    res.status(403).json({ error: "Only venue accounts can create events." });
    return;
  }

  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;

  // Resolve the caller's venue profile
  const [venue] = await db
    .select({ id: venuesTable.id })
    .from(venuesTable)
    .where(eq(venuesTable.userId, userId as number))
    .limit(1);

  if (!venue) {
    res.status(404).json({ error: "Venue profile not found." });
    return;
  }

  // Basic conditional validation for competition
  if (data.isCompetition && (data.competitionLevel == null || data.competitionLevel < 1 || data.competitionLevel > 5)) {
    res.status(400).json({ error: "Select a competition level between 1 and 5 when marking as a competition." });
    return;
  }

  try {
    const [inserted] = await db
      .insert(eventsTable)
      .values({
        venueId: venue.id,
        title: data.title,
        description: data.description ?? null,
        artistRequirements: data.artistRequirements ?? null,
        imageUrls: data.imageUrls ?? [],
        genres: data.genres ?? [],
        isPaid: data.isPaid ?? false,
        payAmount: data.payAmount ?? null,
        isCompetition: data.isCompetition ?? false,
        competitionLevel: data.isCompetition ? (data.competitionLevel ?? null) : null,
        eventDate: data.eventDate,
        durationMinutes: data.durationMinutes ?? null,
        status: "upcoming",
      })
      .returning({ id: eventsTable.id });

    if (!inserted?.id) {
      res.status(500).json({ error: "Failed to create event." });
      return;
    }

    // Re-fetch with joins to return a full EventDetail (artists empty for new event)
    const [row] = await db
      .select({
        id: eventsTable.id,
        title: eventsTable.title,
        description: eventsTable.description,
        artistRequirements: eventsTable.artistRequirements,
        imageUrls: eventsTable.imageUrls,
        genres: eventsTable.genres,
        isPaid: eventsTable.isPaid,
        payAmount: eventsTable.payAmount,
        isCompetition: eventsTable.isCompetition,
        competitionLevel: eventsTable.competitionLevel,
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
      .where(eq(eventsTable.id, inserted.id))
      .limit(1);

    if (!row) {
      res.status(500).json({ error: "Event created but could not load details." });
      return;
    }

    const eventDetail = {
      id: row.id,
      title: row.title,
      description: row.description,
      artistRequirements: row.artistRequirements,
      imageUrls: row.imageUrls,
      genres: row.genres,
      isPaid: row.isPaid,
      payAmount: row.payAmount,
      isCompetition: row.isCompetition,
      competitionLevel: row.competitionLevel,
      eventDate: row.eventDate,
      durationMinutes: row.durationMinutes,
      status: row.status,
      artistCount: 0,
      venue: {
        id: row.venueId,
        name: row.venueName,
        address: row.venueAddress,
        description: row.venueDescription,
        size: row.venueSize,
        moods: row.venueMoods,
        imageUrls: row.venueImageUrls,
        lat: row.venueLat != null ? Number(row.venueLat) : null,
        lng: row.venueLng != null ? Number(row.venueLng) : null,
      },
      artists: [],
    };

    res.status(201).json(GetEventResponse.parse(eventDetail));
  } catch (err) {
    req.log?.error?.({ err }, "Error creating event");
    res.status(500).json({ error: "Could not create event. Please try again." });
  }
});

export default router;
