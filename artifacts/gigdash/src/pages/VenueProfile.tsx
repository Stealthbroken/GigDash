import { useLocation } from "wouter";
import { useSearch } from "wouter";

interface VenueData {
  venueName: string;
  address: string;
  description: string;
  size: string;
  moods: string[];
  images: string[];
}

const SIZE_LABEL: Record<string, string> = {
  xs: "Tiny (< 50 guests)",
  sm: "Small (50–200 guests)",
  md: "Medium (200–500 guests)",
  lg: "Large (500+ guests)",
};

export default function VenueProfile() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const dataParam = params.get("data");

  let data: VenueData | null = null;
  try {
    if (dataParam) {
      data = JSON.parse(atob(decodeURIComponent(dataParam))) as VenueData;
    }
  } catch {
    data = null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="font-serif font-bold text-xl text-amber-400 tracking-tight"
          >
            GigDash
          </button>
          <nav className="flex items-center gap-1">
            <button
              onClick={() => navigate("/")}
              className="px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
            >
              Home
            </button>
          </nav>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-20 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors">Home</button>
          <span>/</span>
          <span className="text-foreground font-medium">Venue</span>
        </div>

        {!data ? (
          <div className="text-center py-20">
            <span className="text-4xl mb-3 block">❌</span>
            <p className="text-lg font-medium">No venue data found</p>
            <p className="text-sm text-muted-foreground mt-1">Something went wrong while creating your profile.</p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 px-6 py-2.5 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Go home
            </button>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span className="text-violet-400">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                  </svg>
                </span>
                <span>Venue</span>
                {data.size && (
                  <>
                    <span>·</span>
                    <span>{SIZE_LABEL[data.size] ?? data.size}</span>
                  </>
                )}
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-2">{data.venueName}</h1>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span>{data.address}</span>
              </div>
            </div>

            {/* Photos — up to 3 */}
            {data.images.length > 0 && (
              <div className="mb-8">
                <div className={`grid gap-3 ${data.images.length === 1 ? "grid-cols-1" : data.images.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {data.images.slice(0, 3).map((src, i) => (
                    <div key={i} className="aspect-[4/3] rounded-xl border border-border overflow-hidden bg-card">
                      <img src={src} alt={`Venue photo ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                {data.images.length > 3 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    +{data.images.length - 3} more photo{data.images.length - 3 !== 1 ? "s" : ""} not shown
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            {data.description && (
              <div className="mb-8">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">About</h2>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {data.description}
                </p>
              </div>
            )}

            {/* Moods */}
            {data.moods.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Mood & Environment</h2>
                <div className="flex flex-wrap gap-2">
                  {data.moods.map((m) => (
                    <span
                      key={m}
                      className="px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-sm font-medium"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div>
                <h3 className="font-semibold text-sm">Ready to start booking?</h3>
                <p className="text-xs text-muted-foreground mt-1">List your next event and let artists discover your space.</p>
              </div>
              <button
                className="px-5 py-2.5 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-lg text-sm transition-colors shrink-0"
                onClick={() => { /* Event listing coming soon */ }}
              >
                Create an event
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
