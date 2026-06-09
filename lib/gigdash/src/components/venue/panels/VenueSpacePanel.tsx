import { useState, useEffect } from "react";
import { useUpdateVenueMe } from "@workspace/api-client-react";
import VenueSectionCard from "../VenueSectionCard";
import CustomTagInput from "@/components/onboarding/CustomTagInput";
import { DESCRIPTION_MAX_WORDS, VENUE_ENVIRONMENT_TAGS, VENUE_SIZES } from "@/lib/venueConstants";
import type { VenueMe } from "@/hooks/use-venue-me";
import { useToast } from "@/hooks/use-toast";
import VenuePhotoUpload from "@/components/venue/VenuePhotoUpload";

interface VenueSpacePanelProps {
  venue: VenueMe;
  onUpdated?: () => void;
}

export default function VenueSpacePanel({ venue, onUpdated }: VenueSpacePanelProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(venue.description ?? "");
  const [size, setSize] = useState(venue.size ?? "");
  const [moods, setMoods] = useState<string[]>(venue.moods ?? []);
  const [imageUrls, setImageUrls] = useState<string[]>(venue.imageUrls ?? []);

  useEffect(() => {
    setDescription(venue.description ?? "");
    setSize(venue.size ?? "");
    setMoods(venue.moods ?? []);
    setImageUrls(venue.imageUrls ?? []);
  }, [venue]);

  const updateMutation = useUpdateVenueMe({
    mutation: {
      onSuccess: () => {
        toast({ title: "Venue updated" });
        setEditing(false);
        onUpdated?.();
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    },
  });

  const wordCount = description.split(/\s+/).filter(Boolean).length;

  function handleSave() {
    if (wordCount > DESCRIPTION_MAX_WORDS) {
      toast({ title: "Description too long", description: `Max ${DESCRIPTION_MAX_WORDS} words.`, variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      data: {
        name: venue.name,
        address: venue.address,
        lat: venue.lat ?? 0,
        lng: venue.lng ?? 0,
        description,
        size: size || undefined,
        moods,
        imageUrls,
      },
    });
  }

  function toggleMood(m: string) {
    setMoods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  return (
    <div className="space-y-6">
      <VenueSectionCard
        title="Venue description"
        description={`Short pitch for artists and fans (${DESCRIPTION_MAX_WORDS} words max).`}
        comingSoon={false}
      >
        {editing ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm resize-y"
            placeholder="Describe your venue…"
          />
        ) : (
          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
            {description || "No description saved yet."}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2 tabular-nums">
          {wordCount} / {DESCRIPTION_MAX_WORDS} words
        </p>
      </VenueSectionCard>

      <VenueSectionCard title="Environment & atmosphere" description="Tags so artists know your vibe." comingSoon={false}>
        {editing ? (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {VENUE_ENVIRONMENT_TAGS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMood(m)}
                  className={`px-2.5 py-1 rounded-full border text-xs font-medium ${
                    moods.includes(m)
                      ? "bg-violet-500/15 border-violet-500/50 text-violet-400"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <CustomTagInput
              accent="violet"
              tags={moods.filter((m) => !(VENUE_ENVIRONMENT_TAGS as readonly string[]).includes(m))}
              onAdd={(tag) => setMoods((prev) => [...prev, tag])}
              onRemove={(tag) => setMoods((prev) => prev.filter((x) => x !== tag))}
            />
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {moods.map((m) => (
              <span key={m} className="px-2.5 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-medium">
                {m}
              </span>
            ))}
          </div>
        )}
      </VenueSectionCard>

      <VenueSectionCard title="Venue photos" description="Show artists and fans what your space looks like." comingSoon={false}>
        {editing ? (
          <VenuePhotoUpload imageUrls={imageUrls} onChange={setImageUrls} />
        ) : imageUrls.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {imageUrls.map((src, i) => (
              <div key={`${src}-${i}`} className="aspect-[4/3] rounded-lg overflow-hidden border border-border">
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No photos yet. Edit to upload.</p>
        )}
      </VenueSectionCard>

      <VenueSectionCard title="Size" description="Capacity tier for artist planning.">
        {editing ? (
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-full max-w-xs px-3 py-2 rounded-lg border border-border bg-card text-sm"
          >
            <option value="">Select size…</option>
            {VENUE_SIZES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        ) : (
          <p className="text-sm">{VENUE_SIZES.find((s) => s.id === size)?.label ?? size ?? "Not set"}</p>
        )}
      </VenueSectionCard>

      <div className="flex gap-2">
        {editing ? (
          <>
            <button type="button" onClick={handleSave} disabled={updateMutation.isPending} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-50">
              Save changes
            </button>
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg border border-border text-sm">
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="px-4 py-2 rounded-lg border border-violet-500/40 text-violet-400 text-sm font-medium hover:bg-violet-500/10">
            Edit venue details
          </button>
        )}
      </div>
    </div>
  );
}