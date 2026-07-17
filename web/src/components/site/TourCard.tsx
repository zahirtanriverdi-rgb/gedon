import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import type { Tour } from '@/types';
import { getLocalizedTourName } from '@/i18n/tourLocalization';
import type { Language } from '@/i18n/LanguageContext';

const CURRENCY_SYMBOL: Record<string, string> = { AZN: '₼', USD: '$', EUR: '€' };

/**
 * Presentational, server-renderable tour card. Deliberately small and dependency-light so the
 * incoming designer can restyle it in isolation. Renders localized content server-side (SEO),
 * defaulting to `az` — the canonical crawl language. Links are real <a href> for crawlers.
 */
export function TourCard({ tour, language = 'az' }: { tour: Tour; language?: Language }) {
  const name = getLocalizedTourName(tour, language);
  const href = `/tours/${tour.slug || tour.id}`;
  const symbol = CURRENCY_SYMBOL[tour.priceCurrency || 'AZN'] || '₼';
  const price = tour.discountPrice ?? tour.price;

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-[var(--card-radius)] border border-[var(--border-primary)] bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {tour.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tour.image}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 font-bold text-[var(--color-text-main)]">{name}</h3>
        <div className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
          <MapPin className="h-4 w-4" />
          <span className="line-clamp-1">{tour.region}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          {typeof tour.rating === 'number' && tour.rating > 0 ? (
            <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
              <Star className="h-4 w-4 fill-current" />
              {tour.rating.toFixed(1)}
            </span>
          ) : (
            <span />
          )}
          {typeof price === 'number' ? (
            <span className="font-black text-[var(--color-primary)]">
              {Math.round(price)} {symbol}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
