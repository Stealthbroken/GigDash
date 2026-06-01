import { useState } from "react";
import { useLocation } from "wouter";

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

export default function AuthModal({ open, onClose, defaultMode = "signup", defaultRole = "artist" }: AuthModalProps) {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [role, setRole] = useState(defaultRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [unError, setUnError] = useState<string | null>(null);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

    onClose();
    if (mode === "signup") {
      navigate(`/onboarding?role=${role}`);
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
            className="mt-1 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-background font-semibold rounded-lg transition-colors text-sm"
          >
            {mode === "signup" ? "Create account →" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-5">
          {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setPwError(null); setUnError(null); }}
            className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            {mode === "signup" ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
