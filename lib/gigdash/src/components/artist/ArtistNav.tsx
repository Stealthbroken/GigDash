import { useLocation } from "wouter";
import { Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ArtistNavProps {
  active?: "discover" | "recs";
}

export default function ArtistNav({ active }: ArtistNavProps) {
  const [, navigate] = useLocation();
  const { user, setUser } = useAuth();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    setUser(null);
    navigate("/");
  }

  return (
    <header className="artist-nav shrink-0">
      <div className="artist-nav-inner">
        <button
          type="button"
          onClick={() => navigate("/artist")}
          className="artist-nav-logo font-serif font-bold text-lg tracking-tight"
        >
          GigDash <span className="artist-nav-role">for artists</span>
        </button>
        {/* Demo indicator - only appears in temporary local mock mode */}
        {user && user.email && user.email.endsWith('@test.local') && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 ml-2">DEMO</span>
        )}

        {active === "discover" && (
          <span className="artist-nav-pill hidden sm:inline-flex" aria-current="page">
            Discover
          </span>
        )}
        {active === "recs" && (
          <span className="artist-nav-pill hidden sm:inline-flex" aria-current="page">
            Recommended
          </span>
        )}

        <div className="artist-nav-actions">
          {user && (
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="artist-nav-settings"
              title="Account settings"
              aria-label="Account settings"
            >
              <Avatar className="h-7 w-7 border border-border/80">
                <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="text-[10px] font-semibold bg-secondary">
                  {(user.displayName || user.username).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="artist-nav-username hidden md:inline">{user.displayName || user.username}</span>
              <Settings className="h-4 w-4 text-muted-foreground md:hidden" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="artist-nav-signout"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
