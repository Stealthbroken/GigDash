import type { EventSummary } from "@workspace/api-client-react";
import L from "leaflet";

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

/** Bounding box that contains a circle of radiusKm around center */
export function boundsForRadiusKm(
  center: [number, number],
  radiusKm: number,
): L.LatLngBounds {
  const [lat, lng] = center;
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return L.latLngBounds(
    [lat - latDelta, lng - lngDelta],
    [lat + latDelta, lng + lngDelta],
  );
}

/** Leaflet zoom level so the radius circle fits the map column */
export function zoomForRadiusKm(radiusKm: number, latitude: number, mapWidthPx = 480): number {
  const diameterM = radiusKm * 2000 * 1.2;
  const metersPerPixel = diameterM / mapWidthPx;
  const zoom = Math.log2(
    (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / metersPerPixel,
  );
  return Math.min(16, Math.max(11, Math.round(zoom)));
}

export function filterEventsByRadius(
  events: EventSummary[],
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): EventSummary[] {
  return events.filter((e) => {
    const lat = e.venue?.lat;
    const lng = e.venue?.lng;
    if (lat == null || lng == null) return false;
    return distanceKm(centerLat, centerLng, lat, lng) <= radiusKm;
  });
}