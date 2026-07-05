import React, { useState } from 'react';
import { Tour, TourSlot, Booking, Review, User } from '../../types';
import { REVIEWS_ENABLED } from '../../config/features';
import { computeFeaturedTourIds } from '../../utils/featuredTours';
import {
  AlertCircle,
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
        descParts.push(`Öz avadanlığı endirimi (-${discount} ${selectedTour.priceCurrency || 'AZN'})`);
      } else if (!selectedTour.equipmentIncluded && rentEquipment) {
        const rental = selectedTour.equipmentRentalPrice || 15;
        perPerson = perPerson + rental;
        descParts.push(`Avadanlıq kirayəsi (+${rental} ${selectedTour.priceCurrency || 'AZN'})`);
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
      if (onShowNotification) onShowNotification('Sifarişi tamamlamaq üçün Ad və Soyadınızı daxil edin.', 'warning');
      return;
    }
    if (!bookingCustomerPhone.trim()) {
      if (onShowNotification) onShowNotification('Sifarişi tamamlamaq üçün WhatsApp əlaqə nömrənizi daxil edin.', 'warning');
      return;
    }

    // Clean Phone value
    const cleanPhone = bookingCustomerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      if (onShowNotification) onShowNotification('Mötəbər bir WhatsApp nömrəsi daxil edin (məsələn: +994 50 123 45 67).', 'warning');
      return;
    }

    const generatedCode = String(Math.floor(1000 + Math.random() * 9000));
    setVerificationOtpCode(generatedCode);
    setIsOtpSent(true);
    setUserInputOtp('');
    setIsPhoneVerified(false);
    setShowIncomingOtpBanner(true);

    if (onShowNotification) {
      onShowNotification(`Təsdiq kodu (${generatedCode}) WhatsApp nömrənizə göndərildi!`, 'success');
    }
  };

  const handleVerifyOtp = () => {
    if (!userInputOtp.trim()) {
      if (onShowNotification) onShowNotification('Zəhmət olmasa daxil olan 4 rəqəmli kodu yazın.', 'warning');
      return;
    }
    if (userInputOtp === verificationOtpCode) {
      setIsPhoneVerified(true);
      setShowIncomingOtpBanner(false);
      if (onShowNotification) {
        onShowNotification('Əla! WhatsApp nömrəniz uğurla təsdiqləndi. İndi rezervasiyanı tamamlaya bilərsiniz! ✅', 'success');
      }
    } else {
      setIsPhoneVerified(false);
      if (onShowNotification) {
        onShowNotification('Təsdiq kodu yanlışdır! Zəhmət olmasa yenidən yoxlayın.', 'error');
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
      setBookingSubmitError(e?.message || 'Rezervasiya göndərilərkən xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
      return;
    }

    if (onShowNotification) {
      onShowNotification('Statistika qeydə alındı! WhatsApp-a yönləndirilirsiniz...', 'info');
    }

    // 3. Exactly 1-second wait before auto-direction: "Müştəri WhatsApp-a yönləndirilməzdən tam bir saniyə öncə arxa planda klik statistikasını tutmalıyq."
    setTimeout(() => {
      setIsProcessingPayment(false);
      setIsRedirecting(false);

      // Raw message formatting
      let msgText = `Salam, mən saytınızdan '${selectedTour.name}' üçün rezervasiya etmək istəyirəm.\nTarix: ${selectedSlot.startDate}.\nYer sayı: ${finalQty} nəfər.\nSifariş ID: #${bookingRef}.\nAd Soyad: ${bookingCustomerName.trim() || currentUser.name}.\nƏlaqə nömrəsi: ${bookingCustomerPhone.trim() || currentUser.phone}`;

      if (selectedTour.category === 'active' || selectedTour.isActiveLife) {
        msgText += `\n\n📌 *İdman Qeydiyyat Növü:* ${bookingRegType === 'team' ? `Komandalı qeydiyyat (Komanda adı: ${bookingTeamName || 'Göstərilməyib'})` : 'Fərdi qeydiyyat'}`;

        if (bookingRegType === 'team') {
          const filledMembers = bookingTeamMembers.filter(m => m.name.trim());
          if (filledMembers.length > 0) {
            msgText += `\n👥 *Komanda Üzvləri:*`;
            filledMembers.forEach((m, i) => {
              msgText += `\n  - ${i + 2}. ${m.name} (${m.phone})`;
            });
          }
        }

        if (selectedTour.equipmentIncluded) {
          msgText += `\n🎒 *Avadanlıq:* ${usingOwnEquipment ? 'Öz şəxsi avadanlığım var (Endirimli)' : 'Təşkilatçının daxil etdiyi pulsuz avadanlıq'}`;
        } else {
          msgText += `\n🎒 *Avadanlıq:* ${rentEquipment ? 'Kirayə etmək istəyirəm (Ödənişli)' : 'Öz şəxsi avadanlığım var'}`;
        }

        msgText += `\n⚖️ *Təhlükəsizlik razılığı:* Təsdiq edildi ✅`;
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
                <span><strong className="text-label-primary cursor-pointer pointer-events-auto hover:underline" onClick={(e) => { e.stopPropagation(); const org = users.find(u => u.id === selectedTour.vendorId); if (org) { setSelectedOrganizer(org); setActiveView('organizer'); setSelectedTour(null); } }}>{selectedTour.vendorName}</strong> tərəfindən</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-label-primary tracking-tight leading-tight">
                {selectedTour.name}
              </h1>
              <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-4">
                  {isFeaturedThisMonth && (
                    <div className="bg-amber-500 text-white border border-amber-600 text-xs font-extrabold px-2 py-1 rounded shadow-sm shrink-0">🔥 Ayın Ən Çox Satılanı</div>
                  )}
                  {REVIEWS_ENABLED && (
                    <div className="flex items-center gap-1 font-bold text-label-primary text-sm shrink-0">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      4.9 <span className="text-label-tertiary font-normal underline decoration-slate-300">({getReviewsCount(selectedTour.id)} rəy)</span>
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
                    {wishlist.includes(selectedTour.id) ? 'İstəklərdə' : 'İstəklərə əlavə et'}
                  </button>
                  <button onClick={() => handleShareTour(selectedTour)} className="flex items-center gap-2 border border-slate-200 rounded-full px-4 py-2 hover:bg-slate-50 text-slate-700 font-extrabold text-sm transition cursor-pointer shadow-sm">
                    <Share2 className="w-4 h-4" /> Paylaş
                  </button>
                </div>
              </div>
            </div>

            {/* Info Banner — placed right after the header's wishlist/share row, at the very top of the page */}
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-brand-primary rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-brand-primary text-sm">Turdan əvvəl bilməli olduqlarınız</h4>
                  <p className="text-brand-primary text-xs mt-0.5">Avadanlıq, geyim və çətinlik dərəcələri haqqında tam bələdçi</p>
                </div>
              </div>
              <button
                onClick={() => setActiveView('faq')}
                className="px-4 py-2 bg-brand-primary hover:opacity-90 text-white font-bold text-xs rounded-lg transition"
              >
                Oxu
              </button>
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
                              <Grid2X2 className="w-4 h-4" /> Hamısına bax
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile Gallery (Carousel) */}
                      <div className="md:hidden relative h-[300px] rounded-2xl overflow-hidden shadow-sm block bg-slate-100">
                         <img src={allMedia[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         <div className="absolute bottom-3 right-3 pointer-events-auto">
                           <button onClick={() => setLightboxIndex(0)} className="bg-white/95 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer border border-slate-200">
                             <Grid2X2 className="w-3.5 h-3.5" /> Bütün şəkillərə bax
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
                    <span className="text-sm font-extrabold text-slate-900">Ödənişsiz ləğv</span>
                    <span className="text-xs text-slate-500 leading-snug">48 saat əvvələ qədər ödənişsiz ləğv et</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Clock className="w-6 h-6 text-slate-700 mb-1" />
                    <span className="text-sm font-extrabold text-slate-900">Müddət: {selectedTour.durationHours ?? (selectedTour.durationDays * 8)} saat</span>
                    <span className="text-xs text-slate-500 leading-snug">Başlama vaxtlarını görmək üçün yoxlayın.</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Globe className="w-6 h-6 text-slate-700 mb-1" />
                    <span className="text-sm font-extrabold text-slate-900">Peşəkar tur bələdçisi</span>
                    <span className="text-xs text-slate-500 leading-snug">
                      {selectedTour.languages && selectedTour.languages.length > 0 ? selectedTour.languages.join(', ') : 'Azərbaycanca'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Users className="w-6 h-6 text-slate-700 mb-1" />
                    <span className="text-sm font-extrabold text-slate-900">Özəl qrup turları</span>
                    <span className="text-xs text-slate-500 leading-snug">Sifariş zamanı seçilə bilər</span>
                  </div>
                </div>

                {/* ACTIVE Tour Slots List — hidden until "Yerləri yoxla" is clicked in the sidebar */}
                {showTourSlots && (
                  <div id="tour-slots-calendar" className="scroll-mt-32 animate-fadeIn">
                    <h4 className="text-sm font-bold text-slate-800 tracking-wide flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      Yürüş Təqvimi və Qiymətlər
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 mb-2">
                      Bələdçi tərəfindən müəyyən edilmiş tarixlər və boş yer limitləri.
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
                              <span className="font-bold text-slate-700 block">📅 Tarix: {slot.startDate}</span>
                              <span className="text-slate-400 block text-[10px]">
                                {slot.startDate !== slot.endDate && `Bitmə Tarixi: ${slot.endDate}`}
                              </span>
                            </div>

                            <div className="text-center">
                              <span className="text-[10px] text-slate-400 block">Boş Yer</span>
                              <strong className={`${isFull ? 'text-red-500' : 'text-slate-700'}`}>
                                {remainingSpots} / {slot.capacity}
                              </strong>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className="text-base font-extrabold text-sky-705">
                                {getConvertedPriceInfo(slot.price, selectedTour.priceCurrency).both} / nəfər
                              </span>
                              {!isFull ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenBooking(slot)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded transition"
                                >
                                  Rezerv et
                                </button>
                              ) : (
                                <span className="text-[11px] text-red-500 font-bold tracking-wider">DOLUB</span>
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
                          <h3 className="text-lg font-extrabold text-slate-800">WhatsApp Rezervasiyası Yaradıldı!</h3>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                            Biletiniz sistemdə müvəqqəti qeydiyyata alındı <strong>(Gözləmədə)</strong>. İştirakınızı tam təsdiqləmək üçün aşağıdakı düyməyə basaraq operatora yazın və ödəniş qəbzini (m10/Kart) göndərin.
                          </p>

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left max-w-sm mx-auto space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Sifariş ID:</span>
                              <strong className="font-mono text-slate-705 text-slate-800">#{bookingSuccessData.bookingRef}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tur marşrutu:</span>
                              <strong className="text-slate-700 text-right">{bookingSuccessData.tourName}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tarix:</span>
                              <strong className="text-slate-700">{bookingSuccessData.date}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ödəniləcək Məbləğ:</span>
                              <strong className="text-emerald-650 text-sm font-extrabold text-emerald-600">{bookingSuccessData.amount} AZN</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Sistem qeydiyyat növü:</span>
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded">GÖZLƏYİR (WHATSAPP)</span>
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
                              WhatsApp ilə Mesajı Göndər ↗
                            </a>

                            {/* Copy to clipboard fallback button */}
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(bookingSuccessData.waMessage);
                                if (onShowNotification) onShowNotification('Sifariş mətni buferə kopyalandı! WhatsApp-da bəhs etdiyiniz nömrəyə asanlıqla yapışdıra bilərsiniz.', 'success');
                              }}
                              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                            >
                              <Copy className="w-3.5 h-3.5" /> Mətni Kopyala & WhatsApp-a Keç
                            </button>
                          </div>

                          {/* WhatsApp dispatch simulation console */}
                          <div className="bg-slate-950 p-4 rounded-lg text-left max-w-sm mx-auto border border-emerald-950 font-mono text-[10px] space-y-1 text-slate-450 text-slate-400 shadow-inner">
                            <div className="text-emerald-400">// WHATSAPP DISPATCH HANDLES READY</div>
                            <div>Bələdçi Nömrəsi: {bookingSuccessData.waNumber}</div>
                            <div className="text-amber-400">Status: Awaiting Receipt validation via WhatsApp / SMS</div>
                            <div className="text-slate-500">// Ödəniş qəbzi alındıqdan sonra dərhal "Təsdiqləndi" biletiniz və SMS gələcəkdir.</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl">
                            ✓
                          </div>
                          <h3 className="text-lg font-bold text-slate-800">Uğurlu Satınalma!</h3>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Təbriklər, ödənişiniz uğurla tamamlandı. Dağ yürüşünə biletiniz və SMS bildiriş təsdiqi göndərildi!
                          </p>

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left max-w-sm mx-auto space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Bilet nömrəsi:</span>
                              <strong className="font-mono text-slate-700">#{bookingSuccessData.bookingId}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Turun adı:</span>
                              <strong className="text-slate-700 text-right">{bookingSuccessData.tourName}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tarix:</span>
                              <strong className="text-slate-700">{bookingSuccessData.date}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ödənilən Məbləğ:</span>
                              <strong className="text-emerald-600">{bookingSuccessData.amount} AZN</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ödəniş Metodu:</span>
                              <span className="font-mono text-xs text-slate-700 font-bold">{bookingSuccessData.method}</span>
                            </div>
                          </div>

                          {/* Live SMS dispatch terminal visual log */}
                          <div className="bg-slate-950 p-4 rounded text-left max-w-sm mx-auto border border-slate-800 font-mono text-[10px] space-y-1 text-slate-400">
                            <div className="text-emerald-400">// SMS INTEGRATION TRANSMISSION OK</div>
                            <div>To: {currentUser.phone}</div>
                            <div>Sender: GEDƏKGÖRƏK</div>
                            <div className="text-slate-300">"Hörmətli {currentUser.name}, {bookingSuccessData.tourName} turuna olan {bookingQty} ədəd biletiniz uğurla alındı. Bilet ID: {bookingSuccessData.bookingId}. Çıxış tarixində iştirakınız təsdiqlənmişdir."</div>
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
                          Bağla
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Payment Checkout inputs
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                        <div className="text-xs">
                          <span className="text-slate-400 block">Seçilən Tarix</span>
                          <strong className="text-slate-700">{selectedSlot?.startDate}</strong>
                        </div>
                        <div className="text-xs text-right">
                          <span className="text-slate-400 block">Tur Qiyməti</span>
                          <strong className="text-emerald-600 font-bold">{getConvertedPriceInfo(selectedSlot?.price || 0, selectedTour.priceCurrency).both} / nəfər</strong>
                        </div>
                      </div>

                      {/* Participant quantity wrapper */}
                      {bookingRegType !== 'team' ? (
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">İştirakçı sayı:</label>
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
                              (Maksimum {selectedSlot ? Math.max(0, selectedSlot.capacity - selectedSlot.bookedCount) : 0} yer mövcuddur)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 text-amber-900 text-xs p-3 rounded-xl border border-amber-200 font-bold flex items-center justify-between">
                          <span>📋 Komandalı Qeydiyyat Kontingenti:</span>
                          <span className="text-xs font-black text-amber-800 bg-white px-2 py-0.5 rounded shadow-sm">6 Nəfərlik Komanda (Sabit)</span>
                        </div>
                      )}

                      {/* ACTIVE LIFESTYLE PORTAL: REGISTRATION STYLE & EQUIPMENT CHOICES */}
                      {(selectedTour.category === 'active' || selectedTour.isActiveLife) && (
                        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4.5 space-y-4 shadow-sm animate-fadeIn">
                          <h4 className="text-xs font-bold text-amber-900 tracking-wider flex items-center gap-1.5 border-b border-amber-200 pb-2">
                            🏅 Aktiv İdman Qeydiyyat Seçimləri
                          </h4>

                          {/* Individual vs Team Registration (Volleyball specific or other dynamic games) */}
                          {selectedTour.allowTeamRegistration && (
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-slate-500 tracking-wider">Qeydiyyat Tipi:</label>
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
                                  <span className="font-extrabold text-xs text-slate-800">👤 Fərdi Gəlirəm</span>
                                  <span className="text-[9px] text-slate-400 mt-1 block">Tək qeydiyyat. Sistem sizi boş komanda yerlərinə yerləşdirəcək.</span>
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
                                  <span className="font-extrabold text-xs text-slate-800">🏐 Komandamla Gəlirəm</span>
                                  <span className="text-[9px] text-slate-400 mt-1 block">Siz daxil olmaqla cəmi 6 nəfərlik tam komanda qeydiyyatı.</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Dynamically expanding team sub-form */}
                          {bookingRegType === 'team' && (
                            <div className="bg-white/95 border border-amber-200 p-4 rounded-xl space-y-3.5 shadow-xs animate-fadeIn">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Komandanızın Adı: <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="Məsələn: Gəncə Qartalları"
                                  value={bookingTeamName}
                                  onChange={(e) => setBookingTeamName(e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs border border-slate-250 bg-white rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 outline-none font-medium"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 tracking-widest border-b border-slate-100 pb-1.5">
                                  Digər 5 Komanda Üzvünün Məlumatları:
                                </label>
                                {bookingTeamMembers.map((member, idx) => (
                                  <div key={idx} className="grid grid-cols-2 gap-2 pb-2 border-b border-dashed border-slate-100 last:border-0 last:pb-0">
                                    <div>
                                      <input
                                        type="text"
                                        placeholder={`${idx + 2}. Üzvün Ad Soyadı`}
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
                                        placeholder="Telefon Nömrəsi"
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
                            <span className="block text-[10px] font-bold text-slate-500">Avadanlıq & Təchizat Seçimi:</span>
                            
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
                                  <strong>💼 Öz şəxsi avadanlığım var.</strong> {selectedTour.equipmentRentalPrice ? `Təşkilatçının daxil etdiyi pulsuz avadanlıqlara ehtiyac duymuram. Bununla da bilet başına -${selectedTour.equipmentRentalPrice} ${selectedTour.priceCurrency || 'AZN'} iştirak haqqı endirimi tətbiq olunacaqdır.` : 'Təşkilatçının avadanlığına ehtiyac duymuram.'}
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
                                  <strong>🎒 Avadanlıq qanuni kirayələmək istəyirəm.</strong> Təşkilatçı mənə zəruri avadanlıq dəstini ({selectedTour.requiredEquipment || 'Xizək, kaska və s.'}) təmin edəcəkdir (+{selectedTour.equipmentRentalPrice || 15} {selectedTour.priceCurrency || 'AZN'} / kişi başı əlavə edilir).
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
                                ⚖️ Təhlükəsizlik və Tibbi Öhudəlik Bəyannaməsi <span className="text-red-500 font-extrabold">*</span>
                              </label>
                              <span className="text-[10px] leading-relaxed block text-rose-950/85">
                                Macəra idman növü zamanı yarana biləcək xüsusi fiziki risk və gərginliklərlə tanış oldum. Xroniki xəstəliyimin olmadığını, fiziki hazırlığımın ({(selectedTour.difficulty as string) === 'beginner' || selectedTour.difficulty === 'easy' ? 'Başlanğıc' : selectedTour.difficulty === 'hard' ? 'Professional' : 'Orta'}) idman turu tələblərinə cavab verdiyimi təsdiq edirəm. Təşkilati qaydalara və bələdçinin təlimatlarına tam tabe olacağıma bəyan edirəm.
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Guest Passenger Details (No Registration required!) */}
                      <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 tracking-wide">
                            Qeydiyyatsız Sürətli Rezervasiya
                          </span>
                          <span className="text-slate-400 font-medium text-[11px]">Bilet Alışı</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Adınız və Soyadınız: <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Məsələn: Zahir Tanrıverdi"
                              value={bookingCustomerName}
                              onChange={(e) => setBookingCustomerName(e.target.value)}
                              disabled={isPhoneVerified}
                              className="w-full px-3 py-2 text-xs border border-slate-250 bg-white rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              WhatsApp Əlaqə Nömrəniz: <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              required
                              placeholder="Məsələn: +994 50 123 45 67"
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
                              WhatsApp-a Təsdiq Kodu Göndər
                            </button>
                          ) : (
                            <div className="space-y-3">
                              {showIncomingOtpBanner && (
                                <div className="bg-slate-900 border-l-4 border-emerald-550 border-emerald-500 rounded-xl p-3.5 shadow-xl text-white max-w-sm mx-auto mb-1 animate-pulse">
                                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold mb-1 tracking-wider">
                                    <div className="flex items-center gap-1">
                                      <span className="bg-emerald-600 text-white rounded p-0.5 px-1 font-extrabold text-[8px]">WA</span>
                                      <span>WhatsApp Göndərildi</span>
                                    </div>
                                    <span>İndi</span>
                                  </div>
                                  <div className="text-[11px] leading-relaxed text-slate-105 text-slate-100">
                                    <span className="font-normal text-slate-350">Hörmətli müştəri, bilet sifarişi üçün WhatsApp təsdiq kodunuz:</span> <strong className="text-emerald-400 font-mono text-sm tracking-widest">{verificationOtpCode}</strong>
                                  </div>
                                </div>
                              )}

                              {!isPhoneVerified ? (
                                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2.5">
                                  <div className="text-[11px] text-slate-500 leading-normal">
                                    Kod WhatsApp ilə nömrənizə göndərildi. Zəhmət olmasa daxil edin:
                                  </div>
                                  <div className="flex gap-2.5">
                                    <input
                                      type="text"
                                      maxLength={4}
                                      placeholder="4 Rəqəmli Kod"
                                      value={userInputOtp}
                                      onChange={(e) => setUserInputOtp(e.target.value.replace(/\D/g, ''))}
                                      className="flex-1 px-3 py-2 text-xs text-center font-bold font-mono tracking-widest border border-slate-200 bg-slate-50 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleVerifyOtp}
                                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-all cursor-pointer"
                                    >
                                      Kodu Təsdiqlə
                                    </button>
                                  </div>
                                  <div className="text-right">
                                    <button
                                      type="button"
                                      onClick={handleSendVerificationCode}
                                      className="text-[10px] text-sky-600 hover:underline font-bold cursor-pointer"
                                    >
                                      Kodu yenidən göndər
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-emerald-50 border border-emerald-150 rounded-lg p-3 flex items-center justify-between text-xs text-emerald-800">
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    <span>Nömrəniz təsdiqləndi! ({bookingCustomerPhone})</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsPhoneVerified(false);
                                      setIsOtpSent(false);
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-red-500 underline cursor-pointer"
                                  >
                                    Nömrəni dəyişdir
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
                          <span>WhatsApp Rezervasiya Sistemi</span>
                          <span className="bg-emerald-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wider">AKTİVDİR</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Qeydiyyat və bilet təsdiqi birbaşa bələdçinin <strong>WhatsApp</strong> nömrəsi üzərindən həyata keçirilir. Rezervasiya tamamlandıqda unikal sifariş kodunuz generasya olunacaq və bələdçinin {selectedTour.whatsapp_number || '+994706717804'} nömrəli WhatsApp hesabına yönləndiriləcəksiniz.
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
                              <span className="text-xs text-slate-400 block font-medium tracking-tight">Cəmi Məbləğ</span>
                              <span className="text-slate-500 text-[10px] font-mono block">
                                {priceDetails.qty} nəfər x {singleOriginal}
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
                            ⚠️ Rezerv üçün əvvəlcə nömrəni təsdiqləyin
                          </span>
                        )}

                        {((selectedTour.category === 'active' || selectedTour.isActiveLife) && !safetyAcknowledged) && (
                          <span className="text-[10px] text-red-500 font-bold bg-rose-50 px-2 py-1 rounded">
                            ⚠️ Sazişi bəyan edin
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
                          Geri
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
                              <span>Qeydə alınır (1s)...</span>
                            </>
                          ) : (
                            <>
                              <MessageCircle className="w-4 h-4 text-white fill-current animate-pulse" />
                              <span>WhatsApp ilə Rezervasiya et</span>
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
                  <h2 className="text-xl font-extrabold text-slate-900">Qiymətə daxildir</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Daxildir */}
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 space-y-3.5">
                      <h3 className="text-xs font-black text-emerald-700 tracking-wider uppercase">Daxildir</h3>
                      <div className="space-y-3">
                        {(selectedTour.includes && selectedTour.includes.length > 0
                          ? selectedTour.includes
                          : ['Peşəkar canlı tur bələdçisi', 'Yerli vergilər və xərclər']
                        ).map((item, idx) => (
                          <div key={`inc-${idx}`} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            <span className="text-slate-700 text-sm font-medium">{item}</span>
                          </div>
                        ))}
                        {selectedTour.mealType && (
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            <span className="text-slate-700 text-sm font-medium">Qida: {selectedTour.mealType}</span>
                          </div>
                        )}
                        {selectedTour.flightIncluded && (
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            <span className="text-slate-700 text-sm font-medium">Aviabilet və transfer daxildir</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Daxil deyil */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5">
                      <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase">Daxil deyil</h3>
                      <div className="space-y-3">
                        {(selectedTour.notIncluded && selectedTour.notIncluded.length > 0
                          ? selectedTour.notIncluded
                          : ['Şəxsi suvenirlər']
                        ).map((item, idx) => (
                          <div key={`exc-${idx}`} className="flex items-start gap-3">
                            <Minus className="w-5 h-5 text-slate-300 shrink-0" />
                            <span className="text-slate-500 text-sm font-medium">{item}</span>
                          </div>
                        ))}
                        {!selectedTour.flightIncluded && selectedTour.isInternational && (
                          <div className="flex items-start gap-3">
                            <Minus className="w-5 h-5 text-slate-300 shrink-0" />
                            <span className="text-slate-500 text-sm font-medium">Aviabiletlər (Ayrı alınmalıdır)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Highlights */}
                <div className="space-y-4 py-4 border-t border-slate-200">
                  <h2 className="text-xl font-extrabold text-slate-900">Önə Çıxanlar</h2>
                  <div className="flex flex-col gap-4">
                    {(selectedTour.highlights && selectedTour.highlights.length > 0
                      ? selectedTour.highlights
                      : [
                          `Peşəkar bələdçilərlə ${selectedTour.region} regionunun nəfəskəsici təbiətini kəşf edin.`,
                          `Seçilmiş səviyyənizə uyğun ${selectedTour.difficulty} çətinlikdə macəra yaşayın.`,
                          ...(selectedTour.isInternational ? [`${selectedTour.destinationCity} şəhərində gündəlik istiqamətinizi izləyən ağıllı marşrut proqramı.`] : [])
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
                <div className="space-y-4 py-4 border-t border-slate-200">
                  <h2 className="text-xl font-extrabold text-slate-900">Tam təsvir</h2>
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
                        {isDescExpanded ? 'Daha az oxu' : 'Daha çox oxu'}
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
                    <h2 className="text-xl font-extrabold text-slate-900">Görüş yeri</h2>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">
                      {selectedTour.meetingPoint}
                    </p>
                  </div>
                )}

                {/* Important Information */}
                <div className="space-y-4 py-4 border-t border-slate-200">
                  <h2 className="text-xl font-extrabold text-slate-900">Mühüm məlumatlar</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-3">Özünüzlə gətirin</h3>
                      <ul className="space-y-2">
                        {(selectedTour.importantInfo?.bring && selectedTour.importantInfo.bring.length > 0
                          ? selectedTour.importantInfo.bring
                          : [selectedTour.requiredEquipment || 'Rahat ayaqqabı', 'Pasport və ya şəxsiyyət vəsiqəsi', 'Hava şəraitinə uyğun geyim']
                        ).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                            <Check className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-3">İcazə verilmir</h3>
                      <ul className="space-y-2">
                        {(selectedTour.importantInfo?.notAllowed && selectedTour.importantInfo.notAllowed.length > 0
                          ? selectedTour.importantInfo.notAllowed
                          : ['Böyük çamadanlar və çantalar', 'Müşayiətsiz yetkinlik yaşına çatmayanlar']
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
                            👥 Təşkilatçının Komandası
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
                                     <span className="text-[10px] text-emerald-600 font-bold block line-clamp-2 tracking-wide mt-0.5" title={g.specialty}>{g.specialty || 'Bələdçi'}</span>
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
                              XARİCİ SƏYAHƏTİN SEHRLİ PLANLAŞDIRICISI
                            </h4>
                            <p className="text-[10px] text-slate-500 font-bold mt-1.5 leading-none">
                              {selectedTour.destinationCountry} və {selectedTour.destinationCity} üçün rəqəmsal bələdçi paneli
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-white bg-indigo-600 px-2.5 py-1 rounded tracking-widest">
                          AĞILLI BƏLƏDÇİ
                        </span>
                      </div>

                      {/* PART 1: WEATHER FORECAST SPECIALLY INTEGRATED FOR DESTINATION */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-black text-indigo-900 tracking-wider flex items-center gap-1">
                          ☀️ Təyinat Məntəqəsinin Gündəlik Hava Proqnozu
                        </h5>
                        
                        <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-4xs grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                          {selectedTour.itinerary && selectedTour.itinerary.map((it, idx) => {
                            const weathers = [
                              { temp: '24°C', tag: 'Açıq Səma', emoji: '☀️' },
                              { temp: '22°C', tag: 'Parlaq Gün', emoji: '🌤️' },
                              { temp: '25°C', tag: 'Az buludlu', emoji: '⛅' },
                              { temp: '21°C', tag: 'Möhtəşəm hava', emoji: '☀️' },
                              { temp: '23°C', tag: 'Sərin meh', emoji: '🌬️' },
                              { temp: '24°C', tag: 'Gözəl hava', emoji: '☀️' },
                            ];
                            const w = weathers[idx % weathers.length];
                            return (
                              <div key={idx} className="bg-slate-50/50 p-2 rounded-lg border border-slate-100 flex flex-col items-center">
                                <span className="text-[9px] font-extrabold text-slate-400 block tracking-tight">GÜN {it.day}</span>
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
                          📍 Günlərə Görə Baş Çəkəcəyiniz Məkanlar (Gəzməli Yerlər)
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
                        🏨 Səyahət, Mehmanxana və VIP Rezervasiya Təfərrüatları
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 text-xs">
                          <span className="text-slate-400 block font-bold text-[9px]">MEHMANXANA NÖVÜ</span>
                          <span className="text-slate-900 font-bold block">{selectedTour.hotelName}</span>
                          <span className="text-amber-500 text-xs tracking-widest font-bold block">
                            {Array(Number(selectedTour.hotelStars || 5)).fill('★').join('')}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <span className="text-slate-400 block font-bold text-[9px]">QİDALANMA TƏMİNATI</span>
                          <span className="text-primary-900 font-extrabold block">🍽️ {selectedTour.mealType || 'Səhər yeməyi'}</span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <span className="text-slate-400 block font-bold text-[9px]">UÇUŞ BİLETLƏRİ</span>
                          <span className="text-slate-700 block text-[11px] font-medium leading-relaxed">
                            {selectedTour.flightIncluded ? '✈️ Aviabilet ümumi qiymətə daxildir' : '❌ Aviabilet müştəri tərəfindən ayrıca alınmalıdır'}
                          </span>
                          {selectedTour.flightDetails && (
                            <span className="text-[10px] text-slate-500 italic block mt-0.5">{selectedTour.flightDetails}</span>
                          )}
                        </div>

                        <div className="space-y-1 text-xs">
                          <span className="text-slate-400 block font-bold text-[9px]">YERDAXİLİ TRANSFER</span>
                          <span className="text-slate-700 block text-[11px] font-medium leading-relaxed">🚍 {selectedTour.transferDetails || 'Hava limanından otelə komfortlu transfer daxildir.'}</span>
                        </div>
                      </div>

                      {/* Room options pricing */}
                      {selectedTour.roomTypes && selectedTour.roomTypes.length > 0 && (
                        <div className="bg-white p-3 rounded-lg border border-amber-150 space-y-2 mt-2">
                          <span className="text-[10px] text-amber-900 font-extrabold block tracking-wide">
                            🏨 Otaq Tiplərinə görə qiymət tənzimləməsi (Əlavələr):
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
                        ⏳ Günbəgün Ətraflı Səyahət Proqramı
                      </h4>

                      <div className="space-y-5">
                        {selectedTour.itinerary.map((day, di) => (
                          <div key={di} className="relative pl-6 border-l-2 border-amber-500/40 space-y-2">
                            {/* Marker */}
                            <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white ring-2 ring-amber-500/20" />
                            
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                              <span className="text-xs font-black text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-sm">
                                📅 {day.day}-ci GÜN
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
                              <span className="text-label-secondary font-medium text-sm">adam başı</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-label-primary">
                              {getConvertedPriceInfo(basePrice, selectedTour.priceCurrency).both}
                            </span>
                            <span className="text-label-secondary font-medium text-sm">adam başı</span>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-400">Məlumat yoxdur</span>
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
                            <span className="text-sm font-extrabold text-slate-800">Böyük × {bookingQty}</span>
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
                                <span className="text-sm font-bold text-slate-700">Böyük</span>
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
                                  (Maksimum {maxParticipants} yer mövcuddur)
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => setShowParticipantsDropdown(false)}
                                className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                              >
                                Təsdiqlə
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
                            <span className="text-sm font-extrabold text-slate-800">{selectedSlot ? `Tarix: ${selectedSlot.startDate}` : 'Tarix seçin'}</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showDateDropdown && (
                          <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowDateDropdown(false)} />
                          <div className="absolute left-0 right-0 top-full z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-2 mt-1 max-h-64 overflow-y-auto">
                            {slots.filter(s => s.tourId === selectedTour.id).length === 0 ? (
                              <p className="text-xs text-slate-400 font-medium p-3 text-center">Hazırda aktiv tarix yoxdur.</p>
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
                                        {isPast ? 'Bitib' : remainingSpots <= 0 ? 'Dolub' : `${remainingSpots} yer`}
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
                      Yerləri yoxla
                    </button>
                  )}

                  {/* Guarantees */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 rounded-full p-0.5 shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-extrabold text-slate-800">Ödənişsiz ləğv</h4>
                        <p className="text-xs text-slate-500 font-medium leading-snug">Tam geri ödəmə üçün 48 saat əvvələ qədər ləğv edin</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 rounded-full p-0.5 shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-extrabold text-slate-800">İndi rezerv et, sonra ödə</h4>
                        <p className="text-xs text-slate-500 font-medium leading-snug">Səyahət planlarınızı çevik saxlayın — yerinizi bron edin və bu gün heç nə ödəməyin.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div> {/* Closes TWO COLUMN WRAPPER */}
            
          {/* YOU MIGHT ALSO LIKE SECTION */}
          <div className="mt-16 pt-16 border-t border-slate-200">
            <h2 className="text-2xl font-extrabold text-label-primary mb-8">Bunlar da maraqlı ola bilər...</h2>
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
                            <span className="text-xs text-label-tertiary font-medium">{tour.durationHours ?? (tour.durationDays * 8)} saat</span>
                            {minPrice ? (
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-label-tertiary font-medium">Başlayan qiymətlər</span>
                                <span className="text-base font-extrabold text-label-primary">{getConvertedPriceInfo(minPrice, tour.priceCurrency).both}</span>
                              </div>
                            ) : (
                               <span className="text-xs font-bold text-label-tertiary">Satılıb qurtarıb</span>
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
