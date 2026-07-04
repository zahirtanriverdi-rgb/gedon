import { Tour, TourSlot } from '../types';

/**
 * Decides which tours should carry the "Ayın Ən Çox Satılanı" badge this month.
 *
 * Rule, per vendor (not platform-wide — each vendor's tours compete only against their own):
 *   1. If the vendor has manually marked one of their tours as featured (isManuallyFeatured),
 *      that tour wins, full stop — no automatic calculation happens for that vendor.
 *   2. Otherwise, the tour with the most booked seats this calendar month (summed across its
 *      slots' bookedCount, for slots starting in the current month) wins automatically. A
 *      vendor with zero bookings this month gets no badge at all — there's nothing to feature.
 *
 * Returns a Set of tour IDs that should display the badge.
 */
export function computeFeaturedTourIds(tours: Tour[], slots: TourSlot[]): Set<string> {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const monthlyBookingsByTour = new Map<string, number>();
  for (const slot of slots) {
    const start = new Date(slot.startDate);
    if (start.getMonth() !== month || start.getFullYear() !== year) continue;
    monthlyBookingsByTour.set(slot.tourId, (monthlyBookingsByTour.get(slot.tourId) || 0) + (slot.bookedCount || 0));
  }

  const toursByVendor = new Map<string, Tour[]>();
  for (const tour of tours) {
    const bucket = toursByVendor.get(tour.vendorId);
    if (bucket) bucket.push(tour);
    else toursByVendor.set(tour.vendorId, [tour]);
  }

  const featured = new Set<string>();
  for (const vendorTours of toursByVendor.values()) {
    const manualPick = vendorTours.find(t => t.isManuallyFeatured);
    if (manualPick) {
      featured.add(manualPick.id);
      continue;
    }

    let bestTourId: string | null = null;
    let bestCount = 0;
    for (const tour of vendorTours) {
      const count = monthlyBookingsByTour.get(tour.id) || 0;
      if (count > bestCount) {
        bestCount = count;
        bestTourId = tour.id;
      }
    }
    if (bestTourId) featured.add(bestTourId);
  }

  return featured;
}
