/** Shared venue enums — align onboarding, dashboard, and future event forms */

export const VENUE_GENRES = [
  "Jazz",
  "Pop",
  "Folk",
  "Rock",
  "Hip-Hop",
  "Electronic",
  "Classical",
  "R&B",
  "Country",
  "Metal",
] as const;

export const VENUE_ENVIRONMENT_TAGS = [
  "Formal",
  "Informal",
  "Bar",
  "Lounge",
  "Outdoor",
  "Intimate",
  "High-energy",
  "Chill",
  "All-ages",
  "18+",
  "Restaurant",
  "Club",
  "Concert Hall",
  "Pub",
  "Coffee Shop",
  "Art Gallery",
  "Rooftop",
  "Theatre",
  "Brewery",
  "Event Space",
] as const;

export const VENUE_SIZES = [
  { id: "xs", label: "Tiny", sublabel: "< 50 guests" },
  { id: "sm", label: "Small", sublabel: "50–200 guests" },
  { id: "md", label: "Medium", sublabel: "200–500 guests" },
  { id: "lg", label: "Large", sublabel: "500+ guests" },
] as const;

export const COMPETITION_LEVELS = [
  { level: 1, label: "Open", description: "Welcoming newer acts and open submissions" },
  { level: 2, label: "Casual", description: "Some curation, flexible booking" },
  { level: 3, label: "Moderate", description: "Balanced standards and availability" },
  { level: 4, label: "Selective", description: "Established acts preferred" },
  { level: 5, label: "Competitive", description: "High demand, limited slots" },
] as const;

export const DESCRIPTION_MAX_WORDS = 200;