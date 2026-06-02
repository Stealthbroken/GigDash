import { useState } from "react";
import { useLocation } from "wouter";
import { useListEvents } from "@workspace/api-client-react";
import type { EventSummary } from "@workspace/api-client-react";
import FanNav from "@/components/fan/FanNav";
import MapView from "@/components/fan/MapView";

const GENRE_OPTIONS = ["All", "Jazz", "Pop", "Folk", "Rock", "Hip-Hop", "Electronic", "Classical", "R&B", "Country", "Metal"];

function genreColor(genre: string): string {
  const map: Record<string, string> = {
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
  return map[genre] ?? "bg-muted text-muted-foreground border-border";
}

function formatDate(dateStr: string): { day: string; month: string; time: string; full: string } {
  const d = new Date(dateStr);
  return {
    day: d.toLocaleDateString("en-CA", { day: "2-digit" }),
    month: d.toLocaleDateString("en-CA", { month: "short" }).toUpperCase(),
    time: d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: true }),
    full: d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" }),
  };
}

function EventCard({ event, isSelected, onClick }: { event: EventSummary; isSelected?: boolean; onClick?: () => void }) {
  const date = formatDate(event.eventDate);
  const isFinalized = (event.artistCount ?? 0) > 0;
  const [, navigate] = useLocation();
  return (
    <div className={`group flex gap-4 bg-card border rounded-2xl p-4 transition-all cursor-pointer ${
      isSelected ? "border-amber-500/50 bg-amber-500/10" : "border-card-border hover:border-amber-500/30"
    }`} onClick={onClick}>
      <div className="shrink-0 w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center">
        <span className="text-amber-400 font-bold text-lg leading-none">{date.day}</span>
        <span className="text-amber-400/70 text-[10px] font-semibold">{date.month}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug group-hover:text-amber-400 transition-colors line-clamp-1">
            {event.title}
          </h3>
          <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${
            isFinalized ? "bg-emerald-500" : "bg-red-500"
          }`}>
            {isFinalized ? "♪" : "!"}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 shrink-0" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <button
            className="truncate hover:text-amber-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); navigate(`/venue/${event.venue.id}`); }}
          >
            {event.venue.name} · {event.venue.address.split(",").slice(0, 2).join(",")}
          </button>
        </p>

        <p className="text-xs text-muted-foreground mt-0.5">
          {date.full} at {date.time}
          {event.durationMinutes && ` · ${event.durationMinutes} min`}
        </p>

        {event.description && (
          <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-2 leading-relaxed">{event.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-2">
          {(event.genres ?? []).map((g) => (
            <span key={g} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${genreColor(g)}`}>
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventSkeleton() {
  return (
    <div className="flex gap-4 bg-card border border-card-border rounded-2xl p-4 animate-pulse">
      <div className="shrink-0 w-14 h-14 rounded-xl bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="flex gap-1 mt-2">
          <div className="h-4 w-12 bg-muted rounded-full" />
          <div className="h-4 w-10 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function FanHome() {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const { data, isLoading, error } = useListEvents({
    genre: selectedGenre !== "All" ? selectedGenre : undefined,
    location: locationFilter || undefined,
    limit: 50,
  });

  const events = data?.events ?? [];

  const handleSelectEvent = (event: EventSummary) => {
    setSelectedEventId(event.id);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FanNav />

      <div className="max-w-7xl mx-auto px-4 pt-20 pb-12">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold mb-1">Upcoming near you</h1>
          <p className="text-muted-foreground text-sm">Live music happening in your city — updated daily.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <svg viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <input
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Filter by location…"
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Genre tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
          {GENRE_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                selectedGenre === g
                  ? "bg-amber-500 border-amber-500 text-background"
                  : "border-border text-muted-foreground hover:border-amber-500/30 hover:text-foreground bg-card"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Two-column layout: events list + interactive map */}
        <div className="grid lg:grid-cols-[1fr_480px] gap-6 items-start">
          {/* Left — event list */}
          <div>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => <EventSkeleton key={i} />)}
              </div>
            ) : error ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Could not load events. Please try again.</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <span className="text-4xl mb-3 block">🎵</span>
                <p className="font-medium">No events found</p>
                <p className="text-sm mt-1">Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isSelected={selectedEventId === event.id}
                    onClick={() => setSelectedEventId(event.id)}
                  />
                ))}
                <p className="text-center text-xs text-muted-foreground pt-2">
                  Showing {events.length} upcoming event{events.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>

          {/* Right — interactive map */}
          <div className="lg:sticky lg:top-20">
            <div className="rounded-2xl border border-border bg-card overflow-hidden h-[650px]">
              <MapView
                events={events}
                selectedEventId={selectedEventId}
                onSelectEvent={handleSelectEvent}
              />
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: "This week", value: events.filter(e => new Date(e.eventDate) < new Date(Date.now() + 7 * 86400000)).length },
                { label: "Free", value: events.filter(e => !e.isPaid).length },
                { label: "Genres", value: new Set(events.flatMap(e => e.genres)).size },
              ].map(stat => (
                <div key={stat.label} className="bg-card border border-border rounded-xl p-3 text-center">
                  <p className="font-bold text-lg text-amber-400">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
