import { useState } from "react";
import { useLocation } from "wouter";
import StepIndicator from "./StepIndicator";
import CustomTagInput from "./CustomTagInput";
import AvatarUpload from "./AvatarUpload";

const GENRES = ["Rock", "Pop", "Jazz", "Hip-Hop", "Electronic", "Folk", "Classical", "R&B", "Country", "Metal"];
const VIBES = ["Energetic", "Chill", "Acoustic", "Experimental", "Traditional", "Interactive", "Background", "Headliner-ready"];

const STEPS = ["Profile", "Your Sound", "Links"];

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
          ? "bg-amber-500/20 border-amber-500/60 text-amber-400"
          : "bg-background border-border text-muted-foreground hover:border-amber-500/30 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export default function ArtistOnboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [vibes, setVibes] = useState<string[]>([]);
  const [spotify, setSpotify] = useState("");
  const [youtube, setYoutube] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function next() { setStep((s) => s + 1); }
  function back() { setStep((s) => s - 1); }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/artists/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          avatarUrl: avatarUrl || undefined,
          bio: bio || undefined,
          genres,
          vibes,
          spotifyUrl: spotify || undefined,
          youtubeUrl: youtube || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Something went wrong. Please try again.");
        return;
      }
      navigate("/");
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
            <h2 className="font-serif text-2xl font-bold mb-1">Set up your artist profile</h2>
            <p className="text-muted-foreground text-sm">This is what venues and fans will see.</p>
          </div>

          <AvatarUpload url={avatarUrl} onChange={setAvatarUrl} color="amber" />

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your stage name"
              maxLength={40}
              className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">
              Bio <span className="normal-case font-normal">(100 words or less)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell venues and fans a little about yourself…"
              className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {bio.split(/\s+/).filter(Boolean).length} / 100 words
            </p>
          </div>
          <button
            onClick={next}
            disabled={!displayName.trim()}
            className="mt-2 w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-background font-semibold rounded-lg text-sm transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-serif text-2xl font-bold mb-1">Your sound</h2>
            <p className="text-muted-foreground text-sm">Help venues find the right fit for their crowd.</p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">Genre</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <TagButton key={g} label={g} selected={genres.includes(g)} onClick={() => setGenres(toggle(genres, g))} />
              ))}
              <CustomTagInput
                accent="amber"
                tags={genres.filter((g) => !GENRES.includes(g))}
                onAdd={(tag) => setGenres((prev) => prev.includes(tag) ? prev : [...prev, tag])}
                onRemove={(tag) => setGenres((prev) => prev.filter((g) => g !== tag))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">Performance Vibe</label>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <TagButton key={v} label={v} selected={vibes.includes(v)} onClick={() => setVibes(toggle(vibes, v))} />
              ))}
              <CustomTagInput
                accent="amber"
                tags={vibes.filter((v) => !VIBES.includes(v))}
                onAdd={(tag) => setVibes((prev) => prev.includes(tag) ? prev : [...prev, tag])}
                onRemove={(tag) => setVibes((prev) => prev.filter((v) => v !== tag))}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={back} className="flex-1 py-2.5 border border-border text-foreground font-medium rounded-lg text-sm hover:bg-secondary transition-colors">
              Back
            </button>
            <button
              onClick={next}
              disabled={genres.length === 0}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-background font-semibold rounded-lg text-sm transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="font-serif text-2xl font-bold mb-1">Link your accounts</h2>
            <p className="text-muted-foreground text-sm">Optional — helps venues and fans find you online.</p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Spotify Profile URL</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-400">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </span>
              <input
                value={spotify}
                onChange={(e) => setSpotify(e.target.value)}
                placeholder="https://open.spotify.com/artist/..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">YouTube Channel URL</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400">
                  <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
                </svg>
              </span>
              <input
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="https://youtube.com/@yourchannel"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-4 flex items-start gap-3 mt-1">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Links are public on your profile. You can add or change them at any time from your settings.
            </p>
          </div>

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
              disabled={saving}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-background font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
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
