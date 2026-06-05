import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export interface VenueForMessage {
  id: number;
  name: string;
  address: string;
}

interface Message {
  id: number;
  from: "you" | "owner";
  text: string;
  time: string;
}

interface VenueMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue: VenueForMessage | null;
  onMessageSent?: (venueId: number) => void;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function VenueMessageDialog({
  open,
  onOpenChange,
  venue,
  onMessageSent,
}: VenueMessageDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Reset convo when venue changes or opens fresh
  useEffect(() => {
    if (open && venue) {
      // Seed a friendly starter from venue side (simulated history)
      const seed: Message[] = [
        {
          id: 1,
          from: "owner",
          text: `Hi! Thanks for checking out ${venue.name}. What kind of set are you looking to bring?`,
          time: formatTime(new Date(Date.now() - 1000 * 60 * 60 * 2)),
        },
      ];
      setMessages(seed);
      setDraft("");
    } else if (!open) {
      setMessages([]);
      setDraft("");
    }
  }, [open, venue]);

  useEffect(() => {
    // Auto scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!venue) return null;

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);

    const now = new Date();
    const youMsg: Message = {
      id: Date.now(),
      from: "you",
      text,
      time: formatTime(now),
    };

    setMessages((prev) => [...prev, youMsg]);
    setDraft("");

    // Simulate owner reply after short delay
    setTimeout(() => {
      const reply: Message = {
        id: Date.now() + 1,
        from: "owner",
        text: "Thanks — I'll take a look at your profile and get back to you within a couple days. What's your availability like in the next month?",
        time: formatTime(new Date(now.getTime() + 45000)),
      };
      setMessages((prev) => [...prev, reply]);
      setSending(false);

      toast({
        title: "Message sent",
        description: `Your message to ${venue.name} has been delivered.`,
      });
      onMessageSent?.(venue.id);
    }, 650);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-base">Message venue owner</DialogTitle>
          <DialogDescription className="text-xs">
            {venue.name} · {venue.address}
          </DialogDescription>
        </DialogHeader>

        <div className="artist-dm-thread flex flex-col h-[320px] bg-muted/30">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 text-sm"
          >
            {messages.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-8">
                Start the conversation about booking a gig.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                    m.from === "you"
                      ? "bg-amber-500 text-background rounded-br-md"
                      : "bg-card border border-border rounded-bl-md"
                  }`}
                >
                  <div>{m.text}</div>
                  <div
                    className={`mt-0.5 text-[10px] tabular-nums ${
                      m.from === "you" ? "text-background/70" : "text-muted-foreground/70"
                    }`}
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-end">
                <div className="text-[10px] text-muted-foreground pr-1">Sending…</div>
              </div>
            )}
          </div>

          <div className="border-t bg-background p-3">
            <div className="flex gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hi, I'd love to play at your venue. My set is..."
                rows={2}
                className="flex-1 resize-y min-h-[44px] max-h-24 rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              />
              <Button
                onClick={handleSend}
                disabled={!draft.trim() || sending}
                className="self-end bg-amber-500 hover:bg-amber-400 text-background h-10 px-4"
              >
                Send
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground/80 px-0.5">
              Messages are private between you and the venue owner.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
