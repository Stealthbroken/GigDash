import VenueSectionCard from "../VenueSectionCard";
import PlaceholderField from "../PlaceholderField";
import { COMPETITION_LEVELS, VENUE_GENRES } from "@/lib/venueConstants";

export default function VenueEventsPanel() {
  return (
    <div className="space-y-6">
      <VenueSectionCard
        title="Post events & gig slots"
        description="Create listings for artists to discover and apply. Each slot can specify genre, pay, schedule, and how competitive the booking is."
        action={
          <button
            type="button"
            disabled
            className="px-4 py-2 rounded-lg bg-violet-500/40 text-white/70 text-sm font-semibold cursor-not-allowed"
          >
            + New event
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
        <div className="venue-empty-state">
          <span className="text-3xl mb-2 block opacity-60" aria-hidden>
            📅
          </span>
          <p className="text-sm font-medium">No events yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            When event creation launches, your gigs will show here and on the map for fans nearby.
          </p>
        </div>
      </VenueSectionCard>
    </div>
  );
}