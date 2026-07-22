'use client';
import React, { useMemo, useState } from 'react';
import { Review, Tour } from '../../types';
import { Star, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface TourReviewsListProps {
  tour: Tour;
  reviews: Review[];
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

const INITIAL_VISIBLE = 3;
const AVATAR_COLORS = ['#A6683C', '#2E7D46', '#3B6EA5', '#8E5AA3', '#C2703D', '#4C7C6E', '#A34C5E'];

const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

function avatarColorOf(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// Mokapdakı Rəylər bölməsi: ortalama + ulduz paylanması zolaqları + rəy kartları +
// rezervasiya nömrəsi ilə təsdiqlənən "Rəy yaz" forması (bax POST /api/reviews).
export function TourReviewsList({ tour, reviews, onShowNotification }: TourReviewsListProps) {
  const { t } = useLanguage();
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_VISIBLE);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState<boolean>(false);

  // Səhifə server-render olunan reviews propu ilə açılır; yeni göndərilən rəy səhifəni
  // yeniləmədən görünsün deyə lokal siyahıya əlavə edilir.
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const tourReviews = useMemo(
    () => [...localReviews, ...reviews.filter((r) => r.tourId === tour.id && !localReviews.some((l) => l.id === r.id))],
    [reviews, localReviews, tour.id]
  );

  const [formName, setFormName] = useState('');
  const [formRef, setFormRef] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const count = tourReviews.length;
  const avg = count > 0 ? tourReviews.reduce((s, r) => s + r.rating, 0) / count : tour.rating || 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const n = tourReviews.filter((r) => Math.round(r.rating) === star).length;
    return { star, percent: count > 0 ? Math.round((n / count) * 100) : 0 };
  });

  const formatMonthYear = (iso: string): string => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const month = t(`miscWidgets.tourWeatherForecast.months.${MONTH_KEYS[d.getMonth()]}`);
    return `${month} ${d.getFullYear()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formRef.trim() || !formComment.trim()) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId: tour.id,
          bookingReference: formRef.trim(),
          customerName: formName.trim(),
          rating: formRating,
          comment: formComment.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t('tourDetailPage.reviews.submitError'));
      if (data.review) setLocalReviews((prev) => [data.review, ...prev]);
      setShowForm(false);
      setFormName('');
      setFormRef('');
      setFormComment('');
      setFormRating(5);
      onShowNotification?.(t('tourDetailPage.reviews.successMessage'), 'success');
    } catch (err: any) {
      setFormError(err?.message || t('tourDetailPage.reviews.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (value: number, sizeClass = 'w-4 h-4') => (
    <span className="inline-flex gap-px">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${sizeClass} ${n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
      ))}
    </span>
  );

  return (
    <div className="space-y-4 py-8 border-t border-slate-100">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-slate-900">{t('tourDetailPage.reviews.title')}</h2>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="text-sm font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full px-4 py-2 transition cursor-pointer"
        >
          ✍️ {t('tourDetailPage.reviews.writeReview')}
        </button>
      </div>

      {/* Rəy yaz forması — rezervasiya nömrəsi ilə təsdiq */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
          <p className="text-xs text-slate-500 font-medium leading-snug">{t('tourDetailPage.reviews.formHint')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">{t('tourDetailPage.reviews.nameLabel')}</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('tourDetailPage.reviews.namePlaceholder')}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">{t('tourDetailPage.reviews.refLabel')}</label>
              <input
                type="text"
                required
                value={formRef}
                onChange={(e) => setFormRef(e.target.value)}
                placeholder={t('tourDetailPage.reviews.refPlaceholder')}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">{t('tourDetailPage.reviews.ratingLabel')}</label>
            <div className="flex items-center gap-1.5 py-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFormRating(n)}
                  className={`p-0.5 rounded transition cursor-pointer ${formRating >= n ? 'text-amber-400 scale-110' : 'text-slate-300'}`}
                >
                  <Star className="w-6 h-6 fill-current" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">{t('tourDetailPage.reviews.commentLabel')}</label>
            <textarea
              required
              rows={3}
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              placeholder={t('tourDetailPage.reviews.commentPlaceholder')}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm"
            />
          </div>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">⚠️ {formError}</div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#2E4F3E] hover:bg-[#233f30] text-white font-bold text-sm px-5 py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? t('tourDetailPage.reviews.submitting') : t('tourDetailPage.reviews.submit')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm font-semibold text-slate-500 hover:text-slate-700 px-3 py-2.5 cursor-pointer"
            >
              {t('tourDetailPage.reviews.cancel')}
            </button>
          </div>
        </form>
      )}

      {count === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm text-slate-500 font-medium">
          {t('tourDetailPage.reviews.empty')}
        </div>
      ) : (
        <>
          {/* Ortalama + paylanma zolaqları */}
          <div className="flex gap-5 items-center bg-slate-50 border border-slate-200 rounded-2xl p-4.5 sm:p-5">
            <div className="text-center shrink-0">
              <div className="text-4xl font-extrabold leading-none text-slate-900">{avg.toFixed(1)}</div>
              <div className="mt-1.5">{renderStars(avg)}</div>
              <div className="text-xs text-slate-500 mt-1">{t('tourDetailPage.reviews.countLabel', { count })}</div>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {distribution.map(({ star, percent }) => (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-2 text-slate-500">{star}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="w-9 text-right text-slate-400">{percent}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rəy kartları */}
          <div>
            {tourReviews.slice(0, visibleCount).map((rev) => {
              const isExpanded = !!expandedIds[rev.id];
              const isLong = (rev.comment || '').length > 220;
              return (
                <div key={rev.id} className="py-4 border-b border-slate-100 last:border-b-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shrink-0"
                      style={{ background: avatarColorOf(rev.customerName) }}
                    >
                      {initialsOf(rev.customerName)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                        {rev.customerName}
                        {rev.verifiedAttendee && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                            <CheckCircle className="w-2.5 h-2.5" /> {t('tourDetailPage.reviews.verified')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{formatMonthYear(rev.createdAt)}</div>
                    </div>
                    <div className="shrink-0">{renderStars(rev.rating, 'w-3.5 h-3.5')}</div>
                  </div>
                  <p className={`text-sm text-slate-600 leading-relaxed ${!isExpanded && isLong ? 'line-clamp-3' : ''}`}>
                    {rev.comment}
                  </p>
                  {isLong && (
                    <button
                      type="button"
                      onClick={() => setExpandedIds((prev) => ({ ...prev, [rev.id]: !prev[rev.id] }))}
                      className="mt-1 text-[13px] font-semibold text-emerald-700 cursor-pointer"
                    >
                      {isExpanded ? t('tourDetailPage.reviews.readLess') : t('tourDetailPage.reviews.readMore')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {count > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + INITIAL_VISIBLE)}
              className="w-full py-3 border border-slate-200 rounded-xl bg-white font-semibold text-sm text-slate-900 hover:bg-slate-50 transition cursor-pointer"
            >
              {t('tourDetailPage.reviews.showMore')}
            </button>
          )}
        </>
      )}
    </div>
  );
}
