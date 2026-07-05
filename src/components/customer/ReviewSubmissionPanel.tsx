import React, { useState } from 'react';
import { Tour, Booking, Review } from '../../types';
import { CheckCircle, AlertCircle, Star } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface ReviewSubmissionPanelProps {
  tours: Tour[];
  bookings: Booking[];
  reviews: Review[];
  currentUser: { id: string; name: string; phone: string; balance: number; email: string };
  onAddReview: (newReview: Review) => Promise<void>;
}

export function ReviewSubmissionPanel({ tours, bookings, reviews, currentUser, onAddReview }: ReviewSubmissionPanelProps) {
  const { t } = useLanguage();
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);

  // Check which user bookings are eligible for leaving a review (must be Paid and not reviewed yet)
  const userEligibleBookings = bookings.filter(b => {
    const alreadyReviewed = reviews.some(r => r.bookingId === b.id);
    return b.customerId === currentUser.id && b.status === 'paid' && !alreadyReviewed;
  });

  // Write review linked with paid booking ID
  const handleAddReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForReview || !reviewComment.trim()) return;

    const targetBooking = bookings.find(b => b.id === selectedBookingForReview);
    if (!targetBooking) return;

    const newRev: Review = {
      id: 'rev-' + Math.floor(Math.random() * 90000 + 10000),
      tourId: targetBooking.tourId,
      bookingId: targetBooking.id,
      customerId: currentUser.id,
      customerName: currentUser.name,
      rating: reviewRating,
      comment: reviewComment,
      createdAt: new Date().toISOString(),
      verifiedAttendee: true // Guaranteed because it links to a PAID booking id
    };

    setIsSubmittingReview(true);
    setReviewSubmitError(null);
    try {
      await onAddReview(newRev);
      setReviewComment('');
      setSelectedBookingForReview('');
    } catch (e: any) {
      setReviewSubmitError(e?.message || t('customerHome.reviewSubmissionPanel.submitError'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <CheckCircle className="text-emerald-500 w-5 h-5" />
          {t('customerHome.reviewSubmissionPanel.heading')}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {t('customerHome.reviewSubmissionPanel.subheading')}
        </p>
      </div>

      {userEligibleBookings.length === 0 ? (
        <div className="bg-slate-50 p-4 rounded-lg text-slate-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{t('customerHome.reviewSubmissionPanel.noEligibleBookings')}</span>
        </div>
      ) : (
        <form onSubmit={handleAddReviewSubmit} className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('customerHome.reviewSubmissionPanel.bookingSelectLabel')}</label>
              <select
                required
                value={selectedBookingForReview}
                onChange={(e) => setSelectedBookingForReview(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="">{t('customerHome.reviewSubmissionPanel.bookingSelectPlaceholder')}</option>
                {userEligibleBookings.map(b => {
                  const tour = tours.find(tt => tt.id === b.tourId);
                  return (
                    <option key={b.id} value={b.id}>
                      {tour?.name} ({b.bookingDate}) - {b.totalAmount} AZN ({t('customerHome.reviewSubmissionPanel.ticketHash')}{b.id})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('customerHome.reviewSubmissionPanel.ratingLabel')}</label>
              <div className="flex items-center gap-2 py-1.5">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setReviewRating(num)}
                    className={`p-1 rounded transition ${reviewRating >= num ? 'text-amber-500 scale-110' : 'text-slate-300'}`}
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                ))}
                <span className="text-xs text-slate-600 font-bold ml-1">{t('customerHome.reviewSubmissionPanel.ratingSuffix', { rating: reviewRating })}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('customerHome.reviewSubmissionPanel.commentLabel')}</label>
            <textarea
              required
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={t('customerHome.reviewSubmissionPanel.commentPlaceholder')}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {reviewSubmitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">
              ⚠️ {reviewSubmitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmittingReview}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmittingReview && (
              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isSubmittingReview ? t('customerHome.reviewSubmissionPanel.submitting') : t('customerHome.reviewSubmissionPanel.submitButton')}
          </button>
        </form>
      )}
    </div>
  );
}
