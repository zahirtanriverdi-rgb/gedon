'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tour, TourSlot } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedTourName } from '../../i18n/tourLocalization';
import { DIAL_CODES, DEFAULT_DIAL_CODE, isoToFlagEmoji } from '../../data/dialCodes';
import { Check, X } from 'lucide-react';

// Fixed pre-reservation questions (always asked, every tour). The `value` strings are what
// gets stored/sent to the vendor and are deliberately kept in Azerbaijani — vendors read the
// inquiries in AZ regardless of which UI language the customer browsed in. The labels shown
// on screen are localized separately via t().
const FIXED_EXPERIENCE_OPTIONS = [
  { value: '0-2 dəfə (Yeni başlayan)', labelKey: 'expBeginner' },
  { value: '3+ dəfə (Təcrübəli)', labelKey: 'expExperienced' },
] as const;
const FIXED_HEIGHT_OPTIONS = [
  { value: 'Xeyr, problem yoxdur', labelKey: 'heightNo' },
  { value: 'Bir az var', labelKey: 'heightSome' },
  { value: 'Bəli, hündürlükdən qorxuram', labelKey: 'heightYes' },
] as const;
const FIXED_EXPERIENCE_QUESTION_AZ = 'Bundan öncə neçə yürüşdə (hiking-də) olmusunuz?';
const FIXED_HEIGHT_QUESTION_AZ = 'Hündürlükdən qorxunuz varmı?';

// <=639px (Tailwind sm breakpoint-dən aşağı) — mobil sheet təqdimatının şərti
export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
}

// Mobil görünüşdə uşaqları document.body-yə portal edir (bottom-sheet-lər səhifə içindəki
// stacking-context-lərə ilişməsin deyə); desktop-da olduğu kimi yerində saxlayır ki,
// anchored dropdown mövqelənməsi işləsin.
export function MaybeBodyPortal({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobileViewport();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  if (isMobile && isMounted) return createPortal(<>{children}</>, document.body);
  return <>{children}</>;
}

interface TourInquirySheetProps {
  tour: Tour;
  slot: TourSlot | null;
  qty: number;
  open: boolean;
  onClose: () => void;
  formatDisplayDate: (iso: string | undefined | null) => string;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

// Booking-inquiry form. Mobile (<sm): bottom sheet with drag-to-dismiss, matching the approved
// mockup; desktop: centered modal. Collects name + WhatsApp number + the two fixed questions +
// any vendor-defined extra questions, then POSTs /api/inquiries (which fans out the vendor/admin
// panel notifications and Telegram messages server-side).
export function TourInquirySheet({ tour, slot, qty, open, onClose, formatDisplayDate, onShowNotification }: TourInquirySheetProps) {
  const { t, language } = useLanguage();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [dialCode, setDialCode] = useState<string>(DEFAULT_DIAL_CODE);
  const [expAnswer, setExpAnswer] = useState('');
  const [expOtherText, setExpOtherText] = useState('');
  const [heightAnswer, setHeightAnswer] = useState('');
  // Extra (vendor-defined) answers keyed by question id; `__other:` prefix marks the free-text choice
  const [extraAnswers, setExtraAnswers] = useState<Record<string, string>>({});
  const [extraOtherTexts, setExtraOtherTexts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fresh form on every open
  useEffect(() => {
    if (open) {
      setSubmitted(false);
      setSubmitError(null);
      setExpAnswer('');
      setExpOtherText('');
      setHeightAnswer('');
      setExtraAnswers({});
      setExtraOtherTexts({});
    }
  }, [open]);

  // Lock page scroll while the sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Drag-to-dismiss (mobile sheet handle)
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({ startY: 0, current: 0, dragging: false });
  const onTouchStart = (e: React.TouchEvent) => {
    dragState.current = { startY: e.touches[0].clientY, current: 0, dragging: true };
    if (panelRef.current) panelRef.current.style.transition = 'none';
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragState.current.dragging) return;
    const delta = Math.max(0, e.touches[0].clientY - dragState.current.startY);
    dragState.current.current = delta;
    if (panelRef.current) panelRef.current.style.transform = `translateY(${delta}px)`;
  };
  const onTouchEnd = () => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    if (panelRef.current) {
      panelRef.current.style.transition = 'transform .3s ease';
      panelRef.current.style.transform = 'translateY(0)';
    }
    if (dragState.current.current > 90) onClose();
    dragState.current.current = 0;
  };

  // SSR-də portal hədəfi yoxdur — yalnız mount-dan sonra render edirik
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  if (!open || !isMounted) return null;

  const extraQuestions = tour.inquiryQuestions || [];

  const getFullPhoneNumber = () => {
    const nationalDigits = customerPhone.replace(/\D/g, '').replace(/^0+/, '');
    return `${dialCode}${nationalDigits}`;
  };

  const expOk = expAnswer && (expAnswer !== '__other' || expOtherText.trim().length > 0);
  const extrasOk = extraQuestions.every(q => {
    const a = extraAnswers[q.id];
    if (!a) return false;
    if (a === '__other') return (extraOtherTexts[q.id] || '').trim().length > 0;
    return true;
  });
  const phoneDigitsOk = customerPhone.replace(/\D/g, '').replace(/^0+/, '').length >= 7;
  const canSubmit = !isSubmitting && customerName.trim().length > 1 && phoneDigitsOk && expOk && !!heightAnswer && extrasOk;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    const answers: Array<{ question: string; answer: string }> = [
      {
        question: FIXED_EXPERIENCE_QUESTION_AZ,
        answer: expAnswer === '__other' ? `Başqa: ${expOtherText.trim()}` : expAnswer,
      },
      { question: FIXED_HEIGHT_QUESTION_AZ, answer: heightAnswer },
      ...extraQuestions.map(q => ({
        question: q.question,
        answer: extraAnswers[q.id] === '__other' ? `Başqa: ${(extraOtherTexts[q.id] || '').trim()}` : extraAnswers[q.id],
      })),
    ];
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId: tour.id,
          slotId: slot?.id,
          tourDate: slot ? formatDisplayDate(slot.startDate) : undefined,
          customerName: customerName.trim(),
          customerPhone: getFullPhoneNumber(),
          participantsCount: qty,
          answers,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t('tourDetailPage.inquiry.submitError'));
      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e?.message || t('tourDetailPage.inquiry.submitError'));
      if (onShowNotification) onShowNotification(e?.message || t('tourDetailPage.inquiry.submitError'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const radioRow = (opts: { name: string; value: string; label: string; checked: boolean; onSelect: () => void }) => (
    <label
      key={opts.value}
      className={`flex items-center gap-3 border rounded-xl px-3.5 py-3 mb-2 cursor-pointer transition ${
        opts.checked ? 'border-primary-600 bg-primary-50/60 ring-1 ring-primary-200' : 'border-slate-200 hover:bg-slate-50'
      }`}
    >
      <input
        type="radio"
        name={opts.name}
        checked={opts.checked}
        onChange={opts.onSelect}
        className="w-4 h-4 accent-[var(--color-primary-600,#1E3F20)] shrink-0"
      />
      <span className="text-sm text-slate-800 font-medium">{opts.label}</span>
    </label>
  );

  // Body-yə portal: səhifə ağacındakı stacking-context-lər (bottom nav və s.) sheet-in
  // üstünə çıxa bilmir — overlay həmişə ən üstdə olur.
  return createPortal(
    <div
      className="fixed inset-0 z-[150] bg-black/50 flex items-end sm:items-center sm:justify-center animate-sheet-backdrop-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[85vh] animate-sheet-slide-up"
      >
        {/* Mobile drag handle */}
        <div
          className="sm:hidden pt-2.5 pb-1 flex justify-center cursor-grab touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1.5 rounded-full bg-slate-300" />
        </div>

        {submitted ? (
          /* Thank-you screen (mirrors the approved mockup) */
          <div className="px-6 py-8 text-center overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" strokeWidth={2.5} />
            </div>
            <div className="font-extrabold text-lg text-slate-900 mb-2">{t('tourDetailPage.inquiry.successTitle')}</div>
            <p className="text-sm text-slate-500 leading-relaxed mb-1">{t('tourDetailPage.inquiry.successDesc')}</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 text-left text-[13px] text-slate-600 space-y-1">
              <div><strong>{t('tourDetailPage.inquiry.summaryTour')}:</strong> {getLocalizedTourName(tour, language)}</div>
              <div><strong>{t('tourDetailPage.inquiry.summaryParticipants')}:</strong> {qty}</div>
              {slot && <div><strong>{t('tourDetailPage.inquiry.summaryDate')}:</strong> {formatDisplayDate(slot.startDate)}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-5 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition cursor-pointer"
            >
              {t('tourDetailPage.inquiry.closeButton')}
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-1 sm:pt-4">
              <span className="font-extrabold text-slate-900 text-base">{t('tourDetailPage.inquiry.title')}</span>
              <button
                type="button"
                aria-label={t('tourDetailPage.inquiry.closeButton')}
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="px-5 pb-4 overflow-y-auto">
              <p className="text-[13px] text-slate-500 leading-relaxed border-b border-slate-100 pb-3.5 mb-4">
                {t('tourDetailPage.inquiry.intro')}
              </p>

              {/* Summary chips */}
              <div className="flex gap-2 flex-wrap mb-4">
                <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                  👥 {t('tourDetailPage.inquiry.chipAdults', { count: qty })}
                </span>
                {slot && (
                  <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                    📅 {formatDisplayDate(slot.startDate)}
                  </span>
                )}
              </div>

              {/* Contact fields */}
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1.5">
                    {t('tourDetailPage.inquiry.nameLabel')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t('tourDetailPage.inquiry.namePlaceholder')}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1.5">
                    {t('tourDetailPage.inquiry.phoneLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={dialCode}
                      onChange={(e) => setDialCode(e.target.value)}
                      className="w-[6.5rem] shrink-0 px-1.5 py-2.5 text-sm border border-slate-300 bg-white rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    >
                      {DIAL_CODES.map((c) => (
                        <option key={c.iso2} value={c.dialCode}>
                          {isoToFlagEmoji(c.iso2)} {c.dialCode}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder={t('tourDetailPage.inquiry.phonePlaceholder')}
                      className="flex-1 min-w-0 px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{t('tourDetailPage.inquiry.phoneHint')}</p>
                </div>
              </div>

              {/* Fixed question 1: hiking experience */}
              <div className="pt-4 border-t border-slate-100">
                <div className="font-medium text-[15px] text-slate-900 mb-2.5">{t('tourDetailPage.inquiry.expQuestion')}</div>
                {FIXED_EXPERIENCE_OPTIONS.map(opt =>
                  radioRow({
                    name: 'inquiry-exp',
                    value: opt.value,
                    label: t(`tourDetailPage.inquiry.${opt.labelKey}`),
                    checked: expAnswer === opt.value,
                    onSelect: () => setExpAnswer(opt.value),
                  })
                )}
                <label
                  className={`flex items-center gap-3 border rounded-xl px-3.5 py-3 mb-2 cursor-pointer transition ${
                    expAnswer === '__other' ? 'border-primary-600 bg-primary-50/60 ring-1 ring-primary-200' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="inquiry-exp"
                    checked={expAnswer === '__other'}
                    onChange={() => setExpAnswer('__other')}
                    className="w-4 h-4 accent-[var(--color-primary-600,#1E3F20)] shrink-0"
                  />
                  {expAnswer === '__other' ? (
                    <input
                      type="text"
                      autoFocus
                      value={expOtherText}
                      onChange={(e) => setExpOtherText(e.target.value)}
                      placeholder={t('tourDetailPage.inquiry.otherPlaceholder')}
                      className="flex-1 min-w-0 text-sm text-slate-800 outline-none bg-transparent"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-sm text-slate-800 font-medium">{t('tourDetailPage.inquiry.otherOption')}</span>
                  )}
                </label>
              </div>

              {/* Fixed question 2: fear of heights */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="font-medium text-[15px] text-slate-900 mb-2.5">{t('tourDetailPage.inquiry.heightQuestion')}</div>
                {FIXED_HEIGHT_OPTIONS.map(opt =>
                  radioRow({
                    name: 'inquiry-height',
                    value: opt.value,
                    label: t(`tourDetailPage.inquiry.${opt.labelKey}`),
                    checked: heightAnswer === opt.value,
                    onSelect: () => setHeightAnswer(opt.value),
                  })
                )}
              </div>

              {/* Vendor-defined extra questions */}
              {extraQuestions.map(q => (
                <div key={q.id} className="mt-4 pt-4 border-t border-slate-100">
                  <div className="font-medium text-[15px] text-slate-900 mb-2.5">{q.question}</div>
                  {q.options.map(opt =>
                    radioRow({
                      name: `inquiry-extra-${q.id}`,
                      value: opt,
                      label: opt,
                      checked: extraAnswers[q.id] === opt,
                      onSelect: () => setExtraAnswers(prev => ({ ...prev, [q.id]: opt })),
                    })
                  )}
                  {q.allowOther && (
                    <label
                      className={`flex items-center gap-3 border rounded-xl px-3.5 py-3 mb-2 cursor-pointer transition ${
                        extraAnswers[q.id] === '__other' ? 'border-primary-600 bg-primary-50/60 ring-1 ring-primary-200' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`inquiry-extra-${q.id}`}
                        checked={extraAnswers[q.id] === '__other'}
                        onChange={() => setExtraAnswers(prev => ({ ...prev, [q.id]: '__other' }))}
                        className="w-4 h-4 accent-[var(--color-primary-600,#1E3F20)] shrink-0"
                      />
                      {extraAnswers[q.id] === '__other' ? (
                        <input
                          type="text"
                          autoFocus
                          value={extraOtherTexts[q.id] || ''}
                          onChange={(e) => setExtraOtherTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder={t('tourDetailPage.inquiry.otherPlaceholder')}
                          className="flex-1 min-w-0 text-sm text-slate-800 outline-none bg-transparent"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-sm text-slate-800 font-medium">{t('tourDetailPage.inquiry.otherOption')}</span>
                      )}
                    </label>
                  )}
                </div>
              ))}

              {submitError && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">
                  ⚠️ {submitError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-white rounded-b-2xl pb-[calc(12px+env(safe-area-inset-bottom))] sm:pb-3">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="w-full py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-[15px] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? t('tourDetailPage.inquiry.submitting') : t('tourDetailPage.inquiry.submitButton')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
