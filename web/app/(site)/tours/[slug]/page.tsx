import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTourBySlug, getTours, getSlots, getReviews, SITE_URL } from '@/lib/api';
import { seedUsers } from '@/data/toursData';
import { TourDetailClient } from './TourDetailClient';

// Dynamic SSR on every request → always-fresh price/availability, and the tour content is in
// the server HTML (the whole point of this migration). generateMetadata below emits the
// crawlable <title>/OG/canonical + JSON-LD that used to be set client-side via react-helmet.
export const dynamic = 'force-dynamic';

function truncate(text: string | undefined, length: number): string {
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTourBySlug(slug);
  if (!tour) {
    return { title: 'Tur tapılmadı', robots: { index: false } };
  }
  const description = truncate(tour.description, 160);
  const canonicalUrl = `${SITE_URL}/tours/${tour.slug || tour.id}`;
  return {
    title: tour.name,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: tour.name,
      description,
      url: canonicalUrl,
      type: 'website',
      images: tour.image ? [{ url: tour.image }] : undefined,
    },
  };
}

export default async function TourDetailPageRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  // Fetch the tour first (cheap 404 path), then the supporting collections in parallel.
  const tour = await getTourBySlug(slug);
  if (!tour || tour.status !== 'approved') notFound();

  const [tours, slots, reviews] = await Promise.all([getTours(), getSlots(), getReviews()]);

  // JSON-LD structured data (ported verbatim from the old TourDetailRoute) — injected into the
  // server HTML so crawlers get rich-result data without executing JS.
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: tour.name,
    description: tour.description,
    image: tour.image,
    offers: {
      '@type': 'Offer',
      price: tour.discountPrice ?? tour.price,
      priceCurrency: tour.priceCurrency || 'AZN',
      availability: 'https://schema.org/InStock',
    },
  };
  if ((tour.reviewsCount ?? 0) > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: tour.rating,
      reviewCount: tour.reviewsCount,
    };
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TourDetailClient
        tour={tour}
        tours={tours}
        slots={slots}
        reviews={reviews}
        users={seedUsers}
      />
    </>
  );
}
