// Customer tour comparison ("Müqayisə"), persisted client-side only — mirrors wishlist.ts.
const STORAGE_KEY = 'gotabiat_compare';

// Dispatched whenever the compare list changes, so components that don't own the toggle
// (e.g. the header badge) can stay in sync without prop drilling or a page reload.
export const COMPARE_CHANGED_EVENT = 'compare-changed';

export const MAX_COMPARE = 3;

export function getCompareList(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isInCompareList(tourId: string): boolean {
  return getCompareList().includes(tourId);
}

function persist(list: string[]): string[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — compare list just won't persist.
  }
  window.dispatchEvent(new Event(COMPARE_CHANGED_EVENT));
  return list;
}

export type ToggleCompareResult = { list: string[]; status: 'added' | 'removed' | 'full' };

// Adds/removes the tour. When the list is already at MAX_COMPARE and the tour isn't in it yet,
// nothing is persisted (status 'full') — the caller should ask the user which tour to swap out
// and call replaceInCompareList instead.
export function toggleCompareList(tourId: string): ToggleCompareResult {
  const current = getCompareList();
  if (current.includes(tourId)) {
    return { list: persist(current.filter(id => id !== tourId)), status: 'removed' };
  }
  if (current.length >= MAX_COMPARE) {
    return { list: current, status: 'full' };
  }
  return { list: persist([...current, tourId]), status: 'added' };
}

// Swaps oldTourId out for newTourId at the same position — used when the list is already full.
export function replaceInCompareList(oldTourId: string, newTourId: string): string[] {
  const current = getCompareList();
  const updated = current.map(id => (id === oldTourId ? newTourId : id));
  return persist(updated);
}
