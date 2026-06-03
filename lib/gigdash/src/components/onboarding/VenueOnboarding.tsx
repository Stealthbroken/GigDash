import { useState, useRef } from "react";
import { useLocation } from "wouter";
import StepIndicator from "./StepIndicator";
import CustomTagInput from "./CustomTagInput";

const MOODS = [
  "Formal", "Informal", "Bar", "Lounge", "Outdoor", "Intimate",
  "High-energy", "Chill", "All-ages", "18+", "Restaurant", "Club",
  "Concert Hall", "Pub", "Coffee Shop", "Art Gallery", "Rooftop",
  "Theatre", "Brewery", "Event Space",
];
const SIZES = [
  { id: "xs", label: "Tiny", sublabel: "< 50 guests" },
  { id: "sm", label: "Small", sublabel: "50–200 guests" },
  { id: "md", label: "Medium", sublabel: "200–500 guests" },
  { id: "lg", label: "Large", sublabel: "500+ guests" },
];
const STEPS = ["Details", "Atmosphere", "Photos"];

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
          ? "bg-violet-500/20 border-violet-500/60 text-violet-400"
          : "bg-background border-border text-muted-foreground hover:border-violet-500/30 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export default function VenueOnboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);

  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [size, setSize] = useState("");
  const [moods, setMoods] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function next() { setStep((s) => s + 1); }
  function back() { setStep((s) => s - 1); }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/venues/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: venueName,
          address,
          description: description || undefined,
          size: size || undefined,
          moods,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Something went wrong. Please try again.");
        return;
      }
      navigate("/venue");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      setImages((prev) => [...prev, url]);
    });
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex justify-center mb-10">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="font-serif text-2xl font-bold mb-1">Your venue details</h2>
            <p className="text-muted-foreground text-sm">Basic info artists and fans will see on your profile.</p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Venue Name</label>
            <input
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="e.g. The Blue Note"
              maxLength={60}
              className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Address</label>
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, Province"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Used to show your venue on the map for fans and artists nearby.</p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">
              Description <span className="normal-case font-normal">(100 words or less)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Tell artists and fans what makes your space unique…"
              className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {description.split(/\s+/).filter(Boolean).length} / 100 words
            </p>
          </div>
          <button
            onClick={next}
            disabled={!venueName.trim() || !address.trim()}
            className="mt-2 w-full py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-serif text-2xl font-bold mb-1">Your atmosphere</h2>
            <p className="text-muted-foreground text-sm">Help artists understand if your venue is the right fit.</p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">Venue Size</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSize(s.id)}
                  className={`flex flex-col items-center gap-0.5 p-3 rounded-xl border text-center transition-all ${
                    size === s.id
                      ? "border-violet-500 bg-violet-500/10 text-violet-400"
                      : "border-border bg-background text-muted-foreground hover:border-violet-500/30 hover:text-foreground"
                  }`}
                >
                  <span className="font-semibold text-sm">{s.label}</span>
                  <span className="text-[10px] opacity-70">{s.sublabel}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">
              Mood & Environment <span className="normal-case font-normal">(pick all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <TagButton key={m} label={m} selected={moods.includes(m)} onClick={() => setMoods(toggle(moods, m))} />
              ))}
              <CustomTagInput
                accent="violet"
                tags={moods.filter((m) => !MOODS.includes(m))}
                onAdd={(tag) => setMoods((prev) => prev.includes(tag) ? prev : [...prev, tag])}
                onRemove={(tag) => setMoods((prev) => prev.filter((m) => m !== tag))}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button onClick={back} className="flex-1 py-2.5 border border-border text-foreground font-medium rounded-lg text-sm hover:bg-secondary transition-colors">
              Back
            </button>
            <button
              onClick={next}
              disabled={!size || moods.length === 0}
              className="flex-1 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="font-serif text-2xl font-bold mb-1">Showcase your space</h2>
            <p className="text-muted-foreground text-sm">Upload photos so artists know what to expect. Optional for now.</p>
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border hover:border-violet-500/50 rounded-xl p-8 flex flex-col items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 group-hover:text-violet-400 transition-colors" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <div className="text-center">
              <p className="font-medium text-sm">Click to upload photos</p>
              <p className="text-xs mt-1 opacity-70">PNG, JPG up to 10 MB each</p>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
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
              disabled={saving}
              className="flex-1 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
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
