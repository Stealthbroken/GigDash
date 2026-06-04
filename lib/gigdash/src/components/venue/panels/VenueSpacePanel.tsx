import VenueSectionCard from "../VenueSectionCard";
import PlaceholderField from "../PlaceholderField";
import { DESCRIPTION_MAX_WORDS, VENUE_ENVIRONMENT_TAGS, VENUE_SIZES } from "@/lib/venueConstants";
import type { VenueMe } from "@/hooks/use-venue-me";

interface VenueSpacePanelProps {
  venue: VenueMe;
}

export default function VenueSpacePanel({ venue }: VenueSpacePanelProps) {
  const moods = venue.moods ?? [];
  const wordCount = (venue.description ?? "").split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <VenueSectionCard
        title="Venue description"
        description={`Short pitch for artists and fans (${DESCRIPTION_MAX_WORDS} words max).`}
        comingSoon={false}
      >
        {venue.description ? (
          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
            {venue.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No description saved yet.</p>
        )}
        <p className="text-xs text-muted-foreground mt-2 tabular-nums">
          {wordCount} / {DESCRIPTION_MAX_WORDS} words
        </p>
        <PlaceholderField label="Edit description" type="textarea" />
      </VenueSectionCard>

      <VenueSectionCard
        title="Environment & atmosphere"
        description="Multi-select tags (20 presets + custom) so artists know your vibe."
        comingSoon={false}
      >
        {moods.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {moods.map((m) => (
              <span
                key={m}
                className="px-2.5 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-medium"
              >
                {m}
              </span>
            ))}
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground mb-3">
          Available tags: {VENUE_ENVIRONMENT_TAGS.slice(0, 6).join(", ")}… + custom
        </p>
        <PlaceholderField label="Environment tags" type="tags" />
      </VenueSectionCard>

      <VenueSectionCard
        title="Size & floor plan"
        description="Capacity tier plus optional venue map with measurements for staging and load-in."
      >
        <div className="venue-placeholder-grid">
          <PlaceholderField label="Venue size" hint={VENUE_SIZES.map((s) => s.label).join(" · ")} type="select" />
          <PlaceholderField
            label="Floor plan"
            hint="Upload image with dimensions for artists"
            type="file"
          />
        </div>
      </VenueSectionCard>
    </div>
  );
}