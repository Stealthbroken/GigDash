import { Link } from "wouter";
import type { VenueMe } from "@/hooks/use-venue-me";
import { VENUE_SIZES } from "@/lib/venueConstants";

const SIZE_LABEL = Object.fromEntries(VENUE_SIZES.map((s) => [s.id, s.label]));

interface VenueOverviewPanelProps {
  venue: VenueMe;
}

export default function VenueOverviewPanel({ venue }: VenueOverviewPanelProps) {
  const moods = venue.moods ?? [];
  const images = venue.imageUrls ?? [];
  const hasMapPin = venue.lat != null && venue.lng != null;

  return (
    <div className="space-y-6">
      <div className="venue-hero rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-card to-card p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/90 mb-2">
          Your venue
        </p>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-2">{venue.name}</h1>
        <p className="text-sm text-muted-foreground flex items-start gap-2">
          <span className="text-violet-400 shrink-0" aria-hidden>
            📍
          </span>
          {venue.address}
        </p>
        {hasMapPin && (
          <p className="text-xs text-emerald-400/90 mt-2">Listed on the fan map with coordinates saved.</p>
        )}
        {!hasMapPin && (
          <p className="text-xs text-amber-400/90 mt-2">
            Add a verified address in onboarding or settings to appear on the fan map.
          </p>
        )}
        {venue.id > 0 && (
          <Link
            href={`/venue/${venue.id}`}
            className="inline-block mt-4 text-sm font-medium text-violet-400 hover:text-violet-300 hover:underline"
          >
            View public venue page →
          </Link>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.slice(0, 3).map((src, i) => (
            <div key={i} className="aspect-[4/3] rounded-lg border border-border overflow-hidden">
              <img src={src} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="venue-roadmap rounded-xl border border-border/70 bg-muted/30 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Dashboard sections
        </p>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
          <li>
            <span className="text-violet-400 font-medium">Events & gigs</span> — post slots, genres, pay,
            schedule, competition
          </li>
          <li>
            <span className="text-violet-400 font-medium">Venue & space</span> — description, environment,
            size, floor plan
          </li>
          <li>
            <span className="text-violet-400 font-medium">Find artists</span> — filter by genre, price,
            location, availability
          </li>
          <li>
            <span className="text-violet-400 font-medium">Public page</span> — what fans see on the map
          </li>
        </ul>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border/70 bg-background/50 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Capacity</p>
          <p className="font-medium text-sm">
            {venue.size ? (SIZE_LABEL[venue.size] ?? venue.size) : "Not set"}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/50 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Environment</p>
          <p className="font-medium text-sm">
            {moods.length > 0 ? `${moods.length} tags` : "Not set"}
          </p>
        </div>
      </div>

      {venue.description && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Description
          </h3>
          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
            {venue.description}
          </p>
        </div>
      )}
    </div>
  );
}