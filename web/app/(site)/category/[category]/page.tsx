import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTours, getSlots, getReviews } from '@/lib/api';
import { seedUsers } from '@/data/toursData';
import { HomeClient } from '../../HomeClient';

// Dedicated per-category pages: /category/peak, /category/camp, /category/hiking,
// /category/active, /category/international. Each renders the same home experience (search,
// filters, calendar, upcoming carousel) but locked to one category, so every category has its
// own crawlable, shareable URL. "Bütün Turlar" (all) stays the home page at /.
export const dynamic = 'force-dynamic';

// Per-category slug → internal category key + localized SEO metadata (AZ, matching the site's
// html lang). Kept in one place so the chips (HomeClient) and these pages agree on the slugs.
const CATEGORY_META: Record<
  string,
  { key: string; title: string; description: string }
> = {
  peak: {
    key: 'peak',
    title: 'Zirvə Turları | Gotabiat',
    description:
      'Azərbaycanın ən yüksək zirvələrinə dırmanma turları — təcrübəli bələdçilər ilə Şahdağ, Bazardüzü və daha çox zirvəni kəşf edin.',
  },
  camp: {
    key: 'camp',
    title: 'Kamp Turları | Gotabiat',
    description:
      'Təbiətin qoynunda çadır kampları və gecələmə turları — ailə və dostlarla unudulmaz kamp təcrübəsi.',
  },
  hiking: {
    key: 'hiking',
    title: 'Hiking Turları | Gotabiat',
    description:
      'Azərbaycanın gözəl cığırları üzrə piyada gəzinti (hiking) turları — şəlalələr, meşələr və dağ mənzərələri.',
  },
  active: {
    key: 'active',
    title: 'Aktiv Həyat Turları | Gotabiat',
    description:
      'Adrenalin dolu aktiv istirahət turları — rafting, zip-line, velosiped və digər açıq hava fəaliyyətləri.',
  },
  international: {
    key: 'international',
    title: 'Xarici Turlar | Gotabiat',
    description:
      'Xaricə səyahət turları — dünyanın müxtəlif ölkələrinə təşkilatlanmış qrup turları Gotabiat ilə.',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const meta = CATEGORY_META[category];
  if (!meta) return {};
  return { title: meta.title, description: meta.description };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const meta = CATEGORY_META[category];
  if (!meta) notFound();

  const [tours, slots, reviews] = await Promise.all([getTours(), getSlots(), getReviews()]);

  return (
    // key locks the mount to the category: navigating between sibling category pages
    // (/category/peak → /category/camp) reuses this route segment, so without a changing key
    // HomeClient's useState(initialCategory) initializer would keep the previous category.
    <HomeClient
      key={meta.key}
      tours={tours}
      slots={slots}
      reviews={reviews}
      users={seedUsers}
      bookings={[]}
      initialCategory={meta.key}
    />
  );
}
