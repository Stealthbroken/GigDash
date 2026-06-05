import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const ROLES = [
  { id: "artist", label: "Artist", description: "I perform music and want to find gigs" },
  { id: "venue", label: "Venue", description: "I run a space and want to book artists" },
  { id: "fan", label: "Fan", description: "I want to discover live music near me" },
];

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: "login" | "signup";
  defaultRole?: string;
}

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(pw)) return "Password must include a letter.";
  if (!/[0-9]/.test(pw)) return "Password must include a number.";
  return null;
}

export default function AuthModal({ open, onClose, defaultMode = "signup", defaultRole = "fan" }: AuthModalProps) {
  const [, navigate] = useLocation();
  const { refreshUser, setUser } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [role, setRole] = useState(defaultRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [unError, setUnError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setRole(defaultRole);
      setPwError(null);
      setUnError(null);
      setServerError(null);
      setUsername("");
      setEmail("");
      setPassword("");
    }
  }, [open, defaultMode, defaultRole]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    let valid = true;

    if (mode === "signup") {
      if (username.length < 2 || username.length > 20) {
        setUnError("Username must be 2–20 characters.");
        valid = false;
      } else {
        setUnError(null);
      }
      const pwErr = validatePassword(password);
      if (pwErr) {
        setPwError(pwErr);
        valid = false;
      } else {
        setPwError(null);
      }
    }
    if (!valid) return;

    setLoading(true);
    try {
      const url = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body =
        mode === "signup"
          ? { username, email, password, role }
          : { email, password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong.");
        return;
      }

      const sessionUser = await refreshUser();
      if (!sessionUser) {
        setServerError(
          "Signed in, but the session cookie was not saved. Keep using the app through the Vite dev URL (not the API port directly), and make sure cookies are allowed for localhost.",
        );
        return;
      }

      if (mode === "signup") {
        navigate(`/onboarding?role=${role}`);
      } else {
        const dest =
          sessionUser.role === "fan"
            ? "/fan"
            : sessionUser.role === "venue"
              ? "/venue"
              : sessionUser.role === "artist"
                ? "/artist"
                : "/";
        navigate(dest);
      }
    } catch {
      // TEMPORARY MOCK for local testing without backend/DB server.
      // Lets you "create" accounts and test the full artist flow (signup → onboarding → artist home).
      // Data is fake and only lives in this browser (localStorage). Clear by logging out or clearing site data.
      const effectiveRole = mode === "login" && !role ? "artist" : role; // default to artist for easy testing
      const fakeUser = {
        id: Date.now(),
        username: username || (mode === "login" ? "demouser" : "demoartist"),
        email: email || `${username || (mode === "login" ? "demouser" : "demoartist")}@test.local`,
        role: effectiveRole,
        avatarUrl: null,
      };
      setUser(fakeUser as any);

      // small hint in console for beginners
      console.log('%c[Demo Mode] Using fake local account (no real server). Sign out to switch accounts.', 'color:#f59e0b');

      if (mode === "signup") {
        navigate(`/onboarding?role=${effectiveRole}`);
      } else {
        const dest =
          effectiveRole === "fan" ? "/fan" : effectiveRole === "venue" ? "/venue" : effectiveRole === "artist" ? "/artist" : "/";
        navigate(dest);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-card border border-card-border rounded-2xl shadow-2xl p-7">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <h2 className="font-serif text-2xl font-bold mb-1">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {mode === "signup"
              ? "Choose your role and join the GigDash community."
              : "Sign in to continue to GigDash."}
          </p>
        </div>

        {mode === "signup" && (
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">I am a...</p>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                    role === r.id
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-border bg-background/50 text-muted-foreground hover:border-border/80 hover:text-foreground"
                  }`}
                >
                  <span className="text-lg">
                    {r.id === "artist" ? "🎸" : r.id === "venue" ? "🏛️" : "🎶"}
                  </span>
                  <span className="text-xs font-semibold">{r.label}</span>
                </button>
              ))}
            </div>
            {role && (
              <p className="mt-2 text-xs text-muted-foreground text-center">
                {ROLES.find((r) => r.id === role)?.description}
              </p>
            )}
          </div>
        )}

        {serverError && (
          <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Username <span className="opacity-60">(2–20 characters)</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setUnError(null); }}
                placeholder="e.g. jamsession99"
                minLength={2}
                maxLength={20}
                required
                className={`w-full px-3.5 py-2.5 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow ${
                  unError ? "border-destructive" : "border-input"
                }`}
              />
              {unError && <p className="text-xs text-destructive mt-1">{unError}</p>}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Password{mode === "signup" && <span className="opacity-60"> (8+ chars, letter &amp; number)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwError(null); }}
              placeholder={mode === "signup" ? "Must include a letter and number" : "Your password"}
              required
              className={`w-full px-3.5 py-2.5 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow ${
                pwError ? "border-destructive" : "border-input"
              }`}
            />
            {pwError && <p className="text-xs text-destructive mt-1">{pwError}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-background font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {mode === "signup" ? "Create account →" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-5">
          {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setPwError(null); setUnError(null); setServerError(null); }}
            className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            {mode === "signup" ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
