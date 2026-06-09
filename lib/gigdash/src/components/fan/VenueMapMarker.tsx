import { useMemo, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import type { EventSummary } from "@workspace/api-client-react";
import VenueEventPopup from "./VenueEventPopup";
import ArtistEventPopup from "@/components/artist/ArtistEventPopup";
import {
  createMultiEventMarkerIcon,
  createSingleEventMarkerIcon,
  type MarkerStatus,
} from "./mapMarkers";
import { eventMarkerStatus } from "@/lib/eventStatus";

function eventStatus(event: EventSummary): MarkerStatus {
  return eventMarkerStatus(event);
}

interface VenueMapMarkerProps {
  group: EventSummary[];
  selectedEventId?: number | null;
  onSelectEvent: (event: EventSummary) => void;
  artistMode?: boolean;
  onMessageOrganizer?: (event: EventSummary) => void;
  onViewEvent?: (event: EventSummary) => void;
}

export default function VenueMapMarker({
  group,
  selectedEventId,
  onSelectEvent,
  artistMode = false,
  onMessageOrganizer,
  onViewEvent,
}: VenueMapMarkerProps) {
  const isMulti = group.length > 1;
  const [popupOpen, setPopupOpen] = useState(false);

  const icon = useMemo(() => {
    if (isMulti) {
      return createMultiEventMarkerIcon(group.length, popupOpen);
    }
    return createSingleEventMarkerIcon(eventStatus(group[0]), artistMode);
  }, [isMulti, group, popupOpen, artistMode]);

  const sortedGroup = useMemo(
    () =>
      [...group].sort(
        (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
      ),
    [group],
  );

  const eventHandlers = useMemo(
    () => ({
      click: (e: LeafletMouseEvent) => {
        e.target.openPopup();
        if (!isMulti) {
          onSelectEvent(group[0]);
        }
      },
      popupopen: () => setPopupOpen(true),
      popupclose: () => setPopupOpen(false),
    }),
    [group, isMulti, onSelectEvent],
  );

  return (
    <Marker
      position={[group[0].venue!.lat!, group[0].venue!.lng!]}
      icon={icon}
      interactive
      zIndexOffset={popupOpen ? 1000 : 0}
      eventHandlers={eventHandlers}
    >
      <Popup className="fan-map-popup" minWidth={280} maxWidth={340} autoPan>
        {artistMode && !isMulti ? (
          <ArtistEventPopup event={group[0]} onMessageOrganizer={onMessageOrganizer} onViewEvent={onViewEvent} />
        ) : (
          <VenueEventPopup
            venueName={group[0].venue?.name ?? "Venue"}
            events={sortedGroup}
            selectedEventId={selectedEventId}
            onSelectEvent={onSelectEvent}
            onViewEvent={onViewEvent}
          />
        )}
      </Popup>
    </Marker>
  );
}