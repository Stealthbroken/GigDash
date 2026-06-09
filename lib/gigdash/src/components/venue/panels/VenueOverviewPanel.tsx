import { Link, useLocation } from "wouter";
import { useAppNavigation } from "@/lib/navigation";
import { format } from "date-fns";
import { useListEvents } from "@workspace/api-client-react";
import type { VenueMe } from "@/hooks/use-venue-me";
import { VENUE_SIZES } from "@/lib/venueConstants";

const SIZE_LABEL = Object.fromEntries(VENUE_SIZES.map((s) => [s.id, s.label]));

interface VenueOverviewPanelProps {
  venue: VenueMe;
}

export default function VenueOverviewPanel({ venue }: VenueOverviewPanelProps) {
  const [, navigate] = useLocation();
  const { goToVenueTab } = useAppNavigation();
  const moods = venue.moods ?? [];
  const images = venue.imageUrls ?? [];
  const hasMapPin = venue.lat != null && venue.lng != null;

  const { data: eventsData } = useListEvents({ limit: 100 });
  const myEvents = (eventsData?.events ?? []).filter((e) => e.venue?.id === venue.id);
  const upcoming = myEvents
    .filter((e) => new Date(e.eventDate) >= new Date())
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 5);

  const planningCount = upcoming.filter((e) => e.status !== "finalized").length;
  const finalizedCount = upcoming.length - planningCount;

  return (
    <div className="space-y-6">
      <div className="venue-overview-hero rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 via-card to-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400 mb-2">Your venue</p>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">{venue.name}</h1>
            <p className="text-sm text-muted-foreground mt-2 flex items-start gap-2">
              <span className="text-violet-400 shrink-0">📍</span>
              {venue.address}
            </p>
            {hasMapPin ? (
              <p className="text-xs text-emerald-400/90 mt-2">Visible on the fan discover map</p>
            ) : (
              <p className="text-xs text-amber-400/90 mt-2">Add a verified address in settings to appear on the map</p>
            )}
          </div>
          {venue.id > 0 && (
            <Link href={`/venue/${venue.id}`} className="text-sm font-medium text-violet-400 hover:text-violet-300 border border-violet-500/30 px-4 py-2 rounded-lg hover:bg-violet-500/10">
              Public page →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="venue-overview-stat">
            <p className="venue-overview-stat__value">{upcoming.length}</p>
            <p className="venue-overview-stat__label">Upcoming</p>
          </div>
          <div className="venue-overview-stat">
            <p className="venue-overview-stat__value">{planningCount}</p>
            <p className="venue-overview-stat__label">Need artists</p>
          </div>
          <div className="venue-overview-stat">
            <p className="venue-overview-stat__value">{finalizedCount}</p>
            <p className="venue-overview-stat__label">Finalized</p>
          </div>
        </div>
      </div>

      {images.length > 0 && (
        images.length <= 3 ? (
          <div className="grid grid-cols-3 gap-2">
            {images.map((src, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl border border-border/60 overflow-hidden">
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2"
            aria-label={`${images.length} venue photos, scroll to see all`}
          >
            {images.map((src, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-[calc((100%-1rem)/3)] aspect-[4/3] rounded-xl border border-border/60 overflow-hidden"
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="venue-overview-panel rounded-xl border border-border/80 bg-card/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Upcoming events</h2>
            <button type="button" onClick={() => navigate("/venue?tab=events")} className="text-xs text-violet-400 hover:underline">
              See all →
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No upcoming events. Create one from the nav bar.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((ev) => {
                const planning = ev.status !== "finalized";
                return (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/venue/event/${ev.id}/manage`)}
                      className="venue-overview-event-row w-full text-left"
                    >
                      <span className={`venue-overview-event-dot ${planning ? "venue-overview-event-dot--planning" : "venue-overview-event-dot--finalized"}`}>
                        {planning ? "!" : "♪"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-sm truncate">{ev.title}</span>
                        <span className="block text-[11px] text-muted-foreground">{format(new Date(ev.eventDate), "MMM d · p")}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="venue-overview-panel rounded-xl border border-border/80 bg-card/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Venue at a glance</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 py-2 border-b border-border/50">
              <dt className="text-muted-foreground">Capacity</dt>
              <dd className="font-medium text-right">{venue.size ? (SIZE_LABEL[venue.size] ?? venue.size) : "Not set"}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b border-border/50">
              <dt className="text-muted-foreground">Atmosphere</dt>
              <dd className="font-medium text-right">{moods.length > 0 ? moods.slice(0, 3).join(", ") : "Not set"}</dd>
            </div>
            <div className="py-2">
              <dt className="text-muted-foreground text-xs mb-1">Description</dt>
              <dd className="text-foreground/85 leading-relaxed text-sm">
                {venue.description || <span className="italic text-muted-foreground">Add a description in Venue & space</span>}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => goToVenueTab("messages")} className="text-xs px-3 py-1.5 rounded-lg border border-violet-500/40 text-violet-400 hover:bg-violet-500/10">
              Messages
            </button>
            <button type="button" onClick={() => navigate("/venue/create-event")} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500">
              New event
            </button>
          </div>
        </section>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Use <span className="text-violet-400">Find artists</span> to search by your event date — blocked dates are respected automatically.
      </p>
    </div>
  );
}