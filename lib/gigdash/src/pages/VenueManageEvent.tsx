import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { format } from "date-fns";
import {
  useGetEvent,
  useUpdateEvent,
  useListEventOutreach,
  useUpsertEventOutreach,
  useListArtists,
  useStartConversation,
  useRemoveEventArtist,
  getListEventOutreachQueryKey,
} from "@workspace/api-client-react";
import { isEventFinalized, localCalendarDay } from "@/lib/eventStatus";
import VenueNav from "@/components/venue/VenueNav";
import VenueSectionCard from "@/components/venue/VenueSectionCard";
import { useToast } from "@/hooks/use-toast";
import { VENUE_GENRES, COMPETITION_LEVELS } from "@/lib/venueConstants";
import CustomTagInput from "@/components/onboarding/CustomTagInput";
import { venueTabUrl } from "@/lib/navigation";

export default function VenueManageEvent() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/venue/event/:id/manage");
  const { toast } = useToast();
  const eventId = parseInt(params?.id ?? "0", 10);

  const { data: event, isLoading, refetch: refetchEvent } = useGetEvent(eventId);
  const { data: outreachData, refetch: refetchOutreach } = useListEventOutreach(eventId, {
    query: { queryKey: getListEventOutreachQueryKey(eventId), enabled: eventId > 0 },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [artistRequirements, setArtistRequirements] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [isCompetition, setIsCompetition] = useState(false);
  const [competitionLevel, setCompetitionLevel] = useState<number | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  const [searchGenre, setSearchGenre] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const eventDateIso = event?.eventDate ?? "";
  const eventDay = eventDateIso ? localCalendarDay(eventDateIso) : "";
  const { data: artistResults, refetch: searchArtists, isFetching: searchingArtists } = useListArtists({
    genre: searchGenre || undefined,
    q: searchQuery || undefined,
    eventDate: eventDay || undefined,
    limit: 20,
  });

  useEffect(() => {
    if (!event || initialized) return;
    setTitle(event.title);
    setDescription(event.description ?? "");
    setArtistRequirements(event.artistRequirements ?? "");
    setPayAmount(event.payAmount ?? "");
    setIsPaid(event.isPaid ?? false);
    setIsCompetition(event.isCompetition ?? false);
    setCompetitionLevel(event.competitionLevel ?? null);
    setGenres(event.genres ?? []);
    setInitialized(true);
  }, [event, initialized]);

  const updateEvent = useUpdateEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Event updated" });
        refetchEvent();
      },
      onError: () => toast({ title: "Could not update event", variant: "destructive" }),
    },
  });

  const upsertOutreach = useUpsertEventOutreach({
    mutation: {
      onSuccess: () => {
        refetchOutreach();
        refetchEvent();
      },
      onError: () => toast({ title: "Could not update artist", variant: "destructive" }),
    },
  });

  const startConversation = useStartConversation({
    mutation: {
      onSuccess: (data) => navigate(venueTabUrl("messages", { chatId: data.id })),
      onError: () => toast({ title: "Could not start chat", variant: "destructive" }),
    },
  });

  const removeArtist = useRemoveEventArtist({
    mutation: {
      onSuccess: () => {
        toast({ title: "Artist removed from lineup" });
        refetchOutreach();
        refetchEvent();
      },
      onError: () => toast({ title: "Could not remove artist", variant: "destructive" }),
    },
  });

  const outreach = outreachData?.outreach ?? [];
  const isFinalized = event ? isEventFinalized(event) : false;
  const confirmedCount = event?.artistCount ?? 0;
  const contacted = outreach.filter((o) => o.status === "contacted");
  const pending = outreach.filter((o) => o.status === "pending");
  const confirmed = outreach.filter((o) => o.status === "confirmed");
  const declined = outreach.filter((o) => o.status === "declined");

  function handleSaveEvent() {
    updateEvent.mutate({
      id: eventId,
      data: {
        title,
        description: description || null,
        artistRequirements: artistRequirements || null,
        genres,
        isPaid,
        payAmount: isPaid ? payAmount || null : null,
        isCompetition,
        competitionLevel: isCompetition ? competitionLevel : null,
      },
    });
  }

  function handleAddArtist(artistId: number) {
    upsertOutreach.mutate({
      id: eventId,
      data: { artistId, status: "contacted", notes: null },
    });
  }

  function handleSendInvite(artistId: number) {
    upsertOutreach.mutate({
      id: eventId,
      data: { artistId, status: "pending", notes: null },
    });
  }

  function handleSaveNotes(artistId: number, status: string, notes: string) {
    upsertOutreach.mutate({
      id: eventId,
      data: { artistId, status: status as "contacted" | "pending" | "confirmed" | "declined", notes: notes || null },
    });
  }

  function handleFinalize() {
    updateEvent.mutate({
      id: eventId,
      data: { status: "finalized" },
    });
  }

  function handleReopen() {
    updateEvent.mutate({
      id: eventId,
      data: { status: "upcoming" },
    });
  }

  if (isLoading || !event) {
    return (
      <div className="venue-dashboard min-h-screen bg-background">
        <VenueNav />
        <div className="venue-dashboard__inner py-16 text-center text-muted-foreground text-sm">Loading event…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground">
      <VenueNav />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto w-full px-4 py-6 pb-12 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <button type="button" onClick={() => navigate("/venue")} className="text-xs text-muted-foreground hover:text-foreground mb-2">
                ← Back to dashboard
              </button>
              <h1 className="font-serif text-2xl font-bold">Manage event</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(event.eventDate), "PPP · p")}
                {event.durationMinutes ? ` · ${event.durationMinutes} min` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isFinalized ? (
                <button
                  type="button"
                  onClick={handleReopen}
                  disabled={updateEvent.isPending}
                  className="text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground"
                >
                  Reopen gig
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={updateEvent.isPending || confirmedCount < 1}
                  title={confirmedCount < 1 ? "Need at least one accepted artist" : undefined}
                  className="text-sm px-4 py-2 rounded-lg bg-amber-500 text-background font-semibold hover:bg-amber-400 disabled:opacity-40"
                >
                  Finalize gig
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/event/${eventId}`)}
                className="text-sm px-4 py-2 rounded-lg border border-violet-500/40 text-violet-400 hover:bg-violet-500/10"
              >
                View public page
              </button>
            </div>
          </div>

          {isFinalized && (
            <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 -mt-2">
              This gig is finalized — fans see it as locked. Reopen to change the lineup.
            </p>
          )}

          <VenueSectionCard title="Event details" description="Edit what fans and artists see for this gig.">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fan description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm resize-y" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Artist requirements</label>
                <textarea value={artistRequirements} onChange={(e) => setArtistRequirements(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm resize-y" />
              </div>
              <div className="flex flex-wrap gap-2">
                {VENUE_GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))}
                    className={`text-xs px-2.5 py-1 rounded-full border ${genres.includes(g) ? "bg-violet-500/15 border-violet-500/50 text-violet-400" : "border-border text-muted-foreground"}`}
                  >
                    {g}
                  </button>
                ))}
                <CustomTagInput
                  accent="violet"
                  tags={genres.filter((g) => !(VENUE_GENRES as readonly string[]).includes(g))}
                  onAdd={(tag) => setGenres((prev) => (prev.includes(tag) ? prev : [...prev, tag]))}
                  onRemove={(tag) => setGenres((prev) => prev.filter((g) => g !== tag))}
                />
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                  Paid slot
                </label>
                {isPaid && (
                  <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Pay amount" className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm w-40" />
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isCompetition} onChange={(e) => setIsCompetition(e.target.checked)} />
                  Competition
                </label>
                {isCompetition && (
                  <select value={competitionLevel ?? ""} onChange={(e) => setCompetitionLevel(e.target.value ? parseInt(e.target.value, 10) : null)} className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm">
                    <option value="">Level…</option>
                    {COMPETITION_LEVELS.map((c) => (
                      <option key={c.level} value={c.level}>L{c.level} — {c.label}</option>
                    ))}
                  </select>
                )}
              </div>
              <button type="button" onClick={handleSaveEvent} disabled={updateEvent.isPending} className="px-5 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 disabled:opacity-50">
                {updateEvent.isPending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </VenueSectionCard>

          <VenueSectionCard
            title="Find artists for this slot"
            description={`Search artists available on ${format(new Date(event.eventDate), "PPP")} — blocked dates are excluded automatically.`}
          >
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-muted-foreground">Genre</label>
                <input
                  list="venue-manage-genre-options"
                  value={searchGenre}
                  onChange={(e) => setSearchGenre(e.target.value)}
                  placeholder="Any (type to filter)"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
                />
                <datalist id="venue-manage-genre-options">
                  {VENUE_GENRES.map((g) => <option key={g} value={g} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Artist name…" className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setSearching(true); searchArtists(); }}
              disabled={searchingArtists}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
            >
              {searchingArtists ? "Searching…" : "Search available artists"}
            </button>
            {searching && (
              <ul className="mt-4 space-y-2">
                {(artistResults?.artists ?? []).map((a) => {
                  const already = outreach.some((o) => o.artistId === a.id);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{a.displayName}</p>
                        <p className="text-xs text-muted-foreground">{a.genres?.join(" · ")}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {a.username && (
                          <button type="button" onClick={() => startConversation.mutate({ data: { username: a.username! } })} className="text-xs px-2.5 py-1 rounded-lg border border-violet-500/40 text-violet-400">
                            Message
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={already}
                          onClick={() => handleAddArtist(a.id)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-violet-600 text-white disabled:opacity-40"
                        >
                          {already ? "Added" : "Add to outreach"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </VenueSectionCard>

          <VenueSectionCard title="Artist outreach" description="Message artists, send invites (they accept in chat), then finalize the gig when your lineup is set.">
            {outreach.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No artists in outreach yet. Search above to add candidates.</p>
            ) : (
              <div className="space-y-6">
                {[
                  { label: "Confirmed (artist accepted)", items: confirmed },
                  { label: "Invite sent — awaiting response", items: pending },
                  { label: "Contacted", items: contacted },
                  { label: "Declined", items: declined },
                ].map(({ label, items }) =>
                  items.length > 0 ? (
                    <div key={label}>
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{label}</h3>
                      <ul className="space-y-3">
                        {items.map((o) => (
                          <OutreachRow
                            key={o.id}
                            entry={o}
                            onSendInvite={() => handleSendInvite(o.artistId)}
                            onSaveNotes={(notes) => handleSaveNotes(o.artistId, o.status, notes)}
                            onRemove={() => removeArtist.mutate({ id: eventId, artistId: o.artistId })}
                            onMessage={() => o.username && startConversation.mutate({ data: { username: o.username } })}
                            removing={removeArtist.isPending}
                            inviting={upsertOutreach.isPending}
                          />
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </VenueSectionCard>
        </div>
      </main>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  contacted: "Contacted",
  pending: "Invite sent",
  confirmed: "Accepted",
  declined: "Declined",
};

function OutreachRow({
  entry,
  onSendInvite,
  onSaveNotes,
  onRemove,
  onMessage,
  removing,
  inviting,
}: {
  entry: { artistId: number; displayName: string; username?: string; status: string; notes?: string | null };
  onSendInvite: () => void;
  onSaveNotes: (notes: string) => void;
  onRemove: () => void;
  onMessage: () => void;
  removing: boolean;
  inviting: boolean;
}) {
  const [notes, setNotes] = useState(entry.notes ?? "");
  const isConfirmed = entry.status === "confirmed";
  const isPending = entry.status === "pending";
  const canInvite = entry.status === "contacted" || entry.status === "declined";

  useEffect(() => {
    setNotes(entry.notes ?? "");
  }, [entry.notes]);

  return (
    <li className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{entry.displayName}</p>
          {entry.username && <p className="text-xs text-muted-foreground">@{entry.username}</p>}
          <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border border-border text-muted-foreground">
            {STATUS_LABELS[entry.status] ?? entry.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {entry.username && (
            <button type="button" onClick={onMessage} className="text-xs px-2.5 py-1 rounded-lg border border-violet-500/40 text-violet-400">
              Message
            </button>
          )}
          {canInvite && (
            <button
              type="button"
              onClick={onSendInvite}
              disabled={inviting}
              className="text-xs px-2.5 py-1 rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50"
            >
              Send gig invite
            </button>
          )}
          {isPending && (
            <span className="text-xs px-2.5 py-1 text-amber-400/90">Awaiting response</span>
          )}
          {isConfirmed && (
            <button
              type="button"
              onClick={onRemove}
              disabled={removing}
              className="text-xs px-2.5 py-1 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              Remove from gig
            </button>
          )}
        </div>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Private notes about this artist…"
        rows={2}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-y"
      />
      <button
        type="button"
        onClick={() => onSaveNotes(notes)}
        disabled={inviting}
        className="text-xs px-3 py-1.5 rounded-lg bg-secondary border border-border hover:bg-secondary/80"
      >
        Save notes
      </button>
    </li>
  );
}