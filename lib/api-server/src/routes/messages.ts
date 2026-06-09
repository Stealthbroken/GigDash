import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import {
  db,
  conversationsTable,
  messagesTable,
  usersTable,
  venuesTable,
  artistsTable,
  eventsTable,
  eventArtistOutreachTable,
  eventArtistsTable,
} from "@workspace/db";
import {
  ListConversationsResponse,
  GetConversationResponse,
  SendMessageBody,
  SearchChatUsersResponse,
  StartConversationBody,
  ListConversationGigInvitesResponse,
  RespondToGigInviteBody,
  RespondToGigInviteResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function sessionUser(req: { session: unknown }) {
  const session = req.session as Record<string, unknown>;
  return {
    userId: session["userId"] as number | undefined,
    role: session["role"] as string | undefined,
  };
}

function chatAllowed(role: string | undefined) {
  return role === "artist" || role === "venue";
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

async function otherParticipant(conversationId: number, userId: number) {
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId))
    .limit(1);
  if (!conv) return null;
  const otherUserId =
    conv.participant1UserId === userId
      ? conv.participant2UserId
      : conv.participant1UserId;
  const [user] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      role: usersTable.role,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(usersTable)
    .where(eq(usersTable.id, otherUserId))
    .limit(1);
  if (!user) return null;

  let displayName = user.username;
  let profileId: number | null = null;
  if (user.role === "venue") {
    const [venue] = await db
      .select({ id: venuesTable.id, name: venuesTable.name })
      .from(venuesTable)
      .where(eq(venuesTable.userId, user.id))
      .limit(1);
    if (venue) {
      displayName = venue.name;
      profileId = venue.id;
    }
  } else if (user.role === "artist") {
    const [artist] = await db
      .select({ id: artistsTable.id, displayName: artistsTable.displayName })
      .from(artistsTable)
      .where(eq(artistsTable.userId, user.id))
      .limit(1);
    if (artist) {
      displayName = artist.displayName;
      profileId = artist.id;
    }
  }

  return { ...user, displayName, profileId };
}

router.get("/messages/conversations", async (req, res): Promise<void> => {
  const { userId, role } = sessionUser(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  if (!chatAllowed(role)) {
    res.status(403).json({ error: "Chat is only available to artists and venues." });
    return;
  }

  const convs = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        eq(conversationsTable.participant1UserId, userId),
        eq(conversationsTable.participant2UserId, userId),
      ),
    )
    .orderBy(desc(conversationsTable.updatedAt));

  const items = [];
  for (const conv of convs) {
    if (conv.closedByUserId === userId) continue;
    const other = await otherParticipant(conv.id, userId);
    if (!other) continue;

    const [lastMsg] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conv.id))
      .orderBy(desc(messagesTable.createdAt))
      .limit(1);

    items.push({
      id: conv.id,
      otherUser: {
        id: other.id,
        username: other.username,
        displayName: other.displayName,
        role: other.role,
        avatarUrl: other.avatarUrl,
        profileId: other.profileId,
      },
      lastMessage: lastMsg
        ? {
            body: lastMsg.body,
            attachmentType: lastMsg.attachmentType,
            createdAt: lastMsg.createdAt,
          }
        : null,
      updatedAt: conv.updatedAt,
    });
  }

  res.json(ListConversationsResponse.parse({ conversations: items }));
});

router.post("/messages/conversations", async (req, res): Promise<void> => {
  const { userId, role } = sessionUser(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  if (!chatAllowed(role)) {
    res.status(403).json({ error: "Chat is only available to artists and venues." });
    return;
  }

  const parsed = StartConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [target] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, parsed.data.username))
    .limit(1);

  if (!target) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  if (target.id === userId) {
    res.status(400).json({ error: "Cannot start a chat with yourself." });
    return;
  }
  if (!chatAllowed(target.role)) {
    res.status(400).json({ error: "Can only chat with artists or venues." });
    return;
  }

  let conv = await conversationForUsers(userId, target.id);
  if (!conv) {
    const [inserted] = await db
      .insert(conversationsTable)
      .values({
        participant1UserId: Math.min(userId, target.id),
        participant2UserId: Math.max(userId, target.id),
      })
      .returning();
    conv = inserted;
  }

  const other = await otherParticipant(conv.id, userId);
  res.status(201).json({
    id: conv.id,
    otherUser: other
      ? {
          id: other.id,
          username: other.username,
          displayName: other.displayName,
          role: other.role,
          avatarUrl: other.avatarUrl,
          profileId: other.profileId,
        }
      : {
          id: target.id,
          username: target.username,
          displayName: target.username,
          role: target.role,
          avatarUrl: target.avatarUrl,
          profileId: null,
        },
  });
});

router.get("/messages/conversations/:id", async (req, res): Promise<void> => {
  const { userId, role } = sessionUser(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  if (!chatAllowed(role)) {
    res.status(403).json({ error: "Chat is only available to artists and venues." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const convId = parseInt(raw, 10);
  if (isNaN(convId)) {
    res.status(400).json({ error: "Invalid conversation ID." });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId))
    .limit(1);

  if (!conv || (conv.participant1UserId !== userId && conv.participant2UserId !== userId)) {
    res.status(404).json({ error: "Conversation not found." });
    return;
  }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(messagesTable.createdAt);

  const other = await otherParticipant(convId, userId);

  res.json(
    GetConversationResponse.parse({
      id: conv.id,
      otherUser: other
        ? {
            id: other.id,
            username: other.username,
            displayName: other.displayName,
            role: other.role,
            avatarUrl: other.avatarUrl,
            profileId: other.profileId,
          }
        : null,
      messages: msgs.map((m) => ({
        id: m.id,
        senderUserId: m.senderUserId,
        body: m.body,
        attachmentUrl: m.attachmentUrl,
        attachmentType: m.attachmentType,
        attachmentName: m.attachmentName,
        createdAt: m.createdAt,
      })),
    }),
  );
});

router.post("/messages/conversations/:id", async (req, res): Promise<void> => {
  const { userId, role } = sessionUser(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  if (!chatAllowed(role)) {
    res.status(403).json({ error: "Chat is only available to artists and venues." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const convId = parseInt(raw, 10);
  if (isNaN(convId)) {
    res.status(400).json({ error: "Invalid conversation ID." });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { body, attachmentUrl, attachmentType, attachmentName } = parsed.data;
  if (!body?.trim() && !attachmentUrl) {
    res.status(400).json({ error: "Message must have text or an attachment." });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId))
    .limit(1);

  if (!conv || (conv.participant1UserId !== userId && conv.participant2UserId !== userId)) {
    res.status(404).json({ error: "Conversation not found." });
    return;
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({
      conversationId: convId,
      senderUserId: userId,
      body: body?.trim() || null,
      attachmentUrl: attachmentUrl ?? null,
      attachmentType: attachmentType ?? null,
      attachmentName: attachmentName ?? null,
    })
    .returning();

  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date(), closedByUserId: null })
    .where(eq(conversationsTable.id, convId));

  res.status(201).json({
    id: msg.id,
    senderUserId: msg.senderUserId,
    body: msg.body,
    attachmentUrl: msg.attachmentUrl,
    attachmentType: msg.attachmentType,
    attachmentName: msg.attachmentName,
    createdAt: msg.createdAt,
  });
});

router.delete("/messages/conversations/:id", async (req, res): Promise<void> => {
  const { userId, role } = sessionUser(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  if (!chatAllowed(role)) {
    res.status(403).json({ error: "Chat is only available to artists and venues." });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const convId = parseInt(raw, 10);

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId))
    .limit(1);

  if (!conv || (conv.participant1UserId !== userId && conv.participant2UserId !== userId)) {
    res.status(404).json({ error: "Conversation not found." });
    return;
  }

  await db
    .update(conversationsTable)
    .set({ closedByUserId: userId })
    .where(eq(conversationsTable.id, convId));

  res.status(204).send();
});

router.get("/messages/users/search", async (req, res): Promise<void> => {
  const { userId, role } = sessionUser(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  if (!chatAllowed(role)) {
    res.status(403).json({ error: "Chat is only available to artists and venues." });
    return;
  }

  const q = String(req.query.q ?? "").trim();
  if (q.length < 1) {
    res.json(SearchChatUsersResponse.parse({ users: [] }));
    return;
  }

  const pattern = `%${q}%`;
  const rows = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      role: usersTable.role,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(usersTable)
    .where(and(ilike(usersTable.username, pattern), or(eq(usersTable.role, "artist"), eq(usersTable.role, "venue"))))
    .limit(10);

  const users = [];
  for (const row of rows) {
    if (row.id === userId) continue;
    let displayName = row.username;
    let profileId: number | null = null;
    if (row.role === "venue") {
      const [venue] = await db
        .select({ id: venuesTable.id, name: venuesTable.name })
        .from(venuesTable)
        .where(eq(venuesTable.userId, row.id))
        .limit(1);
      if (venue) {
        displayName = venue.name;
        profileId = venue.id;
      }
    } else if (row.role === "artist") {
      const [artist] = await db
        .select({ id: artistsTable.id, displayName: artistsTable.displayName })
        .from(artistsTable)
        .where(eq(artistsTable.userId, row.id))
        .limit(1);
      if (artist) {
        displayName = artist.displayName;
        profileId = artist.id;
      }
    }
    users.push({ ...row, displayName, profileId });
  }

  res.json(SearchChatUsersResponse.parse({ users }));
});

router.get("/messages/conversations/:conversationId/gig-invites", async (req, res): Promise<void> => {
  const { userId, role } = sessionUser(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  if (role !== "artist") {
    res.status(403).json({ error: "Only artists can view gig invites." });
    return;
  }

  const raw = Array.isArray(req.params.conversationId)
    ? req.params.conversationId[0]
    : req.params.conversationId;
  const convId = parseInt(raw, 10);
  if (isNaN(convId)) {
    res.status(400).json({ error: "Invalid conversation ID." });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId))
    .limit(1);

  if (!conv || (conv.participant1UserId !== userId && conv.participant2UserId !== userId)) {
    res.status(404).json({ error: "Conversation not found." });
    return;
  }

  const other = await otherParticipant(convId, userId);
  if (!other || other.role !== "venue") {
    res.json(ListConversationGigInvitesResponse.parse({ invites: [] }));
    return;
  }

  const [artist] = await db
    .select({ id: artistsTable.id })
    .from(artistsTable)
    .where(eq(artistsTable.userId, userId))
    .limit(1);

  if (!artist) {
    res.json(ListConversationGigInvitesResponse.parse({ invites: [] }));
    return;
  }

  const rows = await db
    .select({
      outreachId: eventArtistOutreachTable.id,
      eventId: eventsTable.id,
      eventTitle: eventsTable.title,
      eventDate: eventsTable.eventDate,
      venueId: venuesTable.id,
      venueName: venuesTable.name,
      status: eventArtistOutreachTable.status,
    })
    .from(eventArtistOutreachTable)
    .innerJoin(eventsTable, eq(eventArtistOutreachTable.eventId, eventsTable.id))
    .innerJoin(venuesTable, eq(eventsTable.venueId, venuesTable.id))
    .where(
      and(
        eq(eventArtistOutreachTable.artistId, artist.id),
        eq(eventArtistOutreachTable.status, "pending"),
        eq(venuesTable.userId, other.id),
      ),
    );

  res.json(
    ListConversationGigInvitesResponse.parse({
      invites: rows.map((r) => ({
        outreachId: r.outreachId,
        eventId: r.eventId,
        eventTitle: r.eventTitle,
        eventDate: r.eventDate,
        venueId: r.venueId,
        venueName: r.venueName,
        status: "pending" as const,
      })),
    }),
  );
});

router.post(
  "/messages/conversations/:conversationId/gig-invites/:outreachId/respond",
  async (req, res): Promise<void> => {
    const { userId, role } = sessionUser(req);
    if (!userId) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }
    if (role !== "artist") {
      res.status(403).json({ error: "Only artists can respond to gig invites." });
      return;
    }

    const convRaw = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;
    const outreachRaw = Array.isArray(req.params.outreachId)
      ? req.params.outreachId[0]
      : req.params.outreachId;
    const convId = parseInt(convRaw, 10);
    const outreachId = parseInt(outreachRaw, 10);
    if (isNaN(convId) || isNaN(outreachId)) {
      res.status(400).json({ error: "Invalid ID." });
      return;
    }

    const parsed = RespondToGigInviteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [conv] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, convId))
      .limit(1);

    if (!conv || (conv.participant1UserId !== userId && conv.participant2UserId !== userId)) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }

    const other = await otherParticipant(convId, userId);
    if (!other || other.role !== "venue") {
      res.status(403).json({ error: "This invite is not from the venue in this chat." });
      return;
    }

    const [artist] = await db
      .select({ id: artistsTable.id })
      .from(artistsTable)
      .where(eq(artistsTable.userId, userId))
      .limit(1);

    if (!artist) {
      res.status(403).json({ error: "Artist profile not found." });
      return;
    }

    const [outreach] = await db
      .select({
        id: eventArtistOutreachTable.id,
        eventId: eventArtistOutreachTable.eventId,
        artistId: eventArtistOutreachTable.artistId,
        status: eventArtistOutreachTable.status,
        eventTitle: eventsTable.title,
        venueUserId: venuesTable.userId,
      })
      .from(eventArtistOutreachTable)
      .innerJoin(eventsTable, eq(eventArtistOutreachTable.eventId, eventsTable.id))
      .innerJoin(venuesTable, eq(eventsTable.venueId, venuesTable.id))
      .where(eq(eventArtistOutreachTable.id, outreachId))
      .limit(1);

    if (
      !outreach ||
      outreach.artistId !== artist.id ||
      outreach.status !== "pending" ||
      outreach.venueUserId !== other.id
    ) {
      res.status(404).json({ error: "Gig invite not found." });
      return;
    }

    const newStatus = parsed.data.action === "accept" ? "confirmed" : "declined";

    await db
      .update(eventArtistOutreachTable)
      .set({ status: newStatus })
      .where(eq(eventArtistOutreachTable.id, outreachId));

    if (parsed.data.action === "accept") {
      const [already] = await db
        .select({ id: eventArtistsTable.id })
        .from(eventArtistsTable)
        .where(
          and(
            eq(eventArtistsTable.eventId, outreach.eventId),
            eq(eventArtistsTable.artistId, artist.id),
          ),
        )
        .limit(1);
      if (!already) {
        await db
          .insert(eventArtistsTable)
          .values({ eventId: outreach.eventId, artistId: artist.id });
      }
    } else {
      await db
        .delete(eventArtistsTable)
        .where(
          and(
            eq(eventArtistsTable.eventId, outreach.eventId),
            eq(eventArtistsTable.artistId, artist.id),
          ),
        );
    }

    const responseBody =
      parsed.data.action === "accept"
        ? `✅ Accepted the gig invite for "${outreach.eventTitle}". See you there!`
        : `Declined the gig invite for "${outreach.eventTitle}".`;

    await db.insert(messagesTable).values({
      conversationId: convId,
      senderUserId: userId,
      body: responseBody,
    });
    await db
      .update(conversationsTable)
      .set({ updatedAt: new Date(), closedByUserId: null })
      .where(eq(conversationsTable.id, convId));

    const [row] = await db
      .select({
        id: eventArtistOutreachTable.id,
        artistId: eventArtistOutreachTable.artistId,
        displayName: artistsTable.displayName,
        username: usersTable.username,
        genres: artistsTable.genres,
        status: eventArtistOutreachTable.status,
        notes: eventArtistOutreachTable.notes,
        eventId: eventsTable.id,
        eventTitle: eventsTable.title,
        eventDate: eventsTable.eventDate,
      })
      .from(eventArtistOutreachTable)
      .innerJoin(artistsTable, eq(eventArtistOutreachTable.artistId, artistsTable.id))
      .innerJoin(usersTable, eq(artistsTable.userId, usersTable.id))
      .innerJoin(eventsTable, eq(eventArtistOutreachTable.eventId, eventsTable.id))
      .where(eq(eventArtistOutreachTable.id, outreachId))
      .limit(1);

    res.json(RespondToGigInviteResponse.parse(row));
  },
);

export default router;