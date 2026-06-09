import { useLocation, useRoute } from "wouter";
import {
  useGetArtist,
  useGetArtistMe,
  useFollowArtist,
  useUnfollowArtist,
  useListFollowedArtists,
  useCreateRating,
  getGetArtistQueryKey,
  getGetArtistMeQueryKey,
  getListFollowedArtistsQueryKey,
} from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAppNavigation, artistTabUrl } from "@/lib/navigation";
import SpotifyEmbed, { parseSpotifyUrl } from "@/components/artist/SpotifyEmbed";

interface ArtistProfileProps {
  preview?: boolean;
  embedded?: boolean;
}

export default function ArtistProfile({ preview = false, embedded = false }: ArtistProfileProps) {
  const [, navigate] = useLocation();
  const { goBack, linkTo } = useAppNavigation();
  const [, params] = useRoute("/artist/profile/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const artistId = preview ? 0 : parseInt(params?.id ?? "0", 10);

  const { data: publicArtist, isLoading: publicLoading } = useGetArtist(artistId, {
    query: { queryKey: getGetArtistQueryKey(artistId), enabled: !preview && artistId > 0 },
  });
  const { data: meArtist, isLoading: meLoading } = useGetArtistMe({
    query: { queryKey: getGetArtistMeQueryKey(), enabled: preview },
  });

  const artist = preview ? meArtist : publicArtist;
  const isLoading = preview ? meLoading : publicLoading;
  const resolvedId = artist?.id ?? artistId;

  const { data: followed, refetch: refetchFollows } = useListFollowedArtists({
    query: { queryKey: getListFollowedArtistsQueryKey(), enabled: user?.role === "fan" && !preview },
  });

  const [ratingScore, setRatingScore] = useState(5);

  const isFollowing = followed?.artists?.some((a) => a.id === resolvedId) ?? false;

  const followMutation = useFollowArtist({ mutation: { onSuccess: () => refetchFollows() } });
  const unfollowMutation = useUnfollowArtist({ mutation: { onSuccess: () => refetchFollows() } });
  const rateMutation = useCreateRating({
    mutation: {
      onSuccess: () => toast({ title: "Rating submitted" }),
      onError: (err: unknown) => {
        const msg = err && typeof err === "object" && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : "Could not submit rating.";
        toast({ title: "Rating failed", description: msg, variant: "destructive" });
      },
    },
  });

  if (isLoading) {
    return (
      <div className="artist-profile-page min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading profile…
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="artist-profile-page min-h-screen flex items-center justify-center text-muted-foreground">
        Artist not found
      </div>
    );
  }

  const fallbackBack = preview
    ? artistTabUrl("preview")
    : user?.role === "fan"
      ? "/fan"
      : user?.role === "artist"
        ? artistTabUrl("map")
        : user?.role === "venue"
          ? "/venue"
          : "/";

  return (
    <div className={`artist-profile-page ${embedded ? "" : "min-h-screen"} bg-background text-foreground`}>
      {preview && !embedded && (
        <div className="artist-profile-preview-banner bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-400">
          Preview mode — this is how fans and venues see your public profile
        </div>
      )}

      {!embedded && (
        <header className="artist-profile-nav sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <button
              type="button"
              onClick={() => goBack(fallbackBack)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
            {preview && (
              <button
                type="button"
                onClick={() => navigate(linkTo("/settings"))}
                className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-400"
              >
                Edit profile
              </button>
            )}
          </div>
        </header>
      )}

      <main className={`artist-profile-main max-w-2xl mx-auto px-4 ${embedded ? "py-4 pb-8" : "py-8 pb-16"}`}>
        {preview && embedded && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
            <p className="text-xs text-amber-400/95">Preview — this is your public profile</p>
            <button
              type="button"
              onClick={() => navigate(linkTo("/settings"))}
              className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-400 shrink-0"
            >
              Edit profile
            </button>
          </div>
        )}
        <section className="artist-profile-hero rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card p-6 mb-8">
          <div className="flex items-start gap-4">
            <Avatar className="h-24 w-24 border-2 border-amber-500/40 shadow-lg">
              <AvatarImage src={artist.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xl bg-amber-500/10">{artist.displayName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="artist-profile-name font-serif text-2xl sm:text-3xl font-bold tracking-tight">{artist.displayName}</h1>
              {artist.genres && artist.genres.length > 0 && (
                <p className="text-sm text-amber-400/90 mt-1">{artist.genres.join(" · ")}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span>{artist.followerCount ?? 0} follower{(artist.followerCount ?? 0) !== 1 ? "s" : ""}</span>
                {(artist.ratingCount ?? 0) > 0 && (
                  <span>★ {(artist.ratingAverage ?? 0).toFixed(1)} ({artist.ratingCount} ratings)</span>
                )}
              </div>
              {user?.role === "fan" && !preview && (
                <button
                  type="button"
                  onClick={() => (isFollowing ? unfollowMutation.mutate({ artistId: resolvedId }) : followMutation.mutate({ artistId: resolvedId }))}
                  className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isFollowing ? "border border-border text-muted-foreground" : "bg-emerald-600 text-white hover:bg-emerald-500"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow artist"}
                </button>
              )}
            </div>
          </div>
        </section>

        {artist.bio && (
          <section className="mb-8">
            <h2 className="artist-profile-section-title">Bio</h2>
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{artist.bio}</p>
          </section>
        )}

        {artist.vibes && artist.vibes.length > 0 && (
          <section className="mb-8">
            <h2 className="artist-profile-section-title">Performance vibe</h2>
            <div className="flex flex-wrap gap-2">
              {artist.vibes.map((v) => (
                <span key={v} className="artist-profile-vibe-chip">{v}</span>
              ))}
            </div>
          </section>
        )}

        {(artist.spotifyUrl || artist.youtubeUrl) && (
          <section className="mb-8 space-y-4">
            {artist.spotifyUrl && (
              parseSpotifyUrl(artist.spotifyUrl) ? (
                <SpotifyEmbed url={artist.spotifyUrl} />
              ) : (
                <a href={artist.spotifyUrl} target="_blank" rel="noreferrer" className="artist-profile-link artist-profile-link--spotify inline-flex">
                  Spotify ↗
                </a>
              )
            )}
            {artist.youtubeUrl && (
              <div>
                <a href={artist.youtubeUrl} target="_blank" rel="noreferrer" className="artist-profile-link artist-profile-link--youtube inline-flex">
                  YouTube ↗
                </a>
              </div>
            )}
          </section>
        )}

        {artist.venuesPlayed && artist.venuesPlayed.length > 0 && (
          <section className="mb-8">
            <h2 className="artist-profile-section-title">Venues played</h2>
            <ul className="space-y-2">
              {artist.venuesPlayed.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => navigate(linkTo(`/venue/${v.id}`))}
                    className="artist-profile-venue-link text-sm"
                  >
                    {v.name}
                    <span className="text-muted-foreground ml-1">· {v.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {user?.role === "venue" && !preview && (
          <section className="artist-profile-rating-card rounded-xl border border-violet-500/25 bg-violet-500/5 p-5 space-y-3">
            <h2 className="font-semibold text-sm">Rate this artist</h2>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRatingScore(n)} className={`text-2xl ${n <= ratingScore ? "text-amber-400" : "text-muted-foreground/30"}`}>★</button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => rateMutation.mutate({ data: { targetType: "artist", targetId: resolvedId, score: ratingScore } })}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-500"
            >
              Submit rating
            </button>
            <p className="text-[10px] text-muted-foreground">30-day cooldown per artist applies.</p>
          </section>
        )}
      </main>
    </div>
  );
}