import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  fansTable,
  fanFollowsTable,
  artistsTable,
  usersTable,
  eventsTable,
  eventArtistsTable,
  venuesTable,
} from "@workspace/db";
import { GetFanResponse, ListFollowedArtistsResponse, UpdateFanMeBody } from "@workspace/api-zod";

const router: IRouter = Router();

function fanProfilePayload(fan: {
  id: number;
  displayName: string;
  location: string | null;
  genres: string[];
}) {
  return GetFanResponse.parse({
    id: fan.id,
    displayName: fan.displayName,
    location: fan.location,
    genres: fan.genres,
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

  const { displayName, location, genres } = parsed.data;

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
  res.json(fanProfilePayload(fan));
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