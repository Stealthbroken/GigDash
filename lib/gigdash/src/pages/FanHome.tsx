import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  useListEvents,
  useGetAccountSettings,
  useGetFanMe,
  useListFollowedArtists,
  useListFollowedVenues,
} from "@workspace/api-client-react";
import type { EventSummary, GeoPlace } from "@workspace/api-client-react";
import FanNav from "@/components/fan/FanNav";
import FanMapToolbar from "@/components/fan/FanMapToolbar";
import MapView from "@/components/fan/MapView";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_RADIUS_KM,
  DEFAULT_MAP_ZOOM,
  MAX_MAP_RADIUS_KM,
} from "@/lib/constants";
import { distanceKm, filterEventsByRadius } from "@/lib/mapView";

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

function eventMatchesFilters(
  event: EventSummary,
  fanGenres: string[],
  selectedGenre: string,
  customGenres: string[],
): boolean {
  const activeGenres = [
    ...(selectedGenre !== "All" ? [selectedGenre] : []),
    ...customGenres,
  ];
  if (activeGenres.length === 0 && fanGenres.length === 0) return false;
  const check = activeGenres.length > 0 ? activeGenres : fanGenres;
  return event.genres?.some((g) =>
    check.some((f) => g.toLowerCase().includes(f.toLowerCase())),
  ) ?? false;
}

function eventMatchesFollowing(
  event: EventSummary,
  followedVenueIds: Set<number>,
  followedArtistIds: Set<number>,
): boolean {
  if (event.venue?.id && followedVenueIds.has(event.venue.id)) return true;
  const artistIds = event.artistIds ?? [];
  return artistIds.some((id) => followedArtistIds.has(id));
}

export default function FanHome() {
  const [, navigate] = useLocation();
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [customGenres, setCustomGenres] = useState<string[]>([]);
  const [venueFilter, setVenueFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [artistFilter, setArtistFilter] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_MAP_RADIUS_KM);
  const [mapExplored, setMapExplored] = useState(false);
  const [refitToken, setRefitToken] = useState(0);
  const [sidebarCount, setSidebarCount] = useState(0);
  const [followingOnly, setFollowingOnly] = useState(false);

  const [mapLocationInput, setMapLocationInput] = useState("");
  const [viewPlace, setViewPlace] = useState<GeoPlace | null>(null);
  const defaultedFromSettings = useRef(false);

  const { data: accountSettings } = useGetAccountSettings();
  const { data: fanProfile } = useGetFanMe();
  const { data: followedArtists } = useListFollowedArtists();
  const { data: followedVenues } = useListFollowedVenues();
  const debouncedVenue = useDebouncedValue(venueFilter.trim(), 300);
  const debouncedCity = useDebouncedValue(cityFilter.trim(), 300);
  const debouncedArtist = useDebouncedValue(artistFilter.trim(), 300);

  const fanGenres = fanProfile?.genres ?? [];

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

  const hasActiveFilters =
    selectedGenre !== "All" ||
    customGenres.length > 0 ||
    !!debouncedVenue ||
    !!debouncedCity ||
    !!debouncedArtist ||
    followingOnly;

  const activeGenre =
    selectedGenre !== "All"
      ? selectedGenre
      : customGenres[0] ?? undefined;

  const { data, isLoading, isFetching, error } = useListEvents({
    genre: activeGenre,
    location: debouncedVenue || undefined,
    city: debouncedCity || undefined,
    artistName: debouncedArtist || undefined,
    nearLat: mapCenter.lat,
    nearLng: mapCenter.lng,
    radiusKm: MAX_MAP_RADIUS_KM,
    skipProximity: hasActiveFilters ? "true" : undefined,
    limit: 50,
  });

  const followedVenueIds = useMemo(
    () => new Set(followedVenues?.venues?.map((v) => v.id) ?? []),
    [followedVenues],
  );
  const followedArtistIds = useMemo(
    () => new Set(followedArtists?.artists?.map((a) => a.id) ?? []),
    [followedArtists],
  );

  const rawEvents = data?.events ?? [];
  const allEvents = useMemo(() => {
    if (!followingOnly) return rawEvents;
    return rawEvents.filter((e) => eventMatchesFollowing(e, followedVenueIds, followedArtistIds));
  }, [rawEvents, followingOnly, followedVenueIds, followedArtistIds]);

  const eventsInRadius = useMemo(
    () => filterEventsByRadius(allEvents, mapCenter.lat, mapCenter.lng, radiusKm),
    [allEvents, mapCenter.lat, mapCenter.lng, radiusKm],
  );

  const recommendedEvents = useMemo(() => {
    if (fanGenres.length === 0) return [];
    return [...allEvents]
      .filter((e) => eventMatchesFilters(e, fanGenres, "All", []))
      .sort((a, b) => {
        const da = distanceKm(mapCenter.lat, mapCenter.lng, a.venue?.lat ?? 0, a.venue?.lng ?? 0);
        const db = distanceKm(mapCenter.lat, mapCenter.lng, b.venue?.lat ?? 0, b.venue?.lng ?? 0);
        return da - db;
      })
      .slice(0, 5);
  }, [allEvents, fanGenres, mapCenter.lat, mapCenter.lng]);

  const sidebarEvents = useMemo(() => {
    if (hasActiveFilters) {
      return [...allEvents].sort((a, b) => {
        const da = distanceKm(mapCenter.lat, mapCenter.lng, a.venue?.lat ?? 0, a.venue?.lng ?? 0);
        const db = distanceKm(mapCenter.lat, mapCenter.lng, b.venue?.lat ?? 0, b.venue?.lng ?? 0);
        return da - db;
      });
    }
    if (!mapExplored && recommendedEvents.length > 0) {
      const recIds = new Set(recommendedEvents.map((e) => e.id));
      const combined = [
        ...recommendedEvents,
        ...eventsInRadius.filter((e) => !recIds.has(e.id)),
      ];
      return combined;
    }
    return eventsInRadius;
  }, [hasActiveFilters, allEvents, eventsInRadius, recommendedEvents, mapExplored, mapCenter]);

  const highlightEventIds = useMemo(() => {
    const ids = new Set<number>();
    for (const e of allEvents) {
      if (eventMatchesFilters(e, fanGenres, selectedGenre, customGenres)) {
        ids.add(e.id);
      }
    }
    return ids;
  }, [allEvents, fanGenres, selectedGenre, customGenres]);

  const toolbarEventCount = mapExplored ? sidebarCount : sidebarEvents.length;

  useEffect(() => {
    setMapExplored(false);
    setRefitToken((t) => t + 1);
  }, [selectedGenre, customGenres, debouncedVenue, debouncedCity, debouncedArtist, followingOnly, viewPlace?.lat, viewPlace?.lng]);

  useEffect(() => {
    setSelectedEventId(null);
  }, [selectedGenre, customGenres, debouncedVenue, debouncedCity, debouncedArtist, followingOnly, viewPlace?.lat, viewPlace?.lng]);

  const handleSelectEvent = (event: EventSummary) => {
    setSelectedEventId(event.id);
  };

  const handleReturnToView = () => {
    setMapExplored(false);
    setRefitToken((t) => t + 1);
  };

  const handleRadiusChange = (km: number) => {
    setRadiusKm(km);
    if (!mapExplored) setRefitToken((t) => t + 1);
  };

  const showMap = mapReady && !error;
  const isRefreshing = showMap && (isFetching || isLoading);

  const toolbar = (
    <FanMapToolbar
      mapLocationInput={mapLocationInput}
      onMapLocationInputChange={setMapLocationInput}
      viewPlace={viewPlace}
      onViewPlaceChange={setViewPlace}
      radiusKm={radiusKm}
      onRadiusKmChange={handleRadiusChange}
      venueFilter={venueFilter}
      onVenueFilterChange={setVenueFilter}
      cityFilter={cityFilter}
      onCityFilterChange={setCityFilter}
      artistFilter={artistFilter}
      onArtistFilterChange={setArtistFilter}
      selectedGenre={selectedGenre}
      onGenreChange={setSelectedGenre}
      customGenres={customGenres}
      onAddCustomGenre={(g) => setCustomGenres((prev) => [...prev, g])}
      onRemoveCustomGenre={(g) => {
        setCustomGenres((prev) => prev.filter((x) => x !== g));
        if (selectedGenre === g) setSelectedGenre("All");
      }}
      eventCount={toolbarEventCount}
      isUpdating={isFetching && !mapExplored}
      mapExplored={mapExplored}
      hasActiveFilters={hasActiveFilters}
      followingOnly={followingOnly}
      onFollowingOnlyChange={setFollowingOnly}
    />
  );

  return (
    <div className="fan-home flex flex-col overflow-hidden bg-background text-foreground">
      <FanNav active="discover" />

      <section className="fan-map-area flex-1 min-h-0 flex flex-col">
        {!mapReady ? (
          <div className="fan-map-loading h-full flex items-center justify-center">
            <div className="fan-map-refresh-shimmer fan-map-refresh-shimmer--solo" aria-hidden />
          </div>
        ) : error ? (
          <div className="fan-map-loading h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <span className="text-4xl mb-3 block">⚠️</span>
              <p className="font-medium text-sm">Could not load events</p>
              <p className="text-xs mt-1">Please try again later.</p>
            </div>
          </div>
        ) : (
          <MapView
            header={toolbar}
            mapEvents={allEvents}
            sidebarEvents={sidebarEvents}
            selectedEventId={selectedEventId}
            onSelectEvent={handleSelectEvent}
            onSidebarCountChange={setSidebarCount}
            viewCenter={[mapCenter.lat, mapCenter.lng]}
            radiusKm={radiusKm}
            mapExplored={mapExplored || hasActiveFilters}
            onMapExplored={() => setMapExplored(true)}
            onReturnToView={handleReturnToView}
            refitToken={refitToken}
            isRefreshing={isRefreshing}
            viewZoom={DEFAULT_MAP_ZOOM}
            highlightEventIds={highlightEventIds}
            bypassViewportFilter={hasActiveFilters}
            onViewEvent={(e) => navigate(`/event/${e.id}`)}
          />
        )}
      </section>
    </div>
  );
}