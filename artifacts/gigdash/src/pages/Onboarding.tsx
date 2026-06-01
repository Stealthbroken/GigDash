import { useSearch } from "wouter";
import { useLocation } from "wouter";
import ArtistOnboarding from "@/components/onboarding/ArtistOnboarding";
import VenueOnboarding from "@/components/onboarding/VenueOnboarding";
import FanOnboarding from "@/components/onboarding/FanOnboarding";

const ROLE_META: Record<string, { label: string; color: string; emoji: string }> = {
  artist: { label: "Artist", color: "text-amber-400", emoji: "🎸" },
  venue: { label: "Venue", color: "text-violet-400", emoji: "🏛️" },
  fan: { label: "Fan", color: "text-emerald-400", emoji: "🎶" },
};

export default function Onboarding() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const role = params.get("role") || "artist";
  const meta = ROLE_META[role] ?? ROLE_META.artist;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border/50 px-4 h-14 flex items-center justify-between shrink-0">
        <button
          onClick={() => navigate("/")}
          className="font-serif font-bold text-xl text-amber-400 tracking-tight"
        >
          GigDash
        </button>
        <div className={`flex items-center gap-1.5 text-sm font-medium ${meta.color}`}>
          <span>{meta.emoji}</span>
          <span>{meta.label} setup</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 py-12">
        <div className="w-full max-w-lg">
          {role === "artist" && <ArtistOnboarding />}
          {role === "venue" && <VenueOnboarding />}
          {role === "fan" && <FanOnboarding />}
        </div>
      </div>
    </div>
  );
}
