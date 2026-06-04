/** Default map center (Toronto) when user has no saved location */
export const DEFAULT_MAP_CENTER = { lat: 43.6532, lng: -79.3832, label: "Toronto, Ontario, Canada" } as const;

export const MIN_MAP_RADIUS_KM = 1;
export const MAX_MAP_RADIUS_KM = 10;
export const DEFAULT_MAP_RADIUS_KM = 3;
export const MAP_RADIUS_STEP_KM = 1;
/** Initial zoom before first fitBounds; MapView refits from radius */
export const DEFAULT_MAP_ZOOM = 12;