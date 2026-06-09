import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  useListConversations,
  useGetConversation,
  useSendMessage,
  useStartConversation,
  useCloseConversation,
  useSearchChatUsers,
  useListConversationGigInvites,
  useRespondToGigInvite,
  getListConversationGigInvitesQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { artistTabUrl, useAppNavigation, venueTabUrl } from "@/lib/navigation";
import { isStorageConfigured, uploadFile } from "@/lib/storage";

const MAX_ATTACHMENT_BYTES = 500_000;

interface ChatPageProps {
  role: "artist" | "venue";
  homePath: string;
  backLabel?: string;
  embedded?: boolean;
  conversationId?: number | null;
  onConversationChange?: (id: number | null) => void;
}

export default function ChatPage({
  role,
  homePath,
  backLabel,
  embedded = false,
  conversationId: embeddedConversationId,
  onConversationChange,
}: ChatPageProps) {
  const [, navigate] = useLocation();
  const [, params] = useRoute(role === "artist" ? "/artist/chat/:conversationId?" : "/venue/chat/:conversationId?");
  const { user } = useAuth();
  const { toast } = useToast();
  const { linkTo, navigate: appNavigate } = useAppNavigation();

  const routeConversationId = params?.conversationId ? parseInt(params.conversationId, 10) : null;
  const conversationId = embedded ? (embeddedConversationId ?? null) : routeConversationId;
  const resolvedHome = role === "artist" ? artistTabUrl("messages") : venueTabUrl("messages");
  const resolvedBackLabel = backLabel ?? (role === "artist" ? "Back to messages" : "Back to dashboard");
  const chatBase = role === "artist" ? "/artist/chat" : `${homePath}/chat`;

  function openConversation(id: number) {
    if (embedded && onConversationChange) {
      onConversationChange(id);
      return;
    }
    navigate(`${chatBase}/${id}`);
  }

  function closeToList() {
    if (embedded && onConversationChange) {
      onConversationChange(null);
      return;
    }
    navigate(resolvedHome);
  }
  const [draft, setDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebouncedValue(searchQ.trim(), 250);

  const { data: convList, refetch: refetchList } = useListConversations();
  const { data: activeConv, refetch: refetchConv } = useGetConversation(conversationId ?? 0);
  const { data: searchResults } = useSearchChatUsers(
    { q: debouncedSearch || " " },
  );
  const { data: gigInvites, refetch: refetchInvites } = useListConversationGigInvites(
    conversationId ?? 0,
    {
      query: {
        queryKey: getListConversationGigInvitesQueryKey(conversationId ?? 0),
        enabled: role === "artist" && !!conversationId,
      },
    },
  );

  const sendMutation = useSendMessage({
    mutation: {
      onSuccess: () => {
        setDraft("");
        refetchConv();
        refetchList();
      },
    },
  });

  const startMutation = useStartConversation({
    mutation: {
      onSuccess: (data) => {
        setShowNewChat(false);
        setSearchQ("");
        openConversation(data.id);
        refetchList();
      },
      onError: (err: unknown) => {
        const msg = err && typeof err === "object" && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : "Could not start chat.";
        toast({ title: "Error", description: msg ?? "Could not start chat.", variant: "destructive" });
      },
    },
  });

  const respondInvite = useRespondToGigInvite({
    mutation: {
      onSuccess: () => {
        refetchConv();
        refetchInvites();
        refetchList();
        toast({ title: "Response sent" });
      },
      onError: () => {
        toast({ title: "Could not respond", variant: "destructive" });
      },
    },
  });

  const closeMutation = useCloseConversation({
    mutation: {
      onSuccess: () => {
        closeToList();
        refetchList();
      },
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages?.length]);

  function handleSend() {
    if (!conversationId || !draft.trim()) return;
    sendMutation.mutate({ id: conversationId, data: { body: draft.trim() } });
  }

  async function handleFile(file: File) {
    if (!conversationId) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast({ title: "File too large", description: "Max 500 KB for chat attachments.", variant: "destructive" });
      return;
    }

    const isImage = file.type.startsWith("image/");

    try {
      const storageReady = await isStorageConfigured();
      if (storageReady) {
        const { url } = await uploadFile(file, "chat");
        sendMutation.mutate({
          id: conversationId,
          data: {
            attachmentUrl: url,
            attachmentType: isImage ? "image" : "file",
            attachmentName: file.name,
            body: isImage ? undefined : `Shared file: ${file.name}`,
          },
        });
        return;
      }
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload attachment.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      sendMutation.mutate({
        id: conversationId,
        data: {
          attachmentUrl: url,
          attachmentType: isImage ? "image" : "file",
          attachmentName: file.name,
          body: isImage ? undefined : `Shared file: ${file.name}`,
        },
      });
    };
    reader.readAsDataURL(file);
  }

  const accent = role === "artist" ? "amber" : "violet";
  const conversations = convList?.conversations ?? [];
  const otherUser = activeConv?.otherUser;
  const venueProfileId = otherUser?.role === "venue" ? otherUser.profileId : null;
  const pendingInvites = gigInvites?.invites ?? [];

  function formatInviteDate(date: Date | string) {
    return new Date(date).toLocaleDateString("en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const accentStyle = role === "artist"
    ? { borderColor: "hsl(45 93% 47% / 0.4)", color: "hsl(45 93% 47%)" }
    : { borderColor: "hsl(270 60% 60% / 0.4)", color: "hsl(270 60% 70%)" };

  const mobileThreadOpen = embedded && conversationId != null;
  const profileLinkClass = role === "artist"
    ? "text-[11px] text-amber-400/90 hover:text-amber-300 truncate"
    : "text-[11px] text-violet-400/90 hover:text-violet-300 truncate";

  return (
    <div className={embedded ? "embedded-chat" : "min-h-[100dvh] flex flex-col bg-background text-foreground"}>
      {!embedded && (
        <header className="shrink-0 border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(resolvedHome)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {resolvedBackLabel}
          </button>
          <h1 className="font-semibold text-base flex-1">Messages</h1>
          <button
            type="button"
            onClick={() => setShowNewChat((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg border"
            style={accentStyle}
          >
            New chat
          </button>
        </header>
      )}

      {embedded && (
        <div className="embedded-chat__toolbar shrink-0 border-b border-border px-4 py-2 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-sm">Messages</h2>
          <button
            type="button"
            onClick={() => setShowNewChat((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg border"
            style={accentStyle}
          >
            New chat
          </button>
        </div>
      )}

      <div className="embedded-chat__pane">
        <aside
          className={`embedded-chat__sidebar ${mobileThreadOpen ? "embedded-chat__sidebar--mobile-hidden" : ""}`}
        >
          {showNewChat && (
            <div className="p-3 border-b border-border space-y-2">
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search by username…"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card"
                autoFocus
              />
              <ul className="max-h-40 overflow-y-auto space-y-1">
                {(searchResults?.users ?? []).map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => startMutation.mutate({ data: { username: u.username } })}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-secondary text-sm"
                    >
                      <span className="font-medium">{u.displayName}</span>
                      <span className="text-xs text-muted-foreground ml-1">@{u.username}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openConversation(c.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    conversationId === c.id ? "border-border bg-secondary" : "border-transparent hover:bg-secondary/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={c.otherUser.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-[10px]">{c.otherUser.displayName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.otherUser.displayName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {c.lastMessage?.body ?? (c.lastMessage?.attachmentType ? "Attachment" : "No messages")}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main
          className={`embedded-chat__thread ${!conversationId ? "embedded-chat__thread--empty" : ""} ${embedded && !conversationId ? "embedded-chat__thread--mobile-hidden" : ""}`}
        >
          {!conversationId ? (
            <div className="embedded-chat__empty flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation or start a new chat
            </div>
          ) : (
            <>
              <div className="embedded-chat__thread-head shrink-0 px-4 py-2 border-b border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {embedded && (
                    <button
                      type="button"
                      onClick={() => closeToList()}
                      className="embedded-chat__back sm:hidden shrink-0 text-sm text-muted-foreground hover:text-foreground px-1"
                      aria-label="Back to conversations"
                    >
                      ←
                    </button>
                  )}
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={otherUser?.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(otherUser?.displayName ?? "?").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <span className="font-medium text-sm block truncate">{otherUser?.displayName}</span>
                    {venueProfileId != null && (
                      <button
                        type="button"
                        onClick={() => appNavigate(linkTo(`/venue/${venueProfileId}`))}
                        className={profileLinkClass}
                      >
                        View venue profile →
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => closeMutation.mutate({ id: conversationId })}
                  className="text-xs text-muted-foreground hover:text-red-400"
                >
                  Close chat
                </button>
              </div>

              <div className="embedded-chat__messages flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                {role === "artist" && pendingInvites.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {pendingInvites.map((inv) => (
                      <div
                        key={inv.outreachId}
                        className="rounded-xl border border-amber-500/35 bg-amber-500/8 p-3 space-y-2"
                      >
                        <p className="text-sm font-medium text-amber-100/95">Gig invite</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="text-foreground/90 font-medium">{inv.eventTitle}</span>
                          {" · "}
                          {formatInviteDate(inv.eventDate)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={respondInvite.isPending}
                            onClick={() =>
                              respondInvite.mutate({
                                conversationId: conversationId!,
                                outreachId: inv.outreachId,
                                data: { action: "accept" },
                              })
                            }
                            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-background font-medium hover:bg-amber-400 disabled:opacity-50"
                          >
                            Accept gig
                          </button>
                          <button
                            type="button"
                            disabled={respondInvite.isPending}
                            onClick={() =>
                              respondInvite.mutate({
                                conversationId: conversationId!,
                                outreachId: inv.outreachId,
                                data: { action: "decline" },
                              })
                            }
                            className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => appNavigate(linkTo(`/venue/${inv.venueId}`))}
                            className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400/90"
                          >
                            Venue profile
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(activeConv?.messages ?? []).map((m) => {
                  const mine = m.senderUserId === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                          mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                        }`}
                      >
                        {m.attachmentType === "image" && m.attachmentUrl && (
                          <img src={m.attachmentUrl} alt="" className="max-w-full rounded-lg mb-1" />
                        )}
                        {m.attachmentType === "file" && m.attachmentUrl && (
                          <a href={m.attachmentUrl} download={m.attachmentName ?? "file"} className="underline text-xs">
                            📎 {m.attachmentName ?? "Download file"}
                          </a>
                        )}
                        {m.body && <p>{m.body}</p>}
                        <p className="text-[9px] opacity-60 mt-1">
                          {new Date(m.createdAt).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="embedded-chat__composer shrink-0 p-3 border-t border-border flex gap-2">
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
                  title="Attach image or file"
                >
                  📎
                </button>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message…"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-card"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim() || sendMutation.isPending}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}