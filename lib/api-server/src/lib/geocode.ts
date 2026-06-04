const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "GigDash/1.0 (local dev; contact: support@gigdash.local)";

export type GeoPlace = {
  label: string;
  lat: number;
  lng: number;
};

type NominatimResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
};

function parseResult(row: NominatimResult): GeoPlace | null {
  const lat = row.lat != null ? Number(row.lat) : NaN;
  const lng = row.lon != null ? Number(row.lon) : NaN;
  const label = row.display_name?.trim();
  if (!label || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { label, lat, lng };
}

export function isValidCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/** Distance in km between two WGS84 points */
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

export async function searchPlaces(query: string, limit = 6): Promise<GeoPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(Math.min(limit, 10)));
  url.searchParams.set("addressdetails", "0");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error("Location lookup failed. Try again in a moment.");
  }

  const data = (await res.json()) as NominatimResult[];
  const places: GeoPlace[] = [];
  for (const row of data) {
    const place = parseResult(row);
    if (place) places.push(place);
  }
  return places;
}

export async function resolvePlace(query: string): Promise<GeoPlace | null> {
  const results = await searchPlaces(query, 1);
  return results[0] ?? null;
}

/** Ensure coordinates match a real place (re-search by label, allow ~25 km drift). */
export async function verifyPlace(label: string, lat: number, lng: number): Promise<boolean> {
  if (!isValidCoordinates(lat, lng)) return false;
  const results = await searchPlaces(label, 5);
  return results.some((p) => distanceKm(p.lat, p.lng, lat, lng) <= 25);
}

/**
 * Resolve a venue address for DB storage.
 * Prefers validated client coords (from /api/geo/search); otherwise geocodes the address string.
 */
export async function resolveVenueAddress(
  address: string,
  lat?: number,
  lng?: number,
): Promise<GeoPlace | "invalid"> {
  const label = address.trim();
  if (!label) return "invalid";

  if (lat != null && lng != null && isValidCoordinates(lat, lng)) {
    try {
      const ok = await verifyPlace(label, lat, lng);
      if (ok) return { label, lat, lng };
    } catch {
      // Nominatim hiccup — still trust picker coords from our search UI
    }
    return { label, lat, lng };
  }

  try {
    const place = await resolvePlace(label);
    return place ?? "invalid";
  } catch {
    return "invalid";
  }
}