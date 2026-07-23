// Overpass API (OpenStreetMap) proxy used by /api/osm/pois. The public Overpass instances
// are shared community infrastructure with strict fair-use limits, so every response is
// cached server-side and requests fall back across mirrors instead of hammering one host.

export type OsmPoi = {
  id: number;
  kind: string;
  name: string;
  lat: number;
  lon: number;
  ele?: number;
};

// OSM tag → our normalized `kind` (drives the icon + translated label client-side).
const TAG_KINDS: Array<{ key: string; value: string; kind: string }> = [
  { key: "natural", value: "peak", kind: "peak" },
  { key: "natural", value: "spring", kind: "spring" },
  { key: "natural", value: "cave_entrance", kind: "cave" },
  { key: "waterway", value: "waterfall", kind: "waterfall" },
  { key: "amenity", value: "shelter", kind: "shelter" },
  { key: "amenity", value: "drinking_water", kind: "drinking_water" },
  { key: "tourism", value: "camp_site", kind: "camp_site" },
  { key: "tourism", value: "alpine_hut", kind: "alpine_hut" },
  { key: "tourism", value: "wilderness_hut", kind: "alpine_hut" },
  { key: "tourism", value: "viewpoint", kind: "viewpoint" },
];

// Kinds that are useful even without a name (a spring is a spring); everything else unnamed
// is dropped as map noise.
const KEEP_UNNAMED_KINDS = new Set(["peak", "spring", "waterfall", "drinking_water", "camp_site"]);

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const MIRROR_TIMEOUT_MS = 10_000;

export type Bbox = { minLat: number; minLon: number; maxLat: number; maxLon: number };

// bbox=minLat,minLon,maxLat,maxLon — returns null when malformed or suspiciously large
// (a huge bbox would make Overpass do continent-scale work on our behalf).
export function parseBboxParam(raw: any): Bbox | null {
  if (typeof raw !== "string") return null;
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLat, minLon, maxLat, maxLon] = parts;
  if (minLat >= maxLat || minLon >= maxLon) return null;
  if (maxLat - minLat > 1.0 || maxLon - minLon > 1.0) return null;
  if (minLat < -90 || maxLat > 90 || minLon < -180 || maxLon > 180) return null;
  return { minLat, minLon, maxLat, maxLon };
}

function buildQuery(bbox: Bbox): string {
  // Overpass bbox order is (south,west,north,east).
  const bboxStr = `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`;
  const nodeClauses = TAG_KINDS
    // wilderness_hut maps to the same kind as alpine_hut but still needs its own clause.
    .map(({ key, value }) => `node["${key}"="${value}"](${bboxStr});`)
    .join("\n    ");
  return `[out:json][timeout:25];
(
    ${nodeClauses}
);
out body 300;`;
}

function normalizeElements(elements: any[]): OsmPoi[] {
  const pois: OsmPoi[] = [];
  for (const el of elements || []) {
    if (el.type !== "node" || !Number.isFinite(el.lat) || !Number.isFinite(el.lon)) continue;
    const tags = el.tags || {};
    const match = TAG_KINDS.find(({ key, value }) => tags[key] === value);
    if (!match) continue;
    const name = tags["name:az"] || tags.name || "";
    if (!name && !KEEP_UNNAMED_KINDS.has(match.kind)) continue;
    const ele = Number(tags.ele);
    pois.push({
      id: el.id,
      kind: match.kind,
      name,
      lat: el.lat,
      lon: el.lon,
      ...(Number.isFinite(ele) ? { ele } : {}),
    });
  }
  return pois;
}

// --- Cache ------------------------------------------------------------------------------------
// POI data changes on OSM-edit timescales, so 24h staleness is invisible to users while
// cutting Overpass traffic to ~one request per route per day. Entries also serve as a
// fallback: when every mirror fails, an expired entry is better than an empty map.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;

type CacheEntry = { pois: OsmPoi[]; fetchedAt: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(bbox: Bbox): string {
  const r = (n: number) => n.toFixed(3);
  return `${r(bbox.minLat)},${r(bbox.minLon)},${r(bbox.maxLat)},${r(bbox.maxLon)}`;
}

async function fetchFromMirror(url: string, query: string): Promise<OsmPoi[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MIRROR_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Overpass fair-use etiquette: identify the application instead of a generic runtime UA.
        "User-Agent": "Gotabiat-Marketplace/1.0 (camp-sites POI layer)",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Overpass ${url} responded ${res.status}`);
    const json = await res.json();
    return normalizeElements(json.elements);
  } finally {
    clearTimeout(timer);
  }
}

// Returns POIs for the bbox, from cache when fresh, otherwise trying each mirror in order.
// On total upstream failure a stale cache entry is served if one exists; otherwise throws.
export async function getPoisForBbox(bbox: Bbox): Promise<OsmPoi[]> {
  const key = cacheKey(bbox);
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.pois;
  }

  const query = buildQuery(bbox);
  let lastError: unknown;
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const pois = await fetchFromMirror(mirror, query);
      // Insertion-order eviction: delete-then-set keeps the freshest entries at the tail.
      cache.delete(key);
      if (cache.size >= CACHE_MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(key, { pois, fetchedAt: now });
      return pois;
    } catch (error) {
      lastError = error;
      console.warn(`[Overpass] Mirror failed (${mirror}):`, error instanceof Error ? error.message : error);
    }
  }

  if (cached) {
    console.warn("[Overpass] All mirrors failed — serving stale cache for", key);
    return cached.pois;
  }
  throw lastError instanceof Error ? lastError : new Error("All Overpass mirrors failed");
}
