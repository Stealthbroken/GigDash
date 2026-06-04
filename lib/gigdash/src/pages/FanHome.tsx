import { useEffect, useMemo, useRef, useState } from "react";
import { useListEvents, useGetAccountSettings } from "@workspace/api-client-react";
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
import { filterEventsByRadius } from "@/lib/mapView";

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

export default function FanHome() {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [venueFilter, setVenueFilter] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_MAP_RADIUS_KM);
  const [mapExplored, setMapExplored] = useState(false);
  const [refitToken, setRefitToken] = useState(0);
  const [sidebarCount, setSidebarCount] = useState(0);

  const [mapLocationInput, setMapLocationInput] = useState("");
  const [viewPlace, setViewPlace] = useState<GeoPlace | null>(null);
  const defaultedFromSettings = useRef(false);

  const { data: accountSettings } = useGetAccountSettings();
  const debouncedVenue = useDebouncedValue(venueFilter.trim(), 300);

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

  const { data, isLoading, isFetching, error } = useListEvents({
    genre: selectedGenre !== "All" ? selectedGenre : undefined,
    location: debouncedVenue || undefined,
    nearLat: mapCenter.lat,
    nearLng: mapCenter.lng,
    radiusKm: MAX_MAP_RADIUS_KM,
    limit: 50,
  });

  const allEvents = data?.events ?? [];

  const eventsInRadius = useMemo(
    () => filterEventsByRadius(allEvents, mapCenter.lat, mapCenter.lng, radiusKm),
    [allEvents, mapCenter.lat, mapCenter.lng, radiusKm],
  );

  const toolbarEventCount = mapExplored ? sidebarCount : eventsInRadius.length;

  useEffect(() => {
    setMapExplored(false);
    setRefitToken((t) => t + 1);
  }, [selectedGenre, debouncedVenue, viewPlace?.lat, viewPlace?.lng]);

  useEffect(() => {
    setSelectedEventId(null);
  }, [selectedGenre, debouncedVenue, viewPlace?.lat, viewPlace?.lng]);

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
      selectedGenre={selectedGenre}
      onGenreChange={setSelectedGenre}
      eventCount={toolbarEventCount}
      isUpdating={isFetching && !mapExplored}
      mapExplored={mapExplored}
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
            sidebarEvents={eventsInRadius}
            selectedEventId={selectedEventId}
            onSelectEvent={handleSelectEvent}
            onSidebarCountChange={setSidebarCount}
            viewCenter={[mapCenter.lat, mapCenter.lng]}
            radiusKm={radiusKm}
            mapExplored={mapExplored}
            onMapExplored={() => setMapExplored(true)}
            onReturnToView={handleReturnToView}
            refitToken={refitToken}
            isRefreshing={isRefreshing}
            viewZoom={DEFAULT_MAP_ZOOM}
          />
        )}
      </section>
    </div>
  );
}