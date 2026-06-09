import { Router, type IRouter } from "express";
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  db,
  eventsTable,
  venuesTable,
  eventArtistsTable,
  artistsTable,
  usersTable,
  eventArtistOutreachTable,
  conversationsTable,
  messagesTable,
} from "@workspace/db";
import {
  ListEventsResponse,
  GetEventResponse,
  CreateEventBody,
  UpdateEventBody,
  ListEventOutreachResponse,
  UpsertEventOutreachBody,
  UpsertEventOutreachResponse,
} from "@workspace/api-zod";
import { distanceKm, isValidCoordinates } from "../lib/geocode";
import { validateImageUrlList } from "../lib/account";

const router: IRouter = Router();

router.get("/events", async (req, res): Promise<void> => {
  const {
    genre,
    location,
    city,
    nearLat,
    nearLng,
    radiusKm,
    artistName,
    skipProximity,
    limit = "20",
    offset = "0",
  } = req.query as Record<string, string>;

  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const off = parseInt(offset, 10) || 0;
  const locationFilter = city || location;

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
      venueOwnerUsername: usersTable.username,
      artistCount: sql<number>`(SELECT COUNT(*) FROM event_artists WHERE event_artists.event_id = ${eventsTable.id})`.as("artistCount"),
    })
    .from(eventsTable)
    .innerJoin(venuesTable, eq(eventsTable.venueId, venuesTable.id))
    .innerJoin(usersTable, eq(venuesTable.userId, usersTable.id))
    .$dynamic();

  if (locationFilter) {
    const pattern = `%${locationFilter}%`;
    query = query.where(
      or(ilike(venuesTable.address, pattern), ilike(venuesTable.name, pattern)),
    );
  }

  const rows = await query.limit(lim * 3).offset(off);

  const centerLat = nearLat != null ? Number(nearLat) : NaN;
  const centerLng = nearLng != null ? Number(nearLng) : NaN;
  const radius = Math.min(Math.max(Number(radiusKm) || 10, 1), 50);
  const useProximity =
    skipProximity !== "true" && isValidCoordinates(centerLat, centerLng);

  let artistFilteredIds: Set<number> | null = null;
  if (artistName?.trim()) {
    const pattern = `%${artistName.trim()}%`;
    const artistRows = await db
      .select({ eventId: eventArtistsTable.eventId })
      .from(eventArtistsTable)
      .innerJoin(artistsTable, eq(eventArtistsTable.artistId, artistsTable.id))
      .where(ilike(artistsTable.displayName, pattern));
    artistFilteredIds = new Set(artistRows.map((r) => r.eventId));
  }

  const filteredRows = rows
    .filter((r) => {
      if (!genre) return true;
      return r.genres.some((g: string) => g.toLowerCase().includes(genre.toLowerCase()));
    })
    .filter((r) => {
      if (!artistFilteredIds) return true;
      return artistFilteredIds.has(r.id);
    })
    .filter((r) => {
      if (!useProximity) return true;
      if (r.venueLat == null || r.venueLng == null) return false;
      return distanceKm(centerLat, centerLng, r.venueLat, r.venueLng) <= radius;
    })
    .slice(0, lim);

  const eventIds = filteredRows.map((r) => r.id);
  const artistIdsByEvent = new Map<number, number[]>();
  if (eventIds.length > 0) {
    const artistLinks = await db
      .select({
        eventId: eventArtistsTable.eventId,
        artistId: eventArtistsTable.artistId,
      })
      .from(eventArtistsTable)
      .where(inArray(eventArtistsTable.eventId, eventIds));
    for (const link of artistLinks) {
      const list = artistIdsByEvent.get(link.eventId) ?? [];
      list.push(link.artistId);
      artistIdsByEvent.set(link.eventId, list);
    }
  }

  const events = filteredRows.map((r) => ({
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
      artistIds: artistIdsByEvent.get(r.id) ?? [],
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
        ownerUsername: r.venueOwnerUsername,
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
      venueOwnerUsername: usersTable.username,
    })
    .from(eventsTable)
    .innerJoin(venuesTable, eq(eventsTable.venueId, venuesTable.id))
    .innerJoin(usersTable, eq(venuesTable.userId, usersTable.id))
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
        ownerUsername: row.venueOwnerUsername,
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

  const imageErr = validateImageUrlList(data.imageUrls, 6);
  if (imageErr) {
    res.status(400).json({ error: imageErr });
    return;
  }

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

async function assertVenueOwnsEvent(eventId: number, userId: number) {
  const [row] = await db
    .select({ venueUserId: venuesTable.userId })
    .from(eventsTable)
    .innerJoin(venuesTable, eq(eventsTable.venueId, venuesTable.id))
    .where(eq(eventsTable.id, eventId))
    .limit(1);
  if (!row) return { ok: false as const, status: 404, error: "Event not found." };
  if (row.venueUserId !== userId) return { ok: false as const, status: 403, error: "Not your event." };
  return { ok: true as const };
}

async function fetchEventDetail(id: number) {
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
      venueOwnerUsername: usersTable.username,
    })
    .from(eventsTable)
    .innerJoin(venuesTable, eq(eventsTable.venueId, venuesTable.id))
    .innerJoin(usersTable, eq(venuesTable.userId, usersTable.id))
    .where(eq(eventsTable.id, id))
    .limit(1);

  if (!row) return null;

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

  return GetEventResponse.parse({
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
    artistCount: artistRows.length,
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
      ownerUsername: row.venueOwnerUsername,
    },
    artists: artistRows,
  });
}

async function conversationForUsers(userA: number, userB: number) {
  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        and(
          eq(conversationsTable.participant1UserId, userA),
          eq(conversationsTable.participant2UserId, userB),
        ),
        and(
          eq(conversationsTable.participant1UserId, userB),
          eq(conversationsTable.participant2UserId, userA),
        ),
      ),
    )
    .limit(1);
  return existing ?? null;
}

async function sendGigInviteChatMessage(
  venueUserId: number,
  artistUserId: number,
  eventTitle: string,
  eventDate: Date,
) {
  let conv = await conversationForUsers(venueUserId, artistUserId);
  if (!conv) {
    const [inserted] = await db
      .insert(conversationsTable)
      .values({
        participant1UserId: Math.min(venueUserId, artistUserId),
        participant2UserId: Math.max(venueUserId, artistUserId),
      })
      .returning();
    conv = inserted;
  }
  const dateStr = eventDate.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  await db.insert(messagesTable).values({
    conversationId: conv!.id,
    senderUserId: venueUserId,
    body: `🎤 Gig invite: "${eventTitle}" on ${dateStr}. Accept or decline below to confirm your slot.`,
  });
  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date(), closedByUserId: null })
    .where(eq(conversationsTable.id, conv!.id));
}

router.patch("/events/:id", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  const role = session["role"];
  if (!userId || role !== "venue") {
    res.status(403).json({ error: "Only venue accounts can update events." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid event ID." });
    return;
  }

  const owned = await assertVenueOwnsEvent(id, userId as number);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }

  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  if (data.isCompetition && (data.competitionLevel == null || data.competitionLevel < 1 || data.competitionLevel > 5)) {
    res.status(400).json({ error: "Select a competition level between 1 and 5 when marking as a competition." });
    return;
  }

  if (data.imageUrls !== undefined) {
    const imageErr = validateImageUrlList(data.imageUrls, 6);
    if (imageErr) {
      res.status(400).json({ error: imageErr });
      return;
    }
  }

  const patch: Record<string, unknown> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.description !== undefined) patch.description = data.description;
  if (data.artistRequirements !== undefined) patch.artistRequirements = data.artistRequirements;
  if (data.imageUrls !== undefined) patch.imageUrls = data.imageUrls;
  if (data.genres !== undefined) patch.genres = data.genres;
  if (data.isPaid !== undefined) patch.isPaid = data.isPaid;
  if (data.payAmount !== undefined) patch.payAmount = data.payAmount;
  if (data.isCompetition !== undefined) {
    patch.isCompetition = data.isCompetition;
    patch.competitionLevel = data.isCompetition ? (data.competitionLevel ?? null) : null;
  } else if (data.competitionLevel !== undefined) {
    patch.competitionLevel = data.competitionLevel;
  }
  if (data.eventDate !== undefined) patch.eventDate = data.eventDate;
  if (data.durationMinutes !== undefined) patch.durationMinutes = data.durationMinutes;

  if (data.status !== undefined) {
    if (data.status === "finalized") {
      const [lineup] = await db
        .select({ count: sql<number>`COUNT(*)`.as("count") })
        .from(eventArtistsTable)
        .where(eq(eventArtistsTable.eventId, id));
      if (Number(lineup?.count) < 1) {
        res.status(400).json({ error: "Add at least one confirmed artist before finalizing." });
        return;
      }
    }
    patch.status = data.status;
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "No fields to update." });
    return;
  }

  await db.update(eventsTable).set(patch).where(eq(eventsTable.id, id));

  const detail = await fetchEventDetail(id);
  if (!detail) {
    res.status(404).json({ error: "Event not found." });
    return;
  }
  res.json(detail);
});

router.get("/events/:id/outreach", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  const role = session["role"];
  if (!userId || role !== "venue") {
    res.status(403).json({ error: "Only venue accounts can view outreach." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid event ID." });
    return;
  }

  const owned = await assertVenueOwnsEvent(id, userId as number);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }

  const rows = await db
    .select({
      id: eventArtistOutreachTable.id,
      artistId: eventArtistOutreachTable.artistId,
      displayName: artistsTable.displayName,
      username: usersTable.username,
      genres: artistsTable.genres,
      status: eventArtistOutreachTable.status,
      notes: eventArtistOutreachTable.notes,
    })
    .from(eventArtistOutreachTable)
    .innerJoin(artistsTable, eq(eventArtistOutreachTable.artistId, artistsTable.id))
    .innerJoin(usersTable, eq(artistsTable.userId, usersTable.id))
    .where(eq(eventArtistOutreachTable.eventId, id));

  res.json(
    ListEventOutreachResponse.parse({
      outreach: rows.map((r) => ({
        id: r.id,
        artistId: r.artistId,
        displayName: r.displayName,
        username: r.username,
        genres: r.genres,
        status: r.status,
        notes: r.notes,
      })),
    }),
  );
});

router.put("/events/:id/outreach", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  const role = session["role"];
  if (!userId || role !== "venue") {
    res.status(403).json({ error: "Only venue accounts can manage outreach." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid event ID." });
    return;
  }

  const owned = await assertVenueOwnsEvent(id, userId as number);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }

  const parsed = UpsertEventOutreachBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { artistId, status, notes } = parsed.data;

  const [existing] = await db
    .select({ id: eventArtistOutreachTable.id, status: eventArtistOutreachTable.status })
    .from(eventArtistOutreachTable)
    .where(and(eq(eventArtistOutreachTable.eventId, id), eq(eventArtistOutreachTable.artistId, artistId)))
    .limit(1);

  let outreachId: number;

  if (status === "confirmed") {
    if (!existing || existing.status !== "confirmed") {
      res.status(400).json({
        error: "Artists must accept before they can be confirmed. Send a gig invite instead.",
      });
      return;
    }
    await db
      .update(eventArtistOutreachTable)
      .set({ notes: notes ?? null })
      .where(eq(eventArtistOutreachTable.id, existing.id));
    outreachId = existing.id;
  } else if (existing) {
    await db
      .update(eventArtistOutreachTable)
      .set({ status, notes: notes ?? null })
      .where(eq(eventArtistOutreachTable.id, existing.id));
    outreachId = existing.id;
  } else {
    const [inserted] = await db
      .insert(eventArtistOutreachTable)
      .values({ eventId: id, artistId, status, notes: notes ?? null })
      .returning({ id: eventArtistOutreachTable.id });
    outreachId = inserted!.id;
  }

  if (status === "pending") {
    const [eventRow] = await db
      .select({ title: eventsTable.title, eventDate: eventsTable.eventDate })
      .from(eventsTable)
      .where(eq(eventsTable.id, id))
      .limit(1);
    const [artistUser] = await db
      .select({ userId: artistsTable.userId })
      .from(artistsTable)
      .where(eq(artistsTable.id, artistId))
      .limit(1);
    if (eventRow && artistUser) {
      await sendGigInviteChatMessage(
        userId as number,
        artistUser.userId,
        eventRow.title,
        eventRow.eventDate,
      );
    }
  }

  if (status === "declined" || status === "contacted") {
    await db
      .delete(eventArtistsTable)
      .where(and(eq(eventArtistsTable.eventId, id), eq(eventArtistsTable.artistId, artistId)));
  }

  const [row] = await db
    .select({
      id: eventArtistOutreachTable.id,
      artistId: eventArtistOutreachTable.artistId,
      displayName: artistsTable.displayName,
      username: usersTable.username,
      genres: artistsTable.genres,
      status: eventArtistOutreachTable.status,
      notes: eventArtistOutreachTable.notes,
    })
    .from(eventArtistOutreachTable)
    .innerJoin(artistsTable, eq(eventArtistOutreachTable.artistId, artistsTable.id))
    .innerJoin(usersTable, eq(artistsTable.userId, usersTable.id))
    .where(eq(eventArtistOutreachTable.id, outreachId))
    .limit(1);

  res.json(UpsertEventOutreachResponse.parse(row));
});

router.delete("/events/:id/artists/:artistId", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"];
  const role = session["role"];
  if (!userId || role !== "venue") {
    res.status(403).json({ error: "Only venue accounts can manage lineups." });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawArtistId = Array.isArray(req.params.artistId) ? req.params.artistId[0] : req.params.artistId;
  const eventId = parseInt(rawId, 10);
  const artistId = parseInt(rawArtistId, 10);
  if (isNaN(eventId) || isNaN(artistId)) {
    res.status(400).json({ error: "Invalid ID." });
    return;
  }

  const owned = await assertVenueOwnsEvent(eventId, userId as number);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }

  await db
    .delete(eventArtistsTable)
    .where(and(eq(eventArtistsTable.eventId, eventId), eq(eventArtistsTable.artistId, artistId)));

  const [outreach] = await db
    .select({ id: eventArtistOutreachTable.id })
    .from(eventArtistOutreachTable)
    .where(and(eq(eventArtistOutreachTable.eventId, eventId), eq(eventArtistOutreachTable.artistId, artistId)))
    .limit(1);

  if (outreach) {
    await db
      .update(eventArtistOutreachTable)
      .set({ status: "contacted" })
      .where(eq(eventArtistOutreachTable.id, outreach.id));
  }

  res.status(204).send();
});

export default router;
