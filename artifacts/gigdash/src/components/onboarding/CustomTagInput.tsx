import { useState } from "react";

interface CustomTagInputProps {
  accent: "amber" | "emerald" | "violet";
  onAdd: (tag: string) => void;
}

export default function CustomTagInput({ accent, onAdd }: CustomTagInputProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const colorMap = {
    amber: "focus:ring-amber-500 border-amber-500/30",
    emerald: "focus:ring-emerald-500 border-emerald-500/30",
    violet: "focus:ring-violet-500 border-violet-500/30",
  };

  function handleAdd() {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      setValue("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-full border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
      >
        + Add custom
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
        placeholder="Enter a tag…"
        className={`px-3 py-1.5 rounded-full border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${colorMap[accent]}`}
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!value.trim()}
        className="px-3 py-1.5 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-40"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setValue(""); }}
        className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
