import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { artistTabUrl, useAppNavigation } from "@/lib/navigation";
import {
  getGetAccountSettingsQueryKey,
  useChangeAvatar,
  useChangeLocation,
  useChangePassword,
  useChangeUsername,
  useGetAccountSettings,
} from "@workspace/api-client-react";
import type { GeoPlace } from "@workspace/api-client-react";
import LocationSearch from "@/components/LocationSearch";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth, getDemoAccounts, saveDemoAccount } from "@/contexts/AuthContext";
import { COMPETITION_LEVELS } from "@/lib/venueConstants";
import { useToast } from "@/hooks/use-toast";
import CustomTagInput from "@/components/onboarding/CustomTagInput";
import { isStorageConfigured, uploadFile } from "@/lib/storage";

const MAX_AVATAR_BYTES = 400_000;

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: { error?: string } }).data;
    if (data?.error) return data.error;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(pw)) return "Password must include a letter.";
  if (!/[0-9]/.test(pw)) return "Password must include a number.";
  return null;
}

function formatCooldownDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

const GENRES = ["Rock", "Pop", "Jazz", "Hip-Hop", "Electronic", "Folk", "Classical", "R&B", "Country", "Metal"];
const VIBES = ["Energetic", "Chill", "Acoustic", "Experimental", "Traditional", "Interactive", "Background", "Headliner-ready"];

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

export default function Settings() {
  const [, navigate] = useLocation();
  const { goBack } = useAppNavigation();
  const { user, refreshUser, setUser, artistMatching, setArtistMatchingPrefs } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = useGetAccountSettings();

  const isDemoMode = !!user && !!user.email && user.email.endsWith('@test.local');
  const effectiveSettings = isDemoMode ? {
    username: user?.username || '',
    avatarUrl: user?.avatarUrl ?? null,
    locationLabel: null,
    locationLat: null,
    locationLng: null,
    canChangeUsername: true,
    nextUsernameChangeAt: null,
    email: user?.email || '',
  } : settings;

  const [username, setUsername] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [homePlace, setHomePlace] = useState<GeoPlace | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Artist profile for demo/edit
  const [bio, setBio] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [vibes, setVibes] = useState<string[]>([]);

  useEffect(() => {
    if (effectiveSettings) {
      setUsername(effectiveSettings.username || '');
      setAvatarPreview(effectiveSettings.avatarUrl ?? null);
      if (effectiveSettings.locationLabel && effectiveSettings.locationLat != null && effectiveSettings.locationLng != null) {
        const place = {
          label: effectiveSettings.locationLabel,
          lat: effectiveSettings.locationLat,
          lng: effectiveSettings.locationLng,
        };
        setHomePlace(place);
        setLocationInput(place.label);
      } else {
        setHomePlace(null);
        setLocationInput("");
      }
    }
    if (isDemoMode && user?.email) {
      const accounts = getDemoAccounts();
      const prof = accounts[user.email] || {};
      setBio(prof.bio || '');
      setGenres(Array.isArray(prof.genres) ? prof.genres : []);
      setVibes(Array.isArray(prof.vibes) ? prof.vibes : []);
    }
  }, [effectiveSettings, isDemoMode, user]);

  const usernameMutation = useChangeUsername({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetAccountSettingsQueryKey() });
        await refreshUser();
        toast({ title: "Username updated" });
      },
      onError: (err) => {
        toast({ title: "Could not update username", description: getErrorMessage(err), variant: "destructive" });
      },
    },
  });

  const passwordMutation = useChangePassword({
    mutation: {
      onSuccess: () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast({ title: "Password updated" });
      },
      onError: (err) => {
        toast({ title: "Could not update password", description: getErrorMessage(err), variant: "destructive" });
      },
    },
  });

  const locationMutation = useChangeLocation({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetAccountSettingsQueryKey() });
        await refreshUser();
        toast({ title: "Home location saved" });
      },
      onError: (err) => {
        toast({ title: "Could not save location", description: getErrorMessage(err), variant: "destructive" });
      },
    },
  });

  const avatarMutation = useChangeAvatar({
    mutation: {
      onSuccess: async (session) => {
        setAvatarPreview(session.avatarUrl ?? null);
        await refreshUser();
        toast({ title: "Profile picture updated" });
      },
      onError: (err) => {
        toast({ title: "Could not update picture", description: getErrorMessage(err), variant: "destructive" });
      },
    },
  });

  const fallbackBack =
    user?.role === "fan" ? "/fan" :
    user?.role === "artist" ? artistTabUrl("map") :
    user?.role === "venue" ? "/venue" :
    "/";

  function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isDemoMode) {
      const newUsername = username.trim();
      if (!newUsername) return;
      const updatedUser = { ...user!, username: newUsername };
      setUser(updatedUser as any);
      if (user?.email) saveDemoAccount(user.email, { username: newUsername });
      toast({ title: "Username updated (demo)" });
      return;
    }
    if (!effectiveSettings?.canChangeUsername) return;
    usernameMutation.mutate({ data: { username: username.trim() } });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isDemoMode) {
      toast({ title: "Password change (demo only, not persisted)" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      return;
    }
    const pwErr = validatePassword(newPassword);
    if (pwErr) {
      toast({ title: "Invalid password", description: pwErr, variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    passwordMutation.mutate({ data: { currentPassword, newPassword } });
  }

  async function handleAvatarFile(file: File) {
    if (isDemoMode) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          setAvatarPreview(result);
          const updated = { ...user!, avatarUrl: result };
          setUser(updated as any);
          if (user?.email) saveDemoAccount(user.email, { avatarUrl: result });
          toast({ title: "Profile picture updated (demo)" });
        }
      };
      reader.readAsDataURL(file);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({
        title: "Image too large",
        description: "Use an image under 400 KB.",
        variant: "destructive",
      });
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);

    try {
      const storageReady = await isStorageConfigured();
      if (storageReady) {
        const { url } = await uploadFile(file, "avatar");
        setAvatarPreview(url);
        avatarMutation.mutate({ data: { avatarUrl: url } });
        return;
      }
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload image.",
        variant: "destructive",
      });
      setAvatarPreview(effectiveSettings?.avatarUrl ?? null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setAvatarPreview(result);
        avatarMutation.mutate({ data: { avatarUrl: result } });
      }
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveAvatar() {
    if (isDemoMode) {
      setAvatarPreview(null);
      const updated = { ...user!, avatarUrl: null };
      setUser(updated as any);
      if (user?.email) saveDemoAccount(user.email, { avatarUrl: null });
      toast({ title: "Profile picture removed (demo)" });
      return;
    }
    setAvatarPreview(null);
    avatarMutation.mutate({ data: { avatarUrl: null } });
  }

  function handleSaveLocation() {
    if (isDemoMode) {
      // for demo, optionally update local if wanted, but toast for now
      toast({ title: "Location saved (demo)" });
      return;
    }
    if (homePlace) {
      locationMutation.mutate({
        data: {
          locationLabel: homePlace.label,
          lat: homePlace.lat,
          lng: homePlace.lng,
        },
      });
      return;
    }
    if (locationInput.trim().length >= 2) {
      locationMutation.mutate({ data: { query: locationInput.trim() } });
      return;
    }
    locationMutation.mutate({ data: { query: "" } });
  }

  function handleClearLocation() {
    setHomePlace(null);
    setLocationInput("");
    if (isDemoMode) {
      toast({ title: "Location cleared (demo)" });
      return;
    }
    locationMutation.mutate({ data: { query: "" } });
  }

  function handleArtistProfileSave() {
    if (isDemoMode && user?.email) {
      const profileData = {
        bio: bio || undefined,
        genres,
        vibes,
      };
      saveDemoAccount(user.email, profileData);
      const updatedUser = { ...user, ...profileData };
      setUser(updatedUser as any);
      toast({ title: "Artist profile updated (demo)" });
      return;
    }
    toast({ title: "Artist profile editing requires backend", variant: "destructive" });
  }

  const initials = (effectiveSettings?.username ?? user?.username ?? "?").slice(0, 2).toUpperCase();
  const locationUnchanged =
    homePlace != null &&
    effectiveSettings?.locationLabel === homePlace.label &&
    effectiveSettings?.locationLat === homePlace.lat &&
    effectiveSettings?.locationLng === homePlace.lng;
  const savingAvatar = isDemoMode ? false : avatarMutation.isPending;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => goBack(fallbackBack)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
          <h1 className="font-semibold text-sm">Account settings</h1>
          <span className="w-12" aria-hidden />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Loading settings…</p>
        ) : (
          <>
            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-base">Profile picture</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a photo or use a square image. Max 400 KB.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarImage src={avatarPreview ?? undefined} alt="" />
                  <AvatarFallback className="bg-secondary text-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarFile(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={savingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-60"
                  >
                    {savingAvatar ? "Saving…" : "Upload image"}
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      disabled={savingAvatar}
                      onClick={handleRemoveAvatar}
                      className="px-3.5 py-2 text-sm font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-60"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-base">Home location</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Used as the default on the Discover map. Pick a real city, town, or postal code from the list.
                </p>
              </div>
              <LocationSearch
                value={locationInput}
                onChange={setLocationInput}
                selectedPlace={homePlace}
                onPlaceSelect={setHomePlace}
                onClear={() => setHomePlace(null)}
                placeholder="e.g. Toronto, ON or M5V 2T6"
                disabled={!isDemoMode && locationMutation.isPending}
                inputClassName="bg-background border-border"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveLocation}
                  disabled={
                    !isDemoMode && (locationMutation.isPending ||
                    (!homePlace && locationInput.trim().length < 2) ||
                    Boolean(homePlace && locationUnchanged))
                  }
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                >
                  {locationMutation.isPending ? "Saving…" : "Save location"}
                </button>
                {(homePlace || effectiveSettings?.locationLabel) && (
                  <button
                    type="button"
                    onClick={handleClearLocation}
                    disabled={!isDemoMode && locationMutation.isPending}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-base">Username</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  2–20 characters. Letters, numbers, and underscores only.
                </p>
              </div>
              {!effectiveSettings?.canChangeUsername && effectiveSettings?.nextUsernameChangeAt && (
                <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                  You can change your username again on{" "}
                  {formatCooldownDate(effectiveSettings.nextUsernameChangeAt)} (30-day cooldown).
                </p>
              )}
              <form onSubmit={handleUsernameSubmit} className="space-y-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isDemoMode ? false : (!effectiveSettings?.canChangeUsername || usernameMutation.isPending)}
                  maxLength={20}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={
                    isDemoMode ? false :
                    (!effectiveSettings?.canChangeUsername ||
                    usernameMutation.isPending ||
                    username.trim() === effectiveSettings?.username)
                  }
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50"
                >
                  {usernameMutation.isPending ? "Saving…" : "Save username"}
                </button>
              </form>
            </section>

            {user?.role === "artist" && (
              <section className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div>
                  <h2 className="font-semibold text-base">Map matching</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Genres and competition level used for venue recommendations — not shown on the map.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">Your genres</label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map((g) => (
                      <TagButton
                        key={g}
                        label={g}
                        selected={artistMatching.genres.includes(g)}
                        onClick={() => {
                          const prev = artistMatching.genres;
                          const next = prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g];
                          setArtistMatchingPrefs({ genres: next.length ? next : [g], comp: artistMatching.comp });
                        }}
                      />
                    ))}
                    <CustomTagInput
                      accent="amber"
                      tags={artistMatching.genres.filter((g) => !GENRES.includes(g))}
                      onAdd={(tag) => {
                        if (artistMatching.genres.includes(tag)) return;
                        setArtistMatchingPrefs({ genres: [...artistMatching.genres, tag], comp: artistMatching.comp });
                      }}
                      onRemove={(tag) => {
                        const next = artistMatching.genres.filter((x) => x !== tag);
                        setArtistMatchingPrefs({ genres: next, comp: artistMatching.comp });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-2">
                    Competition level{" "}
                    <span className="text-amber-400 font-mono normal-case tracking-normal">
                      {artistMatching.comp == null ? "Any" : `L${artistMatching.comp}`}
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <TagButton
                      label="Any"
                      selected={artistMatching.comp == null}
                      onClick={() => setArtistMatchingPrefs({ genres: artistMatching.genres, comp: null })}
                    />
                    {COMPETITION_LEVELS.map((c) => (
                      <TagButton
                        key={c.level}
                        label={c.label}
                        selected={artistMatching.comp === c.level}
                        onClick={() => setArtistMatchingPrefs({ genres: artistMatching.genres, comp: c.level })}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {(isDemoMode || user?.role === "artist") && (
              <section className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div>
                  <h2 className="font-semibold text-base">Artist Profile</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Edit your bio, tags (genres), and performance vibe. Add custom tags by typing and pressing add.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Tell venues about yourself and your music…"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">Performance Vibe</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {VIBES.map((v) => (
                      <TagButton key={v} label={v} selected={vibes.includes(v)} onClick={() => setVibes(toggle(vibes, v))} />
                    ))}
                  </div>
                  <CustomTagInput
                    accent="amber"
                    tags={vibes.filter((v) => !VIBES.includes(v))}
                    onAdd={(tag) => setVibes((prev) => prev.includes(tag) ? prev : [...prev, tag])}
                    onRemove={(tag) => setVibes((prev) => prev.filter((v) => v !== tag))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3">Tags (Genres)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {GENRES.map((g) => (
                      <TagButton key={g} label={g} selected={genres.includes(g)} onClick={() => setGenres(toggle(genres, g))} />
                    ))}
                  </div>
                  <CustomTagInput
                    accent="amber"
                    tags={genres.filter((g) => !GENRES.includes(g))}
                    onAdd={(tag) => setGenres((prev) => prev.includes(tag) ? prev : [...prev, tag])}
                    onRemove={(tag) => setGenres((prev) => prev.filter((g) => g !== tag))}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleArtistProfileSave}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 border border-border transition-colors"
                  >
                    Save artist profile
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(artistTabUrl("preview"))}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors"
                  >
                    Preview public profile
                  </button>
                </div>
              </section>
            )}

            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-base">Email</h2>
                <p className="text-xs text-muted-foreground mt-1">Your login email cannot be changed here.</p>
              </div>
              <p className="text-sm text-foreground/90 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
                {effectiveSettings?.email}
              </p>
            </section>

            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-base">Password</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  At least 8 characters with a letter and a number.
                </p>
              </div>
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  autoComplete="current-password"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <button
                  type="submit"
                  disabled={passwordMutation.isPending || !currentPassword || !newPassword}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50"
                >
                  {passwordMutation.isPending ? "Updating…" : "Update password"}
                </button>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}