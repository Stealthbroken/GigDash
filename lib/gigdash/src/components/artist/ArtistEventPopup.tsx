import type { EventSummary } from "@workspace/api-client-react";
import { useGetEvent } from "@workspace/api-client-react";

import { eventMarkerStatus, canMessageOrganizer } from "@/lib/eventStatus";

type MarkerStatus = "planning" | "finalized";

function eventStatus(event: EventSummary): MarkerStatus {
  return eventMarkerStatus(event);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: true });
}

interface ArtistEventPopupProps {
  event: EventSummary;
  onMessageOrganizer?: (event: EventSummary) => void;
  onViewEvent?: (event: EventSummary) => void;
}

export default function ArtistEventPopup({ event, onMessageOrganizer, onViewEvent }: ArtistEventPopupProps) {
  const status = eventStatus(event);
  const { data: detail } = useGetEvent(event.id);

  const genres = detail?.genres ?? event.genres ?? [];
  const artists = detail?.artists ?? [];
  const venueDesc = detail?.venue?.description ?? event.venue?.description;
  const isPlanning = status === "planning";

  return (
    <div className="fan-venue-popup fan-venue-popup--single">
      <header className="fan-popup-header">
        <div className="fan-popup-header-text">
          <p className="fan-popup-eyebrow">Gig at</p>
          <h3 className="fan-popup-title">{event.venue?.name ?? "Venue"}</h3>
        </div>
        <span className={`fan-popup-status ${isPlanning ? "fan-popup-status--planning" : "fan-popup-status--finalized"}`}>
          <span className="fan-popup-status-icon" aria-hidden>{isPlanning ? "!" : "♪"}</span>
          {isPlanning ? "Planning" : "Finalized"}
        </span>
      </header>

      <div className="fan-popup-single-body space-y-2">
        <p className="fan-popup-single-title">{event.title}</p>
        <p className="fan-popup-single-datetime text-xs text-muted-foreground">
          {formatDate(event.eventDate)} · {formatTime(event.eventDate)}
        </p>

        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {genres.map((g) => (
              <span key={g} className="px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px]">
                {g}
              </span>
            ))}
          </div>
        )}

        {artists.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">Artists: </span>
            {artists.map((a) => a.displayName).join(", ")}
          </p>
        )}

        {venueDesc && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{venueDesc}</p>
        )}

        {detail?.artistRequirements && (
          <p className="text-xs text-amber-400/90 leading-relaxed">
            <span className="font-medium">Looking for: </span>
            {detail.artistRequirements}
          </p>
        )}

        <div className="mt-2 flex flex-col gap-1.5">
          {onViewEvent && (
            <button
              type="button"
              onClick={() => onViewEvent(event)}
              className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-background text-xs font-semibold"
            >
              Open event page
            </button>
          )}
          {canMessageOrganizer(event) && onMessageOrganizer && (
            <button
              type="button"
              onClick={() => onMessageOrganizer(event)}
              className="w-full py-2 rounded-lg border border-amber-500/60 text-amber-400 text-xs font-medium hover:bg-amber-500/10"
            >
              Message organizer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}