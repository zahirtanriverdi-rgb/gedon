// Extracts a lat/lon pair from the many Google Maps URL shapes people paste:
//   https://www.google.com/maps/place/…/@40.40,46.33,17z/data=…!3d40.4093!4d46.3312…
//   https://www.google.com/maps?q=40.4093,46.3312   (also ll= / query= / destination=)
//   https://www.google.com/maps/@40.4093,46.3312,15z
//   https://www.google.com/maps/search/40.4093,+46.3312
// Short links (maps.app.goo.gl/…) carry no coordinates — those must first be resolved
// server-side via GET /api/geo/gmaps, which follows the redirect and re-runs this parser.

export type LatLon = { lat: number; lon: number };

export function asValidCoords(rawLat: string, rawLon: string): LatLon | null {
  const lat = Number(rawLat);
  const lon = Number(rawLon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

export function extractCoordsFromGoogleMapsUrl(url: string): LatLon | null {
  if (typeof url !== 'string' || !url.trim()) return null;
  const trimmed = url.trim();

  // 1. The place pin itself (!3d<lat>!4d<lon>) — more precise than the @map-center.
  let m = trimmed.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (m) {
    const coords = asValidCoords(m[1], m[2]);
    if (coords) return coords;
  }

  // 2. Coordinate-bearing query params (q=, ll=, query=, destination=, center=).
  try {
    const parsed = new URL(trimmed);
    for (const key of ['q', 'query', 'll', 'destination', 'center']) {
      const value = parsed.searchParams.get(key);
      if (!value) continue;
      const mm = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
      if (mm) {
        const coords = asValidCoords(mm[1], mm[2]);
        if (coords) return coords;
      }
    }
    // Google consent pages wrap the real URL in a `continue` param.
    const cont = parsed.searchParams.get('continue');
    if (cont) {
      const nested = extractCoordsFromGoogleMapsUrl(decodeURIComponent(cont));
      if (nested) return nested;
    }
  } catch {
    // Not a parseable URL — the plain-text fallbacks below still apply.
  }

  // 3. Map center: @lat,lon
  m = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (m) {
    const coords = asValidCoords(m[1], m[2]);
    if (coords) return coords;
  }

  // 4. Loose "lat, lon" pair anywhere (e.g. /maps/search/40.40,+46.33 or pasted plain coords).
  //    Requires ≥3 decimals so random path numbers don't false-match.
  m = trimmed.match(/(-?\d{1,2}\.\d{3,})\s*,\s*\+?(-?\d{1,3}\.\d{3,})/);
  if (m) {
    const coords = asValidCoords(m[1], m[2]);
    if (coords) return coords;
  }

  return null;
}

// Short-link hosts that must be resolved server-side before parsing.
const SHORT_LINK_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl', 'g.co']);

export function isShortGoogleMapsLink(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return SHORT_LINK_HOSTS.has(host) || host.endsWith('.goo.gl');
  } catch {
    return false;
  }
}
