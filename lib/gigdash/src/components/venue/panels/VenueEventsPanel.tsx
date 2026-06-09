import { useLocation } from "wouter";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useListEvents } from "@workspace/api-client-react";
import type { EventSummary } from "@workspace/api-client-react";
import { useVenueMe } from "@/hooks/use-venue-me";
import VenueSectionCard from "../VenueSectionCard";
import { COMPETITION_LEVELS } from "@/lib/venueConstants";

export default function VenueEventsPanel() {
  const [, navigate] = useLocation();
  const { data: venue } = useVenueMe();
  const { data: eventsData, isLoading } = useListEvents({ limit: 100 });

  const myVenueId = venue?.id;
  const myEvents: EventSummary[] = (eventsData?.events ?? []).filter(
    (e) => e.venue?.id === myVenueId,
  );

  const upcoming = myEvents
    .filter((e) => new Date(e.eventDate) >= new Date())
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  const past = myEvents
    .filter((e) => new Date(e.eventDate) < new Date())
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  return (
    <div className="space-y-6">
      <VenueSectionCard
        title="Your events"
        description="Manage listings, track artist outreach, and edit details. New events are created from the nav bar."
        action={
          <button
            type="button"
            onClick={() => navigate("/venue/create-event")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" /> New event
          </button>
        }
      >
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading your events…</div>
        ) : myEvents.length === 0 ? (
          <div className="venue-empty-state">
            <span className="text-3xl mb-2 block opacity-60" aria-hidden>📅</span>
            <p className="text-sm font-medium">No events yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Create your first event — it will appear on the fan map and artist discover view.
            </p>
            <button
              onClick={() => navigate("/venue/create-event")}
              className="mt-3 text-sm px-3 py-1.5 rounded-md bg-violet-500/90 hover:bg-violet-500 text-white"
            >
              + Create your first event
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <EventList title="Upcoming" events={upcoming} navigate={navigate} />
            )}
            {past.length > 0 && (
              <EventList title="Past" events={past} navigate={navigate} muted />
            )}
          </div>
        )}
      </VenueSectionCard>
    </div>
  );
}

function EventList({
  title,
  events,
  navigate,
  muted = false,
}: {
  title: string;
  events: EventSummary[];
  navigate: (path: string) => void;
  muted?: boolean;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{title}</h3>
      <div className="space-y-3">
        {events.map((ev) => {
          const d = new Date(ev.eventDate);
          const planning = ev.status !== "finalized";
          const comp =
            ev.isCompetition && ev.competitionLevel
              ? COMPETITION_LEVELS.find((c) => c.level === ev.competitionLevel)
              : null;
          return (
            <div
              key={ev.id}
              className={`rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-start gap-3 ${muted ? "opacity-75" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{ev.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(d, "PPP p")}
                  {ev.durationMinutes ? ` · ${ev.durationMinutes} min` : ""}
                </p>
                {ev.genres && ev.genres.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">{ev.genres.join(" · ")}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                  {ev.isPaid && ev.payAmount && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{ev.payAmount}</span>
                  )}
                  {comp && (
                    <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-400">Comp L{comp.level}</span>
                  )}
                  <span className="text-muted-foreground">{ev.artistCount ?? 0} confirmed</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0 sm:items-end sm:min-w-[160px]">
                <span
                  className={`inline-flex items-center self-start sm:self-end text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                    planning ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"
                  }`}
                >
                  {planning ? "! Planning" : "♪ Finalized"}
                </span>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => navigate(`/event/${ev.id}`)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary/60"
                  >
                    View page
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/venue/event/${ev.id}/manage`)}
                    className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-500"
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}