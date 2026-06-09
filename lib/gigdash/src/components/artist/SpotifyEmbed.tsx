type SpotifyResourceType = "artist" | "track" | "album" | "playlist" | "episode" | "show";

const SPOTIFY_ID_RE =
  /(?:open\.spotify\.com\/(?:embed\/)?|spotify:)(artist|track|album|playlist|episode|show)[/:]([a-zA-Z0-9]+)/;

export interface ParsedSpotifyUrl {
  type: SpotifyResourceType;
  id: string;
}

export function parseSpotifyUrl(url: string | null | undefined): ParsedSpotifyUrl | null {
  if (!url) return null;
  const match = url.match(SPOTIFY_ID_RE);
  if (!match) return null;
  return { type: match[1] as SpotifyResourceType, id: match[2] };
}

interface SpotifyEmbedProps {
  url: string;
  className?: string;
}

export default function SpotifyEmbed({ url, className }: SpotifyEmbedProps) {
  const parsed = parseSpotifyUrl(url);
  if (!parsed) return null;

  // Tracks/episodes use the compact player; artists/albums/playlists/shows use the full one.
  const isCompact = parsed.type === "track" || parsed.type === "episode";
  const height = isCompact ? 152 : 352;

  return (
    <iframe
      title="Spotify player"
      src={`https://open.spotify.com/embed/${parsed.type}/${parsed.id}?utm_source=generator`}
      width="100%"
      height={height}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      className={className}
      style={{ border: 0, borderRadius: 12 }}
    />
  );
}
