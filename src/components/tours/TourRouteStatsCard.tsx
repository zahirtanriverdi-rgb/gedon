import React from 'react';
import { Star } from 'lucide-react';
import { ParsedGpxRoute } from '../../utils/gpxParser';
import { RouteSparkline } from './RouteSparkline';
import { useLanguage } from '../../i18n/LanguageContext';

interface TourRouteStatsCardProps {
  parsed: ParsedGpxRoute;
  durationLabel: string;
  difficultyLabel: string;
  difficultyBarColorClass: string;
  difficultyPercent: number;
  ratingValue: number;
}

export const TourRouteStatsCard: React.FC<TourRouteStatsCardProps> = ({
  parsed,
  durationLabel,
  difficultyLabel,
  difficultyBarColorClass,
  difficultyPercent,
  ratingValue,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-stretch gap-3">
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-label-primary leading-tight whitespace-nowrap overflow-hidden">
          <span>{parsed.stats.distanceKm} km</span>
          <span className="text-label-tertiary font-medium">•</span>
          <span>{parsed.stats.elevationGainM} m</span>
          <span className="text-label-tertiary font-medium">•</span>
          <span>{durationLabel}</span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1 w-20 shrink-0">
            <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${difficultyBarColorClass}`}
                style={{ width: `${difficultyPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-label-tertiary font-medium break-words">{difficultyLabel}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span className="flex items-center gap-1 font-bold text-sm text-label-primary">
              {ratingValue}
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            </span>
            <span className="text-[10px] text-label-tertiary font-medium">{t('miscWidgets.tourRouteStatsCard.rating')}</span>
          </div>
        </div>
      </div>

      <RouteSparkline
        points={parsed.points}
        className="w-[92px] h-[92px] shrink-0 rounded-xl bg-slate-50 border border-slate-100 p-2"
      />
    </div>
  );
};
