import React, { useState } from 'react';
import { Tour, TourSlot, Booking, Review, User } from '../../types';
import { REVIEWS_ENABLED } from '../../config/features';
import { computeFeaturedTourIds } from '../../utils/featuredTours';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Copy,
  Globe,
  Grid2X2,
  Heart,
  MessageCircle,
  Minus,
  Share2,
  Star,
  Users,
  X
} from 'lucide-react';
import { TourWeatherForecast } from '../TourWeatherForecast';
import { GpsTrackVisualizer } from '../GpsTrackVisualizer';
import { PackingListSection } from './PackingListSection';
import { TourReviewsList } from './TourReviewsList';

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
  handleShareTour: (tour: Tour, e?: React.MouseEvent) => void;
  handleToggleWishlist: (tourId: string, e?: React.MouseEvent) => void;
  setActiveView: (view: 'home' | 'faq' | 'organizer' | 'calculator' | 'wishlist') => void;
  setSelectedOrganizer: (organizer: User | null) => void;
  setSelectedTour: (tour: Tour | null) => void;
  setLightboxIndex: (updater: number | null | ((prev: number | null) => number | null)) => void;
  packingExperienceMap: Record<string, 'beginner' | 'pro' | null>;
  packingAnalyzingMap: Record<string, boolean>;
  checkedPackingItems: Record<string, boolean>;
  handlePackingExperienceSelect: (tourId: string, choice: 'beginner' | 'pro') => void;
  togglePackingItemChecked: (key: string) => void;
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
  handleShareTour,
  handleToggleWishlist,
  setActiveView,
  setSelectedOrganizer,
  setSelectedTour,
  setLightboxIndex,
  packingExperienceMap,
  packingAnalyzingMap,
  checkedPackingItems,
  handlePackingExperienceSelect,
  togglePackingItemChecked
}: TourDetailPageProps) {
  const { t } = useLanguage();
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<TourSlot | null>(null);
  const [bookingQty, setBookingQty] = useState<number>(1);
  const [showParticipantsDropdown, setShowParticipantsDropdown] = useState<boolean>(false);
  const [showDateDropdown, setShowDateDropdown] = useState<boolean>(false);
  const [showTourSlots, setShowTourSlots] = useState<boolean>(false);
  const isFeaturedThisMonth = React.useMemo(() => computeFeaturedTourIds(tours, slots).has(selectedTour.id), [tours, slots, selectedTour.id]);

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
  const [isBookingStep, setIsBookingStep] = useState<boolean>(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  // Scroll to the booking form once it actually exists in the DOM. Doing this in the click
  // handler that opens it doesn't work — setIsBookingStep(true) is an async state update, so
  // the #booking-form-section node isn't rendered yet at the time of that click.
  React.useEffect(() => {
    if (isBookingStep) {
      const formEl = document.getElementById('booking-form-section');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isBookingStep]);

  // Same DOM-timing reasoning as above: scroll to the tour-slots-calendar section only after
  // showTourSlots flips to true and React has actually rendered it.
  React.useEffect(() => {
    if (showTourSlots) {
      const el = document.getElementById('tour-slots-calendar');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showTourSlots]);
  const [bookingSubmitError, setBookingSubmitError] = useState<string | null>(null);
  const [bookingSuccessData, setBookingSuccessData] = useState<any>(null);

  // Guest booking details (replacing previous registration requirement)
  const [bookingCustomerName, setBookingCustomerName] = useState<string>('');
  const [bookingCustomerPhone, setBookingCustomerPhone] = useState<string>('');
  const [verificationOtpCode, setVerificationOtpCode] = useState<string>('');
  const [userInputOtp, setUserInputOtp] = useState<string>('');
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(false);
  const [showIncomingOtpBanner, setShowIncomingOtpBanner] = useState<boolean>(false);

  // Active Lifestyle Booking States
  const [usingOwnEquipment, setUsingOwnEquipment] = useState<boolean>(false);
  const [rentEquipment, setRentEquipment] = useState<boolean>(false);
  const [bookingRegType, setBookingRegType] = useState<'individual' | 'team'>('individual');
  const [bookingTeamName, setBookingTeamName] = useState<string>('');
  const [bookingTeamMembers, setBookingTeamMembers] = useState<Array<{ name: string; phone: string }>>([
    { name: '', phone: '' },
    { name: '', phone: '' },
    { name: '', phone: '' },
    { name: '', phone: '' },
    { name: '', phone: '' }
  ]);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState<boolean>(false);

  // Helper calculation for Volleyball & Adventure sports
  const getActiveCalculatedPrice = () => {
    if (!selectedSlot || !selectedTour) return { perPerson: 0, total: 0, qty: 1, desc: '' };

    let perPerson = selectedSlot.price;
    const descParts: string[] = [];

    if (selectedTour.category === 'active' || selectedTour.isActiveLife) {
      if (selectedTour.equipmentIncluded && usingOwnEquipment) {
        const discount = selectedTour.equipmentRentalPrice || 10;
        perPerson = Math.max(0, perPerson - discount);
        descParts.push(t('tourDetailPage.priceCalc.ownEquipmentDiscount', { discount, currency: selectedTour.priceCurrency || 'AZN' }));
      } else if (!selectedTour.equipmentIncluded && rentEquipment) {
        const rental = selectedTour.equipmentRentalPrice || 15;
        perPerson = perPerson + rental;
        descParts.push(t('tourDetailPage.priceCalc.equipmentRental', { rental, currency: selectedTour.priceCurrency || 'AZN' }));
      }
    }

    const qty = bookingRegType === 'team' ? 6 : bookingQty;
    const total = perPerson * qty;

    return {
      perPerson,
      total,
      qty,
      desc: descParts.join(', ')
    };
  };

  const handleOpenBooking = (slot: TourSlot) => {
    setSelectedSlot(slot);
    setIsBookingStep(true);
    setBookingCustomerName('');
    setBookingCustomerPhone('');
    setVerificationOtpCode('');
    setUserInputOtp('');
    setIsOtpSent(false);
    setIsPhoneVerified(false);
    setShowIncomingOtpBanner(false);

    // Active Lifestyle States Reset
    setUsingOwnEquipment(false);
    setRentEquipment(false);
    setBookingRegType('individual');
    setBookingTeamName('');
    setBookingTeamMembers([
      { name: '', phone: '' },
      { name: '', phone: '' },
      { name: '', phone: '' },
      { name: '', phone: '' },
      { name: '', phone: '' }
    ]);
    setSafetyAcknowledged(false);
  };

  const handleSendVerificationCode = () => {
    if (!bookingCustomerName.trim()) {
      if (onShowNotification) onShowNotification(t('tourDetailPage.booking.validation.nameRequired'), 'warning');
      return;
    }
    if (!bookingCustomerPhone.trim()) {
      if (onShowNotification) onShowNotification(t('tourDetailPage.booking.validation.phoneRequired'), 'warning');
      return;
    }

    // Clean Phone value
    const cleanPhone = bookingCustomerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      if (onShowNotification) onShowNotification(t('tourDetailPage.booking.validation.phoneInvalid'), 'warning');
      return;
    }

    const generatedCode = String(Math.floor(1000 + Math.random() * 9000));
    setVerificationOtpCode(generatedCode);
    setIsOtpSent(true);
    setUserInputOtp('');
    setIsPhoneVerified(false);
    setShowIncomingOtpBanner(true);

    if (onShowNotification) {
      onShowNotification(t('tourDetailPage.booking.validation.otpSent', { code: generatedCode }), 'success');
    }
  };

  const handleVerifyOtp = () => {
    if (!userInputOtp.trim()) {
      if (onShowNotification) onShowNotification(t('tourDetailPage.booking.validation.otpEmpty'), 'warning');
      return;
    }
    if (userInputOtp === verificationOtpCode) {
      setIsPhoneVerified(true);
      setShowIncomingOtpBanner(false);
      if (onShowNotification) {
        onShowNotification(t('tourDetailPage.booking.validation.otpVerified'), 'success');
      }
    } else {
      setIsPhoneVerified(false);
      if (onShowNotification) {
        onShowNotification(t('tourDetailPage.booking.validation.otpWrong'), 'error');
      }
    }
  };

  // State for WhatsApp redirection status
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);

  // WhatsApp click & lead tracking plus auto-redirection with exactly 1-second delay
  const handleProceedBookingSimulate = async () => {
    if (!selectedSlot || !selectedTour) return;

    // Generate custom unique booking_reference of format TUR-XXXX
    const randomRefNum = Math.floor(Math.random() * 9000 + 1000); // 1000 to 9999
    const bookingRef = `TUR-${randomRefNum}`;

    // Dynamic price calculation
    const priceDetails = getActiveCalculatedPrice();
    const finalQty = priceDetails.qty;
    const totalCost = getConvertedPriceInfo(priceDetails.total, selectedTour.priceCurrency).azn;

    setIsProcessingPayment(true);
    setIsRedirecting(true);
    setBookingSubmitError(null);

    // 1. Submit Click Metrics & Lead Stats to backend `/api/bookings/whatsapp-click`
    try {
      await fetch('/api/bookings/whatsapp-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tourId: selectedTour.id,
          startDate: selectedSlot.startDate,
          participantsCount: finalQty,
          vendorId: selectedTour.vendorId,
          booking_reference: bookingRef
        })
      });
      console.log(`Backend Lead Tracking logged successfully for #${bookingRef}`);
    } catch (e) {
      console.error('Click tracking API error:', e);
    }

    // 2. Create the real booking record via the API (server/db.ts — Postgres or SQLite)
    const bId = 'book-' + Math.floor(Math.random() * 90000 + 10000);
    const newBooking: Booking = {
      id: bId,
      slotId: selectedSlot.id,
      tourId: selectedTour.id,
      customerId: 'guest-' + Math.floor(Math.random() * 90000 + 10000),
      customerName: bookingCustomerName.trim() || currentUser.name,
      customerPhone: bookingCustomerPhone.trim() || currentUser.phone,
      bookingDate: new Date().toISOString().split('T')[0],
      participantsCount: finalQty,
      totalAmount: totalCost,
      status: 'pending', // Stored as Pending status until operator confirms
      paymentMethod: 'whatsapp',
      booking_reference: bookingRef,
      smsNotificationSent: false,

      // Active Lifestyle custom properties
      isTeamBooking: (selectedTour.category === 'active' || selectedTour.isActiveLife) && bookingRegType === 'team',
      teamName: bookingRegType === 'team' ? bookingTeamName : undefined,
      teamMembers: bookingRegType === 'team' ? bookingTeamMembers.filter(m => m.name.trim() !== '') : undefined,
      usingOwnEquipment: usingOwnEquipment
    };

    try {
      // onAddBooking POSTs to /api/bookings and already updates the slot's bookedCount
      // locally from the server's response, so there's no separate increment call here.
      await onAddBooking(newBooking);
    } catch (e: any) {
      setIsProcessingPayment(false);
      setIsRedirecting(false);
      setBookingSubmitError(e?.message || t('tourDetailPage.booking.validation.submitError'));
      return;
    }

    if (onShowNotification) {
      onShowNotification(t('tourDetailPage.booking.notifications.statsRecorded'), 'info');
    }

    // 3. Exactly 1-second wait before auto-direction: "Müştəri WhatsApp-a yönləndirilməzdən tam bir saniyə öncə arxa planda klik statistikasını tutmalıyq."
    setTimeout(() => {
      setIsProcessingPayment(false);
      setIsRedirecting(false);

      // Raw message formatting
      let msgText = t('tourDetailPage.booking.waMessage.intro', {
        tourName: selectedTour.name,
        date: selectedSlot.startDate,
        qty: finalQty,
        bookingRef,
        customerName: bookingCustomerName.trim() || currentUser.name,
        customerPhone: bookingCustomerPhone.trim() || currentUser.phone
      });

      if (selectedTour.category === 'active' || selectedTour.isActiveLife) {
        const regTypeText = bookingRegType === 'team'
          ? t('tourDetailPage.booking.waMessage.teamRegType', { teamName: bookingTeamName || t('tourDetailPage.booking.waMessage.teamNameNotProvided') })
          : t('tourDetailPage.booking.waMessage.individualRegType');
        msgText += t('tourDetailPage.booking.waMessage.regTypeLine', { regType: regTypeText });

        if (bookingRegType === 'team') {
          const filledMembers = bookingTeamMembers.filter(m => m.name.trim());
          if (filledMembers.length > 0) {
            msgText += t('tourDetailPage.booking.waMessage.teamMembersHeader');
            filledMembers.forEach((m, i) => {
              msgText += `\n  - ${i + 2}. ${m.name} (${m.phone})`;
            });
          }
        }

        if (selectedTour.equipmentIncluded) {
          msgText += t('tourDetailPage.booking.waMessage.equipmentLine', {
            equipment: usingOwnEquipment
              ? t('tourDetailPage.booking.waMessage.ownEquipmentDiscounted')
              : t('tourDetailPage.booking.waMessage.organizerFreeEquipment')
          });
        } else {
          msgText += t('tourDetailPage.booking.waMessage.equipmentLine', {
            equipment: rentEquipment
              ? t('tourDetailPage.booking.waMessage.rentPaid')
              : t('tourDetailPage.booking.waMessage.ownEquipment')
          });
        }

        msgText += t('tourDetailPage.booking.waMessage.safetyLine');
      }

      // Driver/Guide specific direct whatsapp number or fallback +994706717804
      const targetWa = selectedTour.whatsapp_number
        ? selectedTour.whatsapp_number.replace(/\s+/g, '')
        : '+994706717804';

      const waUrl = `https://wa.me/${targetWa}?text=${encodeURIComponent(msgText)}`;

      // Safe external routing
      window.open(waUrl, '_blank');

      // Set success visuals
      setBookingSuccessData({
        bookingId: bId,
        bookingRef: bookingRef,
        tourName: selectedTour.name,
        date: selectedSlot.startDate,
        amount: totalCost,
        method: 'whatsapp',
        waNumber: targetWa,
        waMessage: msgText
      });
    }, 1000);
  };

  return (
        <div className="animate-fadeIn bg-white min-h-screen pb-20">
          <div className="max-w-[var(--global-max-width)] mx-auto px-5 py-8">

            {/* Header Section */}
            <div className="mb-8 space-y-4">
              <div className="flex space-x-2 text-xs text-label-tertiary font-medium">
                <span><strong className="text-label-primary cursor-pointer pointer-events-auto hover:underline" onClick={(e) => { e.stopPropagation(); const org = users.find(u => u.id === selectedTour.vendorId); if (org) { setSelectedOrganizer(org); setActiveView('organizer'); setSelectedTour(null); } }}>{selectedTour.vendorName}</strong> {t('tourDetailPage.header.by')}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-label-primary tracking-tight leading-tight">
                {selectedTour.name}
              </h1>
              <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-4">
                  {isFeaturedThisMonth && (
                    <div className="bg-amber-500 text-white border border-amber-600 text-xs font-extrabold px-2 py-1 rounded shadow-sm shrink-0">🔥 {t('tourDetailPage.header.bestSellerBadge')}</div>
                  )}
                  {REVIEWS_ENABLED && (
                    <div className="flex items-center gap-1 font-bold text-label-primary text-sm shrink-0">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      4.9 <span className="text-label-tertiary font-normal underline decoration-slate-300">({t('tourDetailPage.header.reviewsCount', { count: getReviewsCount(selectedTour.id) })})</span>
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
                  <button onClick={() => handleShareTour(selectedTour)} className="flex items-center gap-2 border border-slate-200 rounded-full px-4 py-2 hover:bg-slate-50 text-slate-700 font-extrabold text-sm transition cursor-pointer shadow-sm">
                    <Share2 className="w-4 h-4" /> {t('tourDetailPage.header.share')}
                  </button>
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
                        <div className="col-span-2 row-span-2 cursor-pointer relative group" onClick={() => setLightboxIndex(0)}>
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

                      {/* Mobile Gallery (Carousel) */}
                      <div className="md:hidden relative h-[300px] rounded-2xl overflow-hidden shadow-sm block bg-slate-100">
                         <img src={allMedia[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         <div className="absolute bottom-3 right-3 pointer-events-auto">
                           <button onClick={() => setLightboxIndex(0)} className="bg-white/95 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer border border-slate-200">
                             <Grid2X2 className="w-3.5 h-3.5" /> {t('tourDetailPage.gallery.viewAllImages')}
                           </button>
                         </div>
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
                    <span className="text-sm font-extrabold text-slate-900">{t('tourDetailPage.quickInfo.duration', { hours: selectedTour.durationHours ?? (selectedTour.durationDays * 8) })}</span>
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

                {/* ACTIVE Tour Slots List — hidden until "Yerləri yoxla" is clicked in the sidebar */}
                {showTourSlots && (
                  <div id="tour-slots-calendar" className="scroll-mt-32 animate-fadeIn">
                    <h4 className="text-sm font-bold text-slate-800 tracking-wide flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      {t('tourDetailPage.slotsCalendar.title')}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 mb-2">
                      {t('tourDetailPage.slotsCalendar.subtitle')}
                    </p>

                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {slots.filter(s => s.tourId === selectedTour.id).map((slot) => {
                        const remainingSpots = Math.max(0, slot.capacity - slot.bookedCount);
                        const isFull = remainingSpots <= 0;
                        return (
                          <div
                            key={slot.id}
                            className={`flex items-center justify-between p-3 rounded-lg border text-xs transition ${
                              isFull
                                ? 'bg-slate-50 border-slate-200 opacity-60'
                                : 'bg-white border-slate-150 shadow-sm hover:border-emerald-300'
                            }`}
                          >
                            <div className="space-y-1">
                              <span className="font-bold text-slate-700 block">📅 {t('tourDetailPage.slotsCalendar.date', { date: slot.startDate })}</span>
                              <span className="text-slate-400 block text-[10px]">
                                {slot.startDate !== slot.endDate && t('tourDetailPage.slotsCalendar.endDate', { date: slot.endDate })}
                              </span>
                            </div>

                            <div className="text-center">
                              <span className="text-[10px] text-slate-400 block">{t('tourDetailPage.slotsCalendar.remainingSpots')}</span>
                              <strong className={`${isFull ? 'text-red-500' : 'text-slate-700'}`}>
                                {remainingSpots} / {slot.capacity}
                              </strong>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className="text-base font-extrabold text-sky-705">
                                {t('tourDetailPage.slotsCalendar.pricePerPerson', { price: getConvertedPriceInfo(slot.price, selectedTour.priceCurrency).both })}
                              </span>
                              {!isFull ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenBooking(slot)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded transition"
                                >
                                  {t('tourDetailPage.slotsCalendar.reserve')}
                                </button>
                              ) : (
                                <span className="text-[11px] text-red-500 font-bold tracking-wider">{t('tourDetailPage.slotsCalendar.full')}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 2 registration form — rendered right below the tour-slots-calendar
                    section instead of far down the page, so it opens exactly where the user
                    just clicked "Rezerv et". */}
                {isBookingStep && (
                /* STEP 2: BOOKING FLOW INTELLIGENCE / SIMULATION */
                <div id="booking-form-section" className="space-y-6">
                  {bookingSuccessData ? (
                    // Success View
                    <div className="text-center py-6 space-y-4">
                      {bookingSuccessData.method === 'whatsapp' ? (
                        <>
                          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <MessageCircle className="w-8 h-8 fill-current" />
                          </div>
                          <h3 className="text-lg font-extrabold text-slate-800">{t('tourDetailPage.bookingSuccess.whatsapp.title')}</h3>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                            {t('tourDetailPage.bookingSuccess.whatsapp.descPart1')} <strong>{t('tourDetailPage.bookingSuccess.whatsapp.pendingLabel')}</strong>. {t('tourDetailPage.bookingSuccess.whatsapp.descPart2')}
                          </p>

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left max-w-sm mx-auto space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">{t('tourDetailPage.bookingSuccess.orderId')}</span>
                              <strong className="font-mono text-slate-705 text-slate-800">#{bookingSuccessData.bookingRef}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">{t('tourDetailPage.bookingSuccess.tourRoute')}</span>
                              <strong className="text-slate-700 text-right">{bookingSuccessData.tourName}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">{t('tourDetailPage.bookingSuccess.date')}</span>
                              <strong className="text-slate-700">{bookingSuccessData.date}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">{t('tourDetailPage.bookingSuccess.amountDue')}</span>
                              <strong className="text-emerald-650 text-sm font-extrabold text-emerald-600">{bookingSuccessData.amount} AZN</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">{t('tourDetailPage.bookingSuccess.systemRegType')}</span>
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded">{t('tourDetailPage.bookingSuccess.pendingWhatsapp')}</span>
                            </div>
                          </div>

                          {/* Action Button: Open WhatsApp pre-drafted message */}
                          <div className="flex flex-col gap-2 max-w-sm mx-auto pt-2">
                            <a
                              href={`https://wa.me/${bookingSuccessData.waNumber}?text=${encodeURIComponent(bookingSuccessData.waMessage)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-3 bg-whatsapp-500 hover:bg-whatsapp-600 hover:scale-[1.02] transform transition-all text-white font-extrabold text-xs rounded-xl shadow-lg shadow-whatsapp-500/20 flex items-center justify-center gap-2 cursor-pointer no-underline"
                            >
                              <MessageCircle className="w-4 h-4 fill-current" />
                              {t('tourDetailPage.bookingSuccess.sendViaWhatsapp')} ↗
                            </a>

                            {/* Copy to clipboard fallback button */}
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(bookingSuccessData.waMessage);
                                if (onShowNotification) onShowNotification(t('tourDetailPage.bookingSuccess.copiedNotification'), 'success');
                              }}
                              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                            >
                              <Copy className="w-3.5 h-3.5" /> {t('tourDetailPage.bookingSuccess.copyAndGoToWhatsapp')}
                            </button>
                          </div>

                          {/* WhatsApp dispatch simulation console */}
                          <div className="bg-slate-950 p-4 rounded-lg text-left max-w-sm mx-auto border border-emerald-950 font-mono text-[10px] space-y-1 text-slate-450 text-slate-400 shadow-inner">
                            <div className="text-emerald-400">// WHATSAPP DISPATCH HANDLES READY</div>
                            <div>{t('tourDetailPage.bookingSuccess.guideNumber')} {bookingSuccessData.waNumber}</div>
                            <div className="text-amber-400">Status: Awaiting Receipt validation via WhatsApp / SMS</div>
                            <div className="text-slate-500">// {t('tourDetailPage.bookingSuccess.consoleFooter')}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl">
                            ✓
                          </div>
                          <h3 className="text-lg font-bold text-slate-800">{t('tourDetailPage.bookingSuccess.purchase.title')}</h3>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            {t('tourDetailPage.bookingSuccess.purchase.desc')}
                          </p>

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left max-w-sm mx-auto space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">{t('tourDetailPage.bookingSuccess.ticketNumber')}</span>
                              <strong className="font-mono text-slate-700">#{bookingSuccessData.bookingId}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">{t('tourDetailPage.bookingSuccess.tourName')}</span>
                              <strong className="text-slate-700 text-right">{bookingSuccessData.tourName}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">{t('tourDetailPage.bookingSuccess.date')}</span>
                              <strong className="text-slate-700">{bookingSuccessData.date}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">{t('tourDetailPage.bookingSuccess.amountPaid')}</span>
                              <strong className="text-emerald-600">{bookingSuccessData.amount} AZN</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">{t('tourDetailPage.bookingSuccess.paymentMethod')}</span>
                              <span className="font-mono text-xs text-slate-700 font-bold">{bookingSuccessData.method}</span>
                            </div>
                          </div>

                          {/* Live SMS dispatch terminal visual log */}
                          <div className="bg-slate-950 p-4 rounded text-left max-w-sm mx-auto border border-slate-800 font-mono text-[10px] space-y-1 text-slate-400">
                            <div className="text-emerald-400">// SMS INTEGRATION TRANSMISSION OK</div>
                            <div>To: {currentUser.phone}</div>
                            <div>Sender: GEDƏKGÖRƏK</div>
                            <div className="text-slate-300">{t('tourDetailPage.bookingSuccess.smsBody', { name: currentUser.name, tourName: bookingSuccessData.tourName, qty: bookingQty, bookingId: bookingSuccessData.bookingId })}</div>
                          </div>
                        </>
                      )}

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTour(null);
                            setBookingSuccessData(null);
                          }}
                          className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg transition cursor-pointer"
                        >
                          {t('tourDetailPage.bookingSuccess.close')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Payment Checkout inputs
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                        <div className="text-xs">
                          <span className="text-slate-400 block">{t('tourDetailPage.checkout.selectedDate')}</span>
                          <strong className="text-slate-700">{selectedSlot?.startDate}</strong>
                        </div>
                        <div className="text-xs text-right">
                          <span className="text-slate-400 block">{t('tourDetailPage.checkout.tourPrice')}</span>
                          <strong className="text-emerald-600 font-bold">{t('tourDetailPage.checkout.pricePerPerson', { price: getConvertedPriceInfo(selectedSlot?.price || 0, selectedTour.priceCurrency).both })}</strong>
                        </div>
                      </div>

                      {/* Participant quantity wrapper */}
                      {bookingRegType !== 'team' ? (
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">{t('tourDetailPage.checkout.participantCount')}</label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              disabled={bookingQty <= 1}
                              onClick={() => setBookingQty(prev => prev - 1)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold w-8 h-8 rounded-full flex items-center justify-center transition disabled:opacity-40"
                            >
                              -
                            </button>
                            <span className="font-bold text-slate-800 text-sm tracking-widest">{bookingQty}</span>
                            <button
                              type="button"
                              disabled={selectedSlot ? bookingQty >= (selectedSlot.capacity - selectedSlot.bookedCount) : true}
                              onClick={() => setBookingQty(prev => prev + 1)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold w-8 h-8 rounded-full flex items-center justify-center transition disabled:opacity-40"
                            >
                              +
                            </button>
                            <span className="text-[10px] text-slate-400 italic">
                              {t('tourDetailPage.checkout.maxSpotsAvailable', { count: selectedSlot ? Math.max(0, selectedSlot.capacity - selectedSlot.bookedCount) : 0 })}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 text-amber-900 text-xs p-3 rounded-xl border border-amber-200 font-bold flex items-center justify-between">
                          <span>📋 {t('tourDetailPage.checkout.teamContingentLabel')}</span>
                          <span className="text-xs font-black text-amber-800 bg-white px-2 py-0.5 rounded shadow-sm">{t('tourDetailPage.checkout.teamContingentValue')}</span>
                        </div>
                      )}

                      {/* ACTIVE LIFESTYLE PORTAL: REGISTRATION STYLE & EQUIPMENT CHOICES */}
                      {(selectedTour.category === 'active' || selectedTour.isActiveLife) && (
                        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4.5 space-y-4 shadow-sm animate-fadeIn">
                          <h4 className="text-xs font-bold text-amber-900 tracking-wider flex items-center gap-1.5 border-b border-amber-200 pb-2">
                            🏅 {t('tourDetailPage.activeSports.title')}
                          </h4>

                          {/* Individual vs Team Registration (Volleyball specific or other dynamic games) */}
                          {selectedTour.allowTeamRegistration && (
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-slate-500 tracking-wider">{t('tourDetailPage.activeSports.regTypeLabel')}</label>
                              <div className="grid grid-cols-2 gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBookingRegType('individual');
                                    setBookingQty(1);
                                  }}
                                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                                    bookingRegType === 'individual'
                                      ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-200/50 shadow-xs'
                                      : 'bg-white border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="font-extrabold text-xs text-slate-800">👤 {t('tourDetailPage.activeSports.individualOption')}</span>
                                  <span className="text-[9px] text-slate-400 mt-1 block">{t('tourDetailPage.activeSports.individualOptionDesc')}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBookingRegType('team');
                                    setBookingQty(6);
                                  }}
                                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                                    bookingRegType === 'team'
                                      ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-200/50 shadow-xs'
                                      : 'bg-white border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="font-extrabold text-xs text-slate-800">🏐 {t('tourDetailPage.activeSports.teamOption')}</span>
                                  <span className="text-[9px] text-slate-400 mt-1 block">{t('tourDetailPage.activeSports.teamOptionDesc')}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Dynamically expanding team sub-form */}
                          {bookingRegType === 'team' && (
                            <div className="bg-white/95 border border-amber-200 p-4 rounded-xl space-y-3.5 shadow-xs animate-fadeIn">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  {t('tourDetailPage.activeSports.teamNameLabel')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder={t('tourDetailPage.activeSports.teamNamePlaceholder')}
                                  value={bookingTeamName}
                                  onChange={(e) => setBookingTeamName(e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs border border-slate-250 bg-white rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 outline-none font-medium"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 tracking-widest border-b border-slate-100 pb-1.5">
                                  {t('tourDetailPage.activeSports.otherMembersLabel')}
                                </label>
                                {bookingTeamMembers.map((member, idx) => (
                                  <div key={idx} className="grid grid-cols-2 gap-2 pb-2 border-b border-dashed border-slate-100 last:border-0 last:pb-0">
                                    <div>
                                      <input
                                        type="text"
                                        placeholder={t('tourDetailPage.activeSports.memberNamePlaceholder', { index: idx + 2 })}
                                        value={member.name}
                                        onChange={(e) => {
                                          const next = [...bookingTeamMembers];
                                          next[idx].name = e.target.value;
                                          setBookingTeamMembers(next);
                                        }}
                                        className="w-full px-2.5 py-1 text-[11px] border border-slate-200 rounded text-slate-800 bg-white placeholder-slate-400"
                                      />
                                    </div>
                                    <div>
                                      <input
                                        type="tel"
                                        placeholder={t('tourDetailPage.activeSports.memberPhonePlaceholder')}
                                        value={member.phone}
                                        onChange={(e) => {
                                          const next = [...bookingTeamMembers];
                                          next[idx].phone = e.target.value;
                                          setBookingTeamMembers(next);
                                        }}
                                        className="w-full px-2.5 py-1 text-[11px] border border-slate-200 rounded text-slate-800 bg-white placeholder-slate-400"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Dynamic Equipment Checkbox Options */}
                          <div className="bg-white/90 p-3.5 rounded-xl border border-amber-100 space-y-3">
                            <span className="block text-[10px] font-bold text-slate-500">{t('tourDetailPage.equipment.sectionLabel')}</span>

                            {selectedTour.equipmentIncluded ? (
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="checkbox"
                                  id="usingOwnEquipment"
                                  checked={usingOwnEquipment}
                                  onChange={(e) => setUsingOwnEquipment(e.target.checked)}
                                  className="mt-1 w-4.5 h-4.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                />
                                <label htmlFor="usingOwnEquipment" className="text-xs text-slate-705 text-slate-700 leading-normal cursor-pointer select-none">
                                  <strong>💼 {t('tourDetailPage.equipment.ownEquipmentTitle')}</strong> {selectedTour.equipmentRentalPrice ? t('tourDetailPage.equipment.ownEquipmentDiscountDesc', { price: selectedTour.equipmentRentalPrice, currency: selectedTour.priceCurrency || 'AZN' }) : t('tourDetailPage.equipment.ownEquipmentNoDiscountDesc')}
                                </label>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="checkbox"
                                  id="rentEquipment"
                                  checked={rentEquipment}
                                  onChange={(e) => setRentEquipment(e.target.checked)}
                                  className="mt-1 w-4.5 h-4.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                />
                                <label htmlFor="rentEquipment" className="text-xs text-slate-705 text-slate-700 leading-normal cursor-pointer select-none">
                                  <strong>🎒 {t('tourDetailPage.equipment.rentTitle')}</strong> {t('tourDetailPage.equipment.rentDesc', { equipment: selectedTour.requiredEquipment || t('tourDetailPage.equipment.defaultEquipment'), price: selectedTour.equipmentRentalPrice || 15, currency: selectedTour.priceCurrency || 'AZN' })}
                                </label>
                              </div>
                            )}
                          </div>

                          {/* Safety Waiver Section with active checkbox requirement */}
                          <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-100 flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              id="safetyWaiverInputCheck"
                              checked={safetyAcknowledged}
                              onChange={(e) => setSafetyAcknowledged(e.target.checked)}
                              className="mt-1 w-4.5 h-4.5 text-rose-600 border-rose-300 rounded cursor-pointer shrink-0"
                            />
                            <div className="text-xs text-slate-700 leading-normal">
                              <label htmlFor="safetyWaiverInputCheck" className="font-extrabold block text-rose-900 cursor-pointer select-none mb-0.5">
                                ⚖️ {t('tourDetailPage.safetyWaiver.title')} <span className="text-red-500 font-extrabold">*</span>
                              </label>
                              <span className="text-[10px] leading-relaxed block text-rose-950/85">
                                {t('tourDetailPage.safetyWaiver.body', { level: (selectedTour.difficulty as string) === 'beginner' || selectedTour.difficulty === 'easy' ? t('tourDetailPage.safetyWaiver.levelBeginner') : selectedTour.difficulty === 'hard' ? t('tourDetailPage.safetyWaiver.levelProfessional') : t('tourDetailPage.safetyWaiver.levelIntermediate') })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Guest Passenger Details (No Registration required!) */}
                      <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 tracking-wide">
                            {t('tourDetailPage.guestForm.noRegistrationBadge')}
                          </span>
                          <span className="text-slate-400 font-medium text-[11px]">{t('tourDetailPage.guestForm.ticketPurchase')}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              {t('tourDetailPage.guestForm.fullNameLabel')} <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder={t('tourDetailPage.guestForm.fullNamePlaceholder')}
                              value={bookingCustomerName}
                              onChange={(e) => setBookingCustomerName(e.target.value)}
                              disabled={isPhoneVerified}
                              className="w-full px-3 py-2 text-xs border border-slate-250 bg-white rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              {t('tourDetailPage.guestForm.phoneLabel')} <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              required
                              placeholder={t('tourDetailPage.guestForm.phonePlaceholder')}
                              value={bookingCustomerPhone}
                              onChange={(e) => setBookingCustomerPhone(e.target.value)}
                              disabled={isPhoneVerified}
                              className="w-full px-3 py-2 text-xs border border-slate-250 bg-white rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                            />
                          </div>
                        </div>

                        {/* WhatsApp Verification Code Box */}
                        <div className="border-t border-slate-200/60 pt-3.5 mt-2 space-y-3">
                          {!isOtpSent ? (
                            <button
                              type="button"
                              onClick={handleSendVerificationCode}
                              className="w-full py-2 bg-slate-900 text-white hover:bg-slate-800 font-extrabold text-[11px] rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-current text-white" />
                              {t('tourDetailPage.otp.sendButton')}
                            </button>
                          ) : (
                            <div className="space-y-3">
                              {showIncomingOtpBanner && (
                                <div className="bg-slate-900 border-l-4 border-emerald-550 border-emerald-500 rounded-xl p-3.5 shadow-xl text-white max-w-sm mx-auto mb-1 animate-pulse">
                                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold mb-1 tracking-wider">
                                    <div className="flex items-center gap-1">
                                      <span className="bg-emerald-600 text-white rounded p-0.5 px-1 font-extrabold text-[8px]">WA</span>
                                      <span>{t('tourDetailPage.otp.whatsappSent')}</span>
                                    </div>
                                    <span>{t('tourDetailPage.otp.now')}</span>
                                  </div>
                                  <div className="text-[11px] leading-relaxed text-slate-105 text-slate-100">
                                    <span className="font-normal text-slate-350">{t('tourDetailPage.otp.bannerLabel')}</span> <strong className="text-emerald-400 font-mono text-sm tracking-widest">{verificationOtpCode}</strong>
                                  </div>
                                </div>
                              )}

                              {!isPhoneVerified ? (
                                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2.5">
                                  <div className="text-[11px] text-slate-500 leading-normal">
                                    {t('tourDetailPage.otp.enterCodePrompt')}
                                  </div>
                                  <div className="flex gap-2.5">
                                    <input
                                      type="text"
                                      maxLength={4}
                                      placeholder={t('tourDetailPage.otp.codePlaceholder')}
                                      value={userInputOtp}
                                      onChange={(e) => setUserInputOtp(e.target.value.replace(/\D/g, ''))}
                                      className="flex-1 px-3 py-2 text-xs text-center font-bold font-mono tracking-widest border border-slate-200 bg-slate-50 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleVerifyOtp}
                                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-all cursor-pointer"
                                    >
                                      {t('tourDetailPage.otp.verifyButton')}
                                    </button>
                                  </div>
                                  <div className="text-right">
                                    <button
                                      type="button"
                                      onClick={handleSendVerificationCode}
                                      className="text-[10px] text-sky-600 hover:underline font-bold cursor-pointer"
                                    >
                                      {t('tourDetailPage.otp.resendButton')}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-emerald-50 border border-emerald-150 rounded-lg p-3 flex items-center justify-between text-xs text-emerald-800">
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    <span>{t('tourDetailPage.otp.verifiedLabel', { phone: bookingCustomerPhone })}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsPhoneVerified(false);
                                      setIsOtpSent(false);
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-red-500 underline cursor-pointer"
                                  >
                                    {t('tourDetailPage.otp.changeNumber')}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Dedicated WhatsApp explanation instead of old cards */}
                      <div className="bg-emerald-50 border border-emerald-150/60 rounded-xl p-4 space-y-2 text-slate-750">
                        <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                          <MessageCircle className="w-4 h-4 text-emerald-600 fill-current animate-pulse" />
                          <span>{t('tourDetailPage.waExplanation.title')}</span>
                          <span className="bg-emerald-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wider">{t('tourDetailPage.waExplanation.activeLabel')}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {t('tourDetailPage.waExplanation.bodyPart1')} <strong>WhatsApp</strong> {t('tourDetailPage.waExplanation.bodyPart2', { number: selectedTour.whatsapp_number || '+994706717804' })}
                        </p>
                      </div>

                      {/* Dynamic Total Cost calculator */}
                      {(() => {
                        const priceDetails = getActiveCalculatedPrice();
                        const currency = selectedTour.priceCurrency || 'AZN';
                        const isAzn = currency === 'AZN';
                        
                        const singleOriginal = getConvertedPriceInfo(priceDetails.perPerson, currency).original;
                        const totalOriginal = getConvertedPriceInfo(priceDetails.total, currency).original;
                        const totalAzn = getConvertedPriceInfo(priceDetails.total, currency).azn;
                        
                        return (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-slate-400 block font-medium tracking-tight">{t('tourDetailPage.totalCost.label')}</span>
                              <span className="text-slate-500 text-[10px] font-mono block">
                                {t('tourDetailPage.totalCost.breakdown', { qty: priceDetails.qty, price: singleOriginal })}
                              </span>
                              {priceDetails.desc && (
                                <span className="text-[10px] text-amber-600 block mt-0.5 font-bold">
                                  💡 {priceDetails.desc}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-xl font-extrabold text-emerald-600 font-mono">
                                {totalOriginal}
                              </span>
                              {!isAzn && (
                                <span className="text-[10px] text-slate-400 font-bold font-mono">
                                  (~ {totalAzn} ₼)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {bookingSubmitError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2 flex items-center gap-2">
                          ⚠️ {bookingSubmitError}
                        </div>
                      )}

                      {/* Checkout Action Buttons */}
                      <div className="flex gap-3 justify-end items-center pt-4 border-t border-slate-100">
                        {!isPhoneVerified && (
                          <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-1 rounded">
                            ⚠️ {t('tourDetailPage.checkoutActions.verifyPhoneWarning')}
                          </span>
                        )}

                        {((selectedTour.category === 'active' || selectedTour.isActiveLife) && !safetyAcknowledged) && (
                          <span className="text-[10px] text-red-500 font-bold bg-rose-50 px-2 py-1 rounded">
                            ⚠️ {t('tourDetailPage.checkoutActions.acceptWaiverWarning')}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsBookingStep(false);
                            setBookingSuccessData(null);
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs rounded-lg transition"
                        >
                          {t('tourDetailPage.checkoutActions.back')}
                        </button>

                        <button
                          type="button"
                          disabled={isProcessingPayment || !isPhoneVerified || (((selectedTour.category === 'active' || selectedTour.isActiveLife)) && !safetyAcknowledged)}
                          onClick={handleProceedBookingSimulate}
                          className="px-5 py-2.5 bg-whatsapp-500 hover:bg-whatsapp-600 text-white font-extrabold text-xs rounded-lg shadow-md transition flex items-center gap-2 disabled:opacity-40 hover:scale-[1.02] cursor-pointer"
                        >
                          {isProcessingPayment ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span>{t('tourDetailPage.checkoutActions.recordingInProgress')}</span>
                            </>
                          ) : (
                            <>
                              <MessageCircle className="w-4 h-4 text-white fill-current animate-pulse" />
                              <span>{t('tourDetailPage.checkoutActions.bookViaWhatsapp')}</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  )}
                </div>
                )}

                {/* Qiymətə daxildir / daxil deyil (Modern Grid) — turun dəyərini istifadəçi ilk açılışda görsün deyə ən yuxarıda */}
                <div className="space-y-4 py-4">
                  <h2 className="text-xl font-extrabold text-slate-900">{t('tourDetailPage.priceIncludes.title')}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Daxildir */}
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 space-y-3.5">
                      <h3 className="text-xs font-black text-emerald-700 tracking-wider uppercase">{t('tourDetailPage.priceIncludes.includedHeader')}</h3>
                      <div className="space-y-3">
                        {(selectedTour.includes && selectedTour.includes.length > 0
                          ? selectedTour.includes
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
                          ? selectedTour.notIncluded
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
                      ? selectedTour.highlights
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
                  <div className="relative">
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isDescExpanded || selectedTour.description.length <= 320 ? 'max-h-[1000px]' : 'max-h-[150px]'
                      }`}
                    >
                      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line font-medium antialiased">
                        {selectedTour.description}
                      </p>
                    </div>
                    {!isDescExpanded && selectedTour.description.length > 320 && (
                      <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    )}
                  </div>
                  {selectedTour.description.length > 320 && (
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
                                     <span className="text-[10px] text-emerald-600 font-bold block line-clamp-2 tracking-wide mt-0.5" title={g.specialty}>{g.specialty || t('tourDetailPage.organizerTeam.defaultSpecialty')}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-3" title={g.bio}>{g.bio}</p>
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
                      <h4 className="text-xs font-black text-slate-500 tracking-widest border-b pb-1.5 flex items-center gap-1.5">
                        ⏳ {t('tourDetailPage.itineraryDetail.title')}
                      </h4>

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
                            <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowParticipantsDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-4 mt-1">
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
                            </>
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
                            <span className="text-sm font-extrabold text-slate-800">{selectedSlot ? t('tourDetailPage.dateDropdown.selectedDate', { date: selectedSlot.startDate }) : t('tourDetailPage.dateDropdown.selectDate')}</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showDateDropdown && (
                          <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowDateDropdown(false)} />
                          <div className="absolute left-0 right-0 top-full z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-2 mt-1 max-h-64 overflow-y-auto">
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
                                      <span className="text-xs font-bold text-slate-700">📅 {slot.startDate}</span>
                                      <span className={`text-[10px] font-bold ${isDisabled ? 'text-red-400' : 'text-slate-400'}`}>
                                        {isPast ? t('tourDetailPage.dateDropdown.ended') : remainingSpots <= 0 ? t('tourDetailPage.dateDropdown.full') : t('tourDetailPage.dateDropdown.spotsLeft', { count: remainingSpots })}
                                      </span>
                                    </button>
                                  );
                                })
                            )}
                          </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA Action — just reveals the tour-slots-calendar section (moved up next to the
                      Quick Info Grid). Once that section is open there's nothing left for this button to do,
                      so it's hidden entirely instead of switching label/behavior. */}
                  {!showTourSlots && (
                    <button
                      type="button"
                      disabled={slots.filter(s => s.tourId === selectedTour.id).length === 0}
                      onClick={() => setShowTourSlots(true)}
                      className="w-full bg-primary-500 hover:bg-primary-600 text-white text-base md:text-lg font-black py-3.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer block text-center disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {t('tourDetailPage.sidebar.checkAvailability')}
                    </button>
                  )}

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
                {tours
                  .filter(t => t.id !== selectedTour.id)
                  .sort(() => 0.5 - Math.random()) // Randomize for varied suggestions
                  .slice(0, 4)
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
                          setIsBookingStep(false);
                          setBookingSuccessData(null);
                          setSelectedSlot(null);
                        }}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <img
                            src={tour.image}
                            alt={tour.name}
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
                            {tour.name}
                          </h3>
                          {REVIEWS_ENABLED && (
                            <div className="flex items-center gap-1 text-xs font-bold text-label-primary mb-4">
                               <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                               4.9 <span className="text-label-tertiary font-normal">({getReviewsCount(tour.id)})</span>
                            </div>
                          )}

                          <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between">
                            <span className="text-xs text-label-tertiary font-medium">{t('tourDetailPage.relatedTours.hours', { hours: tour.durationHours ?? (tour.durationDays * 8) })}</span>
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
      </div>
  );
}
