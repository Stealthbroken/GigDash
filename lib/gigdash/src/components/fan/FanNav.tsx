import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function FanNav() {
  const [, navigate] = useLocation();
  const { user, setUser } = useAuth();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    navigate("/");
  }

  return (
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
            onClick={() => navigate("/fan")}
            className="px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
          >
            Discover
          </button>
        </nav>

        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-muted-foreground hidden sm:block">
              Hi, <span className="text-foreground font-medium">{user.username}</span>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 text-sm font-medium border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
