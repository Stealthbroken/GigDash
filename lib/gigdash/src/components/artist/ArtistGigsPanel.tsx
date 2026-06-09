import { format } from "date-fns";
import {
  useListArtistGigs,
  useStartConversation,
  getListArtistGigsQueryKey,
} from "@workspace/api-client-react";
import type { ArtistGigSummary } from "@workspace/api-client-react";
import { useAppNavigation } from "@/lib/navigation";
import { useToast } from "@/hooks/use-toast";
import { isEventFinalized } from "@/lib/eventStatus";
import ArtistBlockedDatesCard from "@/components/artist/ArtistBlockedDatesCard";

function formatGigDate(date: Date | string) {
  return format(new Date(date), "EEE, MMM d · h:mm a");
}

function GigCard({
  gig,
  onMessage,
  onViewEvent,
  onViewVenue,
  messaging,
}: {
  gig: ArtistGigSummary;
  onMessage: () => void;
  onViewEvent: () => void;
  onViewVenue: () => void;
  messaging: boolean;
}) {
  const finalized = isEventFinalized({ status: gig.eventStatus });
  const isPending = gig.gigStatus === "pending";

  return (
    <article className="artist-gig-card">
      <div className="artist-gig-card__main">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-base leading-tight truncate">{gig.title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{gig.venue.name}</p>
            <p className="text-xs text-muted-foreground/80 mt-1">{formatGigDate(gig.eventDate)}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={`artist-gig-badge ${isPending ? "artist-gig-badge--pending" : "artist-gig-badge--confirmed"}`}
            >
              {isPending ? "Invite pending" : "Confirmed"}
            </span>
            <span
              className={`artist-gig-badge ${finalized ? "artist-gig-badge--finalized" : "artist-gig-badge--planning"}`}
            >
              {finalized ? "Finalized" : "Planning"}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{gig.venue.address}</p>
      </div>

      <div className="artist-gig-card__actions">
        {gig.venue.ownerUsername ? (
          <button
            type="button"
            onClick={onMessage}
            disabled={messaging}
            className="artist-gig-action artist-gig-action--primary"
          >
            {isPending ? "Respond in chat" : "Message venue"}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">Venue contact unavailable</span>
        )}
        <button type="button" onClick={onViewEvent} className="artist-gig-action">
          Event page
        </button>
        <button type="button" onClick={onViewVenue} className="artist-gig-action">
          Venue profile
        </button>
      </div>
    </article>
  );
}

interface ArtistGigsPanelProps {
  onOpenMessages: (conversationId: number) => void;
  onBrowseMap: () => void;
}

export default function ArtistGigsPanel({ onOpenMessages, onBrowseMap }: ArtistGigsPanelProps) {
  const { linkTo, navigate } = useAppNavigation();
  const { toast } = useToast();

  const { data, isLoading } = useListArtistGigs({
    query: { queryKey: getListArtistGigsQueryKey() },
  });

  const startConversation = useStartConversation({
    mutation: {
      onSuccess: (conv) => onOpenMessages(conv.id),
      onError: () => {
        toast({ title: "Could not open chat", variant: "destructive" });
      },
    },
  });

  const gigs = data?.gigs ?? [];
  const confirmed = gigs.filter((g) => g.gigStatus === "confirmed");
  const pending = gigs.filter((g) => g.gigStatus === "pending");

  function handleMessage(gig: ArtistGigSummary) {
    const username = gig.venue.ownerUsername;
    if (!username) {
      toast({ title: "Cannot message", description: "Venue contact not found.", variant: "destructive" });
      return;
    }
    startConversation.mutate({ data: { username } });
  }

  return (
    <section className="artist-home-gigs flex-1 min-h-0 overflow-auto">
      <div className="artist-gigs-page">
        <header className="artist-gigs-header">
          <h1 className="artist-gigs-title">My upcoming gigs</h1>
          <p className="artist-gigs-subtitle">
            Confirmed shows and open invites — message venues anytime.
          </p>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-16">Loading your gigs…</p>
        ) : gigs.length === 0 ? (
          <div className="space-y-8">
            <div className="artist-gigs-empty">
              <span className="text-4xl mb-3 block opacity-70" aria-hidden>
                🎤
              </span>
              <p className="font-medium text-sm">No upcoming gigs yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Browse the map for open slots, or respond when a venue sends you an invite in Messages.
              </p>
              <button
                type="button"
                onClick={onBrowseMap}
                className="mt-4 text-sm px-4 py-2 rounded-lg bg-amber-500 text-background font-medium hover:bg-amber-400"
              >
                Find gigs on the map
              </button>
            </div>
            <ArtistBlockedDatesCard />
          </div>
        ) : (
          <div className="space-y-8">
            {pending.length > 0 && (
              <section>
                <h2 className="artist-gigs-section-title">Invites awaiting your response</h2>
                <ul className="space-y-3">
                  {pending.map((gig) => (
                    <li key={`pending-${gig.outreachId ?? gig.eventId}`}>
                      <GigCard
                        gig={gig}
                        messaging={startConversation.isPending}
                        onMessage={() => handleMessage(gig)}
                        onViewEvent={() => navigate(linkTo(`/event/${gig.eventId}`))}
                        onViewVenue={() => navigate(linkTo(`/venue/${gig.venue.id}`))}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {confirmed.length > 0 && (
              <section>
                <h2 className="artist-gigs-section-title">Confirmed lineup</h2>
                <ul className="space-y-3">
                  {confirmed.map((gig) => (
                    <li key={`confirmed-${gig.eventId}`}>
                      <GigCard
                        gig={gig}
                        messaging={startConversation.isPending}
                        onMessage={() => handleMessage(gig)}
                        onViewEvent={() => navigate(linkTo(`/event/${gig.eventId}`))}
                        onViewVenue={() => navigate(linkTo(`/venue/${gig.venue.id}`))}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <ArtistBlockedDatesCard />
          </div>
        )}
      </div>
    </section>
  );
}