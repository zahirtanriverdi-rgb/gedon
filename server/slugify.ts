import type { DBClient } from './db';

const AZ_TRANSLIT: Record<string, string> = {
  'ə': 'e', 'Ə': 'e',
  'ö': 'o', 'Ö': 'o',
  'ğ': 'g', 'Ğ': 'g',
  'ü': 'u', 'Ü': 'u',
  'ş': 's', 'Ş': 's',
  'ç': 'c', 'Ç': 'c',
  'ı': 'i', 'I': 'i', 'İ': 'i',
};

export function slugifyBase(name: string): string {
  let s = name || '';
  for (const [from, to] of Object.entries(AZ_TRANSLIT)) {
    s = s.split(from).join(to);
  }
  s = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'tur';
}

// Generates a slug from `name` and appends -2, -3, ... until it's unique among `tours` rows.
// `excludeId` lets a row check uniqueness against every OTHER row (used by the backfill
// migration, where the row already has the id we're generating a slug for).
export async function generateUniqueSlug(name: string, dbClient: DBClient, excludeId?: string): Promise<string> {
  const base = slugifyBase(name);
  let candidate = base;
  let suffix = 2;
  while (true) {
    const rows = excludeId
      ? await dbClient.query('SELECT id FROM tours WHERE slug = ? AND id != ?', [candidate, excludeId])
      : await dbClient.query('SELECT id FROM tours WHERE slug = ?', [candidate]);
    if (rows.length === 0) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}
