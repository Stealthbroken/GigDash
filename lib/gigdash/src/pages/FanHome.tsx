import { useState } from "react";
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

export default function FanHome() {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const { data, isLoading, error } = useListEvents({
    genre: selectedGenre !== "All" ? selectedGenre : undefined,
    location: locationFilter || undefined,
    limit: 50,
  });

  const events: EventSummary[] = data?.events ?? [];

  const handleSelectEvent = (event: EventSummary) => {
    setSelectedEventId(event.id);
  };

  return (
    <div className="flex flex-col overflow-hidden bg-background text-foreground" style={{ height: "100dvh" }}>
      <FanNav />

      {/* Compact filter bar — sits directly below the fixed nav */}
      <div className="shrink-0 pt-14 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-2 flex items-center gap-3">
          {/* Location search */}
          <div className="relative shrink-0 w-52">
            <svg viewBox="0 0 24 24" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <input
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Filter by location…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Genre pills */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5 flex-1">
            {GENRE_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`shrink-0 px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${
                  selectedGenre === g
                    ? "bg-amber-500 border-amber-500 text-background"
                    : g === "All"
                    ? "border-border text-muted-foreground hover:border-amber-500/30 hover:text-foreground bg-card"
                    : `border ${genreColor(g)} hover:opacity-80`
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Event count badge */}
          {!isLoading && (
            <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
              {events.length} event{events.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Map — fills all remaining viewport height */}
      <div className="flex-1 min-h-0 p-3">
        {isLoading ? (
          <div className="h-full flex items-center justify-center rounded-2xl border border-border bg-card">
            <div className="text-center text-muted-foreground">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Loading events…</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center rounded-2xl border border-border bg-card">
            <div className="text-center text-muted-foreground">
              <span className="text-4xl mb-3 block">⚠️</span>
              <p className="font-medium text-sm">Could not load events</p>
              <p className="text-xs mt-1">Please try again later.</p>
            </div>
          </div>
        ) : (
          <MapView
            events={events}
            selectedEventId={selectedEventId}
            onSelectEvent={handleSelectEvent}
          />
        )}
      </div>
    </div>
  );
}
