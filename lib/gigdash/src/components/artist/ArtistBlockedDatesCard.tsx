import { useMemo } from "react";
import { format } from "date-fns";
import {
  useListBlockedDates,
  useAddBlockedDate,
  useRemoveBlockedDate,
  getListBlockedDatesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const [y, m, d] = value.slice(0, 10).split("-").map((p) => parseInt(p, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export default function ArtistBlockedDatesCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useListBlockedDates({
    query: { queryKey: getListBlockedDatesQueryKey() },
  });

  const blockedIsoDates = useMemo(
    () => (data?.dates ?? []).map((d) => (typeof d === "string" ? d.slice(0, 10) : toIsoDate(new Date(d)))),
    [data],
  );
  const blockedDateSet = useMemo(() => new Set(blockedIsoDates), [blockedIsoDates]);
  const selectedDates = useMemo(() => blockedIsoDates.map(parseIsoDate), [blockedIsoDates]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListBlockedDatesQueryKey() });

  const addMutation = useAddBlockedDate({
    mutation: {
      onSuccess: invalidate,
      onError: () => toast({ title: "Could not block date", variant: "destructive" }),
    },
  });
  const removeMutation = useRemoveBlockedDate({
    mutation: {
      onSuccess: invalidate,
      onError: () => toast({ title: "Could not unblock date", variant: "destructive" }),
    },
  });

  function handleSelect(next: Date[] | undefined) {
    const nextSet = new Set((next ?? []).map(toIsoDate));

    for (const iso of nextSet) {
      if (!blockedDateSet.has(iso)) {
        addMutation.mutate({ data: { date: iso } });
      }
    }
    for (const iso of blockedDateSet) {
      if (!nextSet.has(iso)) {
        removeMutation.mutate({ date: iso });
      }
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = useMemo(
    () =>
      blockedIsoDates
        .map(parseIsoDate)
        .filter((d) => d >= today)
        .sort((a, b) => a.getTime() - b.getTime()),
    [blockedIsoDates, today],
  );

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
      <header className="mb-4">
        <h2 className="font-semibold text-base">Blocked dates</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Days you're unavailable. Venues searching for artists for those dates won't see you in results.
        </p>
      </header>

      <div className="grid lg:grid-cols-[auto,1fr] gap-6">
        <div className="flex justify-center lg:justify-start">
          <Calendar
            mode="multiple"
            selected={selectedDates}
            onSelect={handleSelect}
            disabled={{ before: today }}
            className="rounded-lg border border-border/60"
          />
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Upcoming blocked
          </h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming blocked dates. Click a day on the calendar to mark it unavailable.
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-80 overflow-auto pr-1">
              {upcoming.map((d) => {
                const iso = toIsoDate(d);
                return (
                  <li
                    key={iso}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border/60 bg-background/60 text-sm"
                  >
                    <span>{format(d, "EEE, MMM d, yyyy")}</span>
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate({ date: iso })}
                      disabled={removeMutation.isPending}
                      className="text-xs text-muted-foreground hover:text-red-400"
                      aria-label={`Unblock ${iso}`}
                    >
                      Unblock
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
