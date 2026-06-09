import { useRoute } from "wouter";
import { format } from "date-fns";
import {
  useGetEvent,
  useFollowArtist,
  useUnfollowArtist,
  useListFollowedArtists,
  useFollowVenue,
  useUnfollowVenue,
  useListFollowedVenues,
  useStartConversation,
  useGetRatingSummary,
  useCreateRating,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { COMPETITION_LEVELS } from "@/lib/venueConstants";
import { isEventFinalized } from "@/lib/eventStatus";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { artistTabUrl, useAppNavigation } from "@/lib/navigation";

const SIZE_LABEL: Record<string, string> = {
  xs: "Tiny (< 50 guests)",
  sm: "Small (50–200 guests)",
  md: "Medium (200–500 guests)",
  lg: "Large (500+ guests)",
};

export default function EventProfile() {
  const { navigate, goBack, linkTo } = useAppNavigation();
  const [, params] = useRoute("/event/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const eventId = parseInt(params?.id ?? "0", 10);

  const { data: event, isLoading, error } = useGetEvent(eventId);
  const { data: followedArtists, refetch: refetchArtists } = useListFollowedArtists();
  const { data: followedVenues, refetch: refetchVenues } = useListFollowedVenues();

  const venueId = event?.venue?.id ?? 0;
  const { data: venueRating } = useGetRatingSummary("venue", venueId);

  const [ratingScore, setRatingScore] = useState(5);

  const startConversation = useStartConversation({
    mutation: {
      onSuccess: (data) => navigate(linkTo(artistTabUrl("messages", { chatId: data.id }))),
      onError: () => toast({ title: "Could not start chat", variant: "destructive" }),
    },
  });

  const followArtist = useFollowArtist({ mutation: { onSuccess: () => refetchArtists() } });
  const unfollowArtist = useUnfollowArtist({ mutation: { onSuccess: () => refetchArtists() } });
  const followVenue = useFollowVenue({ mutation: { onSuccess: () => refetchVenues() } });
  const unfollowVenue = useUnfollowVenue({ mutation: { onSuccess: () => refetchVenues() } });

  const rateVenue = useCreateRating({
    mutation: {
      onSuccess: () => toast({ title: "Rating submitted" }),
      onError: (err: unknown) => {
        const msg = err && typeof err === "object" && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : "Could not rate venue.";
        toast({ title: "Rating failed", description: msg, variant: "destructive" });
      },
    },
  });

  if (isLoading) {
    return (
      <div className="event-profile-page min-h-screen flex items-center justify-center">
        <div className="event-profile-loading animate-pulse text-muted-foreground text-sm">Loading event…</div>
      </div>
    );
  }

  if (!event || error) {
    return (
      <div className="event-profile-page min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">Event not found.</p>
        <button type="button" onClick={() => navigate("/")} className="text-sm underline">Go home</button>
      </div>
    );
  }

  const role = user?.role ?? "guest";
  const isFinalized = isEventFinalized(event);
  const isPlanning = !isFinalized;
  const ownerUsername = event.venue?.ownerUsername;
  const isFollowingVenue = followedVenues?.venues?.some((v) => v.id === venueId) ?? false;
  const comp = event.isCompetition && event.competitionLevel
    ? COMPETITION_LEVELS.find((c) => c.level === event.competitionLevel)
    : null;

  const fallbackBack =
    role === "fan" ? "/fan" :
    role === "artist" ? artistTabUrl("map") :
    role === "venue" ? "/venue" : "/";

  function handleMessageOrganizer() {
    if (!ownerUsername) {
      toast({ title: "Cannot message", description: "Venue owner not found.", variant: "destructive" });
      return;
    }
    startConversation.mutate({ data: { username: ownerUsername } });
  }

  return (
    <div className="event-profile-page min-h-screen bg-background text-foreground">
      <header className="event-profile-nav sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="event-profile-nav-inner max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button type="button" onClick={() => goBack(fallbackBack)} className="event-profile-back text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </button>
          <span className={`event-profile-status event-profile-status--${isPlanning ? "planning" : "finalized"}`}>
            <span aria-hidden>{isPlanning ? "!" : "♪"}</span>
            {isPlanning ? "Planning" : "Finalized"}
          </span>
        </div>
      </header>

      <main className="event-profile-main max-w-3xl mx-auto px-4 py-8 pb-16 space-y-8">
        {/* Hero */}
        <section className="event-profile-hero">
          <p className="event-profile-eyebrow text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {event.venue?.name}
          </p>
          <h1 className="event-profile-title font-serif text-3xl sm:text-4xl font-bold tracking-tight">{event.title}</h1>
          <p className="event-profile-datetime text-sm text-muted-foreground mt-3">
            {format(new Date(event.eventDate), "EEEE, MMMM d, yyyy · h:mm a")}
            {event.durationMinutes ? ` · ${event.durationMinutes} min` : ""}
          </p>

          {event.genres && event.genres.length > 0 && (
            <div className="event-profile-genres flex flex-wrap gap-2 mt-4">
              {event.genres.map((g) => (
                <span key={g} className="event-profile-genre-chip">{g}</span>
              ))}
            </div>
          )}
        </section>

        {/* Event images */}
        {event.imageUrls && event.imageUrls.length > 0 && (
          <section className="event-profile-gallery grid grid-cols-2 sm:grid-cols-3 gap-3">
            {event.imageUrls.slice(0, 3).map((src, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden border border-border">
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </section>
        )}

        {/* Fan-facing description */}
        {event.description && (
          <section className="event-profile-section">
            <h2 className="event-profile-section-title">About this show</h2>
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{event.description}</p>
          </section>
        )}

        {/* Artists */}
        {event.artists && event.artists.length > 0 && (
          <section className="event-profile-section">
            <h2 className="event-profile-section-title">Performing artists</h2>
            <ul className="space-y-3">
              {event.artists.map((a) => {
                const following = followedArtists?.artists?.some((f) => f.id === a.id) ?? false;
                return (
                  <li key={a.id} className="event-profile-artist-card rounded-xl border border-border p-4 flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{a.displayName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => navigate(linkTo(`/artist/profile/${a.id}`))}
                        className="font-medium text-sm hover:underline text-left"
                      >
                        {a.displayName}
                      </button>
                      {a.genres && a.genres.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">{a.genres.join(" · ")}</p>
                      )}
                      {a.bio && <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{a.bio}</p>}
                    </div>
                    {role === "fan" && (
                      <button
                        type="button"
                        onClick={() => (following ? unfollowArtist.mutate({ artistId: a.id }) : followArtist.mutate({ artistId: a.id }))}
                        className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium ${
                          following ? "border border-border text-muted-foreground" : "bg-emerald-600 text-white"
                        }`}
                      >
                        {following ? "Following" : "Follow"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {isPlanning && role === "fan" && (
          <p className="text-sm text-muted-foreground italic rounded-lg border border-dashed border-border px-4 py-3">
            This gig is still being planned — lineup may change. Follow the venue for updates.
          </p>
        )}

        {/* Artist-only details */}
        {role === "artist" && (
          <section className="event-profile-section event-profile-section--artist">
            <h2 className="event-profile-section-title text-amber-400">Artist details</h2>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3 text-sm">
              {event.artistRequirements && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-400/80 mb-1">What they&apos;re looking for</p>
                  <p className="leading-relaxed">{event.artistRequirements}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-3 text-xs">
                {event.isPaid && event.payAmount && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Pay: {event.payAmount}
                  </span>
                )}
                {!event.isPaid && <span className="text-muted-foreground">Unpaid slot</span>}
                {comp && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Competition L{comp.level} — {comp.label}
                  </span>
                )}
              </div>
              {isPlanning && (
                <button
                  type="button"
                  onClick={handleMessageOrganizer}
                  className="w-full mt-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-background font-semibold text-sm transition-colors"
                >
                  Message organizer
                </button>
              )}
              {isFinalized && (
                <p className="text-xs text-muted-foreground">This slot is finalized — messaging may be limited.</p>
              )}
            </div>
          </section>
        )}

        {/* Venue card */}
        <section className="event-profile-section">
          <h2 className="event-profile-section-title">Venue</h2>
          <div className="event-profile-venue-card rounded-xl border border-border bg-card p-5 space-y-3">
            <button
              type="button"
              onClick={() => navigate(linkTo(`/venue/${venueId}`))}
              className="font-semibold text-lg hover:underline text-left"
            >
              {event.venue?.name}
            </button>
            <p className="text-sm text-muted-foreground">{event.venue?.address}</p>
            {event.venue?.description && (
              <p className="text-sm text-foreground/80 leading-relaxed">{event.venue.description}</p>
            )}
            {event.venue?.size && (
              <p className="text-xs text-muted-foreground">{SIZE_LABEL[event.venue.size] ?? event.venue.size}</p>
            )}
            {event.venue?.moods && event.venue.moods.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {event.venue.moods.map((m) => (
                  <span key={m} className="text-[10px] px-2 py-0.5 rounded-full border border-violet-500/30 text-violet-400">
                    {m}
                  </span>
                ))}
              </div>
            )}
            {(venueRating?.count ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                Venue rating: ★ {(venueRating?.average ?? 0).toFixed(1)} ({venueRating?.count} reviews)
              </p>
            )}

            {role === "fan" && (
              <button
                type="button"
                onClick={() => (isFollowingVenue ? unfollowVenue.mutate({ venueId }) : followVenue.mutate({ venueId }))}
                className={`text-sm px-4 py-2 rounded-lg font-medium ${
                  isFollowingVenue ? "border border-border text-muted-foreground" : "bg-violet-600 text-white hover:bg-violet-500"
                }`}
              >
                {isFollowingVenue ? "Following venue" : "Follow venue for updates"}
              </button>
            )}

            {role === "artist" && isFinalized && (
              <div className="pt-2 border-t border-border/60 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rate this venue</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRatingScore(n)} className={`text-xl ${n <= ratingScore ? "text-amber-400" : "text-muted-foreground/30"}`}>★</button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => rateVenue.mutate({ data: { targetType: "venue", targetId: venueId, score: ratingScore } })}
                  className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                >
                  Submit rating
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}