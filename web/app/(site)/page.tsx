import type { Metadata } from 'next';
import { getTours, getSlots, getReviews } from '@/lib/api';
import { seedUsers } from '@/data/toursData';
import { HomeClient } from './HomeClient';

// Home is SSR'd on every request so the tour list (and its crawlable links) is in the initial
// HTML. The full interactive experience (search, filters, calendar, quick-book modal) is the
// HomeClient state layer on top of that same data — the complete port of the old
// CustomerPortal home view.
export const dynamic = 'force-dynamic';

// Ported from the old CustomerPortal's Helmet block (AZ default — the html lang is az).
export const metadata: Metadata = {
  title: 'GedəkGörək Marketplace | Azərbaycanda Turlar və Aktiv İstirahət',
  description:
    'Azərbaycanın ən yaxşı hiking, kamp, zirvə və xarici turlarını kəşf edin — GedəkGörək ilə asanlıqla rezerv edin.',
};

export default async function HomePage() {
  const [tours, slots, reviews] = await Promise.all([getTours(), getSlots(), getReviews()]);

  // Same public users source the tour-detail page uses (organizer cards in the quick-book
  // modal); the real vendor list is admin-only.
  return <HomeClient tours={tours} slots={slots} reviews={reviews} users={seedUsers} bookings={[]} />;
}
