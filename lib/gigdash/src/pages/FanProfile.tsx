import { useLocation } from "wouter";
import { MessageCircle, Settings } from "lucide-react";
import {
  useGetFanMe,
  useListFollowedArtists,
  useGetAccountSettings,
} from "@workspace/api-client-react";
import type { FollowedArtistSummary } from "@workspace/api-client-react";
import FanNav from "@/components/fan/FanNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

function formatGigDate(value: string): string {
  const d = new Date(value);
  return d.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function artistInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function FollowedArtistRow({
  artist,
  onChat,
}: {
  artist: FollowedArtistSummary;
  onChat: (artistId: number) => void;
}) {
  const gig = artist.recentGig;

  return (
    <li className="fan-followed-card rounded-xl border border-border bg-card p-4 flex gap-4">
      <Avatar className="h-14 w-14 shrink-0 border-2 border-border">
        <AvatarImage src={artist.avatarUrl ?? undefined} alt="" />
        <AvatarFallback className="bg-secondary text-sm font-semibold">
          {artistInitials(artist.displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-base leading-tight">{artist.displayName}</h3>
            {artist.genres && artist.genres.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{artist.genres.join(" · ")}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChat(artist.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shrink-0"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            Chat
          </button>
        </div>

        {gig ? (
          <div className="rounded-lg border border-border/80 bg-secondary/30 px-3 py-2.5 text-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Most recent gig
            </p>
            <p className="font-medium text-foreground/95">{gig.title}</p>
            <p className="text-muted-foreground text-xs mt-1">
              {gig.venueName}
              {gig.venueAddress ? ` · ${gig.venueAddress}` : ""}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">{formatGigDate(gig.eventDate)}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No completed gigs on record yet.</p>
        )}
      </div>
    </li>
  );
}

export default function FanProfile() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: fan, isLoading: fanLoading } = useGetFanMe();
  const { data: settings } = useGetAccountSettings();
  const {
    data: followed,
    isLoading: followsLoading,
    error: followsError,
  } = useListFollowedArtists();

  const avatarUrl = settings?.avatarUrl ?? user?.avatarUrl ?? null;
  const username = settings?.username ?? user?.username ?? "";
  const initials = (fan?.displayName ?? username).slice(0, 2).toUpperCase();
  const artists = followed?.artists ?? [];

  function openChat(artistId: number) {
    navigate(`/fan/chat/${artistId}`);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <FanNav />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-10 space-y-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight">Your profile</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Artists you follow and where they&apos;ve played recently.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Account settings"
          >
            <Settings className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>

        <section className="rounded-xl border border-border bg-card p-6 flex items-center gap-4">
          {fanLoading ? (
            <p className="text-sm text-muted-foreground">Loading profile…</p>
          ) : (
            <>
              <Avatar className="h-20 w-20 border-2 border-border shrink-0">
                <AvatarImage src={avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="bg-secondary text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="font-semibold text-lg">{fan?.displayName ?? username}</h2>
                {fan?.location && (
                  <p className="text-sm text-muted-foreground mt-0.5">{fan.location}</p>
                )}
                {fan?.genres && fan.genres.length > 0 && (
                  <p className="text-xs text-emerald-400/90 mt-2">{fan.genres.join(" · ")}</p>
                )}
              </div>
            </>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-base">Followed artists</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Tap Chat to message an artist directly.
            </p>
          </div>

          {followsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading artists…</p>
          ) : followsError ? (
            <p className="text-sm text-red-400 text-center py-8 rounded-lg border border-red-500/30 bg-red-500/10 px-4">
              Could not load followed artists. Please try again.
            </p>
          ) : artists.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                You&apos;re not following any artists yet.
              </p>
              <button
                type="button"
                onClick={() => navigate("/fan")}
                className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                Discover gigs on the map
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {artists.map((artist) => (
                <FollowedArtistRow key={artist.id} artist={artist} onChat={openChat} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}