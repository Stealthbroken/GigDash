import type { GeoPlace } from "@workspace/api-client-react";
import LocationSearch from "@/components/LocationSearch";
import { Slider } from "@/components/ui/slider";
import {
  DEFAULT_MAP_CENTER,
  MAX_MAP_RADIUS_KM,
  MIN_MAP_RADIUS_KM,
  MAP_RADIUS_STEP_KM,
} from "@/lib/constants";

interface ArtistMapToolbarProps {
  mapLocationInput: string;
  onMapLocationInputChange: (value: string) => void;
  viewPlace: GeoPlace | null;
  onViewPlaceChange: (place: GeoPlace | null) => void;
  radiusKm: number;
  onRadiusKmChange: (km: number) => void;
  venueFilter: string;
  onVenueFilterChange: (value: string) => void;
  venueCount: number;
  isUpdating: boolean;
  mapExplored?: boolean;
}

export default function ArtistMapToolbar({
  mapLocationInput,
  onMapLocationInputChange,
  viewPlace,
  onViewPlaceChange,
  radiusKm,
  onRadiusKmChange,
  venueFilter,
  onVenueFilterChange,
  venueCount,
  isUpdating,
  mapExplored = false,
}: ArtistMapToolbarProps) {
  const placeShort =
    viewPlace?.label.split(",").slice(0, 2).join(",").trim() ?? "this area";

  return (
    <div className="artist-map-toolbar pointer-events-auto" aria-label="Map search and filters">
      <div className="artist-map-toolbar__primary">
        <div className="artist-map-toolbar__location">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="artist-map-toolbar__pin shrink-0"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
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
            inputClassName="artist-search-input artist-map-toolbar__search-input"
            accent="violet" // reuse violet-ish but we'll style amber in css
          />
        </div>

        <div className="artist-map-toolbar__radius">
          <div className="artist-map-toolbar__radius-head">
            <span className="artist-map-toolbar__radius-label">Radius</span>
            <span className="artist-map-toolbar__radius-value tabular-nums">{radiusKm} km</span>
          </div>
          <Slider
            min={MIN_MAP_RADIUS_KM}
            max={MAX_MAP_RADIUS_KM}
            step={MAP_RADIUS_STEP_KM}
            value={[radiusKm]}
            onValueChange={([v]) => onRadiusKmChange(v)}
            aria-label={`Search radius, ${radiusKm} kilometers`}
            className="artist-map-toolbar__slider"
          />
        </div>

        <span className="artist-map-toolbar__count tabular-nums" aria-live="polite">
          {isUpdating ? (
            <span className="text-muted-foreground">…</span>
          ) : (
            <>
              <span className="artist-map-toolbar__count-num">{venueCount}</span>
              <span className="artist-map-toolbar__count-label">
                venue{venueCount !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </span>
      </div>

      <div className="artist-map-toolbar__secondary">
        <div className="artist-map-toolbar__venue">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="shrink-0 w-3.5 h-3.5 text-muted-foreground/80"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="search"
            value={venueFilter}
            onChange={(e) => onVenueFilterChange(e.target.value)}
            placeholder="Venue name…"
            className="artist-map-toolbar__venue-input"
          />
          {venueFilter.length > 0 && (
            <button
              type="button"
              onClick={() => onVenueFilterChange("")}
              className="artist-map-toolbar__venue-clear"
              aria-label="Clear venue filter"
            >
              ✕
            </button>
          )}
        </div>

        <div className="artist-map-toolbar__hint-inline">
          {viewPlace && (
            <span>
              {mapExplored
                ? `Browsing map · ${venueCount} visible`
                : `Within ${radiusKm} km of ${placeShort}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
