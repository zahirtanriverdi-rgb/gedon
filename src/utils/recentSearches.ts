// Real, persisted search history (shared by the header's sticky search bar and the
// marketplace home search box), replacing what used to be a hardcoded ['Quba', 'Qəbələ'] list.
const STORAGE_KEY = 'turlar_recent_searches';
const MAX_RECENT = 5;

export function getRecentSearches(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(term: string): string[] {
  const trimmed = term.trim();
  const existing = getRecentSearches();
  if (!trimmed) return existing;

  const deduped = existing.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...deduped].slice(0, MAX_RECENT);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return updated;
}
