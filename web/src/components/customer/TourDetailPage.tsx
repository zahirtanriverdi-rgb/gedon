'use client';
import React, { useState } from 'react';
import { Tour, TourSlot, Booking, Review, User } from '../../types';
import { REVIEWS_ENABLED } from '../../config/features';
import { computeFeaturedTourIds } from '../../utils/featuredTours';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedTourName, getLocalizedTourDescription, getLocalizedTourIncludes, getLocalizedTourNotIncluded, getLocalizedTourHighlights, getLocalizedGuideBio, getLocalizedGuideSpecialty } from '../../i18n/tourLocalization';
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Flag,
  Globe,
  Grid2X2,
  Heart,
  Home,
  Images,
  MapPin,
  MoveHorizontal,
  Mountain,
  Satellite,
  Scale,
  Star,
  UserRoundCheck,
  Users,
  X
} from 'lucide-react';
import { TourWeatherForecast } from '../TourWeatherForecast';
import { GpsTrackVisualizer } from '../GpsTrackVisualizer';
import { PackingListSection } from './PackingListSection';
import { TourReviewsList } from './TourReviewsList';
import { parseStoredGpxData } from '../../utils/gpxParser';
import { RouteSparkline } from '../tours/RouteSparkline';
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
  compareList: string[];
  handleToggleCompare: (tourId: string, e?: React.MouseEvent) => void;
  setSelectedOrganizer: (organizer: User | null) => void;
  setSelectedTour: (tour: Tour | null) => void;
  setLightboxIndex: (updater: number | null | ((prev: number | null) => number | null)) => void;
  packingExperienceMap: Record<string, 'beginner' | 'pro' | null>;
  packingAnalyzingMap: Record<string, boolean>;
  packingAiResultMap: Record<string, { basics: string[]; pro_gear: string[] } | null>;
  checkedPackingItems: Record<string, boolean>;
  handlePackingExperienceSelect: (tourId: string, choice: 'beginner' | 'pro') => void;
  togglePackingItemChecked: (key: string) => void;
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
  compareList,
  handleToggleCompare,
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
  // Gallery: desktop/tablet mozaika (böyük şəkil + 2×2 tor), mobil Airbnb üslublu sürüşən karusel.
  const mobileGalleryRef = React.useRef<HTMLDivElement | null>(null);
  const [mobileGalleryIndex, setMobileGalleryIndex] = useState<number>(0);
  const handleMobileGalleryScroll = () => {
    const el = mobileGalleryRef.current;
    if (!el) return;
    setMobileGalleryIndex(Math.round(el.scrollLeft / el.clientWidth));
  };
  const [isItineraryExpanded, setIsItineraryExpanded] = useState<boolean>(true);
  const [isDayProgramExpanded, setIsDayProgramExpanded] = useState<boolean>(true);
  const [showMeetingMap, setShowMeetingMap] = useState<boolean>(false);
  const [showSatellite, setShowSatellite] = useState<boolean>(false);

  const isFeaturedThisMonth = React.useMemo(() => computeFeaturedTourIds(tours, slots).has(selectedTour.id), [tours, slots, selectedTour.id]);

  const relatedToursBase = React.useMemo(
    () => tours.filter(t => t.id !== selectedTour.id),
    [tours, selectedTour.id]
  );
  const [relatedTours, setRelatedTours] = useState(() => relatedToursBase.slice(0, 4));
  React.useEffect(() => {
    setRelatedTours([...relatedToursBase].sort(() => 0.5 - Math.random()).slice(0, 4));
  }, [relatedToursBase]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [selectedTour.id]);

  React.useEffect(() => {
    if (selectedSlot) {
      const availableCapacity = Math.max(1, selectedSlot.capacity - selectedSlot.bookedCount);
      setBookingQty(prev => Math.min(Math.max(1, prev), availableCapacity));
    }
  }, [selectedSlot]);

  const MONTH_TRANSLATION_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const formatDisplayDate = (iso: string | undefined | null): string => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    const monthName = t(`miscWidgets.tourWeatherForecast.months.${MONTH_TRANSLATION_KEYS[Number(m) - 1]}`);
    return `${Number(d)} ${monthName} ${y}`;
  };

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

  React.useEffect(() => {
    if (!autoOpenBooking) return;
    if (earliestAvailableSlot) handleOpenInquiry(earliestAvailableSlot);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenBooking, selectedTour.id]);

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
      <div className="max-w-[var(--global-max-width)] mx-auto px-5 py-3 sm:py-8">
        {/* Header Section — desktopda breadcrumb + başlıq + müddət•gecə/reytinq sətri (GYG üslubu).
            Mobil-də başlıq şəkillərin altında göstərilir (aşağıdakı qalereya bloku). Mobildə bütün
            bu blok gizlidir (məzmunu onsuz da sm+ üçündür) — logo↔şəkil arası boşluğu ləğv edir. */}
        <div className="hidden sm:block sm:mb-6 space-y-3">
          {/* Desktop breadcrumb: Ana səhifə > kateqoriya > region */}
          {(() => {
            const catLabelMap: Record<string, string> = {
              peak: t('customerHome.toursHomeView.categories.peak'),
              camp: t('customerHome.toursHomeView.categories.camp'),
              hiking: t('customerHome.toursHomeView.categories.hiking'),
              active: t('customerHome.toursHomeView.categories.active'),
              international: t('customerHome.toursHomeView.badges.international'),
            };
            const categoryLabel = catLabelMap[selectedTour.category] || catLabelMap.peak;
            return (
              <nav className="hidden lg:flex items-center gap-1.5 text-[15px] text-slate-500 font-medium" aria-label="breadcrumb">
                <a href="/" className="flex items-center hover:text-slate-800 transition-colors" aria-label={t('tourDetailPage.header.homeCrumb')}>
                  <Home className="w-[18px] h-[18px]" />
                </a>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                <a href={`/?category=${selectedTour.category}`} className="hover:text-slate-800 transition-colors">{categoryLabel}</a>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                <a href={`/?region=${encodeURIComponent(selectedTour.region)}`} className="text-slate-800 hover:underline">{selectedTour.region}</a>
              </nav>
            );
          })()}
          <div className="hidden sm:flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg,#2E7D46,#1E5C34)' }}
            >
              {selectedTour.vendorName?.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || 'GG'}
            </span>
            <strong
              className="text-label-primary text-[15px] font-bold cursor-pointer hover:underline"
              onClick={(e) => { e.stopPropagation(); const org = users.find(u => u.id === selectedTour.vendorId); if (org) { setSelectedOrganizer(org); } }}
            >
              {selectedTour.vendorName}
            </strong>
            <BadgeCheck className="w-[18px] h-[18px] text-white fill-emerald-500 shrink-0" aria-label="Təsdiqlənmiş" />
            {isFeaturedThisMonth && (
              <span className="bg-amber-500 text-white border border-amber-600 text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm shrink-0">🔥 {t('tourDetailPage.header.bestSellerBadge')}</span>
            )}
          </div>
          {/* Başlıq sətri — mobil-də gizli (ad şəkillərin altında göstərilir); sm+ ekranlarda üstdə,
              lg+ yanında bəyən/paylaş düymələri (qiymət boxunun üstündə). */}
          <div className="hidden sm:flex items-start justify-between gap-4">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-label-primary tracking-tight leading-tight">
              {getLocalizedTourName(selectedTour, language)}
            </h1>
            <div className="hidden lg:flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                aria-label={wishlist.includes(selectedTour.id) ? t('tourDetailPage.header.inWishlist') : t('tourDetailPage.header.addToWishlist')}
                onClick={() => handleToggleWishlist(selectedTour.id)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-900 text-sm font-semibold transition border border-slate-200 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Heart className={`w-[18px] h-[18px] ${wishlist.includes(selectedTour.id) ? 'fill-rose-600 text-rose-600' : ''}`} />
                {wishlist.includes(selectedTour.id) ? t('tourDetailPage.header.inWishlist') : t('tourDetailPage.header.addToWishlist')}
              </button>
              <button
                type="button"
                aria-label={compareList.includes(selectedTour.id) ? t('customerHome.toursHomeView.compare.remove') : t('customerHome.toursHomeView.compare.add')}
                onClick={() => handleToggleCompare(selectedTour.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition border shadow-sm cursor-pointer whitespace-nowrap ${compareList.includes(selectedTour.id) ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'}`}
              >
                <Scale className="w-[18px] h-[18px]" />
                {compareList.includes(selectedTour.id) ? t('customerHome.toursHomeView.compare.remove') : t('customerHome.toursHomeView.compare.add')}
              </button>
              <ShareMenuButton
                tour={selectedTour}
                slots={slots}
                onShowNotification={onShowNotification}
                stopPropagationOnOpen
                showLabel
                iconClassName="w-[18px] h-[18px]"
                buttonClassName="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-900 text-sm font-semibold transition border border-slate-200 shadow-sm cursor-pointer whitespace-nowrap"
              />
            </div>
          </div>
          {/* Desktop meta sətri: yalnız çoxgünlük turlarda "gün • gecə" + reytinq. */}
          {(() => {
            const isMultiDay = selectedTour.durationDays >= 2;
            const nights = isMultiDay ? selectedTour.durationDays - 1 : 0;
            const reviewCount = getReviewsCount(selectedTour.id);
            const showRating = REVIEWS_ENABLED && selectedTour.rating != null && reviewCount > 0;
            if (!isMultiDay && !showRating) return null;
            return (
              <div className="hidden lg:flex items-center gap-x-4 gap-y-1 flex-wrap pt-1">
                {isMultiDay && (
                  <span className="inline-flex items-center gap-2 text-[16px] font-bold text-slate-900">
                    <Clock className="w-[19px] h-[19px] text-slate-700" />
                    {t('tourDetailPage.relatedTours.days', { days: selectedTour.durationDays })}{nights > 0 ? ` • ${t('tourDetailPage.header.nights', { count: nights })}` : ''}
                  </span>
                )}
                {showRating && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="flex items-center gap-0.5">
                      {[0, 1, 2, 3, 4].map(i => (
                        <Star key={i} className={`w-[18px] h-[18px] ${i < Math.round(selectedTour.rating!) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
                      ))}
                    </span>
                    <span className="text-[16px] font-bold text-slate-900">{selectedTour.rating!.toFixed(1)}</span>
                    <span className="text-[15px] text-slate-500">({t('tourDetailPage.header.reviewsCount', { count: reviewCount })})</span>
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        {/* TWO COLUMN WRAPPER */}
        <div className="flex flex-col lg:flex-row gap-10 relative items-stretch">
          {/* LEFT COLUMN: Gallery & Info */}
          <div className="w-full lg:w-[65%] shrink-0 space-y-10">
            {/* Qalereya */}
            {(() => {
              const allMedia = [selectedTour.image, ...(selectedTour.images || []), ...(selectedTour.videos || [])].filter(Boolean);
              const categoryBadges: Record<string, string> = {
                peak: `🏔️ ${t('customerHome.toursHomeView.categories.peak')}`,
                camp: `⛺ ${t('customerHome.toursHomeView.categories.camp')}`,
                hiking: `🥾 ${t('customerHome.toursHomeView.categories.hiking')}`,
                active: `🏃‍♂️ ${t('customerHome.toursHomeView.categories.active')}`,
                international: `✈️ ${t('customerHome.toursHomeView.badges.international')}`,
              };
              const tiles = allMedia.slice(1, 5);
              const extraCount = allMedia.length - 5;
              const hasTiles = tiles.length > 0;
              // Şəkil üstü dairəvi düymələr (bəyən + paylaş) — mobil/planşetdə; lg+ gizli (başlığa köçüb).
              const overlayActions = (
                <div className="absolute top-3 right-3 flex gap-2 z-10 lg:hidden" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    aria-label={wishlist.includes(selectedTour.id) ? t('tourDetailPage.header.inWishlist') : t('tourDetailPage.header.addToWishlist')}
                    onClick={() => handleToggleWishlist(selectedTour.id)}
                    className="w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-sm flex items-center justify-center text-slate-700 transition hover:scale-105 border border-slate-200/60 cursor-pointer"
                  >
                    <Heart className={`w-5 h-5 ${wishlist.includes(selectedTour.id) ? 'fill-rose-600 text-rose-600' : ''}`} />
                  </button>
                  <button
                    type="button"
                    aria-label={compareList.includes(selectedTour.id) ? t('customerHome.toursHomeView.compare.remove') : t('customerHome.toursHomeView.compare.add')}
                    onClick={() => handleToggleCompare(selectedTour.id)}
                    className={`w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition hover:scale-105 border border-slate-200/60 cursor-pointer ${compareList.includes(selectedTour.id) ? 'bg-amber-50 text-amber-600' : 'bg-white/95 hover:bg-white text-slate-700'}`}
                  >
                    <Scale className="w-5 h-5" />
                  </button>
                  <ShareMenuButton
                    tour={selectedTour}
                    slots={slots}
                    onShowNotification={onShowNotification}
                    stopPropagationOnOpen
                    iconClassName="w-5 h-5"
                    buttonClassName="w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-sm flex items-center justify-center text-slate-700 transition hover:scale-105 border border-slate-200/60 cursor-pointer"
                  />
                </div>
              );
              const categoryBadge = (
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10 shadow-sm">
                  <span className="text-[12px] font-medium tracking-wide">{categoryBadges[selectedTour.category] || categoryBadges.peak}</span>
                </div>
              );
              const regionBadge = (
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10 shadow-sm">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-[12px] font-medium tracking-wide">{selectedTour.region}</span>
                </div>
              );
              // Mobil qalereya (referans): yuxarı-solda geri oxu düyməsi.
              const backButton = (
                <button
                  type="button"
                  aria-label={t('tourDetailPage.header.homeCrumb')}
                  onClick={(e) => { e.stopPropagation(); if (window.history.length > 1) window.history.back(); else window.location.href = '/'; }}
                  className="absolute top-3 left-3 z-10 w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-sm flex items-center justify-center text-slate-700 transition border border-slate-200/60 cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              );
              return (
                <>
                  {/* MOBİL (referans): tam enli karusel; aşağı-solda kateqoriya+location stack,
                      aşağı-sağda qalereya düyməsi; başlıq isə şəkillərin altında. */}
                  <div className="sm:hidden">
                    <div className="relative">
                      <div
                        ref={mobileGalleryRef}
                        onScroll={handleMobileGalleryScroll}
                        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-2xl bg-slate-100"
                        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                      >
                        {allMedia.map((m, idx) => (
                          <div
                            key={idx}
                            className="relative shrink-0 w-full snap-center h-[300px] cursor-pointer"
                            onClick={() => setLightboxIndex(idx)}
                          >
                            <img src={m} alt="" className="w-full h-full object-cover block" referrerPolicy="no-referrer" />
                          </div>
                        ))}
                      </div>
                      {backButton}
                      {overlayActions}
                      {/* Aşağı-sol: kateqoriya (üstdə) + location (altda) stack */}
                      <div className="absolute bottom-4 left-4 flex flex-col items-start gap-2 z-10">
                        <span className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full shadow-sm text-[12px] font-medium tracking-wide">
                          {categoryBadges[selectedTour.category] || categoryBadges.peak}
                        </span>
                        <span className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-[12px] font-medium tracking-wide">{selectedTour.region}</span>
                        </span>
                      </div>
                      {/* Aşağı-sağ: qalereya düyməsi — bütün şəkillərə baxmaq üçün */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex(0); }}
                        aria-label={t('tourDetailPage.gallery.viewAllImages')}
                        className="absolute bottom-4 right-4 z-10 bg-white/95 hover:bg-white text-slate-800 px-3 py-2 rounded-full flex items-center gap-1.5 shadow-sm border border-slate-200/60 cursor-pointer"
                      >
                        <Images className="w-4 h-4" />
                        <span className="text-[13px] font-bold">{allMedia.length}</span>
                      </button>
                      {allMedia.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/35 backdrop-blur-sm px-2.5 py-1.5 rounded-full z-10">
                          {allMedia.map((_, idx) => (
                            <span
                              key={idx}
                              className={`rounded-full transition-all duration-200 ${mobileGalleryIndex === idx ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Vendor sətri — mobildə şəklin altında, başlığın üstündə (referans) */}
                    <div className="mt-4 flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg,#2E7D46,#1E5C34)' }}
                      >
                        {selectedTour.vendorName?.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || 'GG'}
                      </span>
                      <strong
                        className="text-label-primary text-[15px] font-bold cursor-pointer hover:underline"
                        onClick={(e) => { e.stopPropagation(); const org = users.find(u => u.id === selectedTour.vendorId); if (org) { setSelectedOrganizer(org); } }}
                      >
                        {selectedTour.vendorName}
                      </strong>
                      <BadgeCheck className="w-[18px] h-[18px] text-white fill-emerald-500 shrink-0" aria-label="Təsdiqlənmiş" />
                      {isFeaturedThisMonth && (
                        <span className="bg-amber-500 text-white border border-amber-600 text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm shrink-0">🔥 {t('tourDetailPage.header.bestSellerBadge')}</span>
                      )}
                    </div>
                    {/* Turun adı şəkillərin altında (referans) */}
                    <h1 className="mt-2 text-2xl font-extrabold text-label-primary tracking-tight leading-tight">
                      {getLocalizedTourName(selectedTour, language)}
                    </h1>
                  </div>

                  {/* DESKTOP/PLANŞET (GetYourGuide üslubu): solda böyük şəkil + sağda 2×2 tor. */}
                  <div className="hidden sm:flex flex-row gap-2 h-[440px] rounded-2xl overflow-hidden">
                    <div
                      className={`relative group cursor-pointer overflow-hidden bg-slate-100 ${hasTiles ? 'w-1/2' : 'w-full'}`}
                      onClick={() => setLightboxIndex(0)}
                    >
                      {categoryBadge}
                      {regionBadge}
                      <img src={allMedia[0]} alt={getLocalizedTourName(selectedTour, language)} className="w-full h-full object-cover block transition duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                      {overlayActions}
                    </div>
                    {hasTiles && (
                      <div className="grid w-1/2 grid-cols-2 auto-rows-fr gap-2">
                        {tiles.map((m, i) => {
                          const idx = i + 1;
                          const isLast = i === tiles.length - 1;
                          return (
                            <div
                              key={idx}
                              className="relative group cursor-pointer overflow-hidden bg-slate-100"
                              onClick={() => setLightboxIndex(idx)}
                            >
                              <img src={m} alt="" className="w-full h-full object-cover block transition duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                              {isLast && extraCount > 0 ? (
                                <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white gap-1">
                                  <span className="text-2xl font-bold leading-none">+{extraCount}</span>
                                  <span className="text-[12px] font-semibold flex items-center gap-1"><Grid2X2 className="w-3.5 h-3.5" /> {t('tourDetailPage.gallery.viewAll')}</span>
                                </div>
                              ) : (
                                isLast && (
                                  <div className="absolute bottom-3 right-3 pointer-events-none">
                                    <span className="bg-white/95 text-slate-900 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-sm flex items-center gap-1.5 border border-slate-200">
                                      <Grid2X2 className="w-3.5 h-3.5" /> {t('tourDetailPage.gallery.viewAll')}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Stats siyahısı */}
            {(() => {
              const parsedGpx = parseStoredGpxData(selectedTour.gpxData);
              const isSportActive = selectedTour.category === 'active' || selectedTour.isActiveLife;
              let difficultyLabel = t(`customerHome.toursHomeView.difficulty.${selectedTour.difficulty}`);
              if (isSportActive) {
                const activeDiff = selectedTour.activeDifficulty || (selectedTour.difficulty === 'easy' ? 'beginner' : selectedTour.difficulty === 'hard' || selectedTour.difficulty === 'extreme' ? 'professional' : 'medium');
                difficultyLabel = t(`customerHome.toursHomeView.activeDifficulty.${activeDiff === 'beginner' || activeDiff === 'easy' ? 'beginner' : activeDiff === 'medium' ? 'medium' : 'professional'}`);
              }
              const durationLabel = selectedTour.durationDays >= 2
                ? t('tourDetailPage.stats.durationDays', { days: selectedTour.durationDays })
                : t('tourDetailPage.stats.durationHours', { hours: selectedTour.durationHours ?? (selectedTour.durationDays * 8) });
              const maxCapacity = Math.max(0, ...slots.filter(s => s.tourId === selectedTour.id).map(s => s.capacity));
              const cancellationHours = selectedTour.cancellationHours ?? 48;
              // Airbnb üslublu chip-lər: çətinlik / məsafə / yüksəklik / müddət / yaş — üfüqi sürüşən pill.
              const statChips: { Icon: React.ComponentType<{ className?: string }>; label: string; value: string }[] = [
                { Icon: Mountain, label: t('tourDetailPage.stats.difficulty'), value: difficultyLabel },
                ...(parsedGpx ? [
                  { Icon: MoveHorizontal, label: t('tourDetailPage.stats.distance'), value: `${parsedGpx.stats.distanceKm} km` },
                  { Icon: Flag, label: t('tourDetailPage.stats.elevation'), value: `${parsedGpx.stats.elevationGainM} m` },
                ] : []),
                { Icon: Clock, label: t('tourDetailPage.stats.duration'), value: durationLabel },
                ...(selectedTour.ageLimit ? [{ Icon: UserRoundCheck, label: t('tourDetailPage.stats.ageLimit'), value: String(selectedTour.ageLimit) }] : []),
              ];
              // İkinci chip sətri: bələdçi / ödənişsiz ləğv / özəl qrup — başlıq qalın, alt sətir boz.
              const featureChips: { Icon: React.ComponentType<{ className?: string }>; title: string; sub: string }[] = [
                {
                  Icon: Globe,
                  title: t('tourDetailPage.quickInfo.professionalGuide'),
                  sub: selectedTour.languages && selectedTour.languages.length > 0 ? selectedTour.languages.join(', ') : t('tourDetailPage.quickInfo.azerbaijaniLanguage'),
                },
                {
                  Icon: Calendar,
                  title: cancellationHours === 0 ? t('tourDetailPage.quickInfo.noCancellation') : t('tourDetailPage.quickInfo.freeCancellation'),
                  sub: cancellationHours === 0 ? t('tourDetailPage.quickInfo.noCancellationDesc') : t('tourDetailPage.quickInfo.freeCancellationDesc', { hours: cancellationHours }),
                },
                {
                  Icon: Users,
                  title: t('tourDetailPage.quickInfo.privateGroupTours'),
                  sub: maxCapacity > 0 ? t('tourDetailPage.stats.maxParticipants', { count: maxCapacity }) : t('tourDetailPage.quickInfo.selectableAtBooking'),
                },
              ];
              const chipRowStyle = { scrollbarWidth: 'none' as const, WebkitOverflowScrolling: 'touch' as const };
              const chipClass = 'shrink-0 inline-flex items-center gap-2.5 bg-slate-100 rounded-2xl px-4 py-2.5';
              const desktopRowClass = 'hidden sm:flex gap-2.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5';
              const labelCls = 'text-[11px] text-slate-500 font-medium whitespace-normal sm:whitespace-nowrap';
              const valueCls = 'text-[13.5px] text-slate-900 font-bold whitespace-normal sm:whitespace-nowrap';
              // Vahid mobil tor üçün stat + feature chip-ləri birləşdir (topBold: feature başlıqları qalın).
              const mergedChips = [
                ...statChips.map((c) => ({ Icon: c.Icon, top: c.label, bottom: c.value, topBold: false })),
                ...featureChips.map((c) => ({ Icon: c.Icon, top: c.title, bottom: c.sub, topBold: true })),
              ];
              return (
                <div className="py-5 border-b border-slate-200 sm:space-y-3">
                  {/* MOBİL: 2 sütunlu simmetrik kart toru. Hər kart ağ fon + incə xətt/kölgə,
                      yuxarıda rəngli ikon, altında boz başlıq + tünd əsas dəyər. Sayı tək olduqda
                      son kart (uzun mətnli xüsusiyyət) tam enli fərqli blok kimi oturur.
                      Padding/gap 4px şəbəkəsinə uyğun: kart daxili p-4, ikon↔mətn gap-2.5. */}
                  <div className="grid grid-cols-2 gap-3 sm:hidden">
                    {mergedChips.map((c, i) => {
                      const fullWidth = mergedChips.length % 2 === 1 && i === mergedChips.length - 1;
                      return (
                        <div
                          key={i}
                          className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex ${fullWidth ? 'col-span-2 flex-row items-center gap-3' : 'flex-col gap-2.5'}`}
                        >
                          <span className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                            <c.Icon className="w-[18px] h-[18px] text-emerald-600" />
                          </span>
                          <div className="flex flex-col gap-0.5 leading-tight min-w-0">
                            <span className={c.topBold ? valueCls : labelCls}>{c.top}</span>
                            <span className={c.topBold ? labelCls : valueCls}>{c.bottom}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* DESKTOP: iki üfüqi sürüşən sətir (mokap) */}
                  <div className={desktopRowClass} style={chipRowStyle}>
                    {statChips.map((c, i) => (
                      <div key={i} className={chipClass}>
                        <c.Icon className="w-[18px] h-[18px] text-slate-600 shrink-0" />
                        <div className="flex flex-col leading-tight min-w-0">
                          <span className={labelCls}>{c.label}</span>
                          <span className={valueCls}>{c.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={desktopRowClass} style={chipRowStyle}>
                    {featureChips.map((c, i) => (
                      <div key={i} className={chipClass}>
                        <c.Icon className="w-[18px] h-[18px] text-slate-600 shrink-0" />
                        <div className="flex flex-col leading-tight min-w-0">
                          <span className={valueCls}>{c.title}</span>
                          <span className={labelCls}>{c.sub}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Tur haqqında */}
            <div id="tour-full-description" className="space-y-4 py-8 scroll-mt-24">
              <h2 className="text-xl font-extrabold text-slate-900">{t('tourDetailPage.fullDescription.title')}</h2>
              {(() => { const localizedDescription = getLocalizedTourDescription(selectedTour, language); return (
              <div className="relative">
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isDescExpanded || localizedDescription.length <= 320 ? 'max-h-[2000px]' : 'max-h-[150px]'
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

            {/* Önə çıxanlar */}
            {selectedTour.highlights && selectedTour.highlights.length > 0 && (
              <div className="space-y-4 py-8 border-t border-slate-200">
                <h2 className="text-xl font-extrabold text-slate-900">{t('tourDetailPage.highlights.title')}</h2>
                <div className="flex flex-col gap-3">
                  {getLocalizedTourHighlights(selectedTour, language).map((highlight, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-[15px] leading-relaxed font-medium">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Qiymətə daxildir */}
            <div className="space-y-4 py-8 border-t border-slate-200">
              <h2 className="text-xl font-extrabold text-slate-900">{t('tourDetailPage.priceIncludes.title')}</h2>
              <ul className="space-y-2.5">
                {[
                  ...(selectedTour.includes && selectedTour.includes.length > 0
                    ? getLocalizedTourIncludes(selectedTour, language)
                    : [t('tourDetailPage.priceIncludes.defaultIncluded1'), t('tourDetailPage.priceIncludes.defaultIncluded2')]),
                  ...(selectedTour.mealType ? [t('tourDetailPage.priceIncludes.mealLabel', { meal: selectedTour.mealType })] : []),
                  ...(selectedTour.flightIncluded ? [t('tourDetailPage.priceIncludes.flightIncluded')] : []),
                ].map((item, idx) => (
                  <li key={`inc-${idx}`} className="flex items-start gap-2.5">
                    <Check className="w-[18px] h-[18px] text-green-600 shrink-0 mt-0.5" strokeWidth={2.4} />
                    <span className="text-slate-700 text-[15px]">{item}</span>
                  </li>
                ))}
                {[
                  ...(selectedTour.notIncluded && selectedTour.notIncluded.length > 0
                    ? getLocalizedTourNotIncluded(selectedTour, language)
                    : []),
                  ...(!selectedTour.flightIncluded && selectedTour.isInternational ? [t('tourDetailPage.priceIncludes.flightsSeparate')] : []),
                ].map((item, idx) => (
                  <li key={`exc-${idx}`} className="flex items-start gap-2.5">
                    <X className="w-[18px] h-[18px] text-red-600 shrink-0 mt-0.5" strokeWidth={2.4} />
                    <span className="text-slate-700 text-[15px]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Vacib məlumat */}
            <div className="space-y-4 py-8 border-t border-slate-200">
              <h2 className="text-xl font-extrabold text-slate-900">{t('tourDetailPage.importantInfo.title')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-2">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm mb-3">{t('tourDetailPage.importantInfo.bringHeader')}</h3>
                  <ul className="space-y-2.5">
                    {(selectedTour.importantInfo?.bring && selectedTour.importantInfo.bring.length > 0
                      ? selectedTour.importantInfo.bring
                      : [selectedTour.requiredEquipment || t('tourDetailPage.importantInfo.defaultBring1'), t('tourDetailPage.importantInfo.defaultBring2'), t('tourDetailPage.importantInfo.defaultBring3')]
                    ).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-[15px] text-slate-700">
                        <Check className="w-[18px] h-[18px] text-green-600 mt-0.5 shrink-0" strokeWidth={2.4} /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm mb-3">{t('tourDetailPage.importantInfo.notAllowedHeader')}</h3>
                  <ul className="space-y-2.5">
                    {(selectedTour.importantInfo?.notAllowed && selectedTour.importantInfo.notAllowed.length > 0
                      ? selectedTour.importantInfo.notAllowed
                      : [t('tourDetailPage.importantInfo.defaultNotAllowed1'), t('tourDetailPage.importantInfo.defaultNotAllowed2')]
                    ).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-[15px] text-slate-700">
                        <X className="w-[18px] h-[18px] text-red-600 mt-0.5 shrink-0" strokeWidth={2.4} /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Günün proqramı */}
            {selectedTour.dayProgram && selectedTour.dayProgram.length > 0 && (
              <div className="space-y-4 py-8 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDayProgramExpanded(prev => !prev)}
                  className="w-full flex items-center justify-between gap-2 cursor-pointer bg-transparent border-0 p-0 text-left"
                >
                  <span className="text-xl font-extrabold text-slate-900">{t('tourDetailPage.dayProgram.title')}</span>
                  <ChevronDown className={`w-[22px] h-[22px] text-slate-700 transition-transform ${isDayProgramExpanded ? '' : '-rotate-90'}`} />
                </button>
                {isDayProgramExpanded && (
                  <div className="mt-1">
                    {selectedTour.dayProgram.map((step, idx) => (
                      <div key={idx} className="relative pb-5 last:pb-0">
                        {idx < selectedTour.dayProgram!.length - 1 && (
                          <span className="absolute left-4 top-9 bottom-0 w-px bg-slate-200" aria-hidden />
                        )}
                        <div className="flex gap-3 items-center">
                          <span className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center relative z-[1] shrink-0">
                            <Clock className="w-[15px] h-[15px] text-slate-500" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] text-slate-500 font-mono">{step.time}</div>
                            <div className="text-[15px] font-bold text-slate-900 leading-tight mt-0.5">{step.title}</div>
                          </div>
                        </div>
                        {step.note && (
                          <p className="text-[13px] text-slate-500 leading-snug ml-11 mt-0.5">{step.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Toplanış yeri */}
            {selectedTour.meetingPoint && (
              <div className="space-y-3 py-8 border-t border-slate-200">
                <h2 className="text-xl font-extrabold text-slate-900">{t('tourDetailPage.meetingPoint.title')}</h2>
                <p className="text-[14px] text-slate-600 leading-relaxed">
                  {selectedTour.meetingPoint}
                </p>
                {selectedTour.meetingPointEmbedUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowMeetingMap(prev => !prev)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[14px] cursor-pointer bg-[#2E4F3E] hover:bg-[#233f30] text-white transition"
                    >
                      <MapPin className="w-4 h-4" />
                      {showMeetingMap ? t('tourDetailPage.meetingPoint.hideMap') : t('tourDetailPage.meetingPoint.viewOnMap')}
                    </button>
                    {showMeetingMap && (
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
                  </>
                )}
              </div>
            )}

            {/* Yürüş trayektoriyası */}
            {(() => {
              const parsedGpx = parseStoredGpxData(selectedTour.gpxData);
              if (!parsedGpx || !selectedTour.gpxData) return null;
              return (
                <div className="space-y-3 py-8 border-t border-slate-200">
                  <h2 className="text-xl font-extrabold text-slate-900">{t('tourDetailPage.trajectory.title')}</h2>
                  <p className="text-[13px] text-slate-500 leading-snug -mt-1">{t('tourDetailPage.trajectory.subtitle')}</p>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 mt-1">
                    <div className="flex items-center justify-center gap-5 mb-3 text-[12px] text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-600 inline-block" />{t('tourDetailPage.trajectory.start')}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Flag className="w-[13px] h-[13px] text-red-600" />{t('tourDetailPage.trajectory.end')}
                      </span>
                    </div>
                    <div className="w-full h-40 flex items-center justify-center">
                      <RouteSparkline points={parsedGpx.points} className="w-full h-full max-w-[340px] text-brand-primary" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSatellite(prev => !prev)}
                      className="w-full flex items-center justify-center gap-2 mt-3 py-2.5 rounded-xl font-semibold text-[13px] cursor-pointer bg-[#2E4F3E] hover:bg-[#233f30] text-white transition"
                    >
                      <Satellite className="w-4 h-4" />
                      {showSatellite ? t('tourDetailPage.trajectory.satelliteHide') : t('tourDetailPage.trajectory.satelliteButton')}
                    </button>
                    {!showSatellite && (
                      <div className="rounded-xl p-3 text-[12.5px] leading-snug mt-2.5" style={{ background: '#F0F5F1', color: '#3F5140' }}>
                        {t('tourDetailPage.trajectory.satelliteHint')}
                      </div>
                    )}
                    {showSatellite && (
                      <div className="mt-3">
                        <GpsTrackVisualizer gpxDataString={selectedTour.gpxData} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Extra dynamic details */}
            <div className="space-y-0">
              {/* Tur bələdçisi — YENİ: Yalnız tura təyin olunmuş bələdçiləri göstərir */}
              {(() => {
                const organizer = users.find(u => u.id === selectedTour.vendorId);
                
                // DEBUG: Brauzer konsolunda (F12) bu məlumatları yoxlayın
                console.log("=== BƏLƏDÇİ DEBUG ===");
                console.log("Organizer (Vendor):", organizer);
                console.log("Turun guideIds massivi:", selectedTour.guideIds);
                console.log("Vendorun bütün guides massivi:", organizer?.guides);

                // MƏNTİQ: 
                // 1. Əgər turda xüsusi guideIds varsa, yalnız həmin ID-lərə uyğun gələnləri göstər.
                // 2. Əgər guideIds yoxdursa (köhnə turlar üçün fallback), vendorun bütün bələdçilərini göstər.
                const hasSpecificGuides = selectedTour.guideIds && selectedTour.guideIds.length > 0;
                
                const tourGuides = hasSpecificGuides
                  ? (organizer?.guides?.filter(g => selectedTour.guideIds!.includes(g.id || '')) || [])
                  : (organizer?.guides || []);

                console.log("Filtrdən keçən yekun bələdçilər:", tourGuides);
                console.log("======================");

                if (tourGuides.length > 0) {
                  return (
                    <div id="tour-guides-section" className="space-y-1 py-8 border-t border-slate-200 scroll-mt-20">
                      <h2 className="text-xl font-extrabold text-slate-900 mb-2">{t('tourDetailPage.guides.title')}</h2>
                      {tourGuides.map((g, i) => (
                        <button
                          key={g.id || i} // g.id daha etibarlıdır
                          type="button"
                          onClick={() => setSelectedOrganizer(organizer!)}
                          className={`w-full flex items-start gap-3 py-3.5 text-left bg-transparent border-0 group cursor-pointer ${i < tourGuides.length - 1 ? 'border-b border-slate-100' : ''}`}
                        >
                          <span className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 border-2 border-emerald-50 shrink-0">
                            {g.avatar
                              ? <img src={g.avatar} className="w-full h-full object-cover" alt={g.name} />
                              : <span className="flex items-center justify-center font-bold text-slate-400 w-full h-full text-sm">{g.name.charAt(0)}</span>}
                          </span>
                          <span className="flex-1 min-w-0 block">
                            <span className="flex items-center gap-1">
                              <span className="text-[14px] font-bold text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors">{g.name}</span>
                              <ChevronRight className="w-[15px] h-[15px] text-slate-400 group-hover:text-emerald-600 transition-colors" />
                            </span>
                            <span className="text-[12px] font-semibold text-emerald-600 mt-0.5 block">
                              {getLocalizedGuideSpecialty(g, language) || t('tourDetailPage.organizerTeam.defaultSpecialty')}
                            </span>
                            {getLocalizedGuideBio(g, language) && (
                              <span className="text-[13px] text-slate-500 leading-snug mt-1 block">
                                {getLocalizedGuideBio(g, language)}
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
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

              {/* Gündəlik Səyahət Proqramı (Itinerary Map) */}
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

              {/* Rəylər */}
              {REVIEWS_ENABLED && (
                <TourReviewsList
                  tour={selectedTour}
                  reviews={reviews}
                  onShowNotification={onShowNotification}
                />
              )}

              {/* Hava proqnozu */}
              {slots.filter(s => s.tourId === selectedTour.id).length > 0 && (
                <div className="py-8 border-t border-slate-200">
                  <TourWeatherForecast
                    dates={slots.filter(s => s.tourId === selectedTour.id).map(s => s.startDate)}
                    region={selectedTour.region}
                    variant="section"
                  />
                </div>
              )}
            </div>
          </div> {/* Closes Left Column */}

          {/* RIGHT COLUMN: Sticky Booking Widget */}
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
                    {/* Participants Dropdown */}
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

                    {/* Date Dropdown */}
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

                {/* Primary CTA */}
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

        {/* Bunlar da maraqlı ola bilər */}
        <div className="mt-16 pt-16 border-t border-slate-200">
          <h2 className="text-2xl font-extrabold text-label-primary mb-8">{t('tourDetailPage.relatedTours.title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              {relatedTours
                .map(tour => {
                  const tourSlots = slots.filter(s => s.tourId === tour.id);
                  const priceList = tourSlots.map(s => s.price);
                  const minPrice = priceList.length > 0 ? Math.min(...priceList) : null;
                  const shownPrice = tour.discountPrice && tour.discountPrice > 0 && tour.discountPrice < (tour.price ?? minPrice ?? 0)
                    ? tour.discountPrice
                    : (tour.price ?? minPrice);
                  const relatedGpx = parseStoredGpxData(tour.gpxData);
                  const categoryBadge =
                    tour.category === 'camp' ? `⛺ ${t('customerHome.toursHomeView.categories.camp')}`
                    : tour.category === 'hiking' ? `🥾 ${t('customerHome.toursHomeView.categories.hiking')}`
                    : tour.category === 'active' ? `🏃‍♂️ ${t('customerHome.toursHomeView.categories.active')}`
                    : tour.isInternational ? `✈️ ${t('customerHome.toursHomeView.badges.international')}`
                    : `🏔️ ${t('customerHome.toursHomeView.categories.peak')}`;
                  const diffTextColors: Record<string, string> = { easy: '#2E9E5B', medium: '#D6A32A', hard: '#C2703D', extreme: '#dc3545' };
                  const diffSegColors: Record<string, string> = { easy: '#2E9E5B', medium: '#D6A32A', hard: '#C2703D', extreme: '#dc3545' };
                  const diffSegments: Record<string, number> = { easy: 2, medium: 3, hard: 4, extreme: 5 };
                  const segFilled = diffSegments[tour.difficulty] ?? 3;
                  const segColor = diffSegColors[tour.difficulty] ?? '#D6A32A';
                  return (
                    <div
                      key={tour.id}
                      className="bg-[#fcfdfc] rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group border border-slate-100 cursor-pointer"
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setSelectedTour(tour);
                        setShowInquiry(false);
                        setSelectedSlot(null);
                      }}
                    >
                      <div className="relative h-[200px] overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={tour.image}
                          alt={getLocalizedTourName(tour, language)}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full flex items-center gap-1.5 z-10 shadow-sm">
                          <span className="text-[11px] font-medium tracking-wide">{categoryBadge}</span>
                        </div>
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                          <button
                            type="button"
                            onClick={(e) => handleToggleWishlist(tour.id, e)}
                            className="w-[40px] h-[40px] bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition shadow-sm"
                            aria-label={t('tourDetailPage.header.addToWishlist')}
                          >
                            <Heart className={`w-5 h-5 ${wishlist.includes(tour.id) ? 'fill-rose-600 text-rose-600' : 'text-gray-700'}`} />
                          </button>
                          <ShareMenuButton
                            tour={tour}
                            slots={slots}
                            onShowNotification={onShowNotification}
                            stopPropagationOnOpen
                            iconClassName="w-5 h-5"
                            buttonClassName="w-[40px] h-[40px] bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-700 transition shadow-sm"
                          />
                        </div>
                        <div className="absolute bottom-4 right-4 bg-white text-gray-800 text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 z-10 shadow-sm border border-slate-100">
                          <MapPin className="w-3 h-3 text-[#2E4F3E]" />
                          <span className="truncate max-w-[120px]">{tour.region.split(',')[0]}</span>
                        </div>
                      </div>
                      <div className="px-5 pt-5 pb-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-gray-900 text-[15px] leading-snug mb-2 line-clamp-2">
                          {getLocalizedTourName(tour, language)}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium mb-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {tour.durationDays >= 2
                              ? t('tourDetailPage.relatedTours.days', { days: tour.durationDays })
                              : t('tourDetailPage.relatedTours.hours', { hours: tour.durationHours ?? (tour.durationDays * 8) })}
                            <span className="mx-1.5">•</span>
                            {t('customerHome.toursHomeView.activeDates', { count: tourSlots.length })}
                          </span>
                        </div>
                        <div className="mt-auto flex flex-col">
                          {relatedGpx && (
                            <div className="flex flex-wrap items-center text-[12px] text-gray-500 mb-4">
                              <span className="text-gray-400 mr-1">{t('tourDetailPage.stats.distance')}</span> <span className="font-semibold text-gray-700">{relatedGpx.stats.distanceKm} km</span>
                              <span className="mx-1.5">•</span>
                              <span className="text-gray-400 mr-1">{t('tourDetailPage.stats.elevation')}</span> <span className="font-semibold text-gray-700">{relatedGpx.stats.elevationGainM} m</span>
                            </div>
                          )}
                          <div className="mb-4">
                            <div className="flex justify-between items-end mb-1.5">
                              <span className="text-[11px] font-bold" style={{ color: diffTextColors[tour.difficulty] ?? '#D6A32A' }}>
                                {t(`customerHome.toursHomeView.difficulty.${tour.difficulty}`)}
                              </span>
                              <div className="flex items-center gap-1">
                                {REVIEWS_ENABLED && tour.rating != null && getReviewsCount(tour.id) > 0 ? (
                                  <>
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    <span className="text-[11px] font-bold text-gray-800">{tour.rating.toFixed(1)} <span className="font-normal text-gray-500">({getReviewsCount(tour.id)})</span></span>
                                  </>
                                ) : (
                                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">{t('customerHome.toursHomeView.cardMeta.newTag')}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 h-1.5">
                              {[1, 2, 3, 4, 5].map(n => (
                                <div key={n} className="flex-1 rounded-full" style={{ background: n <= segFilled ? segColor : '#E2E8F0' }} />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            {shownPrice != null ? (
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Qiymət</span>
                                <div className="flex items-baseline gap-0.5">
                                  <span className="text-[18px] font-extrabold text-gray-900 leading-none">{getConvertedPriceInfo(shownPrice, tour.priceCurrency).both}</span>
                                  <span className="text-[9px] font-medium text-gray-500 whitespace-nowrap">/ nəfər</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-label-tertiary">{t('tourDetailPage.relatedTours.soldOut')}</span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                setSelectedTour(tour);
                                setShowInquiry(false);
                                setSelectedSlot(null);
                              }}
                              className="bg-[#2E4F3E] hover:bg-[#233f30] text-white px-4 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                            >
                              Daha Ətraflı
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
      </div>

      {/* Mobile fixed price bar */}
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