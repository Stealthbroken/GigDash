import { useState } from "react";
import { useListArtists, useListEvents, useStartConversation } from "@workspace/api-client-react";
import VenueSectionCard from "../VenueSectionCard";
import { VENUE_GENRES } from "@/lib/venueConstants";
import { useAppNavigation } from "@/lib/navigation";
import { useVenueMe } from "@/hooks/use-venue-me";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { localCalendarDay } from "@/lib/eventStatus";

export default function VenueArtistsPanel() {
  const { goToVenueTab, navigate, linkTo } = useAppNavigation();
  const { toast } = useToast();
  const { data: venue } = useVenueMe();
  const { data: eventsData } = useListEvents({ limit: 100 });

  const myEvents = (eventsData?.events ?? [])
    .filter((e) => e.venue?.id === venue?.id && new Date(e.eventDate) >= new Date())
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  const [selectedEventId, setSelectedEventId] = useState<number | "custom" | null>(null);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("20:00");
  const [genre, setGenre] = useState("");
  const [minRate, setMinRate] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const eventDateIso = (() => {
    if (selectedEventId === "custom" && customDate) {
      return new Date(`${customDate}T${customTime}`).toISOString();
    }
    if (typeof selectedEventId === "number") {
      const ev = myEvents.find((e) => e.id === selectedEventId);
      return ev?.eventDate ?? "";
    }
    return "";
  })();

  const eventDay = eventDateIso ? localCalendarDay(eventDateIso) : "";

  const { data, refetch, isFetching } = useListArtists({
    genre: genre || undefined,
    minRate: minRate ? parseInt(minRate, 10) : undefined,
    maxRate: maxRate ? parseInt(maxRate, 10) : undefined,
    q: query || undefined,
    eventDate: eventDay || undefined,
    limit: 20,
  });

  const startConversation = useStartConversation({
    mutation: {
      onSuccess: (d) => goToVenueTab("messages", { chatId: d.id }),
      onError: () => toast({ title: "Could not start chat", variant: "destructive" }),
    },
  });

  const artists = data?.artists ?? [];

  function handleSearch() {
    if (!eventDateIso) {
      toast({ title: "Pick an event or date first", description: "Artist availability is checked against that date.", variant: "destructive" });
      return;
    }
    setSearching(true);
    refetch();
  }

  return (
    <div className="space-y-6">
      <VenueSectionCard
        title="Find artists for a slot"
        description="Search by the date and time of your event — artists who blocked that day won't appear."
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Event date & time</label>
            <select
              value={selectedEventId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedEventId(v === "custom" ? "custom" : v ? parseInt(v, 10) : null);
              }}
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm"
            >
              <option value="">Select an upcoming event…</option>
              {myEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} — {format(new Date(ev.eventDate), "MMM d, yyyy · p")}
                </option>
              ))}
              <option value="custom">Custom date & time…</option>
            </select>
          </div>

          {selectedEventId === "custom" && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Date</label>
                <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Time</label>
                <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" />
              </div>
            </div>
          )}

          {eventDateIso && (
            <p className="text-xs text-violet-400/90">
              Searching availability for {format(new Date(eventDateIso), "PPP · p")}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
            <div>
              <label className="text-xs text-muted-foreground">Genre</label>
              <input
                list="venue-artists-genre-options"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Any genre (type to filter)"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
              />
              <datalist id="venue-artists-genre-options">
                {VENUE_GENRES.map((g) => <option key={g} value={g} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Name search</label>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Artist name…" className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Min rate tier (1–5)</label>
              <input type="number" min={1} max={5} value={minRate} onChange={(e) => setMinRate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Max rate tier (1–5)</label>
              <input type="number" min={1} max={5} value={maxRate} onChange={(e) => setMaxRate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSearch}
            disabled={isFetching}
            className="px-5 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
          >
            {isFetching ? "Searching…" : "Search available artists"}
          </button>
        </div>
      </VenueSectionCard>

      <VenueSectionCard title="Results" description="Message artists or open their profile. Add them to an event from Manage event.">
        {!searching ? (
          <p className="text-sm text-muted-foreground text-center py-8">Select a date and run a search.</p>
        ) : artists.length === 0 && !isFetching ? (
          <p className="text-sm text-muted-foreground text-center py-8">No available artists match your filters.</p>
        ) : (
          <ul className="space-y-3">
            {artists.map((a) => (
              <li key={a.id} className="rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <button type="button" onClick={() => navigate(linkTo(`/artist/profile/${a.id}`))} className="flex-1 text-left min-w-0">
                  <p className="font-medium">{a.displayName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.genres?.join(" · ")}</p>
                  {a.bio && <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{a.bio}</p>}
                  {a.rateTier != null && <p className="text-[10px] text-violet-400 mt-1">Rate tier: L{a.rateTier}</p>}
                </button>
                <div className="flex gap-2 shrink-0">
                  {a.username && (
                    <button
                      type="button"
                      onClick={() => startConversation.mutate({ data: { username: a.username! } })}
                      className="px-3 py-1.5 rounded-lg border border-violet-500/40 text-violet-400 text-xs font-medium hover:bg-violet-500/10"
                    >
                      Message
                    </button>
                  )}
                  {typeof selectedEventId === "number" && (
                    <button
                      type="button"
                      onClick={() => navigate(linkTo(`/venue/event/${selectedEventId}/manage`))}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium"
                    >
                      Manage event
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </VenueSectionCard>
    </div>
  );
}