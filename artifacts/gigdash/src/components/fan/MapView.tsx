import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { EventSummary } from "@workspace/api-client-react";

/* ───── Custom marker icons ───── */

function createIcon(type: "planning" | "finalized"): L.Icon {
  const color = type === "planning" ? "#ef4444" : "#10b981"; // red-500 / emerald-500
  const symbol = type === "planning" ? "!" : "♪"; // exclamation / eighth note
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.4"/>
        </filter>
      </defs>
      <path d="M16 0C7.16 0 0 7.16 0 16c0 10.6 16 24 16 24s16-13.4 16-24C32 7.16 24.84 0 16 0z" fill="${color}" filter="url(#shadow)"/>
      <text x="16" y="20" text-anchor="middle" dominant-baseline="central" fill="white" font-size="14" font-weight="bold" font-family="system-ui">${symbol}</text>
    </svg>
  `;
  return L.icon({
    iconUrl: "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg.trim()))),
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36],
    className: "",
  });
}

const planningIcon = createIcon("planning");
const finalizedIcon = createIcon("finalized");

/* ───── Helpers ───── */

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: true });
}

/* ───── MapFlyTo — used to fly to an event when clicked in the list ───── */

function MapFlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  if (target) {
    map.flyTo(target, 15, { duration: 1.5 });
  }
  return null;
}

/* ───── MapBounds — tracks bounds and reports visible events ───── */

function MapBounds({
  events,
  onVisibleChange,
  centerRef,
}: {
  events: EventSummary[];
  onVisibleChange: (visible: EventSummary[]) => void;
  centerRef: React.MutableRefObject<L.LatLng | null>;
}) {
  const map = useMap();
  const mapEvents = useMapEvents({
    moveend() {
      const bounds = map.getBounds();
      centerRef.current = map.getCenter();
      const visible = events.filter((e) => {
        const lat = e.venue?.lat;
        const lng = e.venue?.lng;
        if (lat == null || lng == null) return false;
        return bounds.contains([lat, lng]);
      });
      onVisibleChange(visible);
    },
  });
  // Initial check on mount via useEffect
  useEffect(() => {
    const check = () => {
      if (!map.getBounds().isValid()) {
        requestAnimationFrame(check);
        return;
      }
      const bounds = map.getBounds();
      centerRef.current = map.getCenter();
      const visible = events.filter((e) => {
        const lat = e.venue?.lat;
        const lng = e.venue?.lng;
        if (lat == null || lng == null) return false;
        return bounds.contains([lat, lng]);
      });
      onVisibleChange(visible);
    };
    const id = requestAnimationFrame(check);
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}

/* ───── MapView ───── */

interface MapViewProps {
  events: EventSummary[];
  selectedEventId?: number | null;
  onSelectEvent: (event: EventSummary) => void;
}

export default function MapView({ events, selectedEventId, onSelectEvent }: MapViewProps) {
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [visibleEvents, setVisibleEvents] = useState<EventSummary[]>(events);

  // When events change (e.g. after data loads), set visible to all initially
  useEffect(() => {
    setVisibleEvents(events);
  }, [events]);
  const centerRef = useRef<L.LatLng | null>(null);

  const mapCenter: [number, number] = useMemo(() => {
    const withCoords = events.filter((e) => e.venue?.lat != null && e.venue?.lng != null);
    if (withCoords.length === 0) return [43.6532, -79.3832]; // Toronto default
    const avgLat = withCoords.reduce((s, e) => s + e.venue!.lat!, 0) / withCoords.length;
    const avgLng = withCoords.reduce((s, e) => s + e.venue!.lng!, 0) / withCoords.length;
    return [avgLat, avgLng];
  }, [events]);

  const sortedVisible = useMemo(() => {
    const center = centerRef.current;
    if (!center || visibleEvents.length === 0) return visibleEvents;
    return [...visibleEvents].sort((a, b) => {
      const da = haversine(center.lat, center.lng, a.venue!.lat!, a.venue!.lng!);
      const db = haversine(center.lat, center.lng, b.venue!.lat!, b.venue!.lng!);
      return da - db;
    });
  }, [visibleEvents]);

  const handleListClick = useCallback(
    (event: EventSummary) => {
      onSelectEvent(event);
      if (event.venue?.lat != null && event.venue?.lng != null) {
        setFlyTarget([event.venue.lat, event.venue.lng]);
      }
    },
    [onSelectEvent]
  );

  const eventsWithCoords = events.filter(
    (e) => e.venue?.lat != null && e.venue?.lng != null
  );

  return (
    <div className="flex h-full gap-3">
      {/* Map */}
      <div className="flex-1 relative rounded-xl overflow-hidden bg-card">
        <MapContainer
          center={mapCenter}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBounds
            events={events}
            onVisibleChange={setVisibleEvents}
            centerRef={centerRef}
          />
          <MapFlyTo target={flyTarget} />
          {eventsWithCoords.map((event) => (
            <Marker
              key={event.id}
              position={[event.venue!.lat!, event.venue!.lng!]}
              icon={event.artistCount && event.artistCount > 0 ? finalizedIcon : planningIcon}
              eventHandlers={{
                click: () => {
                  onSelectEvent(event);
                },
              }}
            />
          ))}
        </MapContainer>

        {/* Legend overlay */}
        <div className="absolute bottom-4 left-4 z-[400] bg-card/90 backdrop-blur-md border border-border rounded-xl px-3 py-2 shadow-lg flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 shadow-sm" />
            <span className="text-muted-foreground">Planning (!)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
            <span className="text-muted-foreground">Finalized (♪)</span>
          </div>
        </div>
      </div>

      {/* Side list */}
      <div className="flex flex-col h-full overflow-hidden rounded-2xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <h2 className="font-semibold text-sm">Events nearby</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sortedVisible.length} visible on screen
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sortedVisible.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <span className="text-3xl mb-2 block">🎯</span>
              <p className="text-xs">Zoom out or pan to see more events.</p>
            </div>
          ) : (
            sortedVisible.map((event) => {
              const isSelected = selectedEventId === event.id;
              const isFinalized = (event.artistCount ?? 0) > 0;
              return (
                <button
                  key={event.id}
                  onClick={() => handleListClick(event)}
                  className={`w-full text-left rounded-xl border p-3 transition-all ${
                    isSelected
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-border hover:border-amber-500/30 hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5 ${
                        isFinalized ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    >
                      {isFinalized ? "♪" : "!"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.venue?.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {formatDate(event.eventDate)} · {formatTime(event.eventDate)}
                        {event.durationMinutes && ` · ${event.durationMinutes} min`}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
