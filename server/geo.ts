import { extractCoordsFromGoogleMapsUrl, asValidCoords, type LatLon } from "../shared/utils/googleMapsLink";

// Resolves a Google Maps link to coordinates for the camp-site forms. Full links are parsed
// directly (no network); only genuine Google short links (maps.app.goo.gl etc.) are fetched
// to follow their redirect — with a strict host allowlist so the endpoint can't be used as
// an open SSRF/redirect proxy.

const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "g.co",
  "google.com",
  "www.google.com",
  "maps.google.com",
  "maps.google.az",
  "google.az",
  "www.google.az",
  "consent.google.com",
]);

function isAllowedHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_HOSTS.has(host) || host.endsWith(".goo.gl");
  } catch {
    return false;
  }
}

const FETCH_TIMEOUT_MS = 8_000;

// Light global limiter: resolving a short link costs us an outbound request to Google, so
// cap how often the public endpoint can trigger one (parse-only calls never hit this).
const RESOLVE_MAX_PER_WINDOW = 30;
const RESOLVE_WINDOW_MS = 60_000;
const resolveTimestamps: number[] = [];

function consumeResolveBudget(): boolean {
  const now = Date.now();
  while (resolveTimestamps.length && now - resolveTimestamps[0] > RESOLVE_WINDOW_MS) {
    resolveTimestamps.shift();
  }
  if (resolveTimestamps.length >= RESOLVE_MAX_PER_WINDOW) return false;
  resolveTimestamps.push(now);
  return true;
}

// Flat shape (not a discriminated union) — this project's tsconfig doesn't set
// strictNullChecks, under which TS won't narrow the union via `if (!x.ok)` (same
// pattern as RateLimitResult in server/whatsapp.ts).
export type GmapsResolveResult = {
  ok: boolean;
  coords?: LatLon;
  status?: number;
  error?: string;
};

export async function resolveGoogleMapsLink(rawUrl: any): Promise<GmapsResolveResult> {
  const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!url || url.length > 2048) {
    return { ok: false, status: 400, error: "Zəhmət olmasa Google Maps linki daxil edin." };
  }

  // Full links usually carry the coordinates inline — no network needed.
  const direct = extractCoordsFromGoogleMapsUrl(url);
  if (direct) return { ok: true, coords: direct };

  if (!isAllowedHost(url)) {
    return { ok: false, status: 400, error: "Yalnız Google Maps linkləri dəstəklənir." };
  }
  if (!consumeResolveBudget()) {
    return { ok: false, status: 429, error: "Çox sayda sorğu. Zəhmət olmasa bir az sonra yenidən cəhd edin." };
  }

  // Short link: follow the redirect chain and parse the final URL. The final hop usually
  // lands on google.com/maps/... — its URL (not body) contains the coordinates.
  //
  // Two catches, found by testing real maps.app.goo.gl links against this code:
  //  1. Google 404s the request outright unless the User-Agent looks like a real browser
  //     (any non-browser UA — including a plain descriptive one — gets bot-blocked).
  //  2. Even with a browser UA, maps.app.goo.gl normally returns HTTP 200 with a
  //     JS-rendered "DurableDeepLinkUi" shell instead of an HTTP redirect — the real
  //     destination is resolved client-side, so `res.url` never carries coordinates.
  //     Appending `g_st=ic` makes Google resolve the link server-side instead (used by
  //     other Maps-link decoders), at which point the destination shows up either as a
  //     redirect or embedded in the response body as `[null,null,<lat>,<lon>]`.
  const BROWSER_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  let fetchUrl = url;
  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set("g_st", "ic");
    fetchUrl = parsedUrl.toString();
  } catch {
    // Falls through with the original url string.
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let finalUrl = "";
    let body = "";
    try {
      const res = await fetch(fetchUrl, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": BROWSER_UA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      finalUrl = res.url || "";
      body = await res.text().catch(() => "");
    } finally {
      clearTimeout(timer);
    }

    const fromUrl = extractCoordsFromGoogleMapsUrl(finalUrl);
    if (fromUrl) return { ok: true, coords: fromUrl };

    // Google embeds the resolved destination as `[null,null,<lat>,<lon>]` in the page
    // data when it answers with a 200 instead of redirecting.
    const embedded = body.match(/\[null,null,(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]/);
    if (embedded) {
      const coords = asValidCoords(embedded[1], embedded[2]);
      if (coords) return { ok: true, coords };
    }

    return { ok: false, status: 422, error: "Linkdən koordinat tapılmadı. Zəhmət olmasa xəritədən seçin." };
  } catch {
    return { ok: false, status: 502, error: "Link yoxlanıla bilmədi. Zəhmət olmasa xəritədən seçin." };
  }
}
