// One-off migration: replace all peak/camp/hiking tours (and the stray manual test tour)
// with the real dataset sourced from the docx, while leaving international/active tours,
// their bookings, and reviews untouched. Also backfills en/ru translations via Gemini
// so the new tours are immediately readable in all three languages instead of waiting on the
// fire-and-forget background job.
import dbClient from '../server/db';
import { seedTours, seedTourSlots } from '../src/data/toursData';
import { translateTourContent } from '../server/translate';
import type { Tour } from '../src/types';

async function main() {
  const categoriesToReplace = ['peak', 'camp', 'hiking'];

  const existing = await dbClient.query('SELECT id, category FROM tours');
  const idsToDelete = existing
    .filter((row: any) => categoriesToReplace.includes(row.category) || row.id === 'tour-11263')
    .map((row: any) => row.id);

  console.log(`[migrate] Deleting ${idsToDelete.length} old tours (and their slots/bookings/reviews via cascade)...`);
  for (const id of idsToDelete) {
    await dbClient.execute('DELETE FROM tours WHERE id = ?', [id]);
  }

  const newTours = (seedTours as Tour[]).filter(t => categoriesToReplace.includes(t.category));
  console.log(`[migrate] Inserting ${newTours.length} new tours...`);
  for (const tour of newTours) {
    const {
      id, vendorId, vendorName, name, category, difficulty, region, durationDays,
      description, image, isActive, isApproved, priceCurrency, rating, reviewsCount,
      ...extra
    } = tour;
    const status = isApproved ? 'approved' : 'pending_approval';
    await dbClient.execute(
      `INSERT INTO tours (id, vendor_id, vendor_name, name, category, difficulty, region, duration_days, description, image, is_active, is_approved, status, price_currency, rating, reviews_count, extra_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, vendorId, vendorName || null, name, category, difficulty, region, Number(durationDays),
        description || null, image || null,
        isActive === false ? 0 : 1, isApproved ? 1 : 0, status, priceCurrency || 'AZN',
        Number(rating) || 0, Number(reviewsCount) || 0, JSON.stringify(extra)
      ]
    );
  }

  const newTourIds = new Set(newTours.map(t => t.id));
  const newSlots = seedTourSlots.filter(s => newTourIds.has(s.tourId));
  console.log(`[migrate] Inserting ${newSlots.length} new tour slots...`);
  for (const slot of newSlots) {
    await dbClient.execute(
      `INSERT INTO tour_slots (id, tour_id, start_date, end_date, price, capacity, booked_count) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [slot.id, slot.tourId, slot.startDate, slot.endDate || null, Number(slot.price), Number(slot.capacity), Number(slot.bookedCount) || 0]
    );
  }

  console.log('[migrate] Backfilling en/ru translations via Gemini (this can take a while)...');
  let translated = 0;
  for (const tour of newTours) {
    const translations = await translateTourContent(tour.name, tour.description || null);
    if (Object.keys(translations).length) {
      const rows = await dbClient.query('SELECT extra_data FROM tours WHERE id = ?', [tour.id]);
      if (rows.length) {
        let extra: Record<string, any> = {};
        try { extra = rows[0].extra_data ? JSON.parse(rows[0].extra_data) : {}; } catch { extra = {}; }
        extra.translations = translations;
        await dbClient.execute('UPDATE tours SET extra_data = ? WHERE id = ?', [JSON.stringify(extra), tour.id]);
        translated++;
        console.log(`[migrate] translated (${translated}/${newTours.length}): ${tour.id}`);
      }
    } else {
      console.warn(`[migrate] WARNING: no translation produced for ${tour.id} (Gemini offline or failed)`);
    }
    // Throttle between tours: bulk-looping many sequential Gemini calls without a gap
    // can trip per-minute rate limits even with the per-call retry in translateTourContent.
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  console.log('[migrate] Done.');
}

main().catch((err) => {
  console.error('[migrate] FAILED:', err);
  process.exit(1);
});
