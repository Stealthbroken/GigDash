import { useEffect, useId, useRef, useState } from "react";
import type { GeoPlace } from "@workspace/api-client-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export type { GeoPlace };

type LocationSearchProps = {
  value: string;
  onChange: (value: string) => void;
  selectedPlace: GeoPlace | null;
  onPlaceSelect: (place: GeoPlace) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  inputClassName?: string;
  accent?: "emerald" | "violet";
  "aria-label"?: string;
};

export default function LocationSearch({
  value,
  onChange,
  selectedPlace,
  onPlaceSelect,
  onClear,
  placeholder = "City, town, or postal code…",
  disabled = false,
  inputClassName = "",
  accent = "emerald",
  "aria-label": ariaLabel = "Search location",
}: LocationSearchProps) {
  const pinClass = accent === "violet" ? "text-violet-400/90" : "text-emerald-500/80";
  const ringClass =
    accent === "violet" ? "focus:ring-violet-500/40" : "focus:ring-emerald-500/40";
  const checkClass = accent === "violet" ? "text-violet-400/90" : "text-emerald-400/90";
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<GeoPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(value.trim(), 350);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      setLookupError(null);
      return;
    }

    if (selectedPlace && debouncedQuery === selectedPlace.label) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLookupError(null);

    fetch(`/api/geo/search?q=${encodeURIComponent(debouncedQuery)}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Could not search locations.");
        }
        return res.json() as Promise<{ places: GeoPlace[] }>;
      })
      .then((data) => {
        if (!cancelled) {
          setSuggestions(data.places ?? []);
          setOpen(true);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSuggestions([]);
          setLookupError(err instanceof Error ? err.message : "Could not search locations.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, selectedPlace]);

  function pick(place: GeoPlace) {
    onPlaceSelect(place);
    onChange(place.label);
    setOpen(false);
    setSuggestions([]);
  }

  function handleClear() {
    onChange("");
    onClear?.();
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${pinClass}`}
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        <input
          type="search"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
          className={`w-full pl-8 pr-8 py-2 rounded-xl border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 ${ringClass} ${inputClassName}`.trim()}
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs px-1"
            aria-label="Clear location"
          >
            ✕
          </button>
        )}
      </div>

      {selectedPlace && value === selectedPlace.label && (
        <p className={`mt-1 text-[10px] truncate ${checkClass}`} title={selectedPlace.label}>
          ✓ {selectedPlace.label}
        </p>
      )}

      {loading && debouncedQuery.length >= 2 && !selectedPlace && (
        <p className="mt-1 text-[10px] text-muted-foreground">Looking up places…</p>
      )}

      {lookupError && <p className="mt-1 text-[10px] text-red-400/90">{lookupError}</p>}

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[1100] left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-card shadow-lg py-1"
        >
          {suggestions.map((place) => (
            <li key={`${place.lat}-${place.lng}-${place.label}`} role="option">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(place)}
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && debouncedQuery.length >= 2 && suggestions.length === 0 && !lookupError && (
        <p className="absolute z-[1100] left-0 right-0 mt-1 text-[10px] text-muted-foreground px-3 py-2 rounded-xl border border-border bg-card shadow-lg">
          No places found — try a city name or postal code.
        </p>
      )}
    </div>
  );
}