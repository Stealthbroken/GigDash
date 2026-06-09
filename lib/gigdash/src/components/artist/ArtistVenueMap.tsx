import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
  type MutableRefObject,
} from "react";
import { MapContainer, TileLayer, Circle, ZoomControl, Marker, useMap, useMapEvents } from "react-leaflet";
import { distanceKm, zoomForRadiusKm } from "@/lib/mapView";
import L from "leaflet";
import { createVenueMarkerIcon } from "@/components/fan/mapMarkers";

const MAP_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function MapFlyTo({
  target,
  zoom = 15,
  suppressRef,
}: {
  target: [number, number] | null;
  zoom?: number;
  suppressRef: MutableRefObject<boolean>;
}) {
  const map = useMap();
  const lastTargetRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!target) return;
    const last = lastTargetRef.current;
    if (last && last[0] === target[0] && last[1] === target[1]) return;
    lastTargetRef.current = target;
    suppressRef.current = true;
    map.flyTo(target, zoom, { duration: 1.2 });
  }, [target, zoom, map, suppressRef]);

  return null;
}

function MapFitRadius({
  center,
  radiusKm,
  enabled,
  refitToken,
  suppressRef,
}: {
  center: [number, number];
  radiusKm: number;
  enabled: boolean;
  refitToken: number;
  suppressRef: MutableRefObject<boolean>;
}) {
  const map = useMap();
  const lastKeyRef = useRef("");

  useEffect(() => {
    if (!enabled) return;

    const key = `${center[0].toFixed(5)},${center[1].toFixed(5)},${radiusKm},${refitToken}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    const zoom = zoomForRadiusKm(radiusKm, center[0]);
    suppressRef.current = true;
    map.setView(center, zoom, { animate: true, duration: 0.45 });
  }, [center, radiusKm, enabled, refitToken, map, suppressRef]);

  return null;
}

function MapExploreDetector({
  onExplore,
  suppressRef,
}: {
  onExplore: () => void;
  suppressRef: MutableRefObject<boolean>;
}) {
  const map = useMap();

  useMapEvents({
    dragstart: () => {
      if (!suppressRef.current) onExplore();
    },
    moveend: () => {
      suppressRef.current = false;
    },
    zoomend: () => {
      suppressRef.current = false;
    },
  });

  return null;
}

function sortVenuesByDistance<T extends { lat: number; lng: number }>(
  list: T[],
  lat: number,
  lng: number,
): T[] {
  return [...list].sort((a, b) => {
    const da = distanceKm(lat, lng, a.lat, a.lng);
    const db = distanceKm(lat, lng, b.lat, b.lng);
    return da - db;
  });
}

export interface ArtistMapVenue {
  id: number;
  name: string;
  address: string;
  description: string;
  moods: string[];
  imageUrl: string;
  lat: number;
  lng: number;
}

interface ArtistVenueMapProps {
  header?: ReactNode;
  venues: ArtistMapVenue[]; // all in current search fetch area (here local)
  visibleVenues: ArtistMapVenue[]; // filtered by radius or current screen
  selectedVenueId?: number | null;
  onSelectVenue: (v: ArtistMapVenue) => void;
  onSidebarCountChange?: (count: number) => void;
  viewCenter: [number, number];
  radiusKm: number;
  mapExplored: boolean;
  onMapExplored: () => void;
  onReturnToView: () => void;
  refitToken: number;
  isRefreshing?: boolean;
  viewZoom?: number;
  contactedVenueIds?: Set<number>;
  onMessageVenue?: (v: ArtistMapVenue) => void;
}

export default function ArtistVenueMap({
  header,
  venues,
  visibleVenues,
  selectedVenueId,
  onSelectVenue,
  onSidebarCountChange,
  viewCenter,
  radiusKm,
  mapExplored,
  onMapExplored,
  onReturnToView,
  refitToken,
  isRefreshing = false,
  viewZoom = 12,
  contactedVenueIds,
  onMessageVenue,
}: ArtistVenueMapProps) {
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [visibleOnScreen, setVisibleOnScreen] = useState<ArtistMapVenue[]>([]);
  const suppressProgrammaticRef = useRef(false);

  const centerRef = useRef<L.LatLng | null>(null);
  const mapCenter = viewCenter;

  const sortedSidebar = useMemo(() => {
    const [lat, lng] = viewCenter;
    if (mapExplored) {
      const pivot = centerRef.current;
      const sortLat = pivot?.lat ?? lat;
      const sortLng = pivot?.lng ?? lng;
      return sortVenuesByDistance(visibleOnScreen, sortLat, sortLng);
    }
    return sortVenuesByDistance(
      visibleVenues.filter((v) => v.lat != null && v.lng != null),
      lat,
      lng,
    );
  }, [mapExplored, visibleOnScreen, visibleVenues, viewCenter]);

  useEffect(() => {
    onSidebarCountChange?.(sortedSidebar.length);
  }, [sortedSidebar.length, onSidebarCountChange]);

  const handleListClick = useCallback(
    (venue: ArtistMapVenue) => {
      onSelectVenue(venue);
      setFlyTarget([venue.lat, venue.lng]);
    },
    [onSelectVenue],
  );

  const showRadiusCircle = !mapExplored;

  // Simple bounds listener for explored mode
  function MapBoundsListener() {
    const map = useMap();

    const updateVisible = useCallback(() => {
      if (!map.getBounds().isValid()) return;
      const bounds = map.getBounds();
      centerRef.current = map.getCenter();
      const vis = venues.filter((v) =>
        v.lat != null && v.lng != null && bounds.contains([v.lat, v.lng])
      );
      setVisibleOnScreen(vis);
    }, [venues, map]);

    useMapEvents({
      moveend: updateVisible,
      zoomend: updateVisible,
    });

    useEffect(() => {
      const id = requestAnimationFrame(updateVisible);
      return () => cancelAnimationFrame(id);
    }, [updateVisible]);

    return null;
  }

  return (
    <div className="artist-map-stage flex h-full min-h-0 gap-3">
      <div className="artist-map-column flex flex-1 flex-col min-h-0 min-w-0 gap-2">
        {header}
        <div className="artist-map-shell flex-1 relative min-h-0">
          <MapContainer
            center={mapCenter}
            zoom={viewZoom}
            zoomControl={false}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
            className={`artist-map-container${isRefreshing ? " artist-map-container--refreshing" : ""}`}
          >
            <ZoomControl position="bottomright" />
            <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILES} />
            <MapExploreDetector
              onExplore={onMapExplored}
              suppressRef={suppressProgrammaticRef}
            />
            <MapFitRadius
              center={viewCenter}
              radiusKm={radiusKm}
              enabled={!mapExplored}
              refitToken={refitToken}
              suppressRef={suppressProgrammaticRef}
            />
            {showRadiusCircle && (
              <Circle
                center={viewCenter}
                radius={radiusKm * 1000}
                pathOptions={{
                  color: "hsl(45 93% 47%)", // amber-ish
                  weight: 2,
                  opacity: 0.85,
                  fillColor: "hsl(45 93% 47%)",
                  fillOpacity: 0.1,
                  dashArray: "7 5",
                }}
              />
            )}
            {mapExplored && <MapBoundsListener />}
            <MapFlyTo target={flyTarget} suppressRef={suppressProgrammaticRef} />

            {venues.map((v) => {
              const isSel = selectedVenueId === v.id;
              return (
                <MarkerWrapper
                  key={v.id}
                  venue={v}
                  isSelected={isSel}
                  onSelect={() => onSelectVenue(v)}
                />
              );
            })}
          </MapContainer>

          {isRefreshing && (
            <div className="artist-map-refresh-overlay" aria-hidden>
              <div className="artist-map-refresh-shimmer" />
            </div>
          )}

          {mapExplored && (
            <button
              type="button"
              className="artist-return-view"
              onClick={onReturnToView}
            >
              Return to view
            </button>
          )}

          <div className="artist-map-legend absolute bottom-4 left-3 z-[400] pointer-events-none">
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b" }} />
              <span className="text-foreground/80">Venues</span>
            </div>
          </div>
        </div>
      </div>

      <div className="artist-side-panel shrink-0 flex flex-col min-h-0">
        <div className="artist-side-panel-header px-4 py-3 shrink-0">
          <h2 className="font-semibold text-sm text-foreground">Venues nearby</h2>
          <p className="artist-side-panel-subtitle text-xs mt-0.5">
            {mapExplored
              ? `${sortedSidebar.length} on screen (browsing)`
              : `${sortedSidebar.length} within ${radiusKm} km`}
          </p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {sortedSidebar.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <span className="text-3xl mb-2 block opacity-80">🗺️</span>
              <p className="text-xs font-medium">No venues in this area</p>
              <p className="text-[11px] mt-1 opacity-80">
                {mapExplored
                  ? "Pan the map or return to your search radius."
                  : "No venues in radius — try a different spot or widen the slider."}
              </p>
            </div>
          ) : (
            sortedSidebar.map((venue) => {
              const isSelected = selectedVenueId === venue.id;
              const dist = distanceKm(viewCenter[0], viewCenter[1], venue.lat, venue.lng);
              const contacted = contactedVenueIds?.has(venue.id);
              return (
                <div
                  key={venue.id}
                  className={`artist-venue-list-item w-full text-left rounded-xl border p-3 transition-all ${
                    isSelected ? "artist-venue-list-item--selected" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleListClick(venue)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-md overflow-hidden border border-border/70 shrink-0 bg-muted">
                        <img
                          src={venue.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm leading-tight truncate">{venue.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{venue.address}</p>
                        <p className="text-[10px] text-muted-foreground/80 mt-1 line-clamp-2">{venue.description}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                          <span className="tabular-nums text-amber-400/90">{dist.toFixed(1)} km</span>
                          <span className="text-muted-foreground/60">·</span>
                          <span className="text-muted-foreground/80 truncate">{venue.moods.slice(0, 2).join(" · ")}</span>
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onMessageVenue?.(venue); }}
                    className="mt-2 w-full text-[11px] font-medium py-1 rounded-lg border border-amber-500/60 text-amber-400 hover:bg-amber-500/10 active:bg-amber-500/15 transition-colors"
                  >
                    {contacted ? "Message again" : "Message owner"}
                  </button>
                  {contacted && (
                    <div className="text-center mt-0.5 text-[9px] text-emerald-400">Contacted</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// Separate marker component (needs to be inside MapContainer context via parent)
function MarkerWrapper({
  venue,
  isSelected,
  onSelect,
}: {
  venue: ArtistMapVenue;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const icon = useMemo(() => createVenueMarkerIcon(isSelected), [isSelected]);

  return (
    <Marker
      position={[venue.lat, venue.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(),
      }}
    />
  );
}

