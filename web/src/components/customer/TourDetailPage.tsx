'use client';
import React, { useState } from 'react';
import { Tour, TourSlot, Booking, Review, User } from '../../types';
import { REVIEWS_ENABLED } from '../../config/features';
import { computeFeaturedTourIds } from '../../utils/featuredTours';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedTourName, getLocalizedTourDescription, getLocalizedTourIncludes, getLocalizedTourNotIncluded, getLocalizedTourHighlights, getLocalizedGuideBio, getLocalizedGuideSpecialty } from '../../i18n/tourLocalization';
import {
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Globe,
  Grid2X2,
  Heart,
  Minus,
  Star,
  Users,
  X
} from 'lucide-react';
import { TourWeatherForecast } from '../TourWeatherForecast';
import { GpsTrackVisualizer } from '../GpsTrackVisualizer';
import { PackingListSection } from './PackingListSection';
import { TourReviewsList } from './TourReviewsList';
import { parseStoredGpxData, getRouteDurationHours } from '../../utils/gpxParser';
import { TourRouteStatsCard } from '../tours/TourRouteStatsCard';
import { ShareMenuButton } from '../tours/ShareMenuButton';
import { TourInquirySheet, MaybeBodyPortal } from './TourInquirySheet';

type ConvertedPriceInfo = {
  azn: number;
  currencySymbol: string;
  currencyCode: string;
  original: string;
  both: string;
  detailed: string;
};

interface TourDetailPageProps {
  key?: React.Key;
  selectedTour: Tour;
  tours: Tour[];
  slots: TourSlot[];
  reviews: Review[];
  users: User[];
  wishlist: string[];
  currentUser: { id: string; name: string; phone: string; balance: number; email: string };
  onAddBooking: (newBooking: Booking) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  getConvertedPriceInfo: (price: number, currency?: 'AZN' | 'USD' | 'EUR') => ConvertedPriceInfo;
  getReviewsCount: (tourId: string) => number;
  handleToggleWishlist: (tourId: string, e?: React.MouseEvent) => void;
  setSelectedOrganizer: (organizer: User | null) => void;
  setSelectedTour: (tour: Tour | null) => void;
  setLightboxIndex: (updater: number | null | ((prev: number | null) => number | null)) => void;
  packingExperienceMap: Record<string, 'beginner' | 'pro' | null>;
  packingAnalyzingMap: Record<string, boolean>;
  packingAiResultMap: Record<string, { basics: string[]; pro_gear: string[] } | null>;
  checkedPackingItems: Record<string, boolean>;
  handlePackingExperienceSelect: (tourId: string, choice: 'beginner' | 'pro') => void;
  togglePackingItemChecked: (key: string) => void;
  // When true, jumps straight to the booking/OTP form on mount using the tour's earliest
  // available slot — used by the home page's quick "WhatsApp ilə Rezerv et" popup, where the
  // whole point is skipping the gallery/description browsing step.
  autoOpenBooking?: boolean;
}

export function TourDetailPage({
  selectedTour,
  tours,
  slots,
  reviews,
  users,
  wishlist,
  currentUser,
  onAddBooking,
  onShowNotification,
  getConvertedPriceInfo,
  getReviewsCount,
  handleToggleWishlist,
  setSelectedOrganizer,
  setSelectedTour,
  setLightboxIndex,
  packingExperienceMap,
  packingAnalyzingMap,
  packingAiResultMap,
  checkedPackingItems,
  handlePackingExperienceSelect,
  togglePackingItemChecked,
  autoOpenBooking
}: TourDetailPageProps) {
  const { t, language } = useLanguage();
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<TourSlot | null>(null);
  const [bookingQty, setBookingQty] = useState<number>(1);
  const [showParticipantsDropdown, setShowParticipantsDropdown] = useState<boolean>(false);
  const [showDateDropdown, setShowDateDropdown] = useState<boolean>(false);
  // Mobile gallery: which media the big image shows (thumb strip below swaps it)
  const [mobileGalleryIndex, setMobileGalleryIndex] = useState<number>(0);
  // Day-program (itinerary) section starts open, collapsible like the approved mockup
  const [isItineraryExpanded, setIsItineraryExpanded] = useState<boolean>(true);
  const isFeaturedThisMonth = React.useMemo(() => computeFeaturedTourIds(tours, slots).has(selectedTour.id), [tours, slots, selectedTour.id]);

  // "You might also like" picks: deterministic order for SSR + first client render (a
  // Math.random() sort during render desyncs hydration), then shuffled after mount so the
  // suggestions still vary per visit like they did in the old SPA.
  const relatedToursBase = React.useMemo(
    () => tours.filter(t => t.id !== selectedTour.id),
    [tours, selectedTour.id]
  );
  const [relatedTours, setRelatedTours] = useState(() => relatedToursBase.slice(0, 4));
  React.useEffect(() => {
    setRelatedTours([...relatedToursBase].sort(() => 0.5 - Math.random()).slice(0, 4));
  }, [relatedToursBase]);

  // Opening a tour carries over whatever scroll position the home page list was at (e.g. the
  // user had scrolled down to see this card), so without this the detail page renders already
  // scrolled past the gallery/title straight into the middle of the page.
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [selectedTour.id]);

  // Keep participant count within the capacity of whichever slot is currently selected,
  // so the sticky sidebar and the booking form below always agree on the same numbers.
  React.useEffect(() => {
    if (selectedSlot) {
      const availableCapacity = Math.max(1, selectedSlot.capacity - selectedSlot.bookedCount);
      setBookingQty(prev => Math.min(Math.max(1, prev), availableCapacity));
    }
  }, [selectedSlot]);
  // Human-readable, localized date for raw ISO slot dates ("2026-07-18" → "18 İyul 2026").
  // Reuses the month names already translated for the weather widget.
  const MONTH_TRANSLATION_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const formatDisplayDate = (iso: string | undefined | null): string => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    const monthName = t(`miscWidgets.tourWeatherForecast.months.${MONTH_TRANSLATION_KEYS[Number(m) - 1]}`);
    return `${Number(d)} ${monthName} ${y}`;
  };

  // Booking-inquiry sheet ("Yerləri yoxla" → sorğu axını). Replaces the old direct-WhatsApp
  // booking form: the customer answers the pre-reservation questions and the vendor gets the
  // lead in their panel + Telegram, replying over WhatsApp themselves.
  const [showInquiry, setShowInquiry] = useState<boolean>(false);

  const earliestAvailableSlot = React.useMemo(
    () =>
      slots
        .filter(s => s.tourId === selectedTour.id && s.capacity - s.bookedCount > 0)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] || null,
    [slots, selectedTour.id]
  );

  const handleOpenInquiry = (slot?: TourSlot | null) => {
    const target = slot || selectedSlot || earliestAvailableSlot;
    if (target) setSelectedSlot(target);
    setShowInquiry(true);
  };

  // Quick-reserve popup entry point (see the home page's quick-book card button): open the
  // inquiry sheet straight away using the tour's earliest slot with open capacity.
  React.useEffect(() => {
    if (!autoOpenBooking) return;
    if (earliestAvailableSlot) handleOpenInquiry(earliestAvailableSlot);
    // Only ever run once per popup open — re-running on every render would reopen the sheet
    // the user just closed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenBooking, selectedTour.id]);

  // Mobile fixed price bar: visible while the booking widget itself is off-screen, hidden as
  // soon as it scrolls into view (same behavior as the approved mockup's bottom bar).
  const [isMobileBarHidden, setIsMobileBarHidden] = useState<boolean>(false);
  React.useEffect(() => {
    const panel = document.getElementById('booking-widget-container');
    if (!panel || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => setIsMobileBarHidden(e.isIntersecting)),
      { threshold: 0.25 }
    );
    io.observe(panel);
    return () => io.disconnect();
  }, [selectedTour.id]);

  return (
        <div className="animate-fadeIn bg-white min-h-screen pb-20">
          <div className="max-w-[var(--global-max-width)] mx-auto px-5 py-8">

            {/* Header Section */}
            <div className="mb-8 space-y-4">
              <div className="flex space-x-2 text-xs text-label-tertiary font-medium">
                <span><strong className="text-label-primary cursor-pointer pointer-events-auto hover:underline" onClick={(e) => { e.stopPropagation(); const org = users.find(u => u.id === selectedTour.vendorId); if (org) { setSelectedOrganizer(org); } }}>{selectedTour.vendorName}</strong> {t('tourDetailPage.header.by')}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-label-primary tracking-tight leading-tight">
                {getLocalizedTourName(selectedTour, language)}
              </h1>
              <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-4">
                  {isFeaturedThisMonth && (
                    <div className="bg-amber-500 text-white border border-amber-600 text-xs font-extrabold px-2 py-1 rounded shadow-sm shrink-0">🔥 {t('tourDetailPage.header.bestSellerBadge')}</div>
                  )}
                  {REVIEWS_ENABLED && selectedTour.rating != null && (
                    <div className="flex items-center gap-1 font-bold text-label-primary text-sm shrink-0">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      {selectedTour.rating.toFixed(1)} <span className="text-label-tertiary font-normal underline decoration-slate-300">({t('tourDetailPage.header.reviewsCount', { count: getReviewsCount(selectedTour.id) })})</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 font-bold text-label-primary text-sm shrink-0">
                     • <span className="text-label-secondary font-normal">{selectedTour.region}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleWishlist(selectedTour.id)}
                    className={`flex items-center gap-2 border rounded-full px-4 py-2 font-extrabold text-sm transition cursor-pointer shadow-sm ${
                      wishlist.includes(selectedTour.id)
                        ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${wishlist.includes(selectedTour.id) ? 'fill-rose-600 text-rose-600' : ''}`} />
                    {wishlist.includes(selectedTour.id) ? t('tourDetailPage.header.inWishlist') : t('tourDetailPage.header.addToWishlist')}
                  </button>
                  <ShareMenuButton
                    tour={selectedTour}
                    slots={slots}
                    onShowNotification={onShowNotification}
                    showLabel
                    iconClassName="w-4 h-4"
                    buttonClassName="flex items-center gap-2 border border-slate-200 rounded-full px-4 py-2 hover:bg-slate-50 text-slate-700 font-extrabold text-sm transition cursor-pointer shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* TWO COLUMN WRAPPER — items-stretch (default) so the right column wrapper is as tall as the
                left column's content; without that, the sticky sidebar's own container is only as tall as
                the sidebar itself, leaving no scroll room for position:sticky to actually stick. */}
            <div className="flex flex-col lg:flex-row gap-10 relative items-stretch">
              
              {/* LEFT COLUMN: Gallery & Info */}
              <div className="w-full lg:w-[65%] shrink-0 space-y-10">
                
                {/* Asymmetric Gallery (Bento) */}
                {(() => {
                  const allMedia = [selectedTour.image, ...(selectedTour.images || []), ...(selectedTour.videos || [])].filter(Boolean);
                  return (
                    <>
                      <div className="hidden md:grid grid-cols-3 grid-rows-2 gap-2 h-[450px] relative rounded-2xl overflow-hidden shrink-0 bg-slate-100">
                        <div className="col-span-2 row-span-2 cursor-pointer relative overflow-hidden group" onClick={() => setLightboxIndex(0)}>
                          <img src={allMedia[0]} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
                        </div>
                        <div className="col-span-1 row-span-1 cursor-pointer relative overflow-hidden group" onClick={() => setLightboxIndex(1)}>
                          <img src={allMedia[1] || allMedia[0]} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
                        </div>
                        <div className="col-span-1 row-span-1 cursor-pointer relative overflow-hidden group" onClick={() => setLightboxIndex(2)}>
                          <img src={allMedia[2] || allMedia[0]} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
                          
                          <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-end p-4 pointer-events-none">
                            <button className="bg-white/95 text-slate-900 px-4 py-2 border border-slate-200 rounded-lg shadow-sm text-sm font-extrabold flex items-center gap-2 pointer-events-auto hover:bg-slate-50 transition cursor-pointer">
                              <Grid2X2 className="w-4 h-4" /> {t('tourDetailPage.gallery.viewAll')}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Gallery — main image + tappable thumbnail strip (approved mockup) */}
                      <div className="md:hidden space-y-2">
                        <div className="relative h-[300px] rounded-2xl overflow-hidden shadow-sm block bg-slate-100">
                          <img src={allMedia[mobileGalleryIndex] || allMedia[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute bottom-3 right-3 pointer-events-auto">
                            <button onClick={() => setLightboxIndex(mobileGalleryIndex)} className="bg-white/95 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer border border-slate-200">
                              <Grid2X2 className="w-3.5 h-3.5" /> {t('tourDetailPage.gallery.viewAllImages')}
                            </button>
                          </div>
                        </div>
                        {allMedia.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {allMedia.map((m, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setMobileGalleryIndex(idx)}
                                className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition ${
                                  mobileGalleryIndex === idx ? 'border-primary-500' : 'border-transparent opacity-80'
                                }`}
                              >
                                <img src={m} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-b border-slate-200">
                  <div className="flex flex-col gap-1.5">
                    <Calendar className="w-6 h-6 text-slate-700 mb-1" />
                    <span className="text-sm font-extrabold text-slate-900">{(selectedTour.cancellationHours ?? 48) === 0 ? t('tourDetailPage.quickInfo.noCancellation') : t('tourDetailPage.quickInfo.freeCancellation')}</span>
                    <span className="text-xs text-slate-500 leading-snug">
                      {(selectedTour.cancellationHours ?? 48) === 0
                        ? t('tourDetailPage.quickInfo.noCancellationDesc')
                        : t('tourDetailPage.quickInfo.freeCancellationDesc', { hours: selectedTour.cancellationHours ?? 48 })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Clock className="w-6 h-6 text-slate-700 mb-1" />
                    <span className="text-sm font-extrabold text-slate-900">{selectedTour.durationDays >= 2
                      ? t('tourDetailPage.quickInfo.durationDays', { days: selectedTour.durationDays })
                      : t('tourDetailPage.quickInfo.duration', { hours: selectedTour.durationHours ?? (selectedTour.durationDays * 8) })}</span>
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById('tour-full-description')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="text-xs text-slate-500 leading-snug text-left underline decoration-dotted underline-offset-2 hover:text-slate-700 cursor-pointer"
                    >
                      {t('tourDetailPage.quickInfo.checkStartTimes')}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Globe className="w-6 h-6 text-slate-700 mb-1" />
                    <span className="text-sm font-extrabold text-slate-900">{t('tourDetailPage.quickInfo.professionalGuide')}</span>
                    <span className="text-xs text-slate-500 leading-snug">
                      {selectedTour.languages && selectedTour.languages.length > 0 ? selectedTour.languages.join(', ') : t('tourDetailPage.quickInfo.azerbaijaniLanguage')}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Users className="w-6 h-6 text-slate-700 mb-1" />
                    <span className="text-sm font-extrabold text-slate-900">{t('tourDetailPage.quickInfo.privateGroupTours')}</span>
                    <span className="text-xs text-slate-500 leading-snug">{t('tourDetailPage.quickInfo.selectableAtBooking')}</span>
                  </div>
                </div>

                {/* Qiymətə daxildir / daxil deyil (Modern Grid) — turun dəyərini istifadəçi ilk açılışda görsün deyə ən yuxarıda */}
                <div className="space-y-4 py-4">
                  <h2 className="text-xl font-extrabold text-slate-900">{t('tourDetailPage.priceIncludes.title')}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Daxildir */}
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 space-y-3.5">
                      <h3 className="text-xs font-black text-emerald-700 tracking-wider uppercase">{t('tourDetailPage.priceIncludes.includedHeader')}</h3>
                      <div className="space-y-3">
                        {(selectedTour.includes && selectedTour.includes.length > 0
                          ? getLocalizedTourIncludes(selectedTour, language)
                          : [t('tourDetailPage.priceIncludes.defaultIncluded1'), t('tourDetailPage.priceIncludes.defaultIncluded2')]
                        ).map((item, idx) => (
                          <div key={`inc-${idx}`} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            <span className="text-slate-700 text-sm font-medium">{item}</span>
                          </div>
                        ))}
                        {selectedTour.mealType && (
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            <span className="text-slate-700 text-sm font-medium">{t('tourDetailPage.priceIncludes.mealLabel', { meal: selectedTour.mealType })}</span>
                          </div>
                        )}
                        {selectedTour.flightIncluded && (
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            <span className="text-slate-700 text-sm font-medium">{t('tourDetailPage.priceIncludes.flightIncluded')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Daxil deyil */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5">
                      <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase">{t('tourDetailPage.priceIncludes.notIncludedHeader')}</h3>
                      <div className="space-y-3">
                        {(selectedTour.notIncluded && selectedTour.notIncluded.length > 0
                          ? getLocalizedTourNotIncluded(selectedTour, language)
                          : [t('tourDetailPage.priceIncludes.defaultNotIncluded1')]
                        ).map((item, idx) => (
                          <div key={`exc-${idx}`} className="flex items-start gap-3">
                            <Minus className="w-5 h-5 text-slate-300 shrink-0" />
                            <span className="text-slate-500 text-sm font-medium">{item}</span>
                          </div>
                        ))}
                        {!selectedTour.flightIncluded && selectedTour.isInternational && (
                          <div className="flex items-start gap-3">
                            <Minus className="w-5 h-5 text-slate-300 shrink-0" />
                            <span className="text-slate-500 text-sm font-medium">{t('tourDetailPage.priceIncludes.flightsSeparate')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Highlights */}
                <div className="space-y-4 py-4 border-t border-slate-200">
                  <h2 className="text-xl font-extrabold text-slate-900">{t('tourDetailPage.highlights.title')}</h2>
                  <div className="flex flex-col gap-4">
                    {(selectedTour.highlights && selectedTour.highlights.length > 0
                      ? getLocalizedTourHighlights(selectedTour, language)
                      : [
                          t('tourDetailPage.highlights.defaultHighlight1', { region: selectedTour.region }),
                          t('tourDetailPage.highlights.defaultHighlight2', { difficulty: selectedTour.difficulty }),
                          ...(selectedTour.isInternational ? [t('tourDetailPage.highlights.defaultHighlight3', { city: selectedTour.destinationCity })] : [])
                        ]
                    ).map((highlight, idx) => (
                      <div key={idx} className="flex items-start gap-4">
                        <div className="mt-0.5"><Check className="w-5 h-5 text-emerald-600" /></div>
                        <span className="text-slate-700 leading-relaxed font-medium">{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Full description */}
                <div id="tour-full-description" className="space-y-4 py-4 border-t border-slate-200 scroll-mt-24">
                  <h2 className="text-xl font-extrabold text-slate-900">{t('tourDetailPage.fullDescription.title')}</h2>
                  {(() => { const localizedDescription = getLocalizedTourDescription(selectedTour, language); return (
                  <div className="relative">
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isDescExpanded || localizedDescription.length <= 320 ? 'max-h-[1000px]' : 'max-h-[150px]'
                      }`}
                    >
                      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line font-medium antialiased">
                        {localizedDescription}
                      </p>
                    </div>
                    {!isDescExpanded && localizedDescription.length > 320 && (
                      <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    )}
                  </div>
                  ); })()}
                  {getLocalizedTourDescription(selectedTour, language).length > 320 && (
                    <button
                      type="button"
                      onClick={() => setIsDescExpanded(!isDescExpanded)}
                      className="group inline-flex items-center gap-1.5 text-sm font-extrabold text-slate-900 hover:text-emerald-700 cursor-pointer transition-colors mt-1"
                    >
                      <span className="transition-transform duration-300 group-hover:translate-y-0.5">
                        {isDescExpanded ? t('tourDetailPage.fullDescription.readLess') : t('tourDetailPage.fullDescription.readMore')}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5 ${
                          isDescExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Meeting Point */}
                {selectedTour.meetingPoint && (
                  <div className="space-y-4 py-4 border-t border-slate-200">
                    <h2 className="text-xl font-extrabold text-slate-900">{t('tourDetailPage.meetingPoint.title')}</h2>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">
                      {selectedTour.meetingPoint}
                    </p>
                    {selectedTour.meetingPointEmbedUrl && (
                      <iframe
                        src={selectedTour.meetingPointEmbedUrl}
                        width="100%"
                        height="400"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        className="rounded-xl h-[250px] sm:h-[400px]"
                      />
                    )}
                  </div>
                )}

                {/* Important Information */}
                <div className="space-y-4 py-4 border-t border-slate-200">
                  <h2 className="text-xl font-extrabold text-slate-900">{t('tourDetailPage.importantInfo.title')}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-3">{t('tourDetailPage.importantInfo.bringHeader')}</h3>
                      <ul className="space-y-2">
                        {(selectedTour.importantInfo?.bring && selectedTour.importantInfo.bring.length > 0
                          ? selectedTour.importantInfo.bring
                          : [selectedTour.requiredEquipment || t('tourDetailPage.importantInfo.defaultBring1'), t('tourDetailPage.importantInfo.defaultBring2'), t('tourDetailPage.importantInfo.defaultBring3')]
                        ).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                            <Check className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-3">{t('tourDetailPage.importantInfo.notAllowedHeader')}</h3>
                      <ul className="space-y-2">
                        {(selectedTour.importantInfo?.notAllowed && selectedTour.importantInfo.notAllowed.length > 0
                          ? selectedTour.importantInfo.notAllowed
                          : [t('tourDetailPage.importantInfo.defaultNotAllowed1'), t('tourDetailPage.importantInfo.defaultNotAllowed2')]
                        ).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                            <X className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Extra dynamic details (Weather, GPT assistant) */}
                <div className="space-y-6 pt-4 border-t border-slate-200">

              {/* Tabs Info / Scheduling */}
                <div className="space-y-6">
                  {/* Dynamic Integrations */}

                  {/* High fidelity Weather Integration */}
                  {slots.filter(s => s.tourId === selectedTour.id).length > 0 && (
                    <TourWeatherForecast 
                      dates={slots.filter(s => s.tourId === selectedTour.id).map(s => s.startDate)} 
                      region={selectedTour.region} 
                      variant="detailed" 
                    />
                  )}

                  {/* GPX-derived route stats + mini route map, sitting above the full 3D explorer below */}
                  {(() => {
                    const parsedGpx = parseStoredGpxData(selectedTour.gpxData);
                    if (!parsedGpx) return null;

                    const isSportActive = selectedTour.category === 'active' || selectedTour.isActiveLife;
                    let difficultyBarColorClass = 'bg-sky-500';
                    let difficultyPercent = 60;
                    let difficultyLabel = t(`customerHome.toursHomeView.difficulty.${selectedTour.difficulty}`);
                    if (selectedTour.difficulty === 'easy') { difficultyBarColorClass = 'bg-emerald-500'; difficultyPercent = 30; }
                    else if (selectedTour.difficulty === 'hard') { difficultyBarColorClass = 'bg-rose-500'; difficultyPercent = 85; }
                    else if (selectedTour.difficulty === 'extreme') { difficultyBarColorClass = 'bg-red-700'; difficultyPercent = 100; }

                    if (isSportActive) {
                      const activeDiff = selectedTour.activeDifficulty || (selectedTour.difficulty === 'easy' ? 'beginner' : selectedTour.difficulty === 'hard' || selectedTour.difficulty === 'extreme' ? 'professional' : 'medium');
                      if (activeDiff === 'beginner' || activeDiff === 'easy') {
                        difficultyBarColorClass = 'bg-emerald-500'; difficultyPercent = 30;
                        difficultyLabel = `🟢 ${t('customerHome.toursHomeView.activeDifficulty.beginner')}`;
                      } else if (activeDiff === 'medium') {
                        difficultyBarColorClass = 'bg-sky-500'; difficultyPercent = 60;
                        difficultyLabel = `🟡 ${t('customerHome.toursHomeView.activeDifficulty.medium')}`;
                      } else {
                        difficultyBarColorClass = 'bg-rose-500'; difficultyPercent = 85;
                        difficultyLabel = `🔴 ${t('customerHome.toursHomeView.activeDifficulty.professional')}`;
                      }
                    }

                    // Actual on-trail hiking time estimated from the real GPX track, not the
                    // manually-entered trip-wide duration (which includes transport/rest days).
                    const durationLabel = `${getRouteDurationHours(parsedGpx)} ${t('miscWidgets.tourRouteStatsCard.hours')}`;

                    return (
                      <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
                        <TourRouteStatsCard
                          tour={selectedTour}
                          parsed={parsedGpx}
                          durationLabel={durationLabel}
                          difficultyLabel={difficultyLabel}
                          difficultyBarColorClass={difficultyBarColorClass}
                          difficultyPercent={difficultyPercent}
                          ratingValue={4.9}
                        />
                      </div>
                    );
                  })()}

                  {/* Stunning Interactive 3D/2D GPX Trail Explorer Map */}
                  {selectedTour.gpxData && (
                    <GpsTrackVisualizer gpxDataString={selectedTour.gpxData} />
                  )}

                  {(() => {
                    const organizer = users.find(u => u.id === selectedTour.vendorId);
                    if (organizer && organizer.guides && organizer.guides.length > 0) {
                      return (
                        <div className="mt-6 mb-2 border border-slate-200 rounded-2xl p-5 bg-gradient-to-r from-slate-50 to-white shadow-sm">
                          <h4 className="font-extrabold text-slate-800 mb-4 text-sm flex items-center gap-2">
                            👥 {t('tourDetailPage.organizerTeam.title')}
                          </h4>
                          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none sm:scrollbar-thin">
                            {organizer.guides.map((g, i) => (
                              <div key={i} className="flex flex-col items-start flex-shrink-0 w-[260px] snap-start bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition hover:shadow-md">
                                <div className="flex items-center gap-4 mb-3 w-full">
                                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border-2 border-emerald-50 flex-shrink-0">
                                    {g.avatar ? <img src={g.avatar} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center font-bold text-slate-400 w-full h-full text-sm">{g.name.charAt(0)}</span>}
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                     <span className="text-sm font-bold text-slate-800 block truncate" title={g.name}>{g.name}</span>
                                     <span className="text-[10px] text-emerald-600 font-bold block line-clamp-2 tracking-wide mt-0.5" title={getLocalizedGuideSpecialty(g, language)}>{getLocalizedGuideSpecialty(g, language) || t('tourDetailPage.organizerTeam.defaultSpecialty')}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-3" title={getLocalizedGuideBio(g, language)}>{getLocalizedGuideBio(g, language)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Smart Pack Assistant vs. International Travel Agent Integration */}
                  {selectedTour.isInternational ? (
                    <div className="bg-gradient-to-br from-indigo-900/10 to-teal-900/5 border border-indigo-200/60 rounded-2xl p-6 space-y-5 shadow-3xs hover:border-indigo-300 transition duration-300">
                      <div className="flex items-start justify-between flex-wrap gap-3 border-b border-indigo-200/40 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">✈️</span>
                          <div>
                            <h4 className="text-xs font-black text-indigo-950 tracking-widest leading-none">
                              {t('tourDetailPage.internationalPlanner.title')}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-bold mt-1.5 leading-none">
                              {t('tourDetailPage.internationalPlanner.subtitle', { country: selectedTour.destinationCountry, city: selectedTour.destinationCity })}
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-white bg-indigo-600 px-2.5 py-1 rounded tracking-widest">
                          {t('tourDetailPage.internationalPlanner.smartGuideBadge')}
                        </span>
                      </div>

                      {/* PART 1: WEATHER FORECAST SPECIALLY INTEGRATED FOR DESTINATION */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-black text-indigo-900 tracking-wider flex items-center gap-1">
                          ☀️ {t('tourDetailPage.internationalPlanner.weatherTitle')}
                        </h5>

                        <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-4xs grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                          {selectedTour.itinerary && selectedTour.itinerary.map((it, idx) => {
                            const weathers = [
                              { temp: '24°C', tag: t('tourDetailPage.internationalPlanner.weatherClearSky'), emoji: '☀️' },
                              { temp: '22°C', tag: t('tourDetailPage.internationalPlanner.weatherBrightDay'), emoji: '🌤️' },
                              { temp: '25°C', tag: t('tourDetailPage.internationalPlanner.weatherPartlyCloudy'), emoji: '⛅' },
                              { temp: '21°C', tag: t('tourDetailPage.internationalPlanner.weatherGreatWeather'), emoji: '☀️' },
                              { temp: '23°C', tag: t('tourDetailPage.internationalPlanner.weatherCoolBreeze'), emoji: '🌬️' },
                              { temp: '24°C', tag: t('tourDetailPage.internationalPlanner.weatherNiceWeather'), emoji: '☀️' },
                            ];
                            const w = weathers[idx % weathers.length];
                            return (
                              <div key={idx} className="bg-slate-50/50 p-2 rounded-lg border border-slate-100 flex flex-col items-center">
                                <span className="text-[9px] font-extrabold text-slate-400 block tracking-tight">{t('tourDetailPage.internationalPlanner.dayLabel', { day: it.day })}</span>
                                <span className="text-xl my-1">{w.emoji}</span>
                                <span className="text-xs font-black text-slate-800 leading-none">{w.temp}</span>
                                <span className="text-[9px] text-slate-500 font-medium block truncate mt-0.5 max-w-[90px]">{w.tag}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* PART 2: THE SPOTS COVERED IN THESE DAYS */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-black text-indigo-900 tracking-wider flex items-center gap-1.5">
                          📍 {t('tourDetailPage.internationalPlanner.placesTitle')}
                        </h5>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {selectedTour.itinerary && selectedTour.itinerary.map((day, di) => {
                            let mainPlace = selectedTour.destinationCity;
                            if (day.title.includes('Kilsə') || day.title.includes('Kolizey') || day.title.includes('Məbəd') || day.title.includes('Vadi') || day.title.includes('Ubud')) {
                              mainPlace = day.title.split(':')[0] || selectedTour.destinationCity;
                            }
                            return (
                              <div
                                key={di}
                                className="bg-white p-3 rounded-xl border border-slate-150 flex items-start gap-2.5"
                              >
                                <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-150 text-[10px] font-bold text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                                  {day.day}
                                </div>
                                <div className="space-y-1 overflow-hidden">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[9px] font-extrabold text-indigo-805 bg-indigo-55/75 px-1.5 py-0.5 rounded leading-none truncate">
                                      🗺️ {mainPlace}
                                    </span>
                                  </div>
                                  <h6 className="text-[10px] font-extrabold text-ink-800 leading-tight truncate">{day.title}</h6>
                                  <p className="text-[9.5px] text-slate-500 leading-snug line-clamp-2">{day.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <PackingListSection
                      tourId={selectedTour.id}
                      packingExperienceMap={packingExperienceMap}
                      packingAnalyzingMap={packingAnalyzingMap}
                      aiResult={packingAiResultMap[selectedTour.id] || null}
                      checkedPackingItems={checkedPackingItems}
                      onSelectExperience={handlePackingExperienceSelect}
                      onToggleChecked={togglePackingItemChecked}
                    />
                  )}

                  {/* Mehmanxana və Nəqliyyat Loqistikası */}
                  {selectedTour.isInternational && (
                    <div className="bg-gradient-to-r from-amber-500/10 to-teal-800/5 border border-amber-200 p-5 rounded-xl space-y-4">
                      <h4 className="text-xs font-black text-amber-900 tracking-wider flex items-center gap-1.5 border-b pb-1.5 border-amber-200">
                        🏨 {t('tourDetailPage.hotelLogistics.title')}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 text-xs">
                          <span className="text-slate-400 block font-bold text-[9px]">{t('tourDetailPage.hotelLogistics.hotelTypeLabel')}</span>
                          <span className="text-slate-900 font-bold block">{selectedTour.hotelName}</span>
                          <span className="text-amber-500 text-xs tracking-widest font-bold block">
                            {Array(Number(selectedTour.hotelStars || 5)).fill('★').join('')}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <span className="text-slate-400 block font-bold text-[9px]">{t('tourDetailPage.hotelLogistics.mealPlanLabel')}</span>
                          <span className="text-primary-900 font-extrabold block">🍽️ {selectedTour.mealType || t('tourDetailPage.hotelLogistics.defaultMeal')}</span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <span className="text-slate-400 block font-bold text-[9px]">{t('tourDetailPage.hotelLogistics.flightTicketsLabel')}</span>
                          <span className="text-slate-700 block text-[11px] font-medium leading-relaxed">
                            {selectedTour.flightIncluded ? t('tourDetailPage.hotelLogistics.flightIncluded') : t('tourDetailPage.hotelLogistics.flightNotIncluded')}
                          </span>
                          {selectedTour.flightDetails && (
                            <span className="text-[10px] text-slate-500 italic block mt-0.5">{selectedTour.flightDetails}</span>
                          )}
                        </div>

                        <div className="space-y-1 text-xs">
                          <span className="text-slate-400 block font-bold text-[9px]">{t('tourDetailPage.hotelLogistics.transferLabel')}</span>
                          <span className="text-slate-700 block text-[11px] font-medium leading-relaxed">🚍 {selectedTour.transferDetails || t('tourDetailPage.hotelLogistics.defaultTransfer')}</span>
                        </div>
                      </div>

                      {/* Room options pricing */}
                      {selectedTour.roomTypes && selectedTour.roomTypes.length > 0 && (
                        <div className="bg-white p-3 rounded-lg border border-amber-150 space-y-2 mt-2">
                          <span className="text-[10px] text-amber-900 font-extrabold block tracking-wide">
                            🏨 {t('tourDetailPage.hotelLogistics.roomTypesTitle')}
                          </span>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {selectedTour.roomTypes.map((room, ri) => (
                              <div key={ri} className="bg-slate-50 p-2 rounded border border-slate-100 text-[10px]">
                                <span className="block text-slate-500 font-bold">{room.name}</span>
                                <strong className="block text-emerald-800 font-black">
                                  +{room.priceDiff} {selectedTour.priceCurrency || '₼'}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gündəlik Səyahət Proqramı (Itinerary Map) — collapsible per the approved mockup */}
                  {selectedTour.isInternational && selectedTour.itinerary && selectedTour.itinerary.length > 0 && (
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => setIsItineraryExpanded(prev => !prev)}
                        className="w-full text-xs font-black text-slate-500 tracking-widest border-b pb-1.5 flex items-center justify-between gap-1.5 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">⏳ {t('tourDetailPage.itineraryDetail.title')}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isItineraryExpanded ? '' : '-rotate-90'}`} />
                      </button>

                      {isItineraryExpanded && (
                      <div className="space-y-5">
                        {selectedTour.itinerary.map((day, di) => (
                          <div key={di} className="relative pl-6 border-l-2 border-amber-500/40 space-y-2">
                            {/* Marker */}
                            <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white ring-2 ring-amber-500/20" />

                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                              <span className="text-xs font-black text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-sm">
                                📅 {t('tourDetailPage.itineraryDetail.dayNumber', { day: day.day })}
                              </span>
                              <h5 className="text-xs font-extrabold text-ink-900 flex-1 sm:ml-3">
                                {day.title}
                              </h5>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed pl-1">
                              {day.description}
                            </p>

                            {day.image ? (
                              <div className="mt-2 h-36 max-w-md rounded-lg overflow-hidden bg-slate-100 border border-slate-150 shadow-sm relative group">
                                <img
                                  src={day.image}
                                  alt={day.title}
                                  className="w-full h-full object-cover transition duration-350 group-hover:scale-101"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      )}
                    </div>
                  )}

                  {/* Historical verified feedbacks inside detailed modals */}
                  {/* Ödəniş sistemi olmadığı üçün müvəqqəti söndürülüb, bax: REVIEWS_ENABLED */}
                  {REVIEWS_ENABLED && (
                    <TourReviewsList
                      tourId={selectedTour.id}
                      reviews={reviews}
                      reviewsCount={getReviewsCount(selectedTour.id)}
                    />
                  )}
                </div>

            </div> {/* Closes Extra dynamic details */}
          </div> {/* Closes Left Column */}
            
          {/* RIGHT COLUMN: Sticky Booking Widget (GYG Style) */}
            <div className="w-full lg:w-[35%] relative" id="booking-widget-container">
              <div className="sticky top-24 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200">
                <div className="p-6 space-y-6">
                  {/* Pricing Header */}
                  <div className="flex flex-col gap-1">
                    {slots.filter(s => s.tourId === selectedTour.id).length > 0 ? (
                      (() => {
                        const basePrice = selectedTour.price ?? slots.filter(s => s.tourId === selectedTour.id)[0].price;
                        const hasDiscount = !!selectedTour.discountPrice && selectedTour.discountPrice > 0 && selectedTour.discountPrice < basePrice;
                        return hasDiscount ? (
                          <>
                            <span className="line-through text-label-tertiary text-sm">
                              {getConvertedPriceInfo(basePrice, selectedTour.priceCurrency).both}
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-extrabold text-label-critical bg-surface-critical-weak px-1.5 rounded-md">
                                {getConvertedPriceInfo(selectedTour.discountPrice!, selectedTour.priceCurrency).both}
                              </span>
                              <span className="text-label-secondary font-medium text-sm">{t('tourDetailPage.pricingHeader.perPerson')}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-label-primary">
                              {getConvertedPriceInfo(basePrice, selectedTour.priceCurrency).both}
                            </span>
                            <span className="text-label-secondary font-medium text-sm">{t('tourDetailPage.pricingHeader.perPerson')}</span>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-400">{t('tourDetailPage.pricingHeader.noData')}</span>
                      </div>
                    )}
                  </div>

                  {/* Selectors */}
                  <div className="space-y-4">
                    <div className="flex flex-col border border-slate-300 rounded-xl shadow-xs hover:border-slate-400 transition-colors">
                      {/* Participants Dropdown — bound to the same bookingQty used by the reservation form below */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowParticipantsDropdown(prev => !prev)}
                          className="w-full flex items-center justify-between bg-white px-4 py-3 border-b border-slate-200 text-left cursor-pointer hover:bg-slate-50 rounded-t-xl"
                        >
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-emerald-700" />
                            <span className="text-sm font-extrabold text-slate-800">{t('tourDetailPage.participantsDropdown.adultsCount', { count: bookingQty })}</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showParticipantsDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showParticipantsDropdown && (() => {
                          const maxParticipants = selectedSlot ? Math.max(1, selectedSlot.capacity - selectedSlot.bookedCount) : 20;
                          return (
                            <MaybeBodyPortal>
                            <div className="fixed inset-0 z-10 max-sm:z-[140] max-sm:bg-black/40 max-sm:animate-sheet-backdrop-in" onClick={() => setShowParticipantsDropdown(false)} />
                            {/* sm+: anchored dropdown; mobile: bottom sheet (approved mockup) */}
                            <div className="absolute left-0 right-0 top-full z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-4 mt-1 max-sm:fixed max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:mt-0 max-sm:z-[150] max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:border-0 max-sm:shadow-2xl max-sm:animate-sheet-slide-up max-sm:pb-[calc(16px+env(safe-area-inset-bottom))]">
                              <div className="sm:hidden flex justify-center pb-2 -mt-1">
                                <div className="w-10 h-1.5 rounded-full bg-slate-300" />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-700">{t('tourDetailPage.participantsDropdown.adults')}</span>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    disabled={bookingQty <= 1}
                                    onClick={() => setBookingQty(prev => Math.max(1, prev - 1))}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold w-8 h-8 rounded-full flex items-center justify-center transition disabled:opacity-40"
                                  >
                                    -
                                  </button>
                                  <span className="font-bold text-slate-800 text-sm w-4 text-center">{bookingQty}</span>
                                  <button
                                    type="button"
                                    disabled={bookingQty >= maxParticipants}
                                    onClick={() => setBookingQty(prev => Math.min(maxParticipants, prev + 1))}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold w-8 h-8 rounded-full flex items-center justify-center transition disabled:opacity-40"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              {selectedSlot && (
                                <p className="text-[10px] text-slate-400 italic mt-2">
                                  {t('tourDetailPage.participantsDropdown.maxSpotsAvailable', { count: maxParticipants })}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => setShowParticipantsDropdown(false)}
                                className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                              >
                                {t('tourDetailPage.participantsDropdown.confirm')}
                              </button>
                            </div>
                            </MaybeBodyPortal>
                          );
                        })()}
                      </div>

                      {/* Date Dropdown — lists only this tour's real slots; full/expired dates are disabled */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowDateDropdown(prev => !prev)}
                          className="w-full flex items-center justify-between bg-white px-4 py-3 text-left cursor-pointer hover:bg-slate-50 rounded-b-xl"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-emerald-700" />
                            <span className="text-sm font-extrabold text-slate-800">{selectedSlot ? t('tourDetailPage.dateDropdown.selectedDate', { date: formatDisplayDate(selectedSlot.startDate) }) : t('tourDetailPage.dateDropdown.selectDate')}</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showDateDropdown && (
                          <MaybeBodyPortal>
                          <div className="fixed inset-0 z-10 max-sm:z-[140] max-sm:bg-black/40 max-sm:animate-sheet-backdrop-in" onClick={() => setShowDateDropdown(false)} />
                          {/* sm+: anchored dropdown; mobile: bottom sheet (approved mockup) */}
                          <div className="absolute left-0 right-0 top-full z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-2 mt-1 max-h-64 overflow-y-auto max-sm:fixed max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:mt-0 max-sm:z-[150] max-sm:max-h-[60vh] max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:border-0 max-sm:shadow-2xl max-sm:animate-sheet-slide-up max-sm:p-4 max-sm:pb-[calc(16px+env(safe-area-inset-bottom))]">
                            <div className="sm:hidden flex justify-center pb-2">
                              <div className="w-10 h-1.5 rounded-full bg-slate-300" />
                            </div>
                            {slots.filter(s => s.tourId === selectedTour.id).length === 0 ? (
                              <p className="text-xs text-slate-400 font-medium p-3 text-center">{t('tourDetailPage.dateDropdown.noActiveDate')}</p>
                            ) : (
                              [...slots.filter(s => s.tourId === selectedTour.id)]
                                .sort((a, b) => a.startDate.localeCompare(b.startDate))
                                .map((slot) => {
                                  const remainingSpots = Math.max(0, slot.capacity - slot.bookedCount);
                                  const dateParts = slot.startDate.split('-');
                                  const slotDate = dateParts.length >= 3
                                    ? new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]))
                                    : null;
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const isPast = slotDate ? slotDate < today : false;
                                  const isDisabled = remainingSpots <= 0 || isPast;
                                  return (
                                    <button
                                      key={slot.id}
                                      type="button"
                                      disabled={isDisabled}
                                      onClick={() => {
                                        setSelectedSlot(slot);
                                        setShowDateDropdown(false);
                                      }}
                                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition ${
                                        isDisabled
                                          ? 'opacity-40 cursor-not-allowed'
                                          : selectedSlot?.id === slot.id
                                            ? 'bg-emerald-50 border border-emerald-300'
                                            : 'hover:bg-slate-50 cursor-pointer'
                                      }`}
                                    >
                                      <span className="text-xs font-bold text-slate-700">📅 {formatDisplayDate(slot.startDate)}</span>
                                      <span className={`text-[10px] font-bold ${isDisabled ? 'text-red-400' : 'text-slate-400'}`}>
                                        {isPast ? t('tourDetailPage.dateDropdown.ended') : remainingSpots <= 0 ? t('tourDetailPage.dateDropdown.full') : t('tourDetailPage.dateDropdown.spotsLeft', { count: remainingSpots })}
                                      </span>
                                    </button>
                                  );
                                })
                            )}
                          </div>
                          </MaybeBodyPortal>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA — opens the booking-inquiry sheet (auto-selecting the earliest
                      available date when none is picked yet). */}
                  <button
                    type="button"
                    disabled={!selectedSlot && !earliestAvailableSlot}
                    onClick={() => handleOpenInquiry()}
                    className="w-full bg-primary-500 hover:bg-primary-600 text-white text-base md:text-lg font-black py-3.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer block text-center disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('tourDetailPage.sidebar.checkAvailability')}
                  </button>

                  {/* Guarantees */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 rounded-full p-0.5 shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-extrabold text-slate-800">{(selectedTour.cancellationHours ?? 48) === 0 ? t('tourDetailPage.quickInfo.noCancellation') : t('tourDetailPage.quickInfo.freeCancellation')}</h4>
                        <p className="text-xs text-slate-500 font-medium leading-snug">
                          {(selectedTour.cancellationHours ?? 48) === 0
                            ? t('tourDetailPage.quickInfo.noCancellationDesc')
                            : t('tourDetailPage.sidebar.fullRefundDesc', { hours: selectedTour.cancellationHours ?? 48 })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 rounded-full p-0.5 shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-extrabold text-slate-800">{t('tourDetailPage.sidebar.reserveNowPayLaterTitle')}</h4>
                        <p className="text-xs text-slate-500 font-medium leading-snug">{t('tourDetailPage.sidebar.reserveNowPayLaterDesc')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div> {/* Closes TWO COLUMN WRAPPER */}

          {/* YOU MIGHT ALSO LIKE SECTION */}
          <div className="mt-16 pt-16 border-t border-slate-200">
            <h2 className="text-2xl font-extrabold text-label-primary mb-8">{t('tourDetailPage.relatedTours.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                {relatedTours
                  .map(tour => {
                    const priceList = slots.filter(s => s.tourId === tour.id).map(s => s.price);
                    const minPrice = priceList.length > 0 ? Math.min(...priceList) : null;
                    return (
                      <div
                        key={tour.id}
                        className="group flex flex-col bg-white border border-[#E4E6E9] rounded-2xl overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer h-full"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          setSelectedTour(tour);
                          setShowInquiry(false);
                          setSelectedSlot(null);
                        }}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <img
                            src={tour.image}
                            alt={getLocalizedTourName(tour, language)}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <button className="absolute top-3 right-3 bg-white/90 p-2 rounded-full text-slate-700 hover:text-rose-600 transition shadow-sm" onClick={(e) => { e.stopPropagation(); }}>
                            <Heart className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-4 flex flex-col flex-grow">
                          <div className="flex items-center gap-1.5 text-[14px] text-label-secondary font-normal mb-2">
                            <span>{tour.category}</span>
                            <span>•</span>
                            <span>{tour.region}</span>
                          </div>
                          <h3 className="font-bold text-label-primary text-[16px] mb-3 line-clamp-2 leading-[1.4] group-hover:text-emerald-700 transition">
                            {getLocalizedTourName(tour, language)}
                          </h3>
                          {REVIEWS_ENABLED && (
                            <div className="flex items-center gap-1 text-xs font-bold text-label-primary mb-4">
                               <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                               4.9 <span className="text-label-tertiary font-normal">({getReviewsCount(tour.id)})</span>
                            </div>
                          )}

                          <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between">
                            <span className="text-xs text-label-tertiary font-medium">{tour.durationDays >= 2
                              ? t('tourDetailPage.relatedTours.days', { days: tour.durationDays })
                              : t('tourDetailPage.relatedTours.hours', { hours: tour.durationHours ?? (tour.durationDays * 8) })}</span>
                            {minPrice ? (
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-label-tertiary font-medium">{t('tourDetailPage.relatedTours.startingPrices')}</span>
                                <span className="text-base font-extrabold text-label-primary">{getConvertedPriceInfo(minPrice, tour.priceCurrency).both}</span>
                              </div>
                            ) : (
                               <span className="text-xs font-bold text-label-tertiary">{t('tourDetailPage.relatedTours.soldOut')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

        </div>

        {/* Mobile fixed price bar (approved mockup) — sits above the bottom nav on phones,
            hides itself while the booking widget is on screen. lg+ has the sticky sidebar. */}
        {(() => {
          const tourSlots = slots.filter(s => s.tourId === selectedTour.id);
          if (!tourSlots.length) return null;
          const basePrice = selectedTour.price ?? tourSlots[0].price;
          const hasDiscount = !!selectedTour.discountPrice && selectedTour.discountPrice > 0 && selectedTour.discountPrice < basePrice;
          const shownPrice = hasDiscount ? selectedTour.discountPrice! : basePrice;
          return (
            <div
              className={`lg:hidden fixed left-0 right-0 bottom-16 sm:bottom-0 z-[90] bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 py-2.5 transition-all duration-300 ${
                isMobileBarHidden ? 'translate-y-[130%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col leading-tight">
                  {hasDiscount && (
                    <span className="line-through text-slate-400 text-[12px]">
                      {getConvertedPriceInfo(basePrice, selectedTour.priceCurrency).both}
                    </span>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className={`font-extrabold text-lg ${hasDiscount ? 'text-label-critical' : 'text-label-primary'}`}>
                      {getConvertedPriceInfo(shownPrice, selectedTour.priceCurrency).both}
                    </span>
                    <span className="text-[12px] text-slate-500 font-medium">/ {t('tourDetailPage.pricingHeader.perPerson')}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const panel = document.getElementById('booking-widget-container');
                    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-black text-sm px-5 py-2.5 rounded-full shadow-md active:scale-95 transition cursor-pointer"
                >
                  {t('tourDetailPage.sidebar.checkAvailability')}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Booking-inquiry sheet/modal */}
        <TourInquirySheet
          tour={selectedTour}
          slot={selectedSlot || earliestAvailableSlot}
          qty={bookingQty}
          open={showInquiry}
          onClose={() => setShowInquiry(false)}
          formatDisplayDate={formatDisplayDate}
          onShowNotification={onShowNotification}
        />
      </div>
  );
}