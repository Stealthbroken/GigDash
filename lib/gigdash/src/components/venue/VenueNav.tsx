import { useLocation } from "wouter";
import { Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function VenueNav() {
  const [, navigate] = useLocation();
  const { user, setUser } = useAuth();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    navigate("/");
  }

  return (
    <header className="venue-nav shrink-0">
      <div className="venue-nav-inner">
        <button
          type="button"
          onClick={() => navigate("/venue")}
          className="venue-nav-logo font-serif font-bold text-lg tracking-tight"
        >
          GigDash
        </button>
        <span className="venue-nav-pill hidden sm:inline-flex">Venue dashboard</span>
        <div className="venue-nav-actions">
          {user && (
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="venue-nav-settings"
              title="Account settings"
              aria-label="Account settings"
            >
              <Avatar className="h-7 w-7 border border-border/80">
                <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="text-[10px] font-semibold bg-secondary">
                  {user.username.slice(0,  2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="venue-nav-username hidden md:inline">{user.username}</span>
              <Settings className="h-4 w-4 text-muted-foreground md:hidden" aria-hidden />
            </button>
          )}
          <button type="button" onClick={handleLogout} className="venue-nav-signout">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}