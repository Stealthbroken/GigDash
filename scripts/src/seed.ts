import { db, usersTable, artistsTable, venuesTable, fansTable, eventsTable, eventArtistsTable } from "@workspace/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  const [u1] = await db.insert(usersTable).values({ username: "jazzcat", email: "jazz@example.com", passwordHash: await hash("Password1"), role: "artist" }).returning();
  const [u2] = await db.insert(usersTable).values({ username: "indie_river", email: "indie@example.com", passwordHash: await hash("Password1"), role: "artist" }).returning();
  const [u3] = await db.insert(usersTable).values({ username: "drummerdan", email: "dan@example.com", passwordHash: await hash("Password1"), role: "artist" }).returning();
  const [u4] = await db.insert(usersTable).values({ username: "sofiafolk", email: "sofia@example.com", passwordHash: await hash("Password1"), role: "artist" }).returning();
  const [u5] = await db.insert(usersTable).values({ username: "electro_park", email: "electro@example.com", passwordHash: await hash("Password1"), role: "artist" }).returning();

  const [uv1] = await db.insert(usersTable).values({ username: "the_blue_note", email: "venue1@example.com", passwordHash: await hash("Password1"), role: "venue" }).returning();
  const [uv2] = await db.insert(usersTable).values({ username: "rooftop_live", email: "venue2@example.com", passwordHash: await hash("Password1"), role: "venue" }).returning();
  const [uv3] = await db.insert(usersTable).values({ username: "hideaway_lounge", email: "venue3@example.com", passwordHash: await hash("Password1"), role: "venue" }).returning();
  const [uv4] = await db.insert(usersTable).values({ username: "the_danforth", email: "venue4@example.com", passwordHash: await hash("Password1"), role: "venue" }).returning();
  const [uv5] = await db.insert(usersTable).values({ username: "mod_club", email: "venue5@example.com", passwordHash: await hash("Password1"), role: "venue" }).returning();

  const [uf1] = await db.insert(usersTable).values({ username: "musiclover_alex", email: "alex@example.com", passwordHash: await hash("Password1"), role: "fan" }).returning();

  const [a1] = await db.insert(artistsTable).values({ userId: u1.id, displayName: "The Jazz Cat Quartet", bio: "Four-piece jazz group bringing classic bebop and modern fusion to local stages.", genres: ["Jazz"], vibes: ["Chill", "Acoustic"] }).returning();
  const [a2] = await db.insert(artistsTable).values({ userId: u2.id, displayName: "Indie River", bio: "Indie-folk singer-songwriter with dreamy guitar and warm vocals.", genres: ["Folk", "Pop"], vibes: ["Acoustic", "Chill"], spotifyUrl: "https://open.spotify.com/artist/example" }).returning();
  const [a3] = await db.insert(artistsTable).values({ userId: u3.id, displayName: "Dan Drums", bio: "High-energy drummer with a rock and funk background.", genres: ["Rock"], vibes: ["Energetic", "Headliner-ready"] }).returning();
  const [a4] = await db.insert(artistsTable).values({ userId: u4.id, displayName: "Sofia & The Pines", bio: "Appalachian folk duo with lush harmonies and storytelling roots.", genres: ["Folk", "Country"], vibes: ["Acoustic", "Traditional"] }).returning();
  const [a5] = await db.insert(artistsTable).values({ userId: u5.id, displayName: "Electro Park", bio: "Electronic music producer blending ambient textures with house beats.", genres: ["Electronic"], vibes: ["Energetic", "Experimental"] }).returning();

  const [v1] = await db.insert(venuesTable).values({ userId: uv1.id, name: "The Blue Note", address: "321 Jazz Ave, Toronto, ON", description: "A beloved jazz club with cozy booths and a world-class sound system.", size: "sm", moods: ["Intimate", "Chill", "Bar"], lat: 43.6532, lng: -79.3832 }).returning();
  const [v2] = await db.insert(venuesTable).values({ userId: uv2.id, name: "Rooftop Live", address: "88 King St W, Toronto, ON", description: "An open-air rooftop venue with stunning city views and a lively crowd.", size: "md", moods: ["Rooftop", "Outdoor", "High-energy", "All-ages"], lat: 43.6487, lng: -79.3816 }).returning();
  const [v3] = await db.insert(venuesTable).values({ userId: uv3.id, name: "The Hideaway Lounge", address: "47 Queen St E, Toronto, ON", description: "A hidden gem basement bar with velvet curtains and warm lighting.", size: "xs", moods: ["Lounge", "Formal", "Intimate"], lat: 43.6506, lng: -79.3789 }).returning();
  const [v4] = await db.insert(venuesTable).values({ userId: uv4.id, name: "The Danforth Music Hall", address: "147 Danforth Ave, Toronto, ON", description: "Historic theatre turned concert venue with a grand stage and excellent acoustics.", size: "lg", moods: ["Concert Hall", "High-energy", "All-ages"], lat: 43.6763, lng: -79.3560 }).returning();
  const [v5] = await db.insert(venuesTable).values({ userId: uv5.id, name: "Mod Club Theatre", address: "722 College St, Toronto, ON", description: "Intimate live music venue with a dance floor and a packed calendar.", size: "md", moods: ["Club", "High-energy", "18+"], lat: 43.6547, lng: -79.4113 }).returning();

  await db.insert(fansTable).values({ userId: uf1.id, displayName: "Alex M", location: "Toronto, ON", genres: ["Jazz", "Folk", "Pop"] });

  const now = new Date();
  const day = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  // FINALIZED events (have artists assigned)
  const [e1] = await db.insert(eventsTable).values({ venueId: v1.id, title: "Friday Jazz Night", description: "A weekly showcase of Toronto's finest jazz talent. Come early for the best seats!", genres: ["Jazz"], isPaid: false, eventDate: day(2), durationMinutes: 120, status: "upcoming" }).returning();
  const [e2] = await db.insert(eventsTable).values({ venueId: v2.id, title: "Rooftop Indie Fest", description: "Three acts, one stunning rooftop. Bring your friends and your dancing shoes.", genres: ["Folk", "Pop", "Rock"], isPaid: true, payAmount: "$15", eventDate: day(5), durationMinutes: 180, status: "upcoming" }).returning();
  const [e3] = await db.insert(eventsTable).values({ venueId: v3.id, title: "Acoustic Sunday Sessions", description: "Intimate acoustic sets in the candle-lit Hideaway Lounge. Tickets very limited.", genres: ["Folk", "Country"], isPaid: false, eventDate: day(9), durationMinutes: 90, status: "upcoming" }).returning();
  const [e4] = await db.insert(eventsTable).values({ venueId: v4.id, title: "Danforth Rock Weekend", description: "A full weekend of rock bands taking over the historic Danforth Music Hall.", genres: ["Rock", "Metal"], isPaid: true, payAmount: "$25", eventDate: day(14), durationMinutes: 240, status: "upcoming" }).returning();
  const [e5] = await db.insert(eventsTable).values({ venueId: v5.id, title: "Electronic Thursdays", description: "Weekly electronic music showcase featuring local DJs and producers.", genres: ["Electronic"], isPaid: true, payAmount: "$12", eventDate: day(3), durationMinutes: 150, status: "upcoming" }).returning();

  // PLANNING events (no artists assigned yet)
  const [e6] = await db.insert(eventsTable).values({ venueId: v1.id, title: "Jazz Open Mic Night", description: "Looking for local jazz talent! Open slot for a trio or quartet.", genres: ["Jazz"], isPaid: false, eventDate: day(7), durationMinutes: 120, status: "upcoming" }).returning();
  const [e7] = await db.insert(eventsTable).values({ venueId: v2.id, title: "Summer Sunset Sessions", description: "Rooftop acoustic showcase — seeking singer-songwriters for sunset vibes.", genres: ["Folk", "Pop"], isPaid: false, eventDate: day(11), durationMinutes: 180, status: "upcoming" }).returning();
  const [e8] = await db.insert(eventsTable).values({ venueId: v3.id, title: "Late Night Soul Lounge", description: "Seeking an R&B or soul duo for an intimate late-night set.", genres: ["R&B", "Soul"], isPaid: true, payAmount: "$200", eventDate: day(18), durationMinutes: 120, status: "upcoming" }).returning();
  const [e9] = await db.insert(eventsTable).values({ venueId: v4.id, title: "Classical Evening", description: "Looking for a classical quartet or chamber ensemble for an elegant evening.", genres: ["Classical"], isPaid: true, payAmount: "$500", eventDate: day(21), durationMinutes: 150, status: "upcoming" }).returning();
  const [e10] = await db.insert(eventsTable).values({ venueId: v5.id, title: "Hip-Hop Showcase", description: "Searching for up-and-coming hip-hop acts for a weekly showcase.", genres: ["Hip-Hop"], isPaid: false, eventDate: day(6), durationMinutes: 180, status: "upcoming" }).returning();

  // Link artists to FINALIZED events only
  await db.insert(eventArtistsTable).values([
    { eventId: e1.id, artistId: a1.id, bio: "The Jazz Cat Quartet opens the night with classic bebop." },
    { eventId: e2.id, artistId: a2.id, bio: "Indie River headlines with an extended set of new material." },
    { eventId: e2.id, artistId: a3.id, bio: "Dan Drums closes out the night with a thundering rock set." },
    { eventId: e3.id, artistId: a4.id, bio: "Sofia & The Pines bring their signature Appalachian harmonies." },
    { eventId: e3.id, artistId: a2.id, bio: "Indie River opens with solo acoustic material." },
    { eventId: e4.id, artistId: a3.id, bio: "Dan Drums headlines with a high-energy rock set." },
    { eventId: e5.id, artistId: a5.id, bio: "Electro Park brings ambient house textures to the club." },
  ]);

  console.log("✅ Seed complete! (5 finalized + 5 planning events)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
