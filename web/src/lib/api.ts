/**
 * Central API access for the Next app.
 *
 * Two callers, two paths:
 *  - Server Components (SSR) call `serverFetch` — it hits the Express API DIRECTLY via
 *    API_BASE_URL and never goes through the browser. `cache: 'no-store'` keeps tour prices /
 *    availability fresh on every request (the approved dynamic-SSR strategy).
 *  - Client Components keep using RELATIVE `/api/*` urls (via `clientFetch` or plain fetch),
 *    which Next's rewrite (next.config.ts) proxies to the same Express origin. This is exactly
 *    how the old Vite SPA talked to the backend, so ported components need no per-call changes.
 */

const SERVER_API_BASE =
  process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

/**
 * The API always responds with JSON, but a request that slips past Express (413, proxy 500,
 * etc.) comes back as an HTML error page — response.json() would then throw a cryptic
 * "Unexpected token '<'". Parsing text first lets us surface a message that points at the
 * real problem. (Ported from the inline parseApiResponse in the old App.tsx.)
 */
async function parseApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new Error(
      `Server düzgün cavab qaytarmadı (HTTP ${response.status}). Backend loglarını yoxlayın.`,
    );
  }
}

export interface ServerFetchOptions extends RequestInit {
  /** Bearer token to forward (rarely needed for public SSR pages). */
  token?: string;
}

/** Server-side fetch against the Express API. Returns parsed JSON of type T. */
export async function serverFetch<T>(path: string, opts: ServerFetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = opts;
  const url = path.startsWith('http') ? path : `${SERVER_API_BASE}${path}`;
  const response = await fetch(url, {
    cache: 'no-store',
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`API ${path} failed with HTTP ${response.status}`);
  }
  return parseApiResponse<T>(response);
}

/**
 * Server-side fetch that tolerates a not-found / error by returning `null` instead of throwing.
 * Handy for optional SSR data (slots, reviews) that shouldn't 500 the whole page if the API
 * hiccups.
 */
export async function serverFetchOptional<T>(
  path: string,
  opts: ServerFetchOptions = {},
): Promise<T | null> {
  try {
    return await serverFetch<T>(path, opts);
  } catch {
    return null;
  }
}

/** Client-side fetch — relative url, proxied by the Next rewrite to the Express origin. */
export async function clientFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const response = await fetch(path, opts);
  return parseApiResponse<T>(response);
}

// ─── Typed convenience loaders used by the SSR pages ────────────────────────────
import type { Tour, TourSlot, Review, User } from '@/types';

export async function getTours(): Promise<Tour[]> {
  const data = await serverFetchOptional<{ tours: Tour[] }>('/api/tours');
  return data?.tours ?? [];
}

export async function getTourBySlug(slug: string): Promise<Tour | null> {
  const data = await serverFetchOptional<{ tour: Tour }>(
    `/api/tours/${encodeURIComponent(slug)}`,
  );
  return data?.tour ?? null;
}

export async function getSlots(): Promise<TourSlot[]> {
  const data = await serverFetchOptional<{ slots: TourSlot[] }>('/api/slots');
  return data?.slots ?? [];
}

export async function getReviews(): Promise<Review[]> {
  const data = await serverFetchOptional<{ reviews: Review[] }>('/api/reviews');
  return data?.reviews ?? [];
}

export async function getSlotsForTour(tourId: string): Promise<TourSlot[]> {
  const data = await serverFetchOptional<{ slots: TourSlot[] }>(
    `/api/tours/${encodeURIComponent(tourId)}/slots`,
  );
  return data?.slots ?? [];
}

/**
 * Admin-controlled customer-facing feature flags, resolved SERVER-side so the header/bottom-nav
 * render with the correct state in the initial HTML. Fetching these on the client instead makes
 * the calculator/camp icons flash in then out on every load (the client hook defaults to
 * "visible" and only hides once its fetch resolves). Mirrors the success-path logic of
 * useSiteFeatureFlags so SSR and hydration agree.
 */
export async function getSiteFeatureFlags(): Promise<{
  campSitesEnabled: boolean;
  groupCalculatorEnabled: boolean;
}> {
  const [camp, calc] = await Promise.all([
    serverFetchOptional<{ enabled?: boolean }>('/api/camp-sites/config'),
    serverFetchOptional<{ enabled?: boolean }>('/api/group-calculator/config'),
  ]);
  return {
    campSitesEnabled: !!camp && camp.enabled !== false,
    groupCalculatorEnabled: !!calc && calc.enabled !== false,
  };
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

export type { Tour, TourSlot, Review, User };
