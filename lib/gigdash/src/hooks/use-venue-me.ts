import { useQuery } from "@tanstack/react-query";

export type VenueMe = {
  id: number;
  name: string;
  address: string;
  description?: string | null;
  size?: string | null;
  moods?: string[];
  imageUrls?: string[];
  lat?: number | null;
  lng?: number | null;
};

export function useVenueMe(enabled = true) {
  return useQuery({
    queryKey: ["venueMe"],
    enabled,
    queryFn: async (): Promise<VenueMe> => {
      const res = await fetch("/api/venues/me", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Could not load venue.");
      }
      return res.json() as Promise<VenueMe>;
    },
  });
}