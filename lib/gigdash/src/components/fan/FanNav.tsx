import { useLocation } from "wouter";
import { Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FanNavProps {
  active?: "discover";
}

export default function FanNav({ active }: FanNavProps) {
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
    <header className="fan-nav shrink-0">
      <div className="fan-nav-inner">
        <button
          type="button"
          onClick={() => navigate("/fan")}
          className="fan-nav-logo font-serif font-bold text-lg tracking-tight"
        >
          GigDash
        </button>
        {user && user.email && user.email.endsWith('@test.local') && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 ml-2">DEMO</span>
        )}

        {active === "discover" && (
          <span className="fan-nav-pill hidden sm:inline-flex" aria-current="page">
            Discover
          </span>
        )}

        <div className="fan-nav-actions">
          {user && (
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="fan-nav-settings"
              title="Account settings"
              aria-label="Account settings"
            >
              <Avatar className="h-7 w-7 border border-border/80">
                <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="text-[10px] font-semibold bg-secondary">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="fan-nav-username hidden md:inline">{user.username}</span>
              <Settings className="h-4 w-4 text-muted-foreground md:hidden" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="fan-nav-signout"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}