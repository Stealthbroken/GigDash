import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
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
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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

export default function Settings() {
  const [, navigate] = useLocation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = useGetAccountSettings();

  const [username, setUsername] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [homePlace, setHomePlace] = useState<GeoPlace | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (settings) {
      setUsername(settings.username);
      setAvatarPreview(settings.avatarUrl ?? null);
      if (settings.locationLabel && settings.locationLat != null && settings.locationLng != null) {
        const place = {
          label: settings.locationLabel,
          lat: settings.locationLat,
          lng: settings.locationLng,
        };
        setHomePlace(place);
        setLocationInput(place.label);
      } else {
        setHomePlace(null);
        setLocationInput("");
      }
    }
  }, [settings]);

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

  const backPath = user?.role === "fan" ? "/fan" : "/";

  function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings?.canChangeUsername) return;
    usernameMutation.mutate({ data: { username: username.trim() } });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  function handleAvatarFile(file: File) {
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
    setAvatarPreview(null);
    avatarMutation.mutate({ data: { avatarUrl: null } });
  }

  function handleSaveLocation() {
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
    locationMutation.mutate({ data: { query: "" } });
  }

  const initials = (settings?.username ?? user?.username ?? "?").slice(0, 2).toUpperCase();
  const locationUnchanged =
    homePlace != null &&
    settings?.locationLabel === homePlace.label &&
    settings?.locationLat === homePlace.lat &&
    settings?.locationLng === homePlace.lng;
  const savingAvatar = avatarMutation.isPending;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(backPath)}
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
                disabled={locationMutation.isPending}
                inputClassName="bg-background border-border"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveLocation}
                  disabled={
                    locationMutation.isPending ||
                    (!homePlace && locationInput.trim().length < 2) ||
                    Boolean(homePlace && locationUnchanged)
                  }
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                >
                  {locationMutation.isPending ? "Saving…" : "Save location"}
                </button>
                {(homePlace || settings?.locationLabel) && (
                  <button
                    type="button"
                    onClick={handleClearLocation}
                    disabled={locationMutation.isPending}
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
              {!settings?.canChangeUsername && settings?.nextUsernameChangeAt && (
                <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                  You can change your username again on{" "}
                  {formatCooldownDate(settings.nextUsernameChangeAt)} (30-day cooldown).
                </p>
              )}
              <form onSubmit={handleUsernameSubmit} className="space-y-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!settings?.canChangeUsername || usernameMutation.isPending}
                  maxLength={20}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={
                    !settings?.canChangeUsername ||
                    usernameMutation.isPending ||
                    username.trim() === settings?.username
                  }
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50"
                >
                  {usernameMutation.isPending ? "Saving…" : "Save username"}
                </button>
              </form>
            </section>

            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-base">Email</h2>
                <p className="text-xs text-muted-foreground mt-1">Your login email cannot be changed here.</p>
              </div>
              <p className="text-sm text-foreground/90 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
                {settings?.email}
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