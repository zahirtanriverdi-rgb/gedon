/**
 * Central API access for the Next app.
 */
const SERVER_API_BASE =
  process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

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
  token?: string;
}

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
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('Sessiyanızın vaxtı bitib. Yenidən daxil olun.');
  }
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

// YENİ ƏLAVƏ OLUNAN: Real vendor məlumatlarını çəkmək üçün funksiya
export async function getVendorById(vendorId: string): Promise<User | null> {
  const data = await serverFetchOptional<{ user: User }>(`/api/vendors/${encodeURIComponent(vendorId)}`);
  return data?.user ?? null;
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
export type { Tour, TourSlot, Review, User };