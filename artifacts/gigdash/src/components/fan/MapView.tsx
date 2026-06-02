import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { EventSummary } from "@workspace/api-client-react";

/* ───── Custom marker icons ───── */

function createIcon(type: "planning" | "finalized", selected = false): L.Icon {
  const color = type === "planning" ? "#ef4444" : "#10b981"; // red-500 / emerald-500
  const symbol = type === "planning" ? "!" : "♪";
  const size = selected ? 42 : 32;
  const height = selected ? 52 : 40;
  const ring = selected
    ? `<circle cx="${size / 2}" cy="${size / 2 - 2}" r="${size / 2 - 1}" fill="none" stroke="white" stroke-width="2.5" opacity="0.9"/>`
    : "";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 ${size} ${height}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.4"/>
        </filter>
      </defs>
      <path d="M${size / 2} 0C${size * 0.2238} 0 0 ${size * 0.2238} 0 ${size / 2}c0 ${size * 0.3313} ${size / 2} ${size * 0.75} ${size / 2} ${size * 0.75}s${size / 2}-${size * 0.4188} ${size / 2}-${size * 0.75}C${size} ${size * 0.2238} ${size * 0.7763} 0 ${size / 2} 0z" fill="${color}" filter="url(#shadow)"/>
      ${ring}
      <text x="${size / 2}" y="${size / 2 + 2}" text-anchor="middle" dominant-baseline="central" fill="white" font-size="${selected ? 17 : 14}" font-weight="bold" font-family="system-ui">${symbol}</text>
    </svg>
  `;
  return L.icon({
    iconUrl: "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg.trim()))),
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
    popupAnchor: [0, -(height - 4)],
    className: "",
  });
}

const planningIcon = createIcon("planning");
const finalizedIcon = createIcon("finalized");
const planningIconSelected = createIcon("planning", true);
const finalizedIconSelected = createIcon("finalized", true);

/* ───── Helpers ───── */

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
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

/* ───── MapFlyTo — flies to an event when clicked in the list ───── */

function MapFlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const lastTargetRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!target) return;
    const last = lastTargetRef.current;
    if (last && last[0] === target[0] && last[1] === target[1]) return;
    lastTargetRef.current = target;
    map.flyTo(target, 15, { duration: 1.5 });
  }, [target, map]);

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
  useMapEvents({
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

  useEffect(() => {
    setVisibleEvents(events);
  }, [events]);

  const centerRef = useRef<L.LatLng | null>(null);

  const mapCenter: [number, number] = useMemo(() => {
    const withCoords = events.filter((e) => e.venue?.lat != null && e.venue?.lng != null);
    if (withCoords.length === 0) return [43.6532, -79.3832];
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
    <div className="flex h-full min-h-0 gap-3">
      {/* Map */}
      <div className="flex-1 relative rounded-xl bg-card">
        <MapContainer
          center={mapCenter}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", borderRadius: "0.75rem" }}
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
          {eventsWithCoords.map((event) => {
            const isFinalized = (event.artistCount ?? 0) > 0;
            const isSelected = selectedEventId === event.id;
            const icon = isFinalized
              ? isSelected ? finalizedIconSelected : finalizedIcon
              : isSelected ? planningIconSelected : planningIcon;
            return (
              <Marker
                key={event.id}
                position={[event.venue!.lat!, event.venue!.lng!]}
                icon={icon}
                eventHandlers={{
                  click: () => onSelectEvent(event),
                }}
              >
                <Popup>
                  <div className="text-sm leading-snug min-w-[160px]">
                    <p className="font-semibold text-foreground leading-tight mb-1">
                      {event.title}
                    </p>
                    <p className="text-muted-foreground text-xs">{event.venue?.name}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {formatDate(event.eventDate)} · {formatTime(event.eventDate)}
                    </p>
                    <span
                      className={`inline-block mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${
                        isFinalized ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    >
                      {isFinalized ? "♪ Finalized" : "! Planning"}
                    </span>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legend overlay — z-[1000] sits above Leaflet tiles (~400) but below popups */}
        <div className="absolute bottom-8 left-14 z-[1000] bg-card/90 backdrop-blur-md border border-border rounded-xl px-3 py-2 shadow-lg flex items-center gap-3 text-xs pointer-events-none">
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

      {/* Side list — fixed width so it never collapses */}
      <div className="w-72 shrink-0 flex flex-col min-h-0 rounded-2xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <h2 className="font-semibold text-sm">Events nearby</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sortedVisible.length} visible on screen
          </p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
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
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
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
