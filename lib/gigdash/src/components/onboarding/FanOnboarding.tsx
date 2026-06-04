import { useState } from "react";
import { useLocation } from "wouter";
import StepIndicator from "./StepIndicator";
import CustomTagInput from "./CustomTagInput";
import AvatarUpload from "./AvatarUpload";
import LocationSearch from "@/components/LocationSearch";
import type { GeoPlace } from "@workspace/api-client-react";

const GENRES = ["Rock", "Pop", "Jazz", "Hip-Hop", "Electronic", "Folk", "Classical", "R&B", "Country", "Metal"];
const STEPS = ["Profile", "Your Taste"];

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function TagButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
        selected
          ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
          : "bg-background border-border text-muted-foreground hover:border-emerald-500/30 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export default function FanOnboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [homePlace, setHomePlace] = useState<GeoPlace | null>(null);
  const [genres, setGenres] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function next() { setStep((s) => s + 1); }
  function back() { setStep((s) => s - 1); }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/fans/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          avatarUrl: avatarUrl || undefined,
          location: homePlace?.label ?? (locationInput.trim() || undefined),
          genres,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Something went wrong. Please try again.");
        return;
      }

      if (homePlace) {
        const locRes = await fetch("/api/auth/settings/location", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            locationLabel: homePlace.label,
            lat: homePlace.lat,
            lng: homePlace.lng,
          }),
        });
        if (!locRes.ok) {
          const data = await locRes.json().catch(() => ({}));
          setError((data as { error?: string }).error ?? "Could not save your location.");
          return;
        }
      }

      navigate("/fan");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex justify-center mb-10">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="font-serif text-2xl font-bold mb-1">Set up your profile</h2>
            <p className="text-muted-foreground text-sm">Tell us a bit about yourself to personalise your experience.</p>
          </div>

          <AvatarUpload url={avatarUrl} onChange={setAvatarUrl} color="emerald" />

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or handle"
              maxLength={40}
              className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">
              Your City / Location
            </label>
            <LocationSearch
              value={locationInput}
              onChange={setLocationInput}
              selectedPlace={homePlace}
              onPlaceSelect={setHomePlace}
              onClear={() => setHomePlace(null)}
              placeholder="e.g. Toronto, ON or M5V 2T6"
              inputClassName="border-input bg-card py-2.5 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Pick a suggestion so we can show real events near you.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
            </svg>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Coming soon: link your <span className="text-foreground font-medium">Spotify or Apple Music</span> account to get personalised venue recommendations based on your listening habits.
            </p>
          </div>

          <button
            onClick={next}
            disabled={!displayName.trim()}
            className="mt-2 w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-background font-semibold rounded-lg text-sm transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-serif text-2xl font-bold mb-1">What's your taste?</h2>
            <p className="text-muted-foreground text-sm">We'll use this to surface events and artists you'll love.</p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">
              Favourite Genres <span className="normal-case font-normal">(pick as many as you like)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <TagButton key={g} label={g} selected={genres.includes(g)} onClick={() => setGenres(toggle(genres, g))} />
              ))}
              <CustomTagInput
                accent="emerald"
                tags={genres.filter((g) => !GENRES.includes(g))}
                onAdd={(tag) => setGenres((prev) => prev.includes(tag) ? prev : [...prev, tag])}
                onRemove={(tag) => setGenres((prev) => prev.filter((g) => g !== tag))}
              />
            </div>
          </div>

          {genres.length > 0 && (
            <p className="text-xs text-muted-foreground -mt-2">
              Selected: {genres.join(", ")}
            </p>
          )}

          {error && (
            <p className="text-sm text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-2">
            <button onClick={back} disabled={saving} className="flex-1 py-2.5 border border-border text-foreground font-medium rounded-lg text-sm hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Back
            </button>
            <button
              onClick={finish}
              disabled={genres.length === 0 || saving}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-background font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {saving && (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {saving ? "Saving…" : "Finish setup"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
