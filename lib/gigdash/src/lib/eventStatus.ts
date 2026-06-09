import type { EventSummary } from "@workspace/api-client-react";

export type EventMarkerStatus = "planning" | "finalized";

export function isEventFinalized(event: { status?: string | null }): boolean {
  return event.status === "finalized";
}

export function eventMarkerStatus(event: { status?: string | null }): EventMarkerStatus {
  return isEventFinalized(event) ? "finalized" : "planning";
}

export function canMessageOrganizer(event: EventSummary): boolean {
  return !isEventFinalized(event);
}

/**
 * The calendar day (YYYY-MM-DD) of a Date in the local timezone. Use this when comparing
 * an event timestamp against an artist's blocked-day list, so a "June 15 8pm" event matches
 * a "June 15" block regardless of how the timestamp rounds to UTC.
 */
export function localCalendarDay(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}