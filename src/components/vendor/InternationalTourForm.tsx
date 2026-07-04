import React, { useState, useEffect } from 'react';
import { Tour, TourSlot, User } from '../../types';
import { Check } from 'lucide-react';
import { DynamicStringListInput } from './DynamicStringListInput';
import { MultiDateCalendar, toIsoDate } from './MultiDateCalendar';
import { TourDangerZone } from './TourDangerZone';

interface InternationalTourFormProps {
  currentUser: User;
  tour?: Tour | null; // undefined/null = create mode; provided = edit mode
  slots: TourSlot[];
  onAddTour: (newTour: Tour) => Promise<void>;
  onEditTour?: (updatedTour: Tour) => Promise<void>;
  onDeleteTour?: (tourId: string) => Promise<void>;
  onAddSlot: (newSlot: TourSlot) => Promise<void>;
  onDeleteSlot?: (slotId: string) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onNavigateBack: () => void;
}

function getPremiumStockImageForDestination(country: string, city: string): string {
  const normCountry = (country || '').toLowerCase();
  const normCity = (city || '').toLowerCase();

  if (normCountry.includes('it') || normCity.includes('rom') || normCity.includes('rome')) return 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1000&auto=format&fit=crop&q=80';
  if (normCountry.includes('fran') || normCity.includes('par')) return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1000&auto=format&fit=crop&q=80';
  if (normCountry.includes('indone') || normCity.includes('bal')) return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1000&auto=format&fit=crop&q=80';
  if (normCountry.includes('ispan') || normCountry.includes('spai') || normCity.includes('barc') || normCity.includes('madrid')) return 'https://images.unsplash.com/photo-1583422409516-2895a77efedd?w=1000&auto=format&fit=crop&q=80';
  if (normCountry.includes('gürc') || normCountry.includes('gurc') || normCountry.includes('geor') || normCity.includes('tbil') || normCity.includes('batum')) return 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1000&auto=format&fit=crop&q=80';
  if (normCountry.includes('türkiy') || normCountry.includes('turk') || normCity.includes('ist') || normCity.includes('capa') || normCity.includes('kap')) return 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1000&auto=format&fit=crop&q=80';
  if (normCountry.includes('alm') || normCountry.includes('germ') || normCity.includes('berl') || normCity.includes('mün')) return 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1000&auto=format&fit=crop&q=80';
  if (normCountry.includes('ingil') || normCountry.includes('brit') || normCountry.includes('uk') || normCity.includes('lond')) return 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1000&auto=format&fit=crop&q=80';
  if (normCountry.includes('ərəb') || normCountry.includes('arab') || normCountry.includes('uae') || normCity.includes('dub')) return 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1000&auto=format&fit=crop&q=80';
  if (normCountry.includes('isveçr') || normCountry.includes('switz') || normCity.includes('alpa') || normCity.includes('zur') || normCity.includes('cen')) return 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1000&auto=format&fit=crop&q=80';
  if (normCountry.includes('chex') || normCountry.includes('czech') || normCity.includes('praq') || normCity.includes('prag')) return 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1000&auto=format&fit=crop&q=80';

  const generalTravelSights = [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1000&auto=format&fit=crop&q=80'
  ];
  const hash = Math.abs((country || '').length + (city || '').length) % generalTravelSights.length;
  return generalTravelSights[hash];
}

// Unified create/edit form for international (outbound) tours. Same component is used from
// VendorPortal's "add-intl-tour" tab (tour=null) and from the edit modal (tour set).
export function InternationalTourForm({ currentUser, tour, slots, onAddTour, onEditTour, onDeleteTour, onAddSlot, onDeleteSlot, onShowNotification, onNavigateBack }: InternationalTourFormProps) {
  const isEditMode = !!tour;

  // Number inputs are bound to `number | ''` state so clearing the field doesn't force a
  // "0" back in — see the domestic TourForm.tsx for the same fix and rationale.
  const handleNumberInput = (setter: (v: number | '') => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setter(raw === '' ? '' : Number(raw));
  };

  const [intlTourName, setIntlTourName] = useState<string>('');
  const [intlTourCountry, setIntlTourCountry] = useState<string>('Türkiyə');
  const [intlTourCity, setIntlTourCity] = useState<string>('');
  const [intlTourNights, setIntlTourNights] = useState<number | ''>(3);
  const [intlTourDays, setIntlTourDays] = useState<number | ''>(4);
  const [intlTourCapacity, setIntlTourCapacity] = useState<number | ''>(20);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [intlMeetingPoint, setIntlMeetingPoint] = useState<string>('');
  const [intlIsActive, setIntlIsActive] = useState<boolean>(true);

  const [intlTourFlightIncluded, setIntlTourFlightIncluded] = useState<boolean>(true);
  const [intlTourFlightDetails, setIntlTourFlightDetails] = useState<string>('');
  const [intlTourTransferDetails, setIntlTourTransferDetails] = useState<string>('');

  const [intlTourHotelName, setIntlTourHotelName] = useState<string>('');
  const [intlTourHotelStars, setIntlTourHotelStars] = useState<number>(4);
  const [intlTourMealType, setIntlTourMealType] = useState<string>('Səhər yeməyi');

  const [intlRoomDoubleDiff, setIntlRoomDoubleDiff] = useState<number | ''>(0);
  const [intlRoomTwinDiff, setIntlRoomTwinDiff] = useState<number | ''>(25);
  const [intlRoomSingleDiff, setIntlRoomSingleDiff] = useState<number | ''>(75);

  const [intlTourPrice, setIntlTourPrice] = useState<number | ''>(499);
  const [intlTourDiscountPrice, setIntlTourDiscountPrice] = useState<string>('');
  const [intlTourCurrency, setIntlTourCurrency] = useState<'AZN' | 'USD' | 'EUR'>('USD');
  const [intlTourImage, setIntlTourImage] = useState<string>('');
  const [intlDragActive, setIntlDragActive] = useState<boolean>(false);

  const [intlIncludes, setIntlIncludes] = useState<string[]>(['Aviabilet', '4 ulduzlu Otel', 'Hava limanı Transferi', 'Qidalanma', 'Səyahət sığortası']);
  const [intlNotIncludes, setIntlNotIncludes] = useState<string[]>(['Muzey və tarixi yerlərə giriş biletləri', 'Nahar və şam yeməkləri']);

  const [intlHighlights, setIntlHighlights] = useState<string>('');
  const [intlLanguages, setIntlLanguages] = useState<string>('Azərbaycanca');
  const [intlBringItems, setIntlBringItems] = useState<string[]>([]);
  const [intlNotAllowedItems, setIntlNotAllowedItems] = useState<string[]>([]);

  const [intlItinerary, setIntlItinerary] = useState<Array<{ day: number; title: string; description: string; image?: string }>>([
    { day: 1, title: 'Bakıdan Uçuş və Qarşılanma', description: 'Göstərilən saatda hava limanında toplaşırıq. Təyyarə ilə təyinat nöqtəsinə uçuş. Qarşılanma və otelə transfer.' }
  ]);

  const [isSavingForm, setIsSavingForm] = useState(false);
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!tour) return;
    setIntlTourName(tour.name);
    setIntlTourCountry(tour.destinationCountry || '');
    setIntlTourCity(tour.destinationCity || '');
    setIntlTourNights(tour.durationNights || (tour.durationDays > 1 ? tour.durationDays - 1 : 1));
    setIntlTourDays(tour.durationDays);
    setIntlMeetingPoint(tour.meetingPoint || '');
    setIntlIsActive(tour.isActive !== false);

    setIntlTourFlightIncluded(tour.flightIncluded !== false);
    setIntlTourFlightDetails(tour.flightDetails || '');
    setIntlTourTransferDetails(tour.transferDetails || '');

    setIntlTourHotelName(tour.hotelName || '');
    setIntlTourHotelStars(tour.hotelStars || 4);
    setIntlTourMealType(tour.mealType || 'Səhər yeməyi');

    setIntlRoomDoubleDiff(tour.roomTypes?.find(r => r.name === 'Double')?.priceDiff ?? 0);
    setIntlRoomTwinDiff(tour.roomTypes?.find(r => r.name === 'Twin')?.priceDiff ?? 25);
    setIntlRoomSingleDiff(tour.roomTypes?.find(r => r.name === 'Single')?.priceDiff ?? 75);

    setIntlTourCurrency(tour.priceCurrency || 'USD');
    setIntlTourImage(tour.image || '');
    setIntlIncludes(tour.includes || []);
    setIntlNotIncludes(tour.notIncluded || []);
    setIntlItinerary(tour.itinerary || [{ day: 1, title: 'Bakıdan Uçuş', description: 'Uçuş və qarşılanma.' }]);
    setIntlHighlights(Array.isArray(tour.highlights) ? tour.highlights.join(', ') : '');
    setIntlLanguages(Array.isArray(tour.languages) ? tour.languages.join(', ') : '');
    setIntlBringItems(Array.isArray(tour.importantInfo?.bring) ? tour.importantInfo!.bring! : []);
    setIntlNotAllowedItems(Array.isArray(tour.importantInfo?.notAllowed) ? tour.importantInfo!.notAllowed! : []);

    const tourSlots = slots.filter(s => s.tourId === tour.id);
    setSelectedDates(tourSlots.map(s => new Date(s.startDate)));
    setIntlTourPrice(tour.price !== undefined ? tour.price : (tourSlots.length > 0 ? tourSlots[0].price : 499));
    setIntlTourDiscountPrice(tour.discountPrice !== undefined ? String(tour.discountPrice) : '');
    if (tourSlots.length > 0) {
      setIntlTourCapacity(tourSlots[0].capacity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  const handleIntlAddDay = () => {
    const nextDay = intlItinerary.length + 1;
    setIntlItinerary([...intlItinerary, { day: nextDay, title: `${nextDay}-ci Gün fəaliyyətləri`, description: '', image: '' }]);
  };

  const handleIntlRemoveDay = (index: number) => {
    if (intlItinerary.length <= 1) return;
    setIntlItinerary(intlItinerary.filter((_, idx) => idx !== index).map((day, idx) => ({ ...day, day: idx + 1 })));
  };

  const handleIntlItineraryChange = (index: number, field: 'title' | 'description' | 'image', value: string) => {
    const updated = [...intlItinerary];
    updated[index] = { ...updated[index], [field]: value };
    setIntlItinerary(updated);
  };

  const handleInternationalTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intlTourName || !intlTourCity || !intlTourHotelName) {
      if (onShowNotification) {
        onShowNotification('Zəhmət olmasa operator, bütün lazımi xanaları doldurun (Ad, Şəhər və Otel adını daxil edin).', 'error');
      } else {
        alert('Zəhmət olmasa bütün vacib xanaları doldurun.');
      }
      return;
    }

    const finalImage = intlTourImage || getPremiumStockImageForDestination(intlTourCountry, intlTourCity);
    const cleanHighlights = intlHighlights.split(',').map(s => s.trim()).filter(Boolean);
    const cleanLanguages = intlLanguages.split(',').map(s => s.trim()).filter(Boolean);
    const cleanBringItems = intlBringItems.filter(Boolean);
    const cleanNotAllowedItems = intlNotAllowedItems.filter(Boolean);

    const sharedFields = {
      name: intlTourName,
      category: 'international' as const,
      difficulty: 'easy' as const,
      description: `Bu ${intlTourCountry} (${intlTourCity}) turu üçün xüsusi layihələndirilib. ${intlTourNights} gecə və ${intlTourDays} gündüz davam edir. Otel: ${intlTourHotelName} (${intlTourHotelStars}*).`,
      region: `${intlTourCountry}, ${intlTourCity}`,
      durationDays: Number(intlTourDays),
      includes: intlIncludes.filter(Boolean),
      image: finalImage,
      images: [finalImage],
      isActive: intlIsActive,
      whatsapp_number: '+994706717804',
      isInternational: true,
      destinationCountry: intlTourCountry,
      destinationCity: intlTourCity,
      durationNights: Number(intlTourNights),
      flightIncluded: intlTourFlightIncluded,
      flightDetails: intlTourFlightDetails || (intlTourFlightIncluded ? 'Azərbaycan Hava Yolları, Bakıdan gediş-dönüş baqaj daxil' : 'Aviabilet daxil deyil'),
      transferDetails: intlTourTransferDetails || 'Hava limanından qarşılanma və otelə transfer daxildir.',
      hotelName: intlTourHotelName,
      hotelStars: Number(intlTourHotelStars),
      roomTypes: [
        { name: 'Double', priceDiff: Number(intlRoomDoubleDiff) },
        { name: 'Twin', priceDiff: Number(intlRoomTwinDiff) },
        { name: 'Single', priceDiff: Number(intlRoomSingleDiff) }
      ],
      mealType: intlTourMealType,
      priceCurrency: intlTourCurrency,
      notIncluded: intlNotIncludes.filter(Boolean),
      itinerary: intlItinerary,
      highlights: cleanHighlights.length > 0 ? cleanHighlights : undefined,
      languages: cleanLanguages.length > 0 ? cleanLanguages : undefined,
      importantInfo: (cleanBringItems.length > 0 || cleanNotAllowedItems.length > 0) ? {
        bring: cleanBringItems.length > 0 ? cleanBringItems : undefined,
        notAllowed: cleanNotAllowedItems.length > 0 ? cleanNotAllowedItems : undefined,
      } : undefined,
      meetingPoint: intlMeetingPoint || undefined,
      price: Number(intlTourPrice) || 0,
      discountPrice: intlTourDiscountPrice !== '' && Number(intlTourDiscountPrice) > 0 ? Number(intlTourDiscountPrice) : undefined,
    };

    setIsSavingForm(true);
    setFormSubmitError(null);
    try {
      let tourId: string;
      if (isEditMode && tour) {
        const changes: string[] = ['Xarici tur rekvizitləri yeniləndi ✈️'];
        if ((tour.isActive !== false) !== intlIsActive) {
          changes.push(`Status (${(tour.isActive !== false) ? 'Aktiv' : 'Deaktiv'} ➡️ ${intlIsActive ? 'Aktiv' : 'Deaktiv'})`);
        }
        const updatedTour: Tour = { ...tour, ...sharedFields, lastChangeLog: changes.join(' | ') };
        tourId = tour.id;
        if (onEditTour) await onEditTour(updatedTour);
        if (onShowNotification) {
          onShowNotification('Tur məlumatları yeniləndi və yenidən təsdiqlənməsi üçün Admin nümayəndəsinə göndərildi! ⏳✨', 'info');
        }
      } else {
        const newTour: Tour = {
          id: 'tour-' + Math.floor(Math.random() * 90000 + 10000),
          ...sharedFields,
          vendorId: currentUser.id,
          vendorName: currentUser.name,
          videos: [],
          rating: 5.0,
          reviewsCount: 0,
          isApproved: false,
          status: 'pending_approval',
        };
        tourId = newTour.id;
        await onAddTour(newTour);
        if (onShowNotification) {
          onShowNotification('Təbrik edirik! Yeni Xarici Tur uğurla yaradıldı və təsdiq gözləmə siyahısına əlavə edildi. ⏳✈️', 'info');
        }
      }

      const existingSlots = isEditMode ? slots.filter(s => s.tourId === tourId) : [];
      const existingByDate = new Map(existingSlots.map(s => [toIsoDate(new Date(s.startDate)), s]));
      const selectedIso = new Set(selectedDates.map(toIsoDate));

      for (const date of selectedDates) {
        const iso = toIsoDate(date);
        if (!existingByDate.has(iso)) {
          await onAddSlot({
            id: 'slot-' + Math.floor(Math.random() * 90000 + 10000),
            tourId,
            startDate: iso,
            endDate: iso,
            price: Number(intlTourPrice),
            capacity: Number(intlTourCapacity),
            bookedCount: 0,
          });
        }
      }
      if (onDeleteSlot) {
        for (const slot of existingSlots) {
          if (!selectedIso.has(toIsoDate(new Date(slot.startDate)))) {
            await onDeleteSlot(slot.id);
          }
        }
      }

      onNavigateBack();
    } catch (err: any) {
      setFormSubmitError(err?.message || 'Xarici tur yadda saxlanılarkən xəta baş verdi.');
    } finally {
      setIsSavingForm(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-6 text-white">
        <h2 className="text-sm font-bold flex items-center gap-2 tracking-wider">
          ✈️ {isEditMode ? 'Xarici Turu Redaktə Et' : 'Pasportlu Xarici Səyahət Paket Operatoru (Yeni Xarici Tur)'}
        </h2>
        <p className="text-[11px] text-emerald-100 mt-1">
          Türkiyə, Avropa, Asiya və digər xarici ölkələrə lüks, çoxgünlük turların qeydiyyat forması.
        </p>
      </div>

      <form onSubmit={handleInternationalTourSubmit} className="p-6 space-y-6">
        {/* A) Əsas Səyahət Məlumatları */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-emerald-700 tracking-wider border-b pb-1">A) Əsas Səyahət Məlumatları</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Turun Tam Adı *</label>
              <input type="text" required value={intlTourName} onChange={(e) => setIntlTourName(e.target.value)} placeholder="Məsələn: Kapadokya Sehrli Payız Turu" className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">İstiqamət Ölkə *</label>
              <input type="text" required value={intlTourCountry} onChange={(e) => setIntlTourCountry(e.target.value)} placeholder="Ölkə (məs: Türkiyə)" className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">İstiqamət Şəhər / Region *</label>
              <input type="text" required value={intlTourCity} onChange={(e) => setIntlTourCity(e.target.value)} placeholder="Şəhər (məs: Kapadokya)" className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gecə sayısı *</label>
                <input type="number" required min={1} value={intlTourNights} onChange={handleNumberInput(setIntlTourNights)} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gündüz sayısı *</label>
                <input type="number" required min={1} value={intlTourDays} onChange={handleNumberInput(setIntlTourDays)} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Maksimum Qrup Tutumu *</label>
              <input type="number" required min={1} value={intlTourCapacity} onChange={handleNumberInput(setIntlTourCapacity)} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Görüş Yeri (Mətn olaraq)</label>
            <input
              type="text"
              value={intlMeetingPoint}
              onChange={(e) => setIntlMeetingPoint(e.target.value)}
              placeholder="Məsələn: Tofiq Bəhramov adına Respublika Stadionunun qarşısı..."
              className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
            />
          </div>
        </div>

        {/* B) Loqistika və Nəqliyyat Məlumatları */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-teal-700 tracking-wider border-b pb-1">B) Loqistika və Nəqliyyat Məlumatları</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={intlTourFlightIncluded} onChange={(e) => setIntlTourFlightIncluded(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500" />
              <span className="text-xs font-black text-slate-800">Aviabilet qiymətə daxildir</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Uçuş Təfərrüatları</label>
                <textarea rows={2} value={intlTourFlightDetails} onChange={(e) => setIntlTourFlightDetails(e.target.value)} placeholder="Məsələn: Bakı - Kayseri Pegasus Hava yolları gediş-dönüş, 23kg baqaj daxildir." className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ölkədaxili Transfer növü</label>
                <textarea rows={2} value={intlTourTransferDetails} onChange={(e) => setIntlTourTransferDetails(e.target.value)} placeholder="Məsələn: Hava limanında VIP transfer." className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* C) Yerləşmə (Otel) Məlumatları */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-emerald-750 tracking-wider border-b pb-1">C) Yerləşmə (Otel) Məlumatları</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Otelin Adı *</label>
              <input type="text" required value={intlTourHotelName} onChange={(e) => setIntlTourHotelName(e.target.value)} placeholder="Məsələn: Crowne Plaza Cappadocia" className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Otelin Ulduz Sayı *</label>
              <select value={intlTourHotelStars} onChange={(e) => setIntlTourHotelStars(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none bg-white cursor-pointer">
                <option value={5}>⭐⭐⭐⭐⭐ 5 Ulduzlu Lüks Otel</option>
                <option value={4}>⭐⭐⭐⭐☆ 4 Ulduzlu Premium Otel</option>
                <option value={3}>⭐⭐⭐☆☆ 3 Ulduzlu Standart Otel</option>
                <option value={2}>⭐⭐☆☆☆ 2 Ulduzlu Butik / Hostel</option>
                <option value={1}>⭐☆☆☆☆ 1 Ulduzlu Qonaq Evi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Qidalanma Seçimi *</label>
              <select value={intlTourMealType} onChange={(e) => setIntlTourMealType(e.target.value)} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none bg-white cursor-pointer">
                <option value="Səhər yeməyi">Səhər yeməyi daxildir (BB)</option>
                <option value="Hər şey daxil (AI)">Hər şey daxil (All Inclusive - AI)</option>
                <option value="Yarım pansion (HB)">Yarım pansion (HB)</option>
                <option value="Tam pansion (FB)">Tam pansion (FB)</option>
                <option value="Qidalanma daxil deyil">Qidalanma daxil DEYİL (Only Room - RO)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-emerald-800 mb-2">Otaq Altdərnək Qiymət fərqləri:</label>
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-1">Double Otaq fərqi</label>
                <input type="number" value={intlRoomDoubleDiff} onChange={handleNumberInput(setIntlRoomDoubleDiff)} className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-1">Twin otaq fərqi</label>
                <input type="number" value={intlRoomTwinDiff} onChange={handleNumberInput(setIntlRoomTwinDiff)} className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-1">Single otaq fərqi</label>
                <input type="number" value={intlRoomSingleDiff} onChange={handleNumberInput(setIntlRoomSingleDiff)} className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700" />
              </div>
            </div>
          </div>
        </div>

        {/* D) Qiymət, Təqvim və Paket İnformasiyası */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-teal-800 tracking-wider border-b pb-1">D) Qiymət, Təqvim və Paket İnformasiyası</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Baza Paket Qiyməti *</label>
              <input type="number" required min={1} value={intlTourPrice} onChange={handleNumberInput(setIntlTourPrice)} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700" />
            </div>
            <div>
              <label className="block text-xs font-bold text-rose-600 mb-1">Endirimli Qiymət (opsional):</label>
              <input type="number" min="0" placeholder="Məs: 399" value={intlTourDiscountPrice} onChange={(e) => setIntlTourDiscountPrice(e.target.value)} className="w-full px-3 py-2 border border-rose-200 rounded-lg text-xs text-rose-700 placeholder-rose-300 focus:ring-1 focus:ring-rose-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valyuta Seçimi *</label>
              <select value={intlTourCurrency} onChange={(e) => setIntlTourCurrency(e.target.value as 'AZN' | 'USD' | 'EUR')} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 bg-white cursor-pointer">
                <option value="AZN">AZN (₼)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div className="bg-primary-50/60 p-4 rounded-xl border border-emerald-100 space-y-3">
            <h4 className="text-[10px] font-extrabold text-emerald-800 tracking-widest">📅 Turun Aktiv Olacağı Yola Çıxış Tarixləri</h4>
            <MultiDateCalendar selectedDates={selectedDates} onChange={setSelectedDates} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Əsas Tur Şəkli (Seçin və ya yükləyin)</label>
            {intlTourImage ? (
              <div className="relative border border-slate-200 rounded-lg overflow-hidden group h-24 bg-slate-50 flex items-center justify-between px-3">
                <div className="flex items-center gap-3">
                  <img src={intlTourImage || undefined} alt="Yüklənən şəkil" className="w-16 h-16 object-cover rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
                  <div>
                    <span className="text-[10px] text-emerald-700 font-extrabold block">✓ ŞƏKİL YÜKLƏNDİ</span>
                  </div>
                </div>
                <button type="button" onClick={() => setIntlTourImage('')} className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-black rounded-lg transition">Şəkli Sil</button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIntlDragActive(true); }}
                onDragLeave={() => setIntlDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIntlDragActive(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setIntlTourImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
                onClick={() => document.getElementById('intl-file-uploader-input')?.click()}
                className={`h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer ${intlDragActive ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100/75 hover:border-slate-400'}`}
              >
                <input
                  type="file"
                  id="intl-file-uploader-input"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setIntlTourImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <span className="text-lg">📸</span>
                <span className="text-[10px] font-bold text-slate-705 mt-1">Sürüşdürüb buraxın və ya Seçmək üçün klikləyin</span>
                <span className="text-[9px] text-slate-400 mt-0.5 font-semibold block leading-tight px-2">(Məcburi deyil. Yükləməsəniz, avtomatik seçiləcək!)</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DynamicStringListInput label="Paketə Daxildir:" items={intlIncludes} onChange={setIntlIncludes} placeholder="Məs: Oteldə spa, Yerli sığorta" />
            <DynamicStringListInput label="Paketə Daxil DEYİL:" items={intlNotIncludes} onChange={setIntlNotIncludes} placeholder="Məs: Alış-veriş, Şəxsi xərclər" accent="red" />
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">Önə çıxanlar (Vergüllə ayırın):</label>
              <input type="text" value={intlHighlights} onChange={(e) => setIntlHighlights(e.target.value)} placeholder="Məs: Şəhər turu bələdçi ilə" className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Danışılan dillər (Vergüllə ayırın):</label>
                <input type="text" value={intlLanguages} onChange={(e) => setIntlLanguages(e.target.value)} placeholder="Azərbaycanca, Rusca, İngiliscə" className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
              </div>
              <div>
                <DynamicStringListInput
                  label="Özünüzlə gətirin:"
                  items={intlBringItems}
                  onChange={setIntlBringItems}
                  placeholder="Məs: Pasport, Hava şəraitinə uyğun geyim"
                />
              </div>
            </div>
            <div>
              <DynamicStringListInput
                label="İcazə verilmir:"
                items={intlNotAllowedItems}
                onChange={setIntlNotAllowedItems}
                placeholder="Məs: Böyük çamadanlar"
                accent="red"
              />
            </div>
          </div>
        </div>

        {/* E) Proqram (Günbəgün) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-1">
            <h3 className="text-xs font-bold text-emerald-800 tracking-wider">E) Proqram (Günbəgün Aktiv Gündəlik Planı)</h3>
            <button type="button" onClick={handleIntlAddDay} className="bg-emerald-700 hover:bg-emerald-850 text-white font-black text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs">⏳ Gün Əlavə Et +</button>
          </div>
          <div className="space-y-4">
            {intlItinerary.map((iti, index) => (
              <div key={index} className="border border-slate-200 p-4 rounded-xl bg-slate-50 relative space-y-3">
                <div className="flex justify-between items-center bg-slate-200/50 p-1.5 rounded-lg">
                  <span className="text-xs font-extrabold text-primary-800">📅 {iti.day}-ci Gün Planı</span>
                  {intlItinerary.length > 1 && (
                    <button type="button" onClick={() => handleIntlRemoveDay(index)} className="text-red-500 hover:text-red-705 text-xs font-bold px-2 py-0.5">Günü Sil 🗑️</button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Günlük Başlıq</label>
                    <input type="text" required value={iti.title} onChange={(e) => handleIntlItineraryChange(index, 'title', e.target.value)} className="w-full px-2 py-1.5 border border-slate-250 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Günün Şəkili</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id={`intl-itinerary-file-${index}`}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => handleIntlItineraryChange(index, 'image', reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {!iti.image ? (
                        <button type="button" onClick={() => document.getElementById(`intl-itinerary-file-${index}`)?.click()} className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/20 text-slate-500 hover:text-emerald-700 text-xs py-2 px-3 rounded-lg transition-all cursor-pointer font-bold">
                          📁 Şəkil Yüklə
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 bg-emerald-50/35 border border-emerald-100 p-1.5 rounded-lg w-full">
                          <img src={iti.image || undefined} alt={`Gün ${iti.day}`} className="w-12 h-9 object-cover rounded-md border border-emerald-200/50 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-emerald-800 block leading-tight">Şəkil yükləndi</span>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button type="button" onClick={() => document.getElementById(`intl-itinerary-file-${index}`)?.click()} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold px-1.5 py-1 cursor-pointer hover:bg-white rounded transition-all">Dəyiş</button>
                            <button type="button" onClick={() => handleIntlItineraryChange(index, 'image', '')} className="text-[10px] text-red-500 hover:text-red-700 font-bold px-1.5 py-1 cursor-pointer hover:bg-white rounded transition-all">Sil</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Günlük fəaliyyətlərin tam təsviri</label>
                    <textarea rows={2} required value={iti.description} onChange={(e) => handleIntlItineraryChange(index, 'description', e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-250 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {isEditMode && tour && (
          <TourDangerZone
            isActive={intlIsActive}
            onToggleActive={() => setIntlIsActive(!intlIsActive)}
            onDelete={async () => {
              if (onDeleteTour) {
                await onDeleteTour(tour.id);
                onNavigateBack();
              }
            }}
          />
        )}

        {formSubmitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">⚠️ {formSubmitError}</div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={() => onNavigateBack()} className="px-4 py-2 border border-slate-250 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50">Ləğv Et</button>
          <button type="submit" disabled={isSavingForm} className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-850 text-white font-black text-xs rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5">
            {isEditMode && <Check className="w-4 h-4" />}
            {isSavingForm ? 'Göndərilir...' : isEditMode ? 'Dəyişiklikləri Saxla' : '✈️ Xarici Səyahət Turunu Yarat'}
          </button>
        </div>
      </form>
    </div>
  );
}
