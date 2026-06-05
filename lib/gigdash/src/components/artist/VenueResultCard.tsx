import { useState } from "react";
import { MapPin } from "lucide-react";

export interface VenueCardData {
  id: number;
  name: string;
  address: string;
  description: string;
  moods: string[];
  imageUrl: string;
  lat?: number;
  lng?: number;
}

interface VenueResultCardProps {
  venue: VenueCardData;
  distanceKm?: number;
  matchScore?: number; // 0-100 for recs
  matchReason?: string;
  isContacted?: boolean;
  variant?: "compact" | "full";
  onMessage: (venue: VenueCardData) => void;
  onSelectForMap?: (venue: VenueCardData) => void;
  selected?: boolean;
}

export default function VenueResultCard({
  venue,
  distanceKm,
  matchScore,
  matchReason,
  isContacted = false,
  variant = "full",
  onMessage,
  onSelectForMap,
  selected = false,
}: VenueResultCardProps) {
  const [imgError, setImgError] = useState(false);
  const shortDesc = venue.description.length > 110
    ? venue.description.slice(0, 107) + "…"
    : venue.description;

  const isCompact = variant === "compact";

  const handleMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMessage(venue);
  };

  const handleCardClick = () => {
    if (onSelectForMap) onSelectForMap(venue);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`artist-venue-card group w-full text-left rounded-xl border overflow-hidden transition-all ${
        isCompact ? "artist-venue-card--compact" : ""
      } ${selected ? "artist-venue-card--selected ring-1 ring-amber-500/60" : ""} ${
        onSelectForMap ? "cursor-pointer hover:border-amber-500/40" : ""
      }`}
    >
      {isCompact ? (
        <div className="p-3 flex gap-3">
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/60">
            {!imgError ? (
              <img
                src={venue.imageUrl}
                alt={venue.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-900/30 to-muted flex items-center justify-center text-lg">🎸</div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm leading-tight truncate pr-1">{venue.name}</p>
              {distanceKm != null && (
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/80 mt-0.5">
                  {distanceKm.toFixed(1)} km
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="h-3 w-3" /> {venue.address}
            </p>
            <p className="text-[11px] text-muted-foreground/90 line-clamp-1 mt-1">{shortDesc}</p>

            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {venue.moods.slice(0, 3).map((m) => (
                <span key={m} className="artist-tag text-[10px]">{m}</span>
              ))}
              {isContacted && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Contacted</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleMessage}
              className="mt-2.5 w-full text-xs font-medium py-1.5 rounded-lg border border-amber-500/60 text-amber-400 hover:bg-amber-500/10 active:bg-amber-500/15 transition-colors"
            >
              {isContacted ? "Message again" : "Message owner"}
            </button>
          </div>
        </div>
      ) : (
        // FULL / recommendation banner style
        <div>
          <div className="artist-venue-banner relative h-28">
            {!imgError ? (
              <img
                src={venue.imageUrl}
                alt={venue.name}
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-amber-950/70 via-muted to-background" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white/95 text-sm font-semibold drop-shadow line-clamp-1">{venue.name}</p>
              <p className="text-white/80 text-[10px] mt-0.5 line-clamp-2 leading-tight">{shortDesc}</p>
            </div>
            {matchScore != null && (
              <div className="absolute top-2 right-2 bg-black/70 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-500/40 tabular-nums">
                {matchScore}% match
              </div>
            )}
          </div>

          <div className="p-3 space-y-2 bg-card">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{venue.address}</span>
              {distanceKm != null && (
                <span className="ml-auto tabular-nums text-foreground/70">· {distanceKm.toFixed(1)} km</span>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {venue.moods.map((tag) => (
                <span key={tag} className="artist-tag">{tag}</span>
              ))}
            </div>

            {matchReason && (
              <p className="text-[10px] text-amber-400/90">{matchReason}</p>
            )}

            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={handleMessage}
                className="flex-1 text-xs font-semibold py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-background transition-colors active:scale-[0.985]"
              >
                {isContacted ? "Message again" : "Message owner"}
              </button>
              {onSelectForMap && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSelectForMap(venue); }}
                  className="flex-1 text-xs font-medium py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
                >
                  View on map
                </button>
              )}
            </div>

            {isContacted && (
              <div className="text-center text-[10px] text-emerald-400">You’ve messaged this venue</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
