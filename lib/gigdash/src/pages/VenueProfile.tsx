import { useRoute, useLocation } from "wouter";
import { useSearch } from "wouter";
import { format } from "date-fns";
import {
  useGetVenue,
  useListEvents,
  useFollowVenue,
  useUnfollowVenue,
  useListFollowedVenues,
  useGetRatingSummary,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { artistTabUrl, useAppNavigation } from "@/lib/navigation";

interface VenueData {
  venueName: string;
  address: string;
  description: string;
  size: string;
  moods: string[];
  images: string[];
}

const SIZE_LABEL: Record<string, string> = {
  xs: "Tiny (< 50 guests)",
  sm: "Small (50–200 guests)",
  md: "Medium (200–500 guests)",
  lg: "Large (500+ guests)",
};

export default function VenueProfile() {
  const { navigate, goBack, linkTo } = useAppNavigation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const dataParam = params.get("data");
  const [match, routeParams] = useRoute("/venue/:id");

  let onboardingData: VenueData | null = null;
  try {
    if (dataParam) {
      onboardingData = JSON.parse(atob(decodeURIComponent(dataParam))) as VenueData;
    }
  } catch {
    onboardingData = null;
  }

  const venueId = match ? parseInt(routeParams.id, 10) : NaN;
  const { data: apiVenue, isLoading, error } = useGetVenue(venueId, {
    query: { queryKey: ["venue", venueId], enabled: !isNaN(venueId) && !onboardingData },
  });

  const { data: eventsData } = useListEvents({ limit: 100 });
  const { data: followedVenues, refetch } = useListFollowedVenues();
  const { data: rating } = useGetRatingSummary("venue", venueId);
  const { user } = useAuth();

  const venue = onboardingData
    ? {
        id: -1,
        name: onboardingData.venueName,
        address: onboardingData.address,
        description: onboardingData.description,
        size: onboardingData.size,
        moods: onboardingData.moods,
        imageUrls: onboardingData.images,
        lat: null,
        lng: null,
      }
    : apiVenue;

  const venueEvents = (eventsData?.events ?? []).filter((e) => e.venue?.id === venueId);
  const now = new Date();
  const upcoming = venueEvents
    .filter((e) => new Date(e.eventDate) >= now)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  const past = venueEvents
    .filter((e) => new Date(e.eventDate) < now)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
    .slice(0, 6);
  const isFollowing = followedVenues?.venues?.some((v) => v.id === venueId) ?? false;

  const fallbackBack =
    user?.role === "fan" ? "/fan" :
    user?.role === "artist" ? artistTabUrl("map") :
    user?.role === "venue" ? "/venue" : "/";

  const followMutation = useFollowVenue({ mutation: { onSuccess: () => refetch() } });
  const unfollowMutation = useUnfollowVenue({ mutation: { onSuccess: () => refetch() } });

  if (isLoading) {
    return <div className="venue-public-page min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading venue…</div>;
  }

  if (!venue) {
    return (
      <div className="venue-public-page min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-lg font-medium">Venue not found</p>
        <p className="text-sm text-muted-foreground">{error ? "Could not load venue." : "This venue doesn't exist."}</p>
        <button onClick={() => navigate("/")} className="mt-2 px-5 py-2 rounded-lg bg-violet-600 text-white text-sm">Go home</button>
      </div>
    );
  }

  const imageUrls = venue.imageUrls ?? [];

  return (
    <div className="venue-public-page min-h-screen bg-background text-foreground">
      <header className="venue-public-nav sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button type="button" onClick={() => navigate(user?.role === "fan" ? "/fan" : "/")} className="font-serif font-bold text-violet-400">
            GigDash
          </button>
          <button type="button" onClick={() => goBack(fallbackBack)} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </button>
        </div>
      </header>

      <main className="venue-public-main max-w-3xl mx-auto px-4 py-8 pb-16 space-y-8">
        <section className="venue-public-hero rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-card to-card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">Venue</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-2">{venue.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <span>📍</span> {venue.address}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
            {venue.size && <span>{SIZE_LABEL[venue.size] ?? venue.size}</span>}
            {(rating?.count ?? 0) > 0 && <span>★ {(rating?.average ?? 0).toFixed(1)} ({rating?.count} ratings)</span>}
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            {user?.role === "fan" && venueId > 0 && (
              <button
                type="button"
                onClick={() => (isFollowing ? unfollowMutation.mutate({ venueId }) : followMutation.mutate({ venueId }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isFollowing ? "border border-border text-muted-foreground" : "bg-violet-600 text-white hover:bg-violet-500"
                }`}
              >
                {isFollowing ? "Following" : "Follow for event updates"}
              </button>
            )}
            {user?.role === "fan" && (
              <button
                type="button"
                onClick={() => navigate("/fan")}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-violet-500/40 text-violet-400 hover:bg-violet-500/10"
              >
                View on map
              </button>
            )}
          </div>
        </section>

        {venueId > 0 && (
          <section className="grid grid-cols-3 gap-3">
            <div className="venue-public-stat">
              <p className="venue-public-stat-value">{upcoming.length}</p>
              <p className="venue-public-stat-label">Upcoming</p>
            </div>
            <div className="venue-public-stat">
              <p className="venue-public-stat-value">{venueEvents.length}</p>
              <p className="venue-public-stat-label">Total events</p>
            </div>
            <div className="venue-public-stat">
              <p className="venue-public-stat-value">{(rating?.average ?? 0).toFixed(1)}</p>
              <p className="venue-public-stat-label">Rating ({rating?.count ?? 0})</p>
            </div>
          </section>
        )}

        {imageUrls.length > 0 && (
          imageUrls.length <= 3 ? (
            <section className={`grid gap-3 ${imageUrls.length === 1 ? "grid-cols-1" : imageUrls.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {imageUrls.map((src, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl border border-border overflow-hidden">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </section>
          ) : (
            <section
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-2"
              aria-label={`${imageUrls.length} venue photos, scroll to see all`}
            >
              {imageUrls.map((src, i) => (
                <div
                  key={i}
                  className="snap-start shrink-0 w-[78%] sm:w-[calc((100%-1.5rem)/3)] aspect-[4/3] rounded-xl border border-border overflow-hidden"
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </section>
          )
        )}

        {venue.description && (
          <section>
            <h2 className="venue-public-section-title">About</h2>
            <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">{venue.description}</p>
          </section>
        )}

        {venue.moods && venue.moods.length > 0 && (
          <section>
            <h2 className="venue-public-section-title">Atmosphere</h2>
            <div className="flex flex-wrap gap-2">
              {venue.moods.map((m) => (
                <span key={m} className="px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-sm">{m}</span>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="venue-public-section-title">Upcoming events</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center rounded-xl border border-dashed border-border">
              No upcoming events listed yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((ev) => {
                const planning = ev.status !== "finalized";
                return (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => navigate(linkTo(`/event/${ev.id}`))}
                      className="venue-public-event-card w-full text-left rounded-xl border border-border p-4 hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{ev.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(ev.eventDate), "PPP · p")}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${planning ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                          {planning ? "! Planning" : "♪ Finalized"}
                        </span>
                      </div>
                      {ev.genres && ev.genres.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-2">{ev.genres.join(" · ")}</p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <h2 className="venue-public-section-title">Past events</h2>
            <ul className="space-y-2">
              {past.map((ev) => (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => navigate(linkTo(`/event/${ev.id}`))}
                    className="venue-public-event-card w-full text-left rounded-xl border border-border/70 p-3 opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <p className="font-medium text-sm">{ev.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(ev.eventDate), "PPP")}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {user?.role === "venue" && (
          <section className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-sm">Manage your venue</h3>
              <p className="text-xs text-muted-foreground mt-1">Post events, edit your space, and find artists from the dashboard.</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button onClick={() => navigate("/venue/create-event")} className="px-4 py-2.5 border border-violet-500/40 text-violet-400 font-semibold rounded-lg text-sm hover:bg-violet-500/10">
                New event
              </button>
              <button onClick={() => navigate("/venue")} className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg text-sm">
                Dashboard
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}