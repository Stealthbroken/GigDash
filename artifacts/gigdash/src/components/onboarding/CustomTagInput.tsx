import { useState } from "react";

interface CustomTagInputProps {
  accent: "amber" | "emerald" | "violet";
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}

export default function CustomTagInput({ accent, tags, onAdd, onRemove }: CustomTagInputProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const colorMap = {
    amber: "focus:ring-amber-500 border-amber-500/30",
    emerald: "focus:ring-emerald-500 border-emerald-500/30",
    violet: "focus:ring-violet-500 border-violet-500/30",
  };

  const pillColorMap = {
    amber: "bg-amber-500/10 border-amber-500/40 text-amber-400",
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    violet: "bg-violet-500/10 border-violet-500/40 text-violet-400",
  };

  function handleAdd() {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
      setValue("");
      setOpen(false);
    } else if (tags.includes(trimmed)) {
      setValue("");
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Custom tags rendered as removable pills */}
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onRemove(tag)}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${pillColorMap[accent]} hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400`}
          title="Click to remove"
        >
          {tag}
          <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ))}

      {/* Add custom input */}
      {open ? (
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
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 rounded-full border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
        >
          + Add custom
        </button>
      )}
    </div>
  );
}
