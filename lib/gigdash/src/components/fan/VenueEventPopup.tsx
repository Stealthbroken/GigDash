import type { EventSummary } from "@workspace/api-client-react";

type MarkerStatus = "planning" | "finalized";

function eventStatus(event: EventSummary): MarkerStatus {
  return (event.artistCount ?? 0) > 0 ? "finalized" : "planning";
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

interface VenueEventPopupProps {
  venueName: string;
  events: EventSummary[];
  selectedEventId?: number | null;
  onSelectEvent: (event: EventSummary) => void;
}

export default function VenueEventPopup({
  venueName,
  events,
  selectedEventId,
  onSelectEvent,
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
          <p className="fan-popup-single-title">{single.title}</p>
          <p className="fan-popup-single-datetime">
            <svg
              className="fan-popup-meta-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M4.5 8.25h15m-16.5 0V19.5A2.25 2.25 0 006.75 21.75h10.5A2.25 2.25 0 0019.5 19.5V8.25"
              />
            </svg>
            {formatDate(single.eventDate)} · {formatTime(single.eventDate)}
          </p>
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
            <li key={event.id} role="listitem">
              <button
                type="button"
                className={`fan-popup-event-card ${isSelected ? "fan-popup-event-card--selected" : ""}`}
                onClick={() => onSelectEvent(event)}
              >
                <span
                  className={`fan-popup-row-dot ${
                    status === "finalized"
                      ? "fan-popup-row-dot--finalized"
                      : "fan-popup-row-dot--planning"
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
                    <svg
                      className="fan-popup-meta-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M4.5 8.25h15m-16.5 0V19.5A2.25 2.25 0 006.75 21.75h10.5A2.25 2.25 0 0019.5 19.5V8.25"
                      />
                    </svg>
                    {formatDate(event.eventDate)} · {formatTime(event.eventDate)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}