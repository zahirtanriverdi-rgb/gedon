// Customer wishlist ("İstəklərim"), persisted client-side only — no login is required to
// save favorites, so it lives in localStorage rather than the backend.
const STORAGE_KEY = 'gedek_gorek_wishlist';

// Dispatched whenever the wishlist changes, so components that don't own the toggle
// (e.g. the header badge) can stay in sync without prop drilling or a page reload.
export const WISHLIST_CHANGED_EVENT = 'wishlist-changed';

export function getWishlist(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isInWishlist(tourId: string): boolean {
  return getWishlist().includes(tourId);
}

// Adds/removes the tour and returns the updated list.
export function toggleWishlist(tourId: string): string[] {
  const current = getWishlist();
  const updated = current.includes(tourId)
    ? current.filter(id => id !== tourId)
    : [...current, tourId];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  window.dispatchEvent(new Event(WISHLIST_CHANGED_EVENT));
  return updated;
}
