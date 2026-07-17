'use client';
import React from 'react';
import { Star } from 'lucide-react';
import { Tour } from '../../types';
import { ParsedGpxRoute, isRoundTripRoute } from '../../utils/gpxParser';
import { RouteSparkline } from './RouteSparkline';
import { DifficultyInfoButton } from './DifficultyInfoButton';
import { useLanguage } from '../../i18n/LanguageContext';

interface TourRouteStatsCardProps {
  tour: Tour;
  parsed: ParsedGpxRoute;
  durationLabel: string;
  difficultyLabel: string;
  difficultyBarColorClass: string;
  difficultyPercent: number;
  ratingValue: number;
  // The single-line stats row is too narrow on the compact grid card to fit "(gediş-dönüş)"
  // without clipping the duration next to it — only show it where there's room (tour detail page).
  showRoundTripNote?: boolean;
}

export const TourRouteStatsCard: React.FC<TourRouteStatsCardProps> = ({
  tour,
  parsed,
  durationLabel,
  difficultyLabel,
  difficultyBarColorClass,
  difficultyPercent,
  ratingValue,
  showRoundTripNote = true,
}) => {
  const { t } = useLanguage();
  const roundTrip = showRoundTripNote && isRoundTripRoute(parsed);

  // Same active-vs-standard branching the callers use to pick difficultyLabel/Percent, just
  // reduced to "which legend scale, which entry" for the info popover.
  const isActiveScale = tour.category === 'active' || tour.isActiveLife;
  const rawActiveDiff = tour.activeDifficulty || (tour.difficulty === 'easy' ? 'beginner' : tour.difficulty === 'hard' || tour.difficulty === 'extreme' ? 'professional' : 'medium');
  const activeKey = isActiveScale
    ? (rawActiveDiff === 'beginner' || rawActiveDiff === 'easy' ? 'beginner' : rawActiveDiff === 'medium' ? 'medium' : 'professional')
    : tour.difficulty;

  return (
    <div className="flex items-stretch gap-3">
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
        <div
          className={`flex items-center gap-1.5 text-xs font-extrabold text-label-primary leading-tight overflow-hidden ${
            roundTrip ? 'flex-wrap' : 'whitespace-nowrap'
          }`}
        >
          <span className="whitespace-nowrap">
            {parsed.stats.distanceKm} km
            {roundTrip && (
              <span className="font-medium text-label-tertiary"> ({t('miscWidgets.tourRouteStatsCard.roundTrip')})</span>
            )}
          </span>
          <span className="text-label-tertiary font-medium">•</span>
          <span className="whitespace-nowrap">{parsed.stats.elevationGainM} m</span>
          <span className="text-label-tertiary font-medium">•</span>
          <span className="whitespace-nowrap">{durationLabel}</span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1 w-20 shrink-0">
            <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${difficultyBarColorClass}`}
                style={{ width: `${difficultyPercent}%` }}
              />
            </div>
            <span className="flex items-center gap-1 text-[10px] text-label-tertiary font-medium break-words">
              {difficultyLabel}
              <DifficultyInfoButton scale={isActiveScale ? 'active' : 'standard'} activeKey={activeKey} />
            </span>
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