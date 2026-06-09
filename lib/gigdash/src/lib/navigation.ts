import { useLocation, useSearch } from "wouter";

export const RETURN_TO_PARAM = "returnTo";

export type ArtistTab = "map" | "recs" | "gigs" | "preview" | "messages";

export const ARTIST_TAB_LABELS: Record<ArtistTab, string> = {
  map: "Map",
  recs: "Recs",
  gigs: "My gigs",
  preview: "Preview",
  messages: "Messages",
};

export function parseArtistTab(value: string | null): ArtistTab {
  if (value === "recs" || value === "gigs" || value === "preview" || value === "messages") {
    return value;
  }
  return "map";
}

export function getReturnTo(search: string): string | null {
  const value = new URLSearchParams(search).get(RETURN_TO_PARAM);
  return value || null;
}

export function withReturnTo(path: string, returnPath: string): string {
  const [base, existingQuery = ""] = path.split("?");
  const params = new URLSearchParams(existingQuery);
  params.set(RETURN_TO_PARAM, returnPath);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function artistTabUrl(tab: ArtistTab, opts?: { chatId?: number | null }): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (opts?.chatId) params.set("chat", String(opts.chatId));
  return `/artist?${params.toString()}`;
}

export type VenueTab = "overview" | "events" | "space" | "artists" | "messages";

export function parseVenueTab(value: string | null): VenueTab {
  if (value === "events" || value === "space" || value === "artists" || value === "messages") {
    return value;
  }
  return "overview";
}

export function venueTabUrl(tab: VenueTab, opts?: { chatId?: number | null }): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (opts?.chatId) params.set("chat", String(opts.chatId));
  return `/venue?${params.toString()}`;
}

export function useAppNavigation() {
  const [pathname, navigate] = useLocation();
  const search = useSearch();
  const currentPath = search ? `${pathname}?${search}` : pathname;

  function goBack(fallback: string) {
    navigate(getReturnTo(search) ?? fallback);
  }

  function linkTo(path: string) {
    return withReturnTo(path, currentPath);
  }

  function goToArtistTab(tab: ArtistTab, opts?: { chatId?: number | null }) {
    navigate(artistTabUrl(tab, opts));
  }

  function goToVenueTab(tab: VenueTab, opts?: { chatId?: number | null }) {
    navigate(venueTabUrl(tab, opts));
  }

  return { currentPath, pathname, search, navigate, goBack, linkTo, goToArtistTab, goToVenueTab };
}