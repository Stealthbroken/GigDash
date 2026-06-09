import type { GeoPlace } from "@workspace/api-client-react";
import LocationSearch from "@/components/LocationSearch";
import CustomTagInput from "@/components/onboarding/CustomTagInput";
import { Slider } from "@/components/ui/slider";
import {
  DEFAULT_MAP_CENTER,
  MAX_MAP_RADIUS_KM,
  MIN_MAP_RADIUS_KM,
  MAP_RADIUS_STEP_KM,
} from "@/lib/constants";

const GENRE_OPTIONS = [
  "All",
  "Jazz",
  "Pop",
  "Folk",
  "Rock",
  "Hip-Hop",
  "Electronic",
  "Classical",
  "R&B",
  "Country",
  "Metal",
];

const GENRE_STYLES: Record<string, string> = {
  Jazz: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Pop: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Folk: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Rock: "bg-red-500/20 text-red-400 border-red-500/30",
  "Hip-Hop": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Electronic: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Classical: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  "R&B": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Country: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Metal: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

function genreColor(genre: string): string {
  return GENRE_STYLES[genre] ?? "bg-muted text-muted-foreground border-border";
}

interface FanMapToolbarProps {
  mapLocationInput: string;
  onMapLocationInputChange: (value: string) => void;
  viewPlace: GeoPlace | null;
  onViewPlaceChange: (place: GeoPlace | null) => void;
  radiusKm: number;
  onRadiusKmChange: (km: number) => void;
  venueFilter: string;
  onVenueFilterChange: (value: string) => void;
  cityFilter: string;
  onCityFilterChange: (value: string) => void;
  artistFilter: string;
  onArtistFilterChange: (value: string) => void;
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  customGenres: string[];
  onAddCustomGenre: (genre: string) => void;
  onRemoveCustomGenre: (genre: string) => void;
  eventCount: number;
  isUpdating: boolean;
  mapExplored?: boolean;
  hasActiveFilters?: boolean;
  followingOnly?: boolean;
  onFollowingOnlyChange?: (value: boolean) => void;
}

export default function FanMapToolbar({
  mapLocationInput,
  onMapLocationInputChange,
  viewPlace,
  onViewPlaceChange,
  radiusKm,
  onRadiusKmChange,
  venueFilter,
  onVenueFilterChange,
  cityFilter,
  onCityFilterChange,
  artistFilter,
  onArtistFilterChange,
  selectedGenre,
  onGenreChange,
  customGenres,
  onAddCustomGenre,
  onRemoveCustomGenre,
  eventCount,
  isUpdating,
  mapExplored = false,
  hasActiveFilters = false,
  followingOnly = false,
  onFollowingOnlyChange,
}: FanMapToolbarProps) {
  const placeShort =
    viewPlace?.label.split(",").slice(0, 2).join(",").trim() ?? "this area";

  return (
    <div className="fan-map-toolbar pointer-events-auto" aria-label="Map search and filters">
      <div className="fan-map-toolbar__primary">
        <div className="fan-map-toolbar__location">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="fan-map-toolbar__pin shrink-0"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <LocationSearch
            value={mapLocationInput}
            onChange={onMapLocationInputChange}
            selectedPlace={viewPlace}
            onPlaceSelect={onViewPlaceChange}
            onClear={() =>
              onViewPlaceChange({
                label: DEFAULT_MAP_CENTER.label,
                lat: DEFAULT_MAP_CENTER.lat,
                lng: DEFAULT_MAP_CENTER.lng,
              })
            }
            placeholder="Search city or postal code…"
            aria-label="Map location"
            inputClassName="fan-search-input fan-map-toolbar__search-input"
          />
        </div>

        <div className="fan-map-toolbar__radius">
          <div className="fan-map-toolbar__radius-head">
            <span className="fan-map-toolbar__radius-label">Radius</span>
            <span className="fan-map-toolbar__radius-value tabular-nums">{radiusKm} km</span>
          </div>
          <Slider
            min={MIN_MAP_RADIUS_KM}
            max={MAX_MAP_RADIUS_KM}
            step={MAP_RADIUS_STEP_KM}
            value={[radiusKm]}
            onValueChange={([v]) => onRadiusKmChange(v)}
            aria-label={`Search radius, ${radiusKm} kilometers`}
            className="fan-map-toolbar__slider"
          />
        </div>

        <span className="fan-map-toolbar__count tabular-nums" aria-live="polite">
          {isUpdating ? (
            <span className="text-muted-foreground">…</span>
          ) : (
            <>
              <span className="fan-map-toolbar__count-num">{eventCount}</span>
              <span className="fan-map-toolbar__count-label">gig{eventCount !== 1 ? "s" : ""}</span>
            </>
          )}
        </span>
      </div>

      <div className="fan-map-toolbar__secondary">
        {onFollowingOnlyChange && (
          <button
            type="button"
            onClick={() => onFollowingOnlyChange(!followingOnly)}
            className={`fan-following-filter shrink-0 px-3 py-1 rounded-full border text-[10px] font-semibold transition-all ${
              followingOnly
                ? "fan-following-filter--active"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            ★ Following only
          </button>
        )}
        <div className="fan-map-toolbar__venue">
          <input
            type="search"
            value={cityFilter}
            onChange={(e) => onCityFilterChange(e.target.value)}
            placeholder="Filter by city or town…"
            className="fan-map-toolbar__venue-input"
          />
        </div>
        <div className="fan-map-toolbar__venue">
          <input
            type="search"
            value={venueFilter}
            onChange={(e) => onVenueFilterChange(e.target.value)}
            placeholder="Venue name…"
            className="fan-map-toolbar__venue-input"
          />
        </div>
        <div className="fan-map-toolbar__venue">
          <input
            type="search"
            value={artistFilter}
            onChange={(e) => onArtistFilterChange(e.target.value)}
            placeholder="Artist name…"
            className="fan-map-toolbar__venue-input"
          />
        </div>

        <div className="fan-genre-scroll fan-map-toolbar__genres flex gap-1 overflow-x-auto scrollbar-none">
          {GENRE_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGenreChange(g)}
              className={`fan-genre-chip shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-semibold transition-all ${
                selectedGenre === g
                  ? "fan-genre-chip--active"
                  : g === "All"
                    ? "fan-genre-chip--all"
                    : `border ${genreColor(g)} hover:opacity-90`
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <CustomTagInput
          accent="emerald"
          tags={customGenres}
          onAdd={(tag) => {
            onAddCustomGenre(tag);
            onGenreChange(tag);
          }}
          onRemove={onRemoveCustomGenre}
        />
      </div>

      {viewPlace && (
        <p className="fan-map-toolbar__hint">
          {hasActiveFilters ? (
            <>Filters active — showing all matching gigs sorted by distance{mapExplored ? " (browsing)" : ""}</>
          ) : mapExplored ? (
            <>Browsing freely · use Return to view on the map for {radiusKm} km near {placeShort}</>
          ) : (
            <>
              Within {radiusKm} km of {placeShort}
              {eventCount === 0 && !isUpdating ? " · none in range — try widening radius" : ""}
            </>
          )}
        </p>
      )}
    </div>
  );
}