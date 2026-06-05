import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGetAccountSettings } from "@workspace/api-client-react";
import type { GeoPlace } from "@workspace/api-client-react";
import ArtistNav from "@/components/artist/ArtistNav";
import ArtistMapToolbar from "@/components/artist/ArtistMapToolbar";
import ArtistVenueMap, { type ArtistMapVenue } from "@/components/artist/ArtistVenueMap";
import VenueResultCard, { type VenueCardData } from "@/components/artist/VenueResultCard";
import VenueMessageDialog, { type VenueForMessage } from "@/components/artist/VenueMessageDialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { distanceKm } from "@/lib/mapView";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_RADIUS_KM,
  DEFAULT_MAP_ZOOM,
  MAX_MAP_RADIUS_KM,
} from "@/lib/constants";
import { COMPETITION_LEVELS } from "@/lib/venueConstants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const GENRES = ["Jazz", "Pop", "Folk", "Rock", "Hip-Hop", "Electronic", "Classical", "R&B", "Country", "Metal"] as const;

interface ArtistVenue extends VenueCardData {
  suitableGenres: string[];
  competitionLevel: number; // 1-5
}

// Dummy data derived from previous seed.ts venues
const DUMMY_VENUES: ArtistVenue[] = [
  {
    id: 1,
    name: "The Blue Note",
    address: "321 Jazz Ave, Toronto, ON",
    description: "A beloved jazz club with cozy booths and a world-class sound system.",
    moods: ["Intimate", "Chill", "Bar"],
    imageUrl: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?w=800&q=80",
    lat: 43.6532,
    lng: -79.3832,
    suitableGenres: ["Jazz"],
    competitionLevel: 2,
  },
  {
    id: 2,
    name: "Rooftop Live",
    address: "88 King St W, Toronto, ON",
    description: "An open-air rooftop venue with stunning city views and a lively crowd.",
    moods: ["Rooftop", "Outdoor", "High-energy", "All-ages"],
    imageUrl: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&q=80",
    lat: 43.6487,
    lng: -79.3816,
    suitableGenres: ["Folk", "Pop", "Rock"],
    competitionLevel: 3,
  },
  {
    id: 3,
    name: "The Hideaway Lounge",
    address: "47 Queen St E, Toronto, ON",
    description: "A hidden gem basement bar with velvet curtains and warm lighting.",
    moods: ["Lounge", "Formal", "Intimate"],
    imageUrl: "https://images.unsplash.com/photo-1543007631-283050bb3e8c?w=800&q=80",
    lat: 43.6506,
    lng: -79.3789,
    suitableGenres: ["Jazz", "Folk", "R&B"],
    competitionLevel: 1,
  },
  {
    id: 4,
    name: "The Danforth Music Hall",
    address: "147 Danforth Ave, Toronto, ON",
    description: "Historic theatre turned concert venue with a grand stage and excellent acoustics.",
    moods: ["Concert Hall", "High-energy", "All-ages"],
    imageUrl: "https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=800&q=80",
    lat: 43.6763,
    lng: -79.3560,
    suitableGenres: ["Rock", "Metal", "Folk"],
    competitionLevel: 4,
  },
  {
    id: 5,
    name: "Mod Club Theatre",
    address: "722 College St, Toronto, ON",
    description: "Intimate live music venue with a dance floor and a packed calendar.",
    moods: ["Club", "High-energy", "18+"],
    imageUrl: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80",
    lat: 43.6547,
    lng: -79.4113,
    suitableGenres: ["Electronic", "Hip-Hop", "Pop"],
    competitionLevel: 3,
  },
];

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

function getCompScore(artistLevel: number, venueLevel: number): number {
  const diff = Math.abs(artistLevel - venueLevel);
  return Math.max(0, 1 - diff / 4);
}

function scoreVenue(
  venue: ArtistVenue,
  artistGenres: string[],
  artistComp: number,
  baseLat: number,
  baseLng: number,
): number {
  const dist = distanceKm(baseLat, baseLng, venue.lat, venue.lng);
  const distScore = Math.max(0, 1 - Math.min(dist, 12) / 12);
  const genreScore = getGenreOverlap(artistGenres, venue.suitableGenres);
  const compScore = getCompScore(artistComp, venue.competitionLevel);
  // Balanced: proximity 45%, tags/genre fit 40%, competition fit 15%
  return 0.45 * distScore + 0.40 * genreScore + 0.15 * compScore;
}

function formatMatchReason(score: number, dist: number, genres: string[], venueGenres: string[], comp: number, vComp: number): string {
  const pct = Math.round(score * 100);
  const gMatch = genres.filter((g) => venueGenres.includes(g));
  const parts: string[] = [];
  if (gMatch.length > 0) parts.push(`${gMatch.join(" / ")} fit`);
  parts.push(`${dist.toFixed(1)} km away`);
  if (comp === vComp) parts.push("perfect competition match");
  else if (Math.abs(comp - vComp) <= 1) parts.push("close competition level");
  return `${pct}% match — ${parts.join(" · ")}`;
}

export default function ArtistHome() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Map / search state (mirrors fan pattern)
  const [radiusKm, setRadiusKm] = useState(DEFAULT_MAP_RADIUS_KM);
  const [mapExplored, setMapExplored] = useState(false);
  const [refitToken, setRefitToken] = useState(0);
  const [sidebarCount, setSidebarCount] = useState(0);
  const [mapLocationInput, setMapLocationInput] = useState("");
  const [viewPlace, setViewPlace] = useState<GeoPlace | null>(null);
  const [venueFilter, setVenueFilter] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const defaultedFromSettings = useRef(false);

  // Artist self-identification for recs (persisted lightly in localStorage for demo)
  const [artistGenres, setArtistGenres] = useState<string[]>(["Jazz", "Folk"]);
  const [artistCompLevel, setArtistCompLevel] = useState<number>(3); // Moderate default

  // DM state
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgVenue, setMsgVenue] = useState<VenueForMessage | null>(null);
  const [contacted, setContacted] = useState<Set<number>>(new Set());

  // View mode tabs: map search vs pure recommendations
  const [view, setView] = useState<"map" | "recs">("map");

  const { data: accountSettings } = useGetAccountSettings();
  const debouncedFilter = useDebouncedValue(venueFilter.trim().toLowerCase(), 200);

  // Load saved artist prefs
  useEffect(() => {
    try {
      const saved = localStorage.getItem("artistMatchingPrefs");
      if (saved) {
        const p = JSON.parse(saved);
        if (Array.isArray(p.genres) && p.genres.length) setArtistGenres(p.genres);
        if (typeof p.comp === "number") setArtistCompLevel(Math.min(5, Math.max(1, p.comp)));
      }
    } catch {}
  }, []);

  // Persist prefs
  function savePrefs(genres: string[], comp: number) {
    try {
      localStorage.setItem("artistMatchingPrefs", JSON.stringify({ genres, comp }));
    } catch {}
  }

  function toggleGenre(g: string) {
    setArtistGenres((prev) => {
      const next = prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g];
      const final = next.length ? next : [g]; // keep at least one
      savePrefs(final, artistCompLevel);
      return final;
    });
  }

  function setComp(level: number) {
    setArtistCompLevel(level);
    savePrefs(artistGenres, level);
  }

  // Default map location from settings or Toronto
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
      setViewPlace({
        label: DEFAULT_MAP_CENTER.label,
        lat: DEFAULT_MAP_CENTER.lat,
        lng: DEFAULT_MAP_CENTER.lng,
      });
      setMapLocationInput(DEFAULT_MAP_CENTER.label);
    }
    defaultedFromSettings.current = true;
  }, [accountSettings]);

  const mapCenter = viewPlace ?? {
    label: DEFAULT_MAP_CENTER.label,
    lat: DEFAULT_MAP_CENTER.lat,
    lng: DEFAULT_MAP_CENTER.lng,
  };

  const mapReady = defaultedFromSettings.current;

  // All venues for map (could be fetched later)
  const allVenues = DUMMY_VENUES;

  // Filtered by name
  const nameFiltered = useMemo(() => {
    if (!debouncedFilter) return allVenues;
    return allVenues.filter((v) => v.name.toLowerCase().includes(debouncedFilter));
  }, [debouncedFilter]);

  // Venues inside current radius from map center (for map view "in view")
  const venuesInRadius = useMemo(() => {
    return nameFiltered.filter((v) => {
      return distanceKm(mapCenter.lat, mapCenter.lng, v.lat, v.lng) <= radiusKm;
    });
  }, [nameFiltered, mapCenter.lat, mapCenter.lng, radiusKm]);

  // For recommendations: scored + sorted, always from the chosen location (not limited by radius)
  const recommended = useMemo(() => {
    const baseLat = mapCenter.lat;
    const baseLng = mapCenter.lng;
    const withScores = allVenues.map((v) => {
      const sc = scoreVenue(v, artistGenres, artistCompLevel, baseLat, baseLng);
      const dist = distanceKm(baseLat, baseLng, v.lat, v.lng);
      const reason = formatMatchReason(sc, dist, artistGenres, v.suitableGenres, artistCompLevel, v.competitionLevel);
      return { venue: v, score: sc, dist, reason };
    });
    return withScores.sort((a, b) => b.score - a.score);
  }, [artistGenres, artistCompLevel, mapCenter.lat, mapCenter.lng]);

  // Reset explore/refit on filter/location/radius change
  useEffect(() => {
    setMapExplored(false);
    setRefitToken((t) => t + 1);
  }, [debouncedFilter, viewPlace?.lat, viewPlace?.lng, radiusKm]);

  useEffect(() => {
    setSelectedVenueId(null);
  }, [debouncedFilter, viewPlace?.lat, viewPlace?.lng, radiusKm]);

  const handleSelectVenue = (v: ArtistMapVenue | VenueCardData) => {
    setSelectedVenueId(v.id);
    // If in recs, switch to map and fly
    if (view === "recs") {
      setView("map");
    }
  };

  const handleRadiusChange = (km: number) => {
    setRadiusKm(km);
    if (!mapExplored) setRefitToken((t) => t + 1);
  };

  const handleReturnToView = () => {
    setMapExplored(false);
    setRefitToken((t) => t + 1);
  };

  const openMessage = (v: ArtistMapVenue | VenueCardData) => {
    setMsgVenue({ id: v.id, name: v.name, address: v.address });
    setMsgOpen(true);
  };

  const handleMessageSent = (venueId: number) => {
    setContacted((prev) => {
      const next = new Set(prev);
      next.add(venueId);
      return next;
    });
  };

  const closeMsg = (open: boolean) => {
    setMsgOpen(open);
    if (!open) setMsgVenue(null);
  };

  const toolbar = (
    <ArtistMapToolbar
      mapLocationInput={mapLocationInput}
      onMapLocationInputChange={setMapLocationInput}
      viewPlace={viewPlace}
      onViewPlaceChange={setViewPlace}
      radiusKm={radiusKm}
      onRadiusKmChange={handleRadiusChange}
      venueFilter={venueFilter}
      onVenueFilterChange={setVenueFilter}
      venueCount={mapExplored ? sidebarCount : venuesInRadius.length}
      isUpdating={false}
      mapExplored={mapExplored}
    />
  );

  const showMap = mapReady;
  const isRefreshing = false;

  const currentBaseLabel = mapCenter.label.split(",")[0];

  return (
    <div className="artist-home flex flex-col overflow-hidden bg-background text-foreground min-h-[100dvh]">
      <ArtistNav active={view === "map" ? "discover" : "recs"} />

      <div className="px-4 pt-4 pb-2 border-b border-border/70 bg-card/50">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Find your next stage</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Search venues on the map or get smart recommendations based on your sound and experience level.</p>
            </div>
            <button
              onClick={() => navigate("/settings")}
              className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary"
            >
              Edit full profile
            </button>
          </div>

          {/* Self-identification controls for recommendations */}
          <div className="mt-3 rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Your genres</div>
                <div className="flex flex-wrap gap-1.5">
                  {GENRES.map((g) => {
                    const active = artistGenres.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGenre(g)}
                        className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium transition-all ${
                          active
                            ? "bg-amber-500/15 border-amber-500/60 text-amber-400"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-amber-500/30"
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-w-[220px]">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-2">
                  Competition level you can play
                  <span className="normal-case text-amber-400 font-mono text-xs">L{artistCompLevel}</span>
                </div>
                <div className="flex gap-1.5">
                  {COMPETITION_LEVELS.map((c) => (
                    <button
                      key={c.level}
                      type="button"
                      onClick={() => setComp(c.level)}
                      title={c.description}
                      className={`flex-1 text-center px-2 py-1 rounded-lg border text-[10px] font-medium transition-all ${
                        artistCompLevel === c.level
                          ? "bg-amber-500 text-background border-amber-500"
                          : "border-border hover:bg-secondary text-muted-foreground"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground/70 mt-1">{COMPETITION_LEVELS.find((c) => c.level === artistCompLevel)?.description}</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground/70">Recommendations balance proximity to <span className="font-medium text-foreground/80">{currentBaseLabel}</span>, genre fit, and competition level match.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Tabs value={view} onValueChange={(v) => setView(v as "map" | "recs")} className="h-full flex flex-col">
          <div className="border-b bg-background px-4 pt-2">
            <div className="max-w-5xl mx-auto">
              <TabsList className="bg-muted/70">
                <TabsTrigger value="map" className="data-[state=active]:bg-background">Map search</TabsTrigger>
                <TabsTrigger value="recs" className="data-[state=active]:bg-background">Recommendations</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="map" className="flex-1 min-h-0 mt-0 focus-visible:outline-none">
            {!showMap ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">Loading map…</div>
            ) : (
              <div className="h-full p-3">
                <div className="max-w-[1200px] mx-auto h-full">
                  <ArtistVenueMap
                    header={toolbar}
                    venues={nameFiltered as ArtistMapVenue[]}
                    visibleVenues={venuesInRadius as ArtistMapVenue[]}
                    selectedVenueId={selectedVenueId}
                    onSelectVenue={handleSelectVenue}
                    onSidebarCountChange={setSidebarCount}
                    viewCenter={[mapCenter.lat, mapCenter.lng]}
                    radiusKm={radiusKm}
                    mapExplored={mapExplored}
                    onMapExplored={() => setMapExplored(true)}
                    onReturnToView={handleReturnToView}
                    refitToken={refitToken}
                    isRefreshing={isRefreshing}
                    viewZoom={DEFAULT_MAP_ZOOM}
                    contactedVenueIds={contacted}
                    onMessageVenue={openMessage}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recs" className="flex-1 min-h-0 mt-0 overflow-auto focus-visible:outline-none bg-muted/20">
            <div className="max-w-5xl mx-auto px-4 py-5">
              <div className="mb-3 flex items-baseline justify-between">
                <div>
                  <h3 className="font-semibold">Recommended for you</h3>
                  <p className="text-xs text-muted-foreground">Sorted by match to your genres + competition level + distance from {currentBaseLabel}.</p>
                </div>
                <button onClick={() => setView("map")} className="text-xs underline text-amber-400 hover:text-amber-300">Switch to map search</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommended.map(({ venue, score, dist, reason }) => {
                  const pct = Math.round(score * 100);
                  const isContacted = contacted.has(venue.id);
                  return (
                    <VenueResultCard
                      key={venue.id}
                      venue={venue}
                      distanceKm={dist}
                      matchScore={pct}
                      matchReason={reason}
                      isContacted={isContacted}
                      variant="full"
                      onMessage={openMessage}
                      onSelectForMap={handleSelectVenue}
                    />
                  );
                })}
              </div>

              {recommended.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">No venues available right now.</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <VenueMessageDialog
        open={msgOpen}
        onOpenChange={closeMsg}
        venue={msgVenue}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}
