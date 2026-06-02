import { useRef } from "react";

interface AvatarUploadProps {
  url: string;
  onChange: (url: string) => void;
  color: "amber" | "emerald";
}

export default function AvatarUpload({ url, onChange, color }: AvatarUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const colorMap = {
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:border-amber-500/60",
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:border-emerald-500/60",
  };

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onChange(url);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-all cursor-pointer ${colorMap[color]}`}
        >
          {url ? (
            <img src={url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          )}
        </button>
        {url && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{url ? "Tap to change" : "Tap to upload a photo"}</p>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
