import VenueSectionCard from "../VenueSectionCard";
import PlaceholderField from "../PlaceholderField";
import { VENUE_GENRES } from "@/lib/venueConstants";

export default function VenueArtistsPanel() {
  return (
    <div className="space-y-6">
      <VenueSectionCard
        title="Find artists"
        description="Search and filter local talent to reach out about your open slots. Filters match artist profiles and availability."
      >
        <div className="venue-placeholder-grid venue-placeholder-grid--filters">
          <PlaceholderField
            label="Genre"
            hint={VENUE_GENRES.join(", ")}
            type="tags"
          />
          <PlaceholderField label="Price range" hint="Min–max; artist-visible rates" type="text" />
          <PlaceholderField label="Location" hint="Distance from your venue" type="text" />
          <PlaceholderField label="Dates available" hint="Overlap with your event dates" type="datetime" />
        </div>
        <button
          type="button"
          disabled
          className="mt-4 w-full sm:w-auto px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground cursor-not-allowed"
        >
          Search artists
        </button>
      </VenueSectionCard>

      <VenueSectionCard title="Saved & contacted" description="Track artists you've messaged or shortlisted.">
        <div className="venue-empty-state">
          <span className="text-3xl mb-2 block opacity-60" aria-hidden>
            🎸
          </span>
          <p className="text-sm font-medium">No artist results yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Artist discovery and direct outreach will live here.
          </p>
        </div>
      </VenueSectionCard>
    </div>
  );
}