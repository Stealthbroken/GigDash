import type { EventSummary } from "@workspace/api-client-react";
import { useGetEvent } from "@workspace/api-client-react";

import { eventMarkerStatus } from "@/lib/eventStatus";

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

function StatusBadge({ status }: { status: MarkerStatus }) {
  const finalized = status === "finalized";
  return (
    <span
      className={`fan-popup-status ${finalized ? "fan-popup-status--finalized" : "fan-popup-status--planning"}`}
    >
      <span className="fan-popup-status-icon" aria-hidden>
        {finalized ? "♪" : "!"}
      </span>
      {finalized ? "Finalized" : "Planning"}
    </span>
  );
}

function EventDetailBody({ event }: { event: EventSummary }) {
  const { data: detail } = useGetEvent(event.id);
  const genres = detail?.genres ?? event.genres ?? [];
  const artists = detail?.artists ?? [];
  const venueDesc = detail?.venue?.description ?? event.venue?.description;
  const description = detail?.description ?? event.description;

  return (
    <div className="space-y-2">
      <p className="fan-popup-single-title">{event.title}</p>
      <p className="fan-popup-single-datetime">
        <svg className="fan-popup-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M4.5 8.25h15m-16.5 0V19.5A2.25 2.25 0 006.75 21.75h10.5A2.25 2.25 0 0019.5 19.5V8.25" />
        </svg>
        {formatDate(event.eventDate)} · {formatTime(event.eventDate)}
      </p>

      {genres.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {genres.map((g) => (
            <span key={g} className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]">
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

      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{description}</p>
      )}

      {venueDesc && (
        <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2">
          <span className="font-medium">Venue: </span>{venueDesc}
        </p>
      )}
    </div>
  );
}

interface VenueEventPopupProps {
  venueName: string;
  events: EventSummary[];
  selectedEventId?: number | null;
  onSelectEvent: (event: EventSummary) => void;
  onViewEvent?: (event: EventSummary) => void;
}

export default function VenueEventPopup({
  venueName,
  events,
  selectedEventId,
  onSelectEvent,
  onViewEvent,
}: VenueEventPopupProps) {
  const isMulti = events.length > 1;
  const single = !isMulti ? events[0] : null;

  if (single) {
    const status = eventStatus(single);
    return (
      <div className="fan-venue-popup fan-venue-popup--single">
        <header className="fan-popup-header">
          <div className="fan-popup-header-text">
            <p className="fan-popup-eyebrow">Gig at</p>
            <h3 className="fan-popup-title">{venueName}</h3>
          </div>
          <StatusBadge status={status} />
        </header>
        <div className="fan-popup-single-body">
          <EventDetailBody event={single} />
          {onViewEvent && (
            <button
              type="button"
              onClick={() => onViewEvent(single)}
              className="mt-3 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              Open event page
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fan-venue-popup fan-venue-popup--multi">
      <header className="fan-popup-header">
        <div className="fan-popup-header-text">
          <p className="fan-popup-eyebrow">Venue</p>
          <h3 className="fan-popup-title">{venueName}</h3>
        </div>
        <span className="fan-popup-count-badge">{events.length} gigs</span>
      </header>

      <p className="fan-popup-hint">Choose a gig to highlight on the map</p>

      <ul className="fan-popup-event-list" role="list">
        {events.map((event) => {
          const status = eventStatus(event);
          const isSelected = selectedEventId === event.id;
          return (
            <li key={event.id} role="listitem" className="space-y-1.5">
              <button
                type="button"
                className={`fan-popup-event-card w-full ${isSelected ? "fan-popup-event-card--selected" : ""}`}
                onClick={() => onSelectEvent(event)}
              >
                <span
                  className={`fan-popup-row-dot ${
                    status === "finalized" ? "fan-popup-row-dot--finalized" : "fan-popup-row-dot--planning"
                  }`}
                  aria-hidden
                >
                  {status === "finalized" ? "♪" : "!"}
                </span>
                <span className="fan-popup-event-card-main">
                  <span className="fan-popup-event-card-top">
                    <span className="fan-popup-event-title">{event.title}</span>
                    <StatusBadge status={status} />
                  </span>
                  <span className="fan-popup-event-meta">
                    {formatDate(event.eventDate)} · {formatTime(event.eventDate)}
                  </span>
                  {event.genres && event.genres.length > 0 && (
                    <span className="text-[10px] text-emerald-400/80">{event.genres.join(" · ")}</span>
                  )}
                </span>
              </button>
              {onViewEvent && (
                <button
                  type="button"
                  onClick={() => onViewEvent(event)}
                  className="w-full py-1.5 rounded-lg border border-emerald-500/40 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-500/10"
                >
                  View full details
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}