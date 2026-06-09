import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isStorageConfigured, uploadFile } from "@/lib/storage";

interface VenuePhotoUploadProps {
  imageUrls: string[];
  onChange: (urls: string[]) => void;
  maxPhotos?: number;
}

export default function VenuePhotoUpload({ imageUrls, onChange, maxPhotos = 12 }: VenuePhotoUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    if (imageUrls.length + files.length > maxPhotos) {
      toast({ title: "Too many photos", description: `Max ${maxPhotos} images.`, variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const storageReady = await isStorageConfigured();
      if (!storageReady) {
        toast({
          title: "Storage not configured",
          description: "Set APPWRITE_* env vars to upload venue photos.",
          variant: "destructive",
        });
        return;
      }

      const uploaded: string[] = [];
      for (const file of files) {
        const { url } = await uploadFile(file, "venue");
        uploaded.push(url);
      }
      onChange([...imageUrls, ...uploaded]);
      toast({ title: uploaded.length === 1 ? "Photo uploaded" : `${uploaded.length} photos uploaded` });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload photos.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading || imageUrls.length >= maxPhotos}
        className="w-full border-2 border-dashed border-border hover:border-violet-500/50 rounded-xl p-6 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        <span className="font-medium text-sm">{uploading ? "Uploading…" : "Add venue photos"}</span>
        <span className="text-xs opacity-70">JPEG, PNG, WebP · up to 5 MB each</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

      {imageUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {imageUrls.map((src, i) => (
            <div key={`${src}-${i}`} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(imageUrls.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs hover:bg-red-500"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}