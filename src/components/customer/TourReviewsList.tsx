import React from 'react';
import { Review } from '../../types';
import { Star, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface TourReviewsListProps {
  tourId: string;
  reviews: Review[];
  reviewsCount: number;
}

export function TourReviewsList({ tourId, reviews, reviewsCount }: TourReviewsListProps) {
  const { t } = useLanguage();
  const tourReviews = reviews.filter(r => r.tourId === tourId);

  return (
    <div>
      <h4 className="text-xs font-bold text-slate-500 tracking-widest">{t('customerHome.tourReviewsList.heading', { count: reviewsCount })}</h4>
      <div className="space-y-2.5 mt-2">
        {tourReviews.length === 0 ? (
          <div className="text-slate-400 text-xs italic">{t('customerHome.tourReviewsList.emptyState')}</div>
        ) : (
          tourReviews.map((rev) => (
            <div key={rev.id} className="bg-slate-50 p-3 rounded-lg space-y-1">
              <div className="flex items-center justify-between text-xs">
                <strong className="text-slate-700 font-bold">{rev.customerName}</strong>
                <div className="flex items-center text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="font-bold ml-0.5">{rev.rating}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600">{rev.comment}</p>
              {rev.verifiedAttendee && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-1">
                  <CheckCircle className="w-2.5 h-2.5" /> {t('customerHome.tourReviewsList.verifiedAttendee')}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
