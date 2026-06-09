import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
  type MutableRefObject,
} from "react";
import { MapContainer, TileLayer, Circle, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import { distanceKm, zoomForRadiusKm } from "@/lib/mapView";
import L from "leaflet";
import type { EventSummary } from "@workspace/api-client-react";
import VenueMapMarker from "./VenueMapMarker";
import type { MarkerStatus } from "./mapMarkers";
import { eventMarkerStatus, canMessageOrganizer } from "@/lib/eventStatus";

const MAP_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function eventStatus(event: EventSummary): MarkerStatus {
  return eventMarkerStatus(event);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: true });
}

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

function MapBounds({
  events,
  onVisibleChange,
  centerRef,
}: {
  events: EventSummary[];
  onVisibleChange: (visible: EventSummary[]) => void;
  centerRef: MutableRefObject<L.LatLng | null>;
}) {
  const map = useMap();

  const updateVisible = useCallback(() => {
    if (!map.getBounds().isValid()) return;
    const bounds = map.getBounds();
    centerRef.current = map.getCenter();
    const visible = events.filter((e) => {
      const lat = e.venue?.lat;
      const lng = e.venue?.lng;
      if (lat == null || lng == null) return false;
      return bounds.contains([lat, lng]);
    });
    onVisibleChange(visible);
  }, [events, map, onVisibleChange, centerRef]);

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

function sortByDistance(
  list: EventSummary[],
  lat: number,
  lng: number,
): EventSummary[] {
  return [...list].sort((a, b) => {
    const da = distanceKm(lat, lng, a.venue!.lat!, a.venue!.lng!);
    const db = distanceKm(lat, lng, b.venue!.lat!, b.venue!.lng!);
    return da - db;
  });
}

interface MapViewProps {
  header?: ReactNode;
  /** All markers to render on the map (full fetch area) */
  mapEvents: EventSummary[];
  /** Events within the active radius — sidebar when not browsing */
  sidebarEvents: EventSummary[];
  selectedEventId?: number | null;
  onSelectEvent: (event: EventSummary) => void;
  onSidebarCountChange?: (count: number) => void;
  viewCenter: [number, number];
  radiusKm: number;
  mapExplored: boolean;
  onMapExplored: () => void;
  onReturnToView: () => void;
  refitToken: number;
  isRefreshing?: boolean;
  viewZoom?: number;
  highlightEventIds?: Set<number>;
  bypassViewportFilter?: boolean;
  artistMode?: boolean;
  onMessageOrganizer?: (event: EventSummary) => void;
  onViewEvent?: (event: EventSummary) => void;
  fixedSidebarItems?: number;
}

export default function MapView({
  header,
  mapEvents,
  sidebarEvents,
  selectedEventId,
  onSelectEvent,
  onSidebarCountChange,
  viewCenter,
  radiusKm,
  mapExplored,
  onMapExplored,
  onReturnToView,
  refitToken,
  isRefreshing = false,
  viewZoom = 12,
  highlightEventIds,
  bypassViewportFilter = false,
  artistMode = false,
  onMessageOrganizer,
  onViewEvent,
  fixedSidebarItems,
}: MapViewProps) {
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [visibleOnScreen, setVisibleOnScreen] = useState<EventSummary[]>([]);
  const suppressProgrammaticRef = useRef(false);

  const centerRef = useRef<L.LatLng | null>(null);
  const mapCenter = viewCenter;

  const sortedSidebar = useMemo(() => {
    const [lat, lng] = viewCenter;
    if (bypassViewportFilter) {
      return sortByDistance(
        sidebarEvents.filter((e) => e.venue?.lat != null && e.venue?.lng != null),
        lat,
        lng,
      );
    }
    if (mapExplored) {
      const pivot = centerRef.current;
      const sortLat = pivot?.lat ?? lat;
      const sortLng = pivot?.lng ?? lng;
      return sortByDistance(visibleOnScreen, sortLat, sortLng);
    }
    return sortByDistance(
      sidebarEvents.filter((e) => e.venue?.lat != null && e.venue?.lng != null),
      lat,
      lng,
    );
  }, [mapExplored, bypassViewportFilter, visibleOnScreen, sidebarEvents, viewCenter]);

  useEffect(() => {
    onSidebarCountChange?.(sortedSidebar.length);
  }, [sortedSidebar.length, onSidebarCountChange]);

  const handleListClick = useCallback(
    (event: EventSummary) => {
      onSelectEvent(event);
      if (event.venue?.lat != null && event.venue?.lng != null) {
        setFlyTarget([event.venue.lat, event.venue.lng]);
      }
    },
    [onSelectEvent],
  );

  const eventsWithCoords = mapEvents.filter(
    (e) => e.venue?.lat != null && e.venue?.lng != null,
  );

  const venueGroups = useMemo(() => {
    const groups = new Map<string, EventSummary[]>();
    for (const e of eventsWithCoords) {
      const key = `${e.venue!.lat!.toFixed(6)},${e.venue!.lng!.toFixed(6)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    return groups;
  }, [eventsWithCoords]);

  const showRadiusCircle = !mapExplored;
  const theme = artistMode ? "artist" : "fan";

  return (
    <div className={`${theme}-map-stage flex h-full min-h-0 gap-3`}>
      <div className={`${theme}-map-column flex flex-1 flex-col min-h-0 min-w-0 gap-2`}>
        {header}
        <div className={`${theme}-map-shell flex-1 relative min-h-0`}>
          <MapContainer
            center={mapCenter}
            zoom={viewZoom}
            zoomControl={false}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
            className={`${theme}-map-container${isRefreshing ? ` ${theme}-map-container--refreshing` : ""}`}
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
                pathOptions={
                  artistMode
                    ? {
                        color: "hsl(45 93% 47%)",
                        weight: 2,
                        opacity: 0.85,
                        fillColor: "hsl(45 80% 42%)",
                        fillOpacity: 0.1,
                        dashArray: "7 5",
                      }
                    : {
                        color: "hsl(160 55% 45%)",
                        weight: 2,
                        opacity: 0.85,
                        fillColor: "hsl(160 55% 42%)",
                        fillOpacity: 0.12,
                        dashArray: "7 5",
                      }
                }
              />
            )}
            {mapExplored && (
              <MapBounds
                events={eventsWithCoords}
                onVisibleChange={setVisibleOnScreen}
                centerRef={centerRef}
              />
            )}
            <MapFlyTo target={flyTarget} suppressRef={suppressProgrammaticRef} />
            {Array.from(venueGroups.entries()).map(([key, group]) => (
              <VenueMapMarker
                key={key}
                group={group}
                selectedEventId={selectedEventId}
                onSelectEvent={onSelectEvent}
                artistMode={artistMode}
                onMessageOrganizer={onMessageOrganizer}
                onViewEvent={onViewEvent}
              />
            ))}

          </MapContainer>

          {isRefreshing && (
            <div className={`${theme}-map-refresh-overlay`} aria-hidden>
              <div className={`${theme}-map-refresh-shimmer`} />
            </div>
          )}

          {mapExplored && (
            <button
              type="button"
              className={`${theme}-return-view`}
              onClick={onReturnToView}
            >
              Return to view
            </button>
          )}

          <div className={`${theme}-map-legend absolute bottom-4 left-3 z-[400] pointer-events-none`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className={`${theme}-legend-dot ${theme}-legend-dot--planning`} aria-hidden />
                <span className="text-foreground/80">Planning</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`${theme}-legend-dot ${theme}-legend-dot--finalized`} aria-hidden />
                <span className="text-foreground/80">Finalized</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`${theme}-legend-cluster-sample`} aria-hidden>
                  3
                </span>
                <span className="text-foreground/80">Several gigs (tap for list)</span>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className={`${theme}-side-panel shrink-0 flex flex-col min-h-0 ${fixedSidebarItems ? `${theme}-side-panel--fixed` : ""}`}>
        <div className={`${theme}-side-panel-header px-4 py-3 shrink-0`}>
          <h2 className="font-semibold text-sm text-foreground">{artistMode ? "Gigs nearby" : "Events nearby"}</h2>
          <p className={`${theme}-side-panel-subtitle text-xs mt-0.5`}>
            {mapExplored
              ? `${sortedSidebar.length} on screen (browsing)`
              : `${sortedSidebar.length} within ${radiusKm} km`}
          </p>
        </div>
        <div className={`flex-1 min-h-0 overflow-y-auto p-3 space-y-2 ${fixedSidebarItems ? `${theme}-side-panel-list--fixed` : ""}`}>
          {sortedSidebar.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <span className="text-3xl mb-2 block opacity-80">🗺️</span>
              <p className="text-xs font-medium">No events in this area</p>
              <p className="text-[11px] mt-1 opacity-80">
                {mapExplored
                  ? "Pan the map or return to your search radius."
                  : "No gigs in your radius — widen the slider or check the map for nearby markers."}
              </p>
            </div>
          ) : (
            sortedSidebar.map((event) => {
              const isSelected = selectedEventId === event.id;
              const finalized = eventStatus(event) === "finalized";
              const isHighlighted = highlightEventIds?.has(event.id);
              return (
                <div
                  key={event.id}
                  className={`${theme}-event-card rounded-xl border transition-all ${
                    isSelected ? `${theme}-event-card--selected` : ""
                  } ${isHighlighted ? `${theme}-event-card--highlight` : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => (onViewEvent ? onViewEvent(event) : handleListClick(event))}
                    className="w-full text-left p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`${theme}-event-status-dot shrink-0 ${
                          finalized
                            ? `${theme}-event-status-dot--finalized`
                            : `${theme}-event-status-dot--planning`
                        }`}
                        aria-hidden
                      >
                        {finalized ? "♪" : "!"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm leading-tight truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {event.venue?.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                          {formatDate(event.eventDate)} · {formatTime(event.eventDate)}
                          {event.durationMinutes ? ` · ${event.durationMinutes} min` : ""}
                        </p>
                        {event.genres && event.genres.length > 0 && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{event.genres.join(" · ")}</p>
                        )}
                      </div>
                    </div>
                  </button>
                  {artistMode && canMessageOrganizer(event) && onMessageOrganizer && (
                    <div className="px-3 pb-3">
                      <button
                        type="button"
                        onClick={() => onMessageOrganizer(event)}
                        className={`${theme}-event-card-action ${theme}-event-card-action--secondary w-full`}
                      >
                        Message organizer
                      </button>
                    </div>
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