import type { ArtistTab } from "@/lib/navigation";
import { ARTIST_TAB_LABELS } from "@/lib/navigation";

const TABS: ArtistTab[] = ["map", "recs", "gigs", "preview", "messages"];

interface ArtistTabSwitcherProps {
  active: ArtistTab;
  onChange: (tab: ArtistTab) => void;
  gigCount?: number;
}

export default function ArtistTabSwitcher({ active, onChange, gigCount }: ArtistTabSwitcherProps) {
  return (
    <div className="artist-home-view-toggle" role="tablist" aria-label="Artist views">
      {TABS.map((tab) => {
        const label =
          tab === "gigs" && gigCount != null && gigCount > 0
            ? `${ARTIST_TAB_LABELS[tab]} (${gigCount})`
            : ARTIST_TAB_LABELS[tab];

        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active === tab}
            className={`artist-home-view-btn ${active === tab ? "artist-home-view-btn--active" : ""}`}
            onClick={() => onChange(tab)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}