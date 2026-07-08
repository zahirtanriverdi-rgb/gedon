import React from 'react';
import { Star } from 'lucide-react';
import { Tour } from '../../types';
import { ParsedGpxRoute } from '../../utils/gpxParser';
import { TourRouteStatsCard } from './TourRouteStatsCard';
import { DifficultyInfoButton } from './DifficultyInfoButton';
import { useLanguage } from '../../i18n/LanguageContext';
import { REVIEWS_ENABLED } from '../../config/features';

interface TourStatsRowProps {
  tour: Tour;
  parsedGpx: ParsedGpxRoute | null;
  durationLabel: string;
  difficultyLabel: string;
  difficultyBarColorClass: string;
  difficultyPercent: number;
  ratingValue: number;
  reviewsCount: number;
  isTopSeller: boolean;
  topSellerMonth: string;
}

// Decides what fills the row above the price block: GPX-derived route stats when a
// tour has route data, camping-appropriate metadata when it doesn't but is a camp
// tour, or a rating/bestseller fallback otherwise. Centralized here so every place
// that renders a tour card (grid, search, favorites) makes this call the same way.
export const TourStatsRow: React.FC<TourStatsRowProps> = ({
  tour,
  parsedGpx,
  durationLabel,
  difficultyLabel,
  difficultyBarColorClass,
  difficultyPercent,
  ratingValue,
  reviewsCount,
  isTopSeller,
  topSellerMonth,
}) => {
  const { t } = useLanguage();

  if (parsedGpx) {
    return (
      <div className="flex-1 min-w-0">
        <TourRouteStatsCard
          tour={tour}
          parsed={parsedGpx}
          durationLabel={durationLabel}
          difficultyLabel={difficultyLabel}
          difficultyBarColorClass={difficultyBarColorClass}
          difficultyPercent={difficultyPercent}
          ratingValue={ratingValue}
          showRoundTripNote={false}
        />
      </div>
    );
  }

  if (tour.category === 'camp') {
    const nights = tour.durationNights ?? Math.max((tour.durationDays || 1) - 1, 0);
    const includedTag = tour.includes && tour.includes.length > 0 ? tour.includes[0] : null;
    return (
      <div className="flex flex-col justify-center gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-label-primary whitespace-nowrap">
          <span>⛺ {t('miscWidgets.tourStatsRow.nights', { count: nights })}</span>
          {includedTag && (
            <>
              <span className="text-label-tertiary font-medium">•</span>
              <span className="text-[10px] font-semibold text-label-secondary truncate max-w-[140px]">{includedTag}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 w-fit">
          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0">
            <div className={`h-full rounded-full ${difficultyBarColorClass}`} style={{ width: `${difficultyPercent}%` }} />
          </div>
          <span className="flex items-center gap-1 text-[10px] text-label-tertiary font-medium">
            {difficultyLabel}
            <DifficultyInfoButton scale="standard" activeKey={tour.difficulty} />
          </span>
        </div>
      </div>
    );
  }

  const starRating = Math.round(ratingValue);
  return (
    <div className="flex flex-col justify-center gap-1.5 min-w-0">
      {REVIEWS_ENABLED && (
        <div className="flex items-center gap-0.5" title={t('customerHome.toursHomeView.ratingScoreTitle', { rating: ratingValue })}>
          {[1, 2, 3, 4, 5].map((starIdx) => (
            <Star
              key={starIdx}
              className={`w-3.5 h-3.5 ${starIdx <= starRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
            />
          ))}
          <span className="text-xs font-bold text-brand-text-main ml-1">{ratingValue}</span>
          <span className="text-brand-text-muted text-[10px] font-medium">({t('customerHome.toursHomeView.reviewsCount', { count: reviewsCount })})</span>
        </div>
      )}
      {isTopSeller && (
        <span
          className="bg-amber-50/70 text-brand-accent border border-amber-100 text-[9px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 w-fit"
          title={t('customerHome.toursHomeView.topSellerTitle')}
        >
          🔥 {t('customerHome.toursHomeView.bestSellerOfMonthNamed', { month: topSellerMonth })}
        </span>
      )}
    </div>
  );
};
