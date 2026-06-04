interface PlaceholderFieldProps {
  label: string;
  hint?: string;
  type?: "text" | "textarea" | "select" | "tags" | "toggle" | "file" | "datetime";
}

export default function PlaceholderField({ label, hint, type = "text" }: PlaceholderFieldProps) {
  return (
    <div className="venue-placeholder-field">
      <span className="venue-placeholder-field__label">{label}</span>
      {hint && <span className="venue-placeholder-field__hint">{hint}</span>}
      <div
        className={`venue-placeholder-field__mock venue-placeholder-field__mock--${type}`}
        aria-hidden
      >
        {type === "tags" && (
          <div className="flex flex-wrap gap-1.5 p-2">
            {["Jazz", "Rock", "…"].map((t) => (
              <span key={t} className="venue-placeholder-tag">
                {t}
              </span>
            ))}
          </div>
        )}
        {type === "toggle" && (
          <div className="flex gap-3 p-2">
            <span className="venue-placeholder-pill venue-placeholder-pill--on">Paid</span>
            <span className="venue-placeholder-pill">Unpaid</span>
          </div>
        )}
        {type === "datetime" && (
          <div className="grid grid-cols-3 gap-2 p-2">
            <span className="venue-placeholder-box col-span-1">Date</span>
            <span className="venue-placeholder-box col-span-1">Time</span>
            <span className="venue-placeholder-box col-span-1">Duration</span>
          </div>
        )}
        {type === "file" && (
          <div className="p-4 text-center text-xs text-muted-foreground/70">Floor plan upload</div>
        )}
        {type === "select" && <div className="p-2.5 text-xs text-muted-foreground/60">Select…</div>}
        {type === "textarea" && <div className="p-2.5 h-16" />}
        {type === "text" && <div className="p-2.5 h-9" />}
      </div>
    </div>
  );
}