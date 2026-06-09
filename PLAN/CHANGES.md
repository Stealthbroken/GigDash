# GigDash Completion Changes

**Date:** June 6, 2026  
**Author:** Grok (AI assistant)  
**Based on:** `PLAN/CS Project Management.pdf` and `PLAN/CS Project Management (1).pdf`

This document lists all changes made to bring GigDash toward full completion per the project plan.

---

## Summary

The app was partially built (fan map, auth, onboarding, venue event creation). This pass implemented the remaining major features: improved filtering, artist event map, messaging, follow/artist profiles, venue editing, artist search, ratings, and supporting backend APIs/database tables.

---

## Database (new tables & columns)

| Change | Files |
|--------|-------|
| `conversations` + `messages` tables for artist/venue chat | `lib/db/src/schema/messages.ts` |
| `ratings` table (artist↔venue mutual ratings, 30-day cooldown) | `lib/db/src/schema/ratings.ts` |
| `artist_blocked_dates` table | `lib/db/src/schema/artist-blocked-dates.ts` |
| `fan_follows_venues` table | `lib/db/src/schema/fan-follows-venues.ts` |
| `fans`: added `spotifyUrl`, `appleMusicUrl`, `tidalUrl` | `lib/db/src/schema/fans.ts` |
| `artists`: added `rateTier` (1–5 for venue search filters) | `lib/db/src/schema/artists.ts` |

Run `pnpm --filter @workspace/db run push` after pulling (already applied in dev).

---

## API (new & updated endpoints)

### Events (`lib/api-server/src/routes/events.ts`)
- `city` query param for town/city filtering
- `artistName` filter (joins event_artists + artists)
- `skipProximity=true` to show filtered results beyond map radius
- `ownerUsername` on venue objects (for artist→venue messaging)

### Artists (`lib/api-server/src/routes/artists.ts`)
- `GET /artists` — search by genre, rate tier, name
- `GET /artists/:id` — public profile (followers, venues played, ratings)
- `GET/POST/DELETE /artists/me/blocked-dates` — availability blocking

### Fans (`lib/api-server/src/routes/fans.ts`)
- `POST/DELETE /fans/me/follow/:artistId` — follow/unfollow
- `GET /fans/me/followed-venues` + follow/unfollow venue
- Fan profile PATCH supports Spotify/Apple Music/Tidal URLs
- `GET /fans/me/rating-summary`

### Messages (`lib/api-server/src/routes/messages.ts`) — **NEW**
- List/start/close conversations
- Send text, images (base64), files
- Search users by username

### Ratings (`lib/api-server/src/routes/ratings.ts`) — **NEW**
- `POST /ratings` — artists rate venues, venues rate artists
- `GET /ratings/:targetType/:targetId` — average + count

### Venues (`lib/api-server/src/routes/venues.ts`)
- PATCH now persists `imageUrls`

### OpenAPI (`lib/api-spec/openapi.yaml`)
- All new endpoints documented
- Fixed misplaced `FollowedArtist*` schemas (were under `securitySchemes`)
- Regenerate hooks: `pnpm --filter @workspace/api-spec run codegen`

---

## Frontend — Fan experience

| Feature | Files |
|---------|-------|
| Custom genre tags via `CustomTagInput` | `FanMapToolbar.tsx`, `FanHome.tsx` |
| City/town, venue name, artist name filters | `FanMapToolbar.tsx`, `FanHome.tsx` |
| Filtered results in side list even when off-map | `FanHome.tsx`, `MapView.tsx` |
| Highlight events matching fan taste/filters | `MapView.tsx`, `index.css` |
| Recommended events in side list (from fan genres) | `FanHome.tsx` |
| Richer event popups: genre, artists, description, venue | `VenueEventPopup.tsx` |

---

## Frontend — Artist experience

| Feature | Files |
|---------|-------|
| Map shows **events** with ! / ♪ markers (not dummy venues) | `ArtistHome.tsx` |
| Data from `/api/events` (live DB/seed) | `ArtistHome.tsx` |
| Message organizer → opens chat with venue owner | `ArtistHome.tsx`, `ArtistEventPopup.tsx` |
| Fixed-height side list (~5 items, scrollable) | `MapView.tsx`, `index.css` |
| `/artist/chat` messaging page | `ChatPage.tsx`, `App.tsx` |
| Public artist profile `/artist/profile/:id` | `ArtistProfile.tsx` |
| Follow/unfollow from profile (fans) | `ArtistProfile.tsx` |
| Venue rating from profile (venues) | `ArtistProfile.tsx` |

---

## Frontend — Venue experience

| Feature | Files |
|---------|-------|
| Editable venue description, moods, size | `VenueSpacePanel.tsx` |
| Artist search with genre + rate tier filters | `VenueArtistsPanel.tsx` |
| `/venue/chat` messaging page | `ChatPage.tsx`, `App.tsx` |

---

## Frontend — Chat system

- Shared `ChatPage.tsx` for artists and venues
- Conversation list, user search, switch chats, close chats
- Text + image/file attachments (base64, max 500 KB)
- Routes: `/artist/chat`, `/artist/chat/:id`, `/venue/chat`, `/venue/chat/:id`

---

## Not implemented (requires external setup or out of scope)

| Item | Reason |
|------|--------|
| **Google OAuth login** | Needs Google Cloud Console client ID/secret and server OAuth flow — not configured in this repo |
| **Real file upload storage** | Chat attachments use base64 in DB (fine for demo; production would use S3/blob storage) |
| **Apple Music / Spotify API integration** | URLs are stored and displayed; no OAuth listening-habit sync |
| **Fan→artist chat** | Plan specifies artist/venue only; fan chat shell existed, unchanged |

---

## Pre-existing issues not fixed

- `Settings.tsx` references `setUser` without importing from `useAuth` (was already broken)
- `App.tsx` `JSX` namespace errors (pre-existing strict TS config)
- `mockup-sandbox` / `scripts` typecheck failures (unrelated workspaces)

---

## How to test

```bash
pnpm install
pnpm --filter @workspace/db run push
pnpm dev
```

**Seed data:** `npx tsx scripts/src/seed.ts`  
**Logins:** `jazz@example.com` / `Password1` (artist), `alex@example.com` / `Password1` (fan), `venue1@example.com` / `Password1` (venue)

1. **Fan** `/fan` — filter by city, custom genre, artist; click markers for full details
2. **Artist** `/artist` — see planning (!) and finalized (♪) gigs; message organizer
3. **Chat** `/artist/chat` or `/venue/chat` — start chat by username
4. **Artist profile** `/artist/profile/1` — follow as fan, rate as venue
5. **Venue** `/venue` — edit space panel, search artists tab

---

---

## Second pass (June 6, 2026) — Event pages, artist CSS, venue & profile preview

### Event detail pages (`/event/:id`)
| Feature | Files |
|---------|-------|
| Full event page with fan + artist interactions (follow artists/venue, message organizer, rate venue) | `EventProfile.tsx` (existing), wired from map/sidebar/popups |
| Links from fan map sidebar + popups | `MapView.tsx`, `VenueEventPopup.tsx`, `FanHome.tsx` |
| Links from artist map sidebar + popups | `MapView.tsx`, `ArtistEventPopup.tsx`, `ArtistHome.tsx` |
| Links from venue dashboard listings + public venue page | `VenueEventsPanel.tsx`, `VenueProfile.tsx` |
| Artist names on event page → public artist profile | `EventProfile.tsx` |

### Artist page CSS
| Feature | Files |
|---------|-------|
| Amber-themed map/sidebar (mirrors fan emerald theme) | `MapView.tsx` (`artistMode` class prefix), `index.css` |
| Hero, genre/competition prefs panel styling | `ArtistHome.tsx`, `index.css` |
| Fixed nested-button issue in sidebar event cards | `MapView.tsx` |

### Venue public page completion
| Feature | Files |
|---------|-------|
| Stats row (upcoming, total, rating) | `VenueProfile.tsx`, `index.css` |
| Past events section with links to event pages | `VenueProfile.tsx` |
| Role-aware back navigation + “View on map” for fans | `VenueProfile.tsx` |
| Venue owner quick actions (new event + dashboard) | `VenueProfile.tsx` |
| Dashboard event listings link to `/event/:id` | `VenueEventsPanel.tsx` |

### Artist profile preview
| Feature | Files |
|---------|-------|
| `/artist/preview` — artists see their public profile | `App.tsx`, `ArtistProfile.tsx` |
| Preview links in nav, home hero, and settings | `ArtistNav.tsx`, `ArtistHome.tsx`, `Settings.tsx` |
| Public `/artist/profile/:id` viewable by fans, venues, and other artists | `ArtistProfile.tsx` |

### Profile page CSS
| Feature | Files |
|---------|-------|
| Event, artist, and venue public page styles | `index.css` |

---

---

## Third pass (June 6, 2026) — Venue polish, fan/artist UX fixes

### Venue
- Removed all "Coming soon" badges (default off on `VenueSectionCard`)
- Events tab is management-only (no inline create placeholders); create via nav
- **`/venue/event/:id/manage`** — edit event, artist outreach (contacted/confirmed/declined + notes), message artists
- Find artists by **event date/time**; blocked dates excluded (`GET /artists?eventDate=`)
- Messages link in `VenueNav`; venues can message artists from search & manage page
- Settings back nav fixed for venue role → `/venue`
- Overview redesigned: stats, upcoming events, quick actions

### Backend
- `event_artist_outreach` table
- `PATCH /events/:id`, `GET/PUT /events/:id/outreach`
- `artistIds` on event list summaries (for fan following filter)
- `username` on artist search results

### Fan
- Sidebar listing click opens event page (no separate View details button)
- **Following only** map filter (followed venue or artist)
- Fan chat removed; fans cannot message artists/venues

### Artist
- Nav-only Preview profile + Messages (removed duplicate hero buttons)
- **Hide finalized gigs** toggle (default off); amber finalized map pins match legend
- Competition level optional (**Any** default)

---

## Questions for the team

1. **Google login** — Do you have Google OAuth credentials to add, or should we keep email/password only?
2. **Fan chat** — Should fans message artists through the real messages API, or keep the existing fan chat UI separate?
3. **Rate tiers on artists** — Should `rateTier` be editable in artist settings/onboarding, or derived from gig history?