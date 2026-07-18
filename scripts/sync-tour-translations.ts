// Overwrites tours.extra_data.translations in the live DB with the hand-written EN/RU
// translations from src/data/tourTranslations.ts, replacing the unreliable LibreTranslate
// output that migrate-tours.ts originally populated.
import dbClient from '../server/db';
import { seedTours } from '../shared/data/toursData';

async function main() {
  let updated = 0;
  for (const tour of seedTours) {
    if (!tour.translations) continue;
    const rows = await dbClient.query('SELECT extra_data FROM tours WHERE id = ?', [tour.id]);
    if (!rows.length) {
      console.warn(`[sync] skip ${tour.id}: not found in DB`);
      continue;
    }
    let extra: Record<string, any> = {};
    try { extra = rows[0].extra_data ? JSON.parse(rows[0].extra_data) : {}; } catch { extra = {}; }
    extra.translations = tour.translations;
    await dbClient.execute('UPDATE tours SET extra_data = ? WHERE id = ?', [JSON.stringify(extra), tour.id]);
    updated++;
  }
  console.log(`[sync] Updated translations for ${updated} tours.`);
}

main().catch((err) => {
  console.error('[sync] FAILED:', err);
  process.exit(1);
});
