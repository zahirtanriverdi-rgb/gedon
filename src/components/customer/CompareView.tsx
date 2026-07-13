import React from 'react';
import { Tour, TourSlot, TourDifficulty } from '../../types';
import { Scale, MapPin, Star, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedTourName, getLocalizedTourIncludes } from '../../i18n/tourLocalization';
import { parseStoredGpxData, getRouteDurationHours } from '../../utils/gpxParser';

type ConvertedPriceInfo = {
  azn: number;
  currencySymbol: string;
  currencyCode: string;
  original: string;
  both: string;
  detailed: string;
};

interface CompareViewProps {
  compareTours: Tour[];
  slots: TourSlot[];
  onBack: () => void;
  onSelectTour: (tour: Tour) => void;
  onRemoveFromCompare: (tourId: string) => void;
  getConvertedPriceInfo: (price: number, currency?: 'AZN' | 'USD' | 'EUR') => ConvertedPriceInfo;
  getAverageRating: (tourId: string) => string | null;
  getReviewsCount: (tourId: string) => number;
}

const DIFFICULTY_BADGE: Record<TourDifficulty, string> = {
  easy: 'bg-emerald-50 text-emerald-800 border border-emerald-100',
  medium: 'bg-brand-bg-light text-brand-text-main border border-slate-200',
  hard: 'bg-orange-50 text-orange-800 border border-orange-100',
  extreme: 'bg-red-50 text-red-800 border border-red-100',
};

export function CompareView({
  compareTours,
  slots,
  onBack,
  onSelectTour,
  onRemoveFromCompare,
  getConvertedPriceInfo,
  getAverageRating,
  getReviewsCount,
}: CompareViewProps) {
  const { t, language } = useLanguage();

  const minPriceOf = (tour: Tour) => {
    const tourSlots = slots.filter(s => s.tourId === tour.id);
    return tour.price ?? (tourSlots.length > 0 ? Math.min(...tourSlots.map(s => s.price)) : 0);
  };

  const rows: { key: string; label: string; render: (tour: Tour) => React.ReactNode }[] = [
    {
      key: 'price',
      label: t('customerHome.compareView.rows.price'),
      render: (tour) => {
        const base = minPriceOf(tour);
        if (tour.discountPrice && tour.discountPrice > 0 && tour.discountPrice < base) {
          return (
            <span className="flex flex-col gap-0.5">
              <span className="line-through text-label-tertiary text-xs">{getConvertedPriceInfo(base, tour.priceCurrency).both}</span>
              <span className="font-black text-label-critical">{getConvertedPriceInfo(tour.discountPrice, tour.priceCurrency).both}</span>
            </span>
          );
        }
        return <span className="font-black text-label-primary">{getConvertedPriceInfo(base, tour.priceCurrency).both}</span>;
      },
    },
    {
      key: 'duration',
      label: t('customerHome.compareView.rows.duration'),
      render: (tour) => {
        const parsedGpx = parseStoredGpxData(tour.gpxData);
        if (parsedGpx) return `${getRouteDurationHours(parsedGpx)} ${t('miscWidgets.tourRouteStatsCard.hours')}`;
        if (tour.durationHours) return `${tour.durationHours} ${t('miscWidgets.tourRouteStatsCard.hours')}`;
        return `${tour.durationDays} ${t('miscWidgets.tourRouteStatsCard.days')}`;
      },
    },
    {
      key: 'difficulty',
      label: t('customerHome.compareView.rows.difficulty'),
      render: (tour) => (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${DIFFICULTY_BADGE[tour.difficulty] || DIFFICULTY_BADGE.medium}`}>
          {t(`customerHome.toursHomeView.difficulty.${tour.difficulty}`)}
        </span>
      ),
    },
    {
      key: 'rating',
      label: t('customerHome.compareView.rows.rating'),
      render: (tour) => (
        getAverageRating(tour.id) !== null ? (
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold">{getAverageRating(tour.id)}</span>
            <span className="text-label-tertiary text-xs">({getReviewsCount(tour.id)})</span>
          </span>
        ) : (
          <span className="text-xs font-bold text-emerald-700">{t('customerHome.toursHomeView.cardMeta.newTag')}</span>
        )
      ),
    },
    {
      key: 'region',
      label: t('customerHome.compareView.rows.region'),
      render: (tour) => tour.region,
    },
    {
      key: 'route',
      label: t('customerHome.compareView.rows.route'),
      render: (tour) => {
        const parsedGpx = parseStoredGpxData(tour.gpxData);
        if (!parsedGpx) return <span className="text-label-tertiary">—</span>;
        return `${parsedGpx.stats.distanceKm.toFixed(1)} km · ↑${Math.round(parsedGpx.stats.elevationGainM)} m`;
      },
    },
    {
      key: 'includes',
      label: t('customerHome.compareView.rows.includes'),
      render: (tour) => {
        const includes = getLocalizedTourIncludes(tour, language);
        if (includes.length === 0) return <span className="text-label-tertiary">—</span>;
        return (
          <ul className="space-y-0.5 text-xs">
            {includes.map((item, i) => <li key={i}>• {item}</li>)}
          </ul>
        );
      },
    },
    {
      key: 'languages',
      label: t('customerHome.compareView.rows.languages'),
      render: (tour) => tour.languages?.join(', ') || <span className="text-label-tertiary">—</span>,
    },
    {
      key: 'vendor',
      label: t('customerHome.compareView.rows.vendor'),
      render: (tour) => tour.vendorName,
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-extrabold text-label-primary flex items-center gap-2">
          <Scale className="w-5 h-5 text-emerald-600" /> {t('customerHome.compareView.title')}
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
        >
          ← {t('customerHome.compareView.backButton')}
        </button>
      </div>

      {compareTours.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
          <Scale className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">{t('customerHome.compareView.emptyState')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <div
              className="grid"
              style={{ gridTemplateColumns: `140px repeat(${compareTours.length}, minmax(180px, 1fr))` }}
            >
              <div className="p-3 border-b border-r border-slate-100 bg-slate-50 sticky left-0" />
              {compareTours.map(tour => (
                <div key={tour.id} className="p-3 border-b border-slate-100 bg-slate-50 space-y-2 relative">
                  <button
                    type="button"
                    onClick={() => onRemoveFromCompare(tour.id)}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white p-1 rounded-full shadow-sm transition cursor-pointer"
                    title={t('customerHome.compareView.removeTitle')}
                  >
                    <X className="w-3.5 h-3.5 text-label-secondary" />
                  </button>
                  <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 cursor-pointer" onClick={() => onSelectTour(tour)}>
                    <img src={tour.image || undefined} className="w-full h-full object-cover" alt={getLocalizedTourName(tour, language)} referrerPolicy="no-referrer" />
                  </div>
                  <h4 className="text-sm font-bold leading-[1.3] text-label-primary line-clamp-2 cursor-pointer" onClick={() => onSelectTour(tour)}>
                    {getLocalizedTourName(tour, language)}
                  </h4>
                  <p className="text-xs text-label-secondary flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-500 shrink-0" /> <span className="truncate">{tour.region}</span>
                  </p>
                </div>
              ))}

              {compareTours.length >= 2 && rows.map(row => (
                <React.Fragment key={row.key}>
                  <div className="p-3 border-b border-r border-slate-100 bg-slate-50 text-xs font-bold text-label-secondary sticky left-0">
                    {row.label}
                  </div>
                  {compareTours.map(tour => (
                    <div key={tour.id} className="p-3 border-b border-slate-100 text-sm text-label-primary">
                      {row.render(tour)}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
          {compareTours.length < 2 && (
            <p className="text-center text-xs font-semibold text-label-tertiary">
              {t('customerHome.compareView.needMore', { count: 2 - compareTours.length })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
