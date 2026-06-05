import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Send } from "lucide-react";
import { useListFollowedArtists } from "@workspace/api-client-react";
import FanNav from "@/components/fan/FanNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function artistInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function FanChat() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/fan/chat/:artistId");
  const artistId = params?.artistId ? parseInt(params.artistId, 10) : null;

  const { data: followed, isLoading } = useListFollowedArtists();
  const artists = followed?.artists ?? [];
  const activeArtist =
    artistId != null && !isNaN(artistId)
      ? artists.find((a) => a.id === artistId)
      : undefined;

  const [draft, setDraft] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <FanNav />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-10 flex flex-col min-h-0">
        <button
          type="button"
          onClick={() => navigate(activeArtist ? "/fan/profile" : "/fan/profile")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 w-fit"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to profile
        </button>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
        ) : artistId != null && !isNaN(artistId) && !activeArtist ? (
          <div className="text-center py-12 rounded-xl border border-border bg-card">
            <p className="text-sm text-muted-foreground">Artist not found in your follows.</p>
            <button
              type="button"
              onClick={() => navigate("/fan/chat")}
              className="mt-4 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              Choose an artist
            </button>
          </div>
        ) : activeArtist ? (
          <div className="flex flex-col flex-1 min-h-0 rounded-xl border border-border bg-card overflow-hidden">
            <header className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card/80">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={activeArtist.avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="bg-secondary text-xs font-semibold">
                  {artistInitials(activeArtist.displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold text-sm">{activeArtist.displayName}</h1>
                <p className="text-xs text-muted-foreground">Direct message</p>
              </div>
            </header>

            <div className="flex-1 min-h-[280px] px-4 py-6 flex flex-col justify-end">
              <p className="text-sm text-muted-foreground text-center max-w-xs mx-auto leading-relaxed">
                Say hi to {activeArtist.displayName}. Messages you send here will reach the artist
                when chat delivery is enabled.
              </p>
            </div>

            <form
              className="p-3 border-t border-border flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                setDraft("");
              }}
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight">Chat</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Pick an artist you follow to start a conversation.
              </p>
            </div>

            {artists.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12 rounded-xl border border-dashed border-border">
                Follow artists from your profile to chat with them.
              </p>
            ) : (
              <ul className="space-y-2">
                {artists.map((artist) => (
                  <li key={artist.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/fan/chat/${artist.id}`)}
                      className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:bg-secondary/50 transition-colors"
                    >
                      <Avatar className="h-11 w-11 border border-border">
                        <AvatarImage src={artist.avatarUrl ?? undefined} alt="" />
                        <AvatarFallback className="bg-secondary text-xs font-semibold">
                          {artistInitials(artist.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{artist.displayName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}