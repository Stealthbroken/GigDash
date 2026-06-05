import L from "leaflet";

export type MarkerStatus = "planning" | "finalized";

const COLORS = {
  planning: "#ef4444",
  finalized: "#10b981",
} as const;

export const VENUE_MARKER_COLOR = "#f59e0b"; // amber for artist venue search markers

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

const iconCache = new Map<string, L.Icon>();

function getCachedIcon(key: string, factory: () => L.Icon): L.Icon {
  let icon = iconCache.get(key);
  if (!icon) {
    icon = factory();
    iconCache.set(key, icon);
  }
  return icon;
}

/** Single gig — red or green pin with ! or ♪ (no highlight ring; use multi popup ring only) */
export function createSingleEventMarkerIcon(status: MarkerStatus): L.Icon {
  const fill = COLORS[status];
  const symbol = status === "finalized" ? "♪" : "!";
  const w = 34;
  const h = 42;
  const key = `single-${status}`;

  return getCachedIcon(key, () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 34 42">
        <path d="M17 1C8.16 1 1 8.16 1 17c0 10.2 16 24 16 24s16-13.8 16-24C33 8.16 25.84 1 17 1z"
          fill="${fill}" stroke="#ffffff" stroke-width="2.5"/>
        <text x="17" y="19" text-anchor="middle" dominant-baseline="middle"
          fill="#ffffff" font-size="15" font-weight="800" font-family="system-ui,sans-serif">${symbol}</text>
      </svg>
    `;
    return L.icon({
      iconUrl: svgDataUri(svg),
      iconSize: [w, h],
      iconAnchor: [w / 2, h],
      popupAnchor: [0, -h + 4],
      className: "gigdash-marker-icon",
    });
  });
}

/** Multiple gigs — slate numbered dot; yellow ring only while popup is open */
export function createMultiEventMarkerIcon(count: number, popupOpen: boolean): L.Icon {
  const size = popupOpen ? 42 : 36;
  const label = count > 99 ? "99+" : String(count);
  const key = `multi-${label}-${popupOpen}`;

  return getCachedIcon(key, () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="#334155" stroke="${popupOpen ? "#fbbf24" : "#ffffff"}" stroke-width="${popupOpen ? 3.5 : 3}"/>
        <text x="18" y="19" text-anchor="middle" dominant-baseline="middle"
          fill="#f8fafc" font-size="14" font-weight="800" font-family="system-ui,sans-serif">${label}</text>
      </svg>
    `;
    return L.icon({
      iconUrl: svgDataUri(svg),
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -(size / 2 + 4)],
      className: "gigdash-marker-icon gigdash-marker-icon--cluster",
    });
  });
}

/** Venue marker for artist search (amber pin with music/building symbol) */
export function createVenueMarkerIcon(isSelected = false): L.Icon {
  const fill = VENUE_MARKER_COLOR;
  const ring = isSelected ? "#fefce8" : "#ffffff";
  const ringWidth = isSelected ? 3 : 2.5;
  const w = 32;
  const h = 40;
  const key = `venue-${isSelected ? "sel" : "norm"}`;

  return getCachedIcon(key, () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 32 40">
        <path d="M16 1C8 1 1.5 7.5 1.5 16c0 9.5 14.5 22 14.5 22s14.5-12.5 14.5-22C30.5 7.5 24 1 16 1z"
          fill="${fill}" stroke="${ring}" stroke-width="${ringWidth}"/>
        <circle cx="16" cy="15" r="4.5" fill="#ffffff" />
        <path d="M13 15v6.5c0 1.1.9 2 2 2s2-.9 2-2V15" fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `;
    return L.icon({
      iconUrl: svgDataUri(svg),
      iconSize: [w, h],
      iconAnchor: [w / 2, h],
      popupAnchor: [0, -h + 3],
      className: "gigdash-marker-icon gigdash-venue-marker",
    });
  });
}