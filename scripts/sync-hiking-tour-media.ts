// One-off sync: push real GPX tracks + real location photos (added to seedTours in
// src/data/toursData.ts) into the already-seeded database rows for these tours, without
// touching bookings/slots/reviews and without clobbering existing extra_data (translations).
import dbClient from '../server/db';
import { seedTours } from '../src/data/toursData';
import { translateTourContent } from '../server/translate';
import type { Tour } from '../src/types';

const TOUR_IDS = [
  'tour-mucu-lahic',
  'tour-mestdergah',
  'tour-qalaciq-yurusu',
  'tour-qalaxudat-qriz',
  'tour-heydar-ataturk',
  'tour-kepez',
  'tour-qaranohur',
  'tour-kuzun-laza',
  'tour-eh-yolu-qriz',
  'tour-qebele-soyuqbulaq',
  'tour-qax-qocyataq-hiking',
  'tour-qax-qocyataq-camp',
  'tour-seki-xan-yaylagi',
  'tour-beybeyim-dagi',
];

// Tours whose AZ description text actually changed (distance/difficulty corrections) and
// therefore need fresh EN/RU translations; the rest only gained images/gpxData so their
// existing translated description text is still accurate.
const NEEDS_RETRANSLATION = new Set(['tour-mucu-lahic', 'tour-qalaciq-yurusu', 'tour-kuzun-laza']);

async function main() {
  for (const id of TOUR_IDS) {
    const tour = (seedTours as Tour[]).find(t => t.id === id);
    if (!tour) throw new Error(`${id} not found in seedTours`);

    const rows = await dbClient.query('SELECT extra_data FROM tours WHERE id = ?', [id]);
    if (!rows.length) {
      console.warn(`[sync] SKIP ${id}: not present in DB (never seeded)`);
      continue;
    }

    let extra: Record<string, any> = {};
    try { extra = rows[0].extra_data ? JSON.parse(rows[0].extra_data) : {}; } catch { extra = {}; }

    const {
      id: _id, vendorId, vendorName, name, category, difficulty, region, durationDays,
      description, image, isActive, isApproved, priceCurrency, rating, reviewsCount,
      ...newExtra
    } = tour;

    // Preserve translations and anything else already stored server-side; only overwrite the
    // fields that legitimately come from the seed source (images, gpxData, gpxFileName, etc).
    const mergedExtra = { ...extra, ...newExtra };
    if (extra.translations) mergedExtra.translations = extra.translations;

    await dbClient.execute(
      `UPDATE tours SET name = ?, difficulty = ?, region = ?, duration_days = ?, description = ?, image = ?, extra_data = ? WHERE id = ?`,
      [name, difficulty, region, Number(durationDays), description || null, image || null, JSON.stringify(mergedExtra), id]
    );
    console.log(`[sync] updated ${id}`);
  }

  console.log('[sync] Re-translating tours whose description text changed...');
  for (const id of NEEDS_RETRANSLATION) {
    const tour = (seedTours as Tour[]).find(t => t.id === id)!;
    const translations = await translateTourContent({
      name: tour.name,
      description: tour.description || null,
      includes: tour.includes,
      notIncluded: tour.notIncluded,
      highlights: tour.highlights,
    });
    if (Object.keys(translations).length) {
      const rows = await dbClient.query('SELECT extra_data FROM tours WHERE id = ?', [id]);
      let extra: Record<string, any> = {};
      try { extra = rows[0].extra_data ? JSON.parse(rows[0].extra_data) : {}; } catch { extra = {}; }
      extra.translations = translations;
      await dbClient.execute('UPDATE tours SET extra_data = ? WHERE id = ?', [JSON.stringify(extra), id]);
      console.log(`[sync] translated ${id}`);
    } else {
      console.warn(`[sync] WARNING: no translation produced for ${id} (Gemini offline or failed)`);
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('[sync] Done.');
}

main().catch(err => {
  console.error('[sync] FAILED:', err);
  process.exit(1);
});
