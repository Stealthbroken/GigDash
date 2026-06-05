import { useLocation } from "wouter";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useListEvents } from "@workspace/api-client-react";
import type { EventSummary } from "@workspace/api-client-react";
import { useVenueMe } from "@/hooks/use-venue-me";
import VenueSectionCard from "../VenueSectionCard";
import PlaceholderField from "../PlaceholderField";
import { COMPETITION_LEVELS, VENUE_GENRES } from "@/lib/venueConstants";

export default function VenueEventsPanel() {
  const [, navigate] = useLocation();
  const { data: venue } = useVenueMe();
  const { data: eventsData, isLoading } = useListEvents({ limit: 100 });

  const myVenueId = venue?.id;
  const myEvents: EventSummary[] = (eventsData?.events ?? []).filter(
    (e) => e.venue?.id === myVenueId
  );

  return (
    <div className="space-y-6">
      <VenueSectionCard
        title="Post events & gig slots"
        description="Create listings for artists to discover and apply. Each slot can specify genre, pay, schedule, and how competitive the booking is."
        action={
          <button
            type="button"
            onClick={() => navigate("/venue/create-event")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" /> New event
          </button>
        }
      >
        <div className="venue-placeholder-grid">
          <PlaceholderField
            label="Event title"
            hint="Name shown to artists and fans"
            type="text"
          />
          <PlaceholderField
            label="Genres"
            hint={`Pick from ${VENUE_GENRES.length} defaults + add custom`}
            type="tags"
          />
          <PlaceholderField
            label="Paid or unpaid"
            hint="Pay amount visible to artists only; currency from venue location"
            type="toggle"
          />
          <PlaceholderField
            label="Date, time & length"
            hint="Defaults to now; adjustable per slot"
            type="datetime"
          />
          <PlaceholderField
            label="Competition level"
            hint="5 levels — how selective this slot is"
            type="select"
          />
        </div>
        <ul className="mt-4 space-y-2">
          {COMPETITION_LEVELS.map((c) => (
            <li
              key={c.level}
              className="flex gap-3 text-xs text-muted-foreground rounded-lg border border-border/50 px-3 py-2"
            >
              <span className="font-bold text-violet-400 tabular-nums w-4">{c.level}</span>
              <span>
                <span className="text-foreground/90 font-medium">{c.label}</span> — {c.description}
              </span>
            </li>
          ))}
        </ul>
      </VenueSectionCard>

      <VenueSectionCard
        title="Artist & fan spaces"
        description="Each gig can expose different details to artists (pay, competition, slot length) versus fans (show time, vibe, ticket info). Currency for pay follows your venue location."
      >
        <div className="venue-audience-grid">
          <div className="venue-audience-card">
            <p className="venue-audience-card__title">Artist-facing</p>
            <p className="venue-audience-card__desc text-xs text-muted-foreground mb-3">
              Paid/unpaid, rate, competition level, load-in notes, genre fit
            </p>
            <PlaceholderField label="Artist listing copy" type="textarea" />
          </div>
          <div className="venue-audience-card">
            <p className="venue-audience-card__title">Fan-facing</p>
            <p className="venue-audience-card__desc text-xs text-muted-foreground mb-3">
              Public title, doors time, environment tags, map pin when published
            </p>
            <PlaceholderField label="Fan listing copy" type="textarea" />
          </div>
        </div>
      </VenueSectionCard>

      <VenueSectionCard
        title="Your listings"
        description="Manage draft and published events. Published gigs appear on the fan discover map."
      >
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading your events…</div>
        ) : myEvents.length === 0 ? (
          <div className="venue-empty-state">
            <span className="text-3xl mb-2 block opacity-60" aria-hidden>
              📅
            </span>
            <p className="text-sm font-medium">No events yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Create your first event — it will show here and on the map for fans.
            </p>
            <button
              onClick={() => navigate("/venue/create-event")}
              className="mt-3 text-sm px-3 py-1.5 rounded-md bg-violet-500/90 hover:bg-violet-500 text-white"
            >
              + Create your first event
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {myEvents.map((ev) => {
              const d = new Date(ev.eventDate);
              const comp =
                ev.isCompetition && ev.competitionLevel
                  ? COMPETITION_LEVELS.find((c) => c.level === ev.competitionLevel)
                  : null;
              return (
                <div
                  key={ev.id}
                  className="rounded-lg border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{ev.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(d, "PPP p")}
                      {ev.durationMinutes ? ` • ${ev.durationMinutes} min` : ""}
                    </div>
                    {ev.genres && ev.genres.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ev.genres.slice(0, 4).map((g) => (
                          <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary">
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {ev.isPaid && ev.payAmount && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        {ev.payAmount}
                      </span>
                    )}
                    {comp && (
                      <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-400">
                        Level {comp.level}
                      </span>
                    )}
                    <span className="text-muted-foreground">{ev.artistCount ?? 0} artists</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </VenueSectionCard>
    </div>
  );
}