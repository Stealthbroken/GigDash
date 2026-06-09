import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "wouter";
import {
  useGetAccountSettings,
  useListEvents,
  useListArtistGigs,
  useStartConversation,
  getListArtistGigsQueryKey,
} from "@workspace/api-client-react";
import type { EventSummary, GeoPlace } from "@workspace/api-client-react";
import ArtistNav from "@/components/artist/ArtistNav";
import ArtistMapToolbar from "@/components/artist/ArtistMapToolbar";
import ArtistTabSwitcher from "@/components/artist/ArtistTabSwitcher";
import ArtistGigsPanel from "@/components/artist/ArtistGigsPanel";
import MapView from "@/components/fan/MapView";
import VenueResultCard, { type VenueCardData } from "@/components/artist/VenueResultCard";
import ArtistProfile from "@/pages/ArtistProfile";
import ChatPage from "@/pages/ChatPage";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { distanceKm, filterEventsByRadius } from "@/lib/mapView";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_RADIUS_KM,
  DEFAULT_MAP_ZOOM,
  MAX_MAP_RADIUS_KM,
} from "@/lib/constants";
import { isEventFinalized } from "@/lib/eventStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { parseArtistTab, useAppNavigation, type ArtistTab } from "@/lib/navigation";

type VenueWithOwner = VenueCardData & {
  suitableGenres: string[];
  competitionLevel: number;
  ownerUsername?: string;
};

function placeFromSettings(
  label: string | null | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined,
): GeoPlace | null {
  if (label && lat != null && lng != null) {
    return { label, lat, lng };
  }
  return null;
}

function getGenreOverlap(artistGenres: string[], venueGenres: string[]): number {
  if (artistGenres.length === 0) return 0.5;
  const matches = venueGenres.filter((g) => artistGenres.includes(g)).length;
  return matches / Math.max(1, venueGenres.length);
}

function getCompScore(artistLevel: number | null, venueLevel: number): number {
  if (artistLevel == null) return 0.5;
  const diff = Math.abs(artistLevel - venueLevel);
  return Math.max(0, 1 - diff / 4);
}

function scoreVenue(
  venue: VenueWithOwner,
  artistGenres: string[],
  artistComp: number | null,
  baseLat: number,
  baseLng: number,
): number {
  const dist = distanceKm(baseLat, baseLng, venue.lat ?? 0, venue.lng ?? 0);
  const distScore = Math.max(0, 1 - Math.min(dist, 12) / 12);
  const genreScore = getGenreOverlap(artistGenres, venue.suitableGenres);
  const compScore = getCompScore(artistComp, venue.competitionLevel);
  return 0.45 * distScore + 0.4 * genreScore + 0.15 * compScore;
}

function formatMatchReason(
  score: number,
  dist: number,
  genres: string[],
  venueGenres: string[],
  comp: number | null,
  vComp: number,
): string {
  const pct = Math.round(score * 100);
  const gMatch = genres.filter((g) => venueGenres.includes(g));
  const parts: string[] = [];
  if (gMatch.length > 0) parts.push(`${gMatch.join(" / ")} fit`);
  parts.push(`${dist.toFixed(1)} km away`);
  if (comp != null) {
    if (comp === vComp) parts.push("perfect competition match");
    else if (Math.abs(comp - vComp) <= 1) parts.push("close competition level");
  }
  return `${pct}% match — ${parts.join(" · ")}`;
}

function eventToVenue(event: EventSummary): VenueWithOwner | null {
  const v = event.venue;
  if (!v?.lat || !v?.lng) return null;
  return {
    id: v.id,
    name: v.name,
    address: v.address,
    description: v.description ?? "",
    moods: v.moods ?? [],
    imageUrl: v.imageUrls?.[0] ?? "",
    lat: v.lat,
    lng: v.lng,
    suitableGenres: event.genres ?? [],
    competitionLevel: event.competitionLevel ?? 2,
    ownerUsername: v.ownerUsername,
  };
}

export default function ArtistHome() {
  const search = useSearch();
  const { linkTo, navigate, goToArtistTab } = useAppNavigation();
  const { toast } = useToast();
  const { artistMatching } = useAuth();

  const urlParams = new URLSearchParams(search);
  const tab = parseArtistTab(urlParams.get("tab"));
  const chatIdParam = urlParams.get("chat");
  const conversationId = chatIdParam ? parseInt(chatIdParam, 10) : null;

  const [radiusKm, setRadiusKm] = useState(DEFAULT_MAP_RADIUS_KM);
  const [mapExplored, setMapExplored] = useState(false);
  const [refitToken, setRefitToken] = useState(0);
  const [sidebarCount, setSidebarCount] = useState(0);
  const [mapLocationInput, setMapLocationInput] = useState("");
  const [viewPlace, setViewPlace] = useState<GeoPlace | null>(null);
  const [venueFilter, setVenueFilter] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [showFinalized, setShowFinalized] = useState(false);
  const [contacted, setContacted] = useState<Set<number>>(new Set());
  const defaultedFromSettings = useRef(false);

  const { data: accountSettings } = useGetAccountSettings();
  const { data: myGigs } = useListArtistGigs({
    query: { queryKey: getListArtistGigsQueryKey() },
  });
  const gigCount = myGigs?.gigs?.length ?? 0;
  const debouncedFilter = useDebouncedValue(venueFilter.trim().toLowerCase(), 200);

  const artistGenres = artistMatching.genres;
  const artistCompLevel = artistMatching.comp;

  const startConversation = useStartConversation({
    mutation: {
      onSuccess: (data) => {
        goToArtistTab("messages", { chatId: data.id });
      },
      onError: () => {
        toast({ title: "Could not start chat", variant: "destructive" });
      },
    },
  });

  useEffect(() => {
    if (defaultedFromSettings.current || !accountSettings) return;
    const saved = placeFromSettings(
      accountSettings.locationLabel,
      accountSettings.locationLat,
      accountSettings.locationLng,
    );
    if (saved) {
      setViewPlace(saved);
      setMapLocationInput(saved.label);
    } else {
      setViewPlace({ label: DEFAULT_MAP_CENTER.label, lat: DEFAULT_MAP_CENTER.lat, lng: DEFAULT_MAP_CENTER.lng });
      setMapLocationInput(DEFAULT_MAP_CENTER.label);
    }
    defaultedFromSettings.current = true;
  }, [accountSettings]);

  const mapCenter = viewPlace ?? DEFAULT_MAP_CENTER;
  const mapReady = defaultedFromSettings.current;

  const { data: eventsData, isFetching } = useListEvents({
    nearLat: mapCenter.lat,
    nearLng: mapCenter.lng,
    radiusKm: MAX_MAP_RADIUS_KM,
    location: debouncedFilter || undefined,
    limit: 50,
  });

  const allEventsRaw = eventsData?.events ?? [];
  const allEvents = useMemo(() => {
    if (showFinalized) return allEventsRaw;
    return allEventsRaw.filter((e) => !isEventFinalized(e));
  }, [allEventsRaw, showFinalized]);

  const eventsInRadius = useMemo(
    () => filterEventsByRadius(allEvents, mapCenter.lat, mapCenter.lng, radiusKm),
    [allEvents, mapCenter.lat, mapCenter.lng, radiusKm],
  );

  const venuesFromEvents = useMemo(() => {
    const seen = new Map<number, VenueWithOwner>();
    for (const e of allEvents) {
      const v = eventToVenue(e);
      if (v && !seen.has(v.id)) seen.set(v.id, v);
    }
    return Array.from(seen.values());
  }, [allEvents]);

  const recommended = useMemo(() => {
    const withScores = venuesFromEvents.map((v) => {
      const sc = scoreVenue(v, artistGenres, artistCompLevel, mapCenter.lat, mapCenter.lng);
      const dist = distanceKm(mapCenter.lat, mapCenter.lng, v.lat ?? 0, v.lng ?? 0);
      const reason = formatMatchReason(sc, dist, artistGenres, v.suitableGenres, artistCompLevel, v.competitionLevel);
      return { venue: v, score: sc, dist, reason };
    });
    return withScores.sort((a, b) => b.score - a.score);
  }, [venuesFromEvents, artistGenres, artistCompLevel, mapCenter]);

  useEffect(() => {
    setMapExplored(false);
    setRefitToken((t) => t + 1);
  }, [debouncedFilter, viewPlace?.lat, viewPlace?.lng, radiusKm]);

  function handleTabChange(next: ArtistTab) {
    goToArtistTab(next);
  }

  function handleMessageOrganizer(event: EventSummary) {
    const ownerUsername = event.venue?.ownerUsername;
    if (!ownerUsername) {
      toast({ title: "Cannot message", description: "Venue owner not found.", variant: "destructive" });
      return;
    }
    setContacted((prev) => new Set(prev).add(event.venue!.id));
    startConversation.mutate({ data: { username: ownerUsername } });
  }

  const toolbar = (
    <ArtistMapToolbar
      mapLocationInput={mapLocationInput}
      onMapLocationInputChange={setMapLocationInput}
      viewPlace={viewPlace}
      onViewPlaceChange={setViewPlace}
      radiusKm={radiusKm}
      onRadiusKmChange={(km) => { setRadiusKm(km); if (!mapExplored) setRefitToken((t) => t + 1); }}
      venueFilter={venueFilter}
      onVenueFilterChange={setVenueFilter}
      venueCount={mapExplored ? sidebarCount : eventsInRadius.length}
      isUpdating={isFetching && !mapExplored}
      mapExplored={mapExplored}
      showFinalized={showFinalized}
      onShowFinalizedChange={setShowFinalized}
    />
  );

  const currentBaseLabel = mapCenter.label.split(",")[0];

  const headerSubtitle =
    tab === "map"
      ? "Open gigs on the map · tune recommendations in Settings"
      : tab === "recs"
        ? `Venue picks from ${currentBaseLabel} based on genre + competition fit`
        : tab === "gigs"
          ? "Confirmed shows and open invites"
          : tab === "preview"
            ? "How fans and venues see your public profile"
            : "Chat with venues about gigs and invites";

  return (
    <div className="artist-home flex flex-col overflow-hidden bg-background text-foreground min-h-[100dvh]">
      <ArtistNav />

      <div className="artist-home-head">
        <div className="artist-home-head-inner">
          <div className="artist-home-head-copy">
            <h1 className="artist-home-title">Find your next stage</h1>
            <p className="artist-home-subtitle">{headerSubtitle}</p>
          </div>
          <ArtistTabSwitcher active={tab} onChange={handleTabChange} gigCount={gigCount} />
        </div>
      </div>

      {tab === "map" ? (
        <section className="artist-map-area flex-1 min-h-0 flex flex-col">
          {!mapReady ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading map…</div>
          ) : (
            <MapView
              header={toolbar}
              mapEvents={allEvents}
              sidebarEvents={eventsInRadius}
              selectedEventId={selectedEventId}
              onSelectEvent={(e) => setSelectedEventId(e.id)}
              onSidebarCountChange={setSidebarCount}
              viewCenter={[mapCenter.lat, mapCenter.lng]}
              radiusKm={radiusKm}
              mapExplored={mapExplored}
              onMapExplored={() => setMapExplored(true)}
              onReturnToView={() => { setMapExplored(false); setRefitToken((t) => t + 1); }}
              refitToken={refitToken}
              isRefreshing={isFetching}
              viewZoom={DEFAULT_MAP_ZOOM}
              artistMode
              onMessageOrganizer={handleMessageOrganizer}
              fixedSidebarItems={5}
              onViewEvent={(e) => navigate(linkTo(`/event/${e.id}`))}
            />
          )}
        </section>
      ) : tab === "recs" ? (
        <section className="artist-home-recs flex-1 min-h-0 overflow-auto">
          <div className="artist-home-recs-inner">
            <h3 className="font-semibold mb-1">Recommended for you</h3>
            <p className="text-xs text-muted-foreground mb-4">From {currentBaseLabel} based on genre + competition fit.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommended.map(({ venue, score, dist, reason }) => (
                <VenueResultCard
                  key={venue.id}
                  venue={venue}
                  distanceKm={dist}
                  matchScore={Math.round(score * 100)}
                  matchReason={reason}
                  isContacted={contacted.has(venue.id)}
                  variant="full"
                  onMessage={(v) => {
                    const username = (v as VenueWithOwner).ownerUsername;
                    if (username) startConversation.mutate({ data: { username } });
                  }}
                  onSelectForMap={() => goToArtistTab("map")}
                />
              ))}
            </div>
          </div>
        </section>
      ) : tab === "gigs" ? (
        <ArtistGigsPanel
          onOpenMessages={(id) => goToArtistTab("messages", { chatId: id })}
          onBrowseMap={() => goToArtistTab("map")}
        />
      ) : tab === "preview" ? (
        <section className="artist-home-preview flex-1 min-h-0 overflow-auto">
          <ArtistProfile preview embedded />
        </section>
      ) : (
        <section className="artist-home-messages flex-1 min-h-0 flex flex-col overflow-hidden">
          <ChatPage
            role="artist"
            homePath="/artist"
            embedded
            conversationId={conversationId}
            onConversationChange={(id) => goToArtistTab("messages", { chatId: id })}
          />
        </section>
      )}
    </div>
  );
}