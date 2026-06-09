import { useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, X } from "lucide-react";
import { useVenueMe } from "@/hooks/use-venue-me";
import { useToast } from "@/hooks/use-toast";
import { useCreateEvent } from "@workspace/api-client-react";
import type { CreateEventInput } from "@workspace/api-client-react";
import VenueNav from "@/components/venue/VenueNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { VENUE_GENRES, COMPETITION_LEVELS, DESCRIPTION_MAX_WORDS } from "@/lib/venueConstants";
import CustomTagInput from "@/components/onboarding/CustomTagInput";
import { cn } from "@/lib/utils";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: { error?: string } }).data;
    if (data?.error) return data.error;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export default function VenueCreateEvent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: venue, isLoading: venueLoading } = useVenueMe();
  const createMutation = useCreateEvent({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Event created!",
          description: "It is now visible to fans on the map and artists browsing.",
        });
        navigate("/venue");
      },
      onError: (err) => {
        toast({
          title: "Could not create event",
          description: getErrorMessage(err),
          variant: "destructive",
        });
      },
    },
  });

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [artistRequirements, setArtistRequirements] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [timeValue, setTimeValue] = useState("20:00");
  const [durationMinutes, setDurationMinutes] = useState<number | "">(60);
  const [genres, setGenres] = useState<string[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [isCompetition, setIsCompetition] = useState(false);
  const [competitionLevel, setCompetitionLevel] = useState<number | null>(null);
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);

  const descWords = countWords(description);
  const reqWords = countWords(artistRequirements);
  const descOver = descWords > DESCRIPTION_MAX_WORDS;
  const reqOver = reqWords > DESCRIPTION_MAX_WORDS;

  const venueImages = venue?.imageUrls ?? [];

  function toggleGenre(g: string) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function togglePhoto(url: string) {
    setSelectedImageUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  }

  function toggleCompetitionLevel(l: number) {
    setCompetitionLevel((prev) => (prev === l ? null : l));
  }

  function buildEventDate(): Date | null {
    if (!selectedDate) return null;
    const [hStr, mStr] = timeValue.split(":");
    const h = Number(hStr) || 20;
    const m = Number(mStr) || 0;
    const d = new Date(selectedDate);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const eventDate = buildEventDate();
    if (!eventDate) {
      toast({ title: "Please pick a date and start time", variant: "destructive" });
      return;
    }
    if (descOver || reqOver) {
      toast({
        title: `Descriptions must be ${DESCRIPTION_MAX_WORDS} words or less`,
        variant: "destructive",
      });
      return;
    }
    if (isCompetition && !competitionLevel) {
      toast({ title: "Please select a competition level (1-5)", variant: "destructive" });
      return;
    }

    const input: CreateEventInput = {
      title: title.trim(),
      description: description.trim() || null,
      artistRequirements: artistRequirements.trim() || null,
      imageUrls: selectedImageUrls.length > 0 ? selectedImageUrls : undefined,
      genres: genres.length > 0 ? genres : undefined,
      isPaid,
      payAmount: isPaid && payAmount.trim() ? payAmount.trim() : null,
      isCompetition,
      competitionLevel: isCompetition ? competitionLevel : null,
      eventDate: eventDate.toISOString(),
      durationMinutes:
        typeof durationMinutes === "number" && durationMinutes >= 15 ? durationMinutes : null,
    };

    createMutation.mutate({ data: input });
  }

  const isPending = createMutation.isPending;

  return (
    <div className="venue-dashboard flex flex-col min-h-[100dvh] bg-background text-foreground">
      <VenueNav />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight">Create event</h1>
              <p className="text-muted-foreground text-sm mt-1">
                This will appear on the fan map and be discoverable by artists.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/venue")}>
              Cancel
            </Button>
          </div>

          {venueLoading && (
            <div className="text-sm text-muted-foreground">Loading your venue profile…</div>
          )}

          {!venueLoading && !venue && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm">
              Venue profile not found. Please complete onboarding first.
            </div>
          )}

          {venue && (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  Event title <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. Friday Jazz Night • Live"
                  className="mt-1.5"
                  required
                />
                <p className="text-[10px] text-muted-foreground mt-1">Max 100 characters</p>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">
                    Date <span className="text-red-400">*</span>
                  </Label>
                  <div className="mt-1.5">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label htmlFor="time" className="text-sm font-medium">
                    Start time
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={timeValue}
                    onChange={(e) => setTimeValue(e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">24-hour format</p>
                </div>
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="dur" className="text-sm font-medium">
                  Duration (minutes)
                </Label>
                <Input
                  id="dur"
                  type="number"
                  min={15}
                  step={15}
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(e.target.value ? parseInt(e.target.value, 10) : "")
                  }
                  className="mt-1.5 w-40"
                  placeholder="60"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="desc" className="text-sm font-medium">
                  Description for fans (optional)
                </Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Tell fans what to expect — vibe, set times, cover, etc."
                  className="mt-1.5"
                />
                <p className={`text-[10px] mt-1 ${descOver ? "text-red-400" : "text-muted-foreground"}`}>
                  {descWords} / {DESCRIPTION_MAX_WORDS} words
                </p>
              </div>

              {/* Artist Requirements */}
              <div>
                <Label htmlFor="artistReq" className="text-sm font-medium">
                  What kind of artist are you looking for? (optional)
                </Label>
                <Textarea
                  id="artistReq"
                  value={artistRequirements}
                  onChange={(e) => setArtistRequirements(e.target.value)}
                  rows={4}
                  placeholder="e.g. Soulful vocalists with original material, 3-piece bands welcome…"
                  className="mt-1.5"
                />
                <p className={`text-[10px] mt-1 ${reqOver ? "text-red-400" : "text-muted-foreground"}`}>
                  {reqWords} / {DESCRIPTION_MAX_WORDS} words
                </p>
              </div>

              {/* Photos */}
              <div>
                <Label className="text-sm font-medium">
                  Featured photos (select from your venue uploads)
                </Label>
                {venueImages.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-2">
                    No photos yet. Add photos in your venue profile to showcase the space here.
                  </p>
                ) : (
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {venueImages.map((url, idx) => {
                      const sel = selectedImageUrls.includes(url);
                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => togglePhoto(url)}
                          className={cn(
                            "relative aspect-square rounded-lg overflow-hidden border transition",
                            sel ? "border-violet-500 ring-1 ring-violet-500/50" : "border-border hover:border-violet-500/40"
                          )}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {sel && (
                            <div className="absolute top-1 right-1 bg-violet-500 text-white rounded-full p-0.5">
                              <X className="h-3 w-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  Selected: {selectedImageUrls.length}
                </p>
              </div>

              {/* Genres */}
              <div>
                <Label className="text-sm font-medium">Music genres for this event</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {VENUE_GENRES.map((g) => {
                    const active = genres.includes(g);
                    return (
                      <button
                        type="button"
                        key={g}
                        onClick={() => toggleGenre(g)}
                        className={cn(
                          "px-3 py-1 rounded-full text-sm border transition",
                          active
                            ? "bg-violet-500/20 border-violet-500/60 text-violet-300"
                            : "border-border hover:bg-secondary"
                        )}
                      >
                        {g}
                      </button>
                    );
                  })}
                  <CustomTagInput
                    accent="violet"
                    tags={genres.filter((g) => !(VENUE_GENRES as readonly string[]).includes(g))}
                    onAdd={(tag) => setGenres((prev) => (prev.includes(tag) ? prev : [...prev, tag]))}
                    onRemove={(tag) => setGenres((prev) => prev.filter((g) => g !== tag))}
                  />
                </div>
              </div>

              {/* Paid */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Switch id="paid" checked={isPaid} onCheckedChange={setIsPaid} />
                  <Label htmlFor="paid" className="text-sm font-medium cursor-pointer">
                    This is a paid gig
                  </Label>
                </div>
                {isPaid && (
                  <Input
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder='e.g. "$150" or "Tips + $50 bar tab"'
                    className="max-w-sm"
                  />
                )}
              </div>

              {/* Competition */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch
                    id="comp"
                    checked={isCompetition}
                    onCheckedChange={(checked) => {
                      setIsCompetition(checked);
                      if (!checked) setCompetitionLevel(null);
                    }}
                  />
                  <Label htmlFor="comp" className="text-sm font-medium cursor-pointer">
                    This event is a competition / curated showcase
                  </Label>
                </div>
                {isCompetition && (
                  <div className="pl-7">
                    <p className="text-xs text-muted-foreground mb-2">
                      Select level (1 = open mic style, 5 = highly competitive / invite only)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {COMPETITION_LEVELS.map((c) => {
                        const active = competitionLevel === c.level;
                        return (
                          <button
                            type="button"
                            key={c.level}
                            onClick={() => toggleCompetitionLevel(c.level)}
                            className={cn(
                              "text-left p-2.5 rounded-lg border text-xs transition",
                              active
                                ? "border-violet-500 bg-violet-500/10"
                                : "border-border hover:border-violet-500/40"
                            )}
                          >
                            <div className="font-semibold tabular-nums text-violet-400">
                              {c.level}. {c.label}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                              {c.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/venue")}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isPending ||
                    !title.trim() ||
                    descOver ||
                    reqOver ||
                    (isCompetition && !competitionLevel)
                  }
                  className="min-w-[140px]"
                >
                  {isPending ? "Creating…" : "Create event"}
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Events are published immediately and visible on the fan map.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
