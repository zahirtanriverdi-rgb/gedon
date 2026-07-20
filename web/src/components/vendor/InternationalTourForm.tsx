'use client';
import React, { useState, useEffect } from 'react';
import { Tour, TourSlot, User } from '../../types';
import { Check } from 'lucide-react';
import { DynamicStringListInput } from './DynamicStringListInput';
import { LocationAutocompleteInput } from './LocationAutocompleteInput';
import { MultiDateCalendar, toIsoDate } from './MultiDateCalendar';
import { TourDangerZone } from './TourDangerZone';
import { WhatsAppVerifyField } from '../shared/WhatsAppVerifyField';
import { handleNumberInput, useStepWizard } from './useTourFormWizard';
import { useLanguage } from '../../i18n/LanguageContext';
import { uploadSingleImage } from '../../utils/uploadMedia';

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

// Unified create/edit form for international (outbound) tours. Same component is used from
// VendorPortal's "add-intl-tour" tab (tour=null) and from the edit modal (tour set). Mirrors the
// 3-step wizard pattern from the domestic TourForm.tsx (Basic Info / Logistics & Program /
// Pricing & Rules) so both create flows behave consistently.
export function InternationalTourForm({ currentUser, tour, slots, onAddTour, onEditTour, onDeleteTour, onAddSlot, onDeleteSlot, onShowNotification, onNavigateBack }: InternationalTourFormProps) {
  const { t } = useLanguage();
  const isEditMode = !!tour;

  const FORM_STEPS = [
    { number: 1 as const, label: t('vendorTourForms.internationalTourForm.steps.basic') },
    { number: 2 as const, label: t('vendorTourForms.internationalTourForm.steps.logistics') },
    { number: 3 as const, label: t('vendorTourForms.internationalTourForm.steps.pricing') },
  ];

  const [intlTourName, setIntlTourName] = useState<string>('');
  const [intlTourCountry, setIntlTourCountry] = useState<string>('Türkiyə');
  const [intlTourCity, setIntlTourCity] = useState<string>('');
  const [intlTourNights, setIntlTourNights] = useState<number | ''>(3);
  const [intlTourDays, setIntlTourDays] = useState<number | ''>(4);
  const [intlTourCapacity, setIntlTourCapacity] = useState<number | ''>(20);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [intlMeetingPoint, setIntlMeetingPoint] = useState<string>('');
  const [intlMeetingPointLat, setIntlMeetingPointLat] = useState<number | undefined>(undefined);
  const [intlMeetingPointLng, setIntlMeetingPointLng] = useState<number | undefined>(undefined);
  const [intlIsActive, setIntlIsActive] = useState<boolean>(true);
  const [intlTourWhatsApp, setIntlTourWhatsApp] = useState<string>(currentUser.whatsapp_number || currentUser.phone || '');
  // New tours require a fresh live-WhatsApp check on the guide number; editing an existing tour
  // starts pre-verified since that number was already checked when the tour was first created.
  const [isIntlWhatsAppVerified, setIsIntlWhatsAppVerified] = useState<boolean>(!!tour);

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

  const { currentStep, goToNextStep, goToPrevStep } = useStepWizard();

  // Per-field invalid markers for fields HTML5 `required` can't cover (tag lists, image upload).
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
  };

  // Returns the labels of every required-but-empty field in `step`, so goToNextStep (and the
  // final submit, which re-checks step 3) can report every gap at once instead of one at a time.
  const getMissingFieldsForStep = (step: 1 | 2 | 3): { key: string; label: string }[] => {
    const missing: { key: string; label: string }[] = [];
    if (step === 1) {
      if (!intlLanguages.trim()) missing.push({ key: 'languages', label: t('vendorTourForms.internationalTourForm.validation.fieldLanguages') });
      if (intlBringItems.filter(Boolean).length === 0) missing.push({ key: 'bringItems', label: t('vendorTourForms.internationalTourForm.validation.fieldBringItems') });
      if (!isIntlWhatsAppVerified) missing.push({ key: 'whatsappVerification', label: t('vendorTourForms.internationalTourForm.validation.fieldWhatsappVerification') });
    } else if (step === 3) {
      if (!intlTourImage) missing.push({ key: 'image', label: t('vendorTourForms.internationalTourForm.validation.fieldImage') });
      if (intlIncludes.filter(Boolean).length === 0) missing.push({ key: 'includes', label: t('vendorTourForms.internationalTourForm.validation.fieldIncludes') });
      if (intlNotIncludes.filter(Boolean).length === 0) missing.push({ key: 'notIncludes', label: t('vendorTourForms.internationalTourForm.validation.fieldNotIncludes') });
      if (!intlHighlights.trim()) missing.push({ key: 'highlights', label: t('vendorTourForms.internationalTourForm.validation.fieldHighlights') });
    }
    return missing;
  };

  const validateStepAndNotify = (step: 1 | 2 | 3): boolean => {
    const missing = getMissingFieldsForStep(step);
    if (missing.length === 0) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        for (const key of ['languages', 'bringItems', 'whatsappVerification', 'image', 'includes', 'notIncludes', 'highlights']) delete next[key];
        return next;
      });
      return true;
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const { key } of missing) next[key] = true;
      return next;
    });
    const message = `${t('vendorTourForms.internationalTourForm.validation.missingFieldsPrefix')} ${missing.map((m) => m.label).join(', ')}.`;
    if (onShowNotification) onShowNotification(message, 'error');
    else alert(message);
    return false;
  };

  useEffect(() => {
    if (!tour) return;
    setIntlTourName(tour.name);
    setIntlTourCountry(tour.destinationCountry || '');
    setIntlTourCity(tour.destinationCity || '');
    setIntlTourNights(tour.durationNights || (tour.durationDays > 1 ? tour.durationDays - 1 : 1));
    setIntlTourDays(tour.durationDays);
    setIntlMeetingPoint(tour.meetingPoint || '');
    setIntlMeetingPointLat(tour.meetingPointLat);
    setIntlMeetingPointLng(tour.meetingPointLng);
    setIntlIsActive(tour.isActive !== false);
    setIntlTourWhatsApp(tour.whatsapp_number || currentUser.whatsapp_number || currentUser.phone || '');
    setIsIntlWhatsAppVerified(true);

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
    setIntlItinerary([...intlItinerary, { day: nextDay, title: t('vendorTourForms.internationalTourForm.itinerary.newDayTitle', { day: nextDay }), description: '', image: '' }]);
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
    if (currentStep !== 3) {
      if (!validateStepAndNotify(currentStep)) return;
      goToNextStep();
      return;
    }
    if (!intlTourName || !intlTourCity || !intlTourHotelName) {
      if (onShowNotification) {
        onShowNotification(t('vendorTourForms.internationalTourForm.validation.missingRequiredFields'), 'error');
      } else {
        alert(t('vendorTourForms.internationalTourForm.validation.missingRequiredFieldsFallback'));
      }
      return;
    }
    if (!validateStepAndNotify(3)) return;

    const finalImage = intlTourImage;
    const cleanHighlights = intlHighlights.split(',').map(s => s.trim()).filter(Boolean);
    const cleanLanguages = intlLanguages.split(',').map(s => s.trim()).filter(Boolean);
    const cleanBringItems = intlBringItems.filter(Boolean);
    const cleanNotAllowedItems = intlNotAllowedItems.filter(Boolean);

    const sharedFields = {
      name: intlTourName,
      category: 'international' as const,
      difficulty: 'easy' as const,
      description: t('vendorTourForms.internationalTourForm.generatedDescription', {
        country: intlTourCountry,
        city: intlTourCity,
        nights: intlTourNights,
        days: intlTourDays,
        hotelName: intlTourHotelName,
        hotelStars: intlTourHotelStars,
      }),
      region: `${intlTourCountry}, ${intlTourCity}`,
      durationDays: Number(intlTourDays),
      includes: intlIncludes.filter(Boolean),
      image: finalImage,
      images: [finalImage],
      isActive: intlIsActive,
      whatsapp_number: intlTourWhatsApp || currentUser.whatsapp_number || currentUser.phone || '',
      isInternational: true,
      destinationCountry: intlTourCountry,
      destinationCity: intlTourCity,
      durationNights: Number(intlTourNights),
      flightIncluded: intlTourFlightIncluded,
      flightDetails: intlTourFlightDetails || (intlTourFlightIncluded ? t('vendorTourForms.internationalTourForm.defaultFlightDetailsIncluded') : t('vendorTourForms.internationalTourForm.defaultFlightDetailsExcluded')),
      transferDetails: intlTourTransferDetails || t('vendorTourForms.internationalTourForm.defaultTransferDetails'),
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
      meetingPointLat: intlMeetingPointLat,
      meetingPointLng: intlMeetingPointLng,
      price: Number(intlTourPrice) || 0,
      discountPrice: intlTourDiscountPrice !== '' && Number(intlTourDiscountPrice) > 0 ? Number(intlTourDiscountPrice) : undefined,
    };

    setIsSavingForm(true);
    setFormSubmitError(null);
    try {
      let tourId: string;
      if (isEditMode && tour) {
        const activeLabel = t('vendorTourForms.internationalTourForm.changeLog.statusActive');
        const inactiveLabel = t('vendorTourForms.internationalTourForm.changeLog.statusInactive');
        const changes: string[] = [t('vendorTourForms.internationalTourForm.changeLog.updated')];
        if ((tour.isActive !== false) !== intlIsActive) {
          changes.push(t('vendorTourForms.internationalTourForm.changeLog.statusChange', {
            oldStatus: (tour.isActive !== false) ? activeLabel : inactiveLabel,
            newStatus: intlIsActive ? activeLabel : inactiveLabel,
          }));
        }
        const updatedTour: Tour = { ...tour, ...sharedFields, lastChangeLog: changes.join(' | ') };
        tourId = tour.id;
        if (onEditTour) await onEditTour(updatedTour);
        if (onShowNotification) {
          onShowNotification(
            currentUser.role === 'admin'
              ? t('vendorTourForms.internationalTourForm.notifications.tourUpdatedByAdmin')
              : t('vendorTourForms.internationalTourForm.notifications.tourUpdatedPendingApproval'),
            'info'
          );
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
          onShowNotification(t('vendorTourForms.internationalTourForm.notifications.tourCreatedPendingApproval'), 'info');
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
      setFormSubmitError(err?.message || t('vendorTourForms.internationalTourForm.submitErrors.generic'));
    } finally {
      setIsSavingForm(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-4 sm:p-6 text-white">
        <h2 className="text-sm font-bold flex items-center gap-2 tracking-wider">
          ✈️ {isEditMode ? t('vendorTourForms.internationalTourForm.header.titleEdit') : t('vendorTourForms.internationalTourForm.header.titleNew')}
        </h2>
        <p className="text-[11px] text-emerald-100 mt-1">
          {t('vendorTourForms.internationalTourForm.header.subtitle')}
        </p>
      </div>

      <form onSubmit={handleInternationalTourSubmit} className="p-4 sm:p-6 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-3 py-1">
          {FORM_STEPS.map((step, idx) => (
            <React.Fragment key={step.number}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 flex-shrink-0 rounded-full border-2 flex items-center justify-center text-[11px] font-extrabold transition-colors ${
                    currentStep === step.number
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                      : currentStep > step.number
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 text-slate-400'
                  }`}
                >
                  {currentStep > step.number ? <Check className="w-3.5 h-3.5" /> : step.number}
                </div>
                <span className={`hidden sm:inline text-[11px] font-bold whitespace-nowrap ${currentStep === step.number ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
              {idx < FORM_STEPS.length - 1 && (
                <div className={`w-6 sm:w-14 h-0.5 rounded-full transition-colors ${currentStep > step.number ? 'bg-emerald-600' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {currentStep === 1 && (
        <div className="space-y-4">
          {/* A) Əsas Səyahət Məlumatları */}
          <h3 className="text-xs font-bold text-emerald-700 tracking-wider border-b pb-1">{t('vendorTourForms.internationalTourForm.sections.basicInfo')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.name.label')}</label>
              <input type="text" required value={intlTourName} onChange={(e) => setIntlTourName(e.target.value)} placeholder={t('vendorTourForms.internationalTourForm.fields.name.placeholder')} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.country.label')}</label>
              <input type="text" required value={intlTourCountry} onChange={(e) => setIntlTourCountry(e.target.value)} placeholder={t('vendorTourForms.internationalTourForm.fields.country.placeholder')} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.city.label')}</label>
              <input type="text" required value={intlTourCity} onChange={(e) => setIntlTourCity(e.target.value)} placeholder={t('vendorTourForms.internationalTourForm.fields.city.placeholder')} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.nights.label')}</label>
                <input type="number" required min={1} value={intlTourNights} onChange={handleNumberInput(setIntlTourNights)} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.days.label')}</label>
                <input type="number" required min={1} value={intlTourDays} onChange={handleNumberInput(setIntlTourDays)} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.capacity.label')}</label>
              <input type="number" required min={1} value={intlTourCapacity} onChange={handleNumberInput(setIntlTourCapacity)} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
            </div>
          </div>
          <div>
            <LocationAutocompleteInput
              label={t('vendorTourForms.internationalTourForm.fields.meetingPoint.label')}
              value={intlMeetingPoint}
              lat={intlMeetingPointLat}
              lng={intlMeetingPointLng}
              onChange={(address, lat, lng) => {
                setIntlMeetingPoint(address);
                setIntlMeetingPointLat(lat);
                setIntlMeetingPointLng(lng);
              }}
              placeholder={t('vendorTourForms.internationalTourForm.fields.meetingPoint.placeholder')}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.whatsapp.label')}</label>
            <WhatsAppVerifyField
              value={intlTourWhatsApp}
              onChange={setIntlTourWhatsApp}
              isVerified={isIntlWhatsAppVerified}
              onVerifiedChange={setIsIntlWhatsAppVerified}
              onShowNotification={onShowNotification}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">{t('vendorTourForms.internationalTourForm.fields.languages.label')}</label>
              <input
                type="text"
                value={intlLanguages}
                onChange={(e) => { setIntlLanguages(e.target.value); clearFieldError('languages'); }}
                placeholder={t('vendorTourForms.internationalTourForm.fields.languages.placeholder')}
                className={`w-full px-3 py-2 border rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none ${fieldErrors.languages ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-250'}`}
              />
              {fieldErrors.languages && <p className="text-[10px] font-semibold text-red-600 mt-1">⚠️ {t('vendorTourForms.internationalTourForm.fields.languages.error')}</p>}
            </div>
            <div>
              <DynamicStringListInput
                label={t('vendorTourForms.internationalTourForm.fields.bringItems.label')}
                items={intlBringItems}
                onChange={(items) => { setIntlBringItems(items); clearFieldError('bringItems'); }}
                placeholder={t('vendorTourForms.internationalTourForm.fields.bringItems.placeholder')}
                error={fieldErrors.bringItems}
              />
            </div>
          </div>
          <div>
            <DynamicStringListInput
              label={t('vendorTourForms.internationalTourForm.fields.notAllowedItems.label')}
              items={intlNotAllowedItems}
              onChange={setIntlNotAllowedItems}
              placeholder={t('vendorTourForms.internationalTourForm.fields.notAllowedItems.placeholder')}
              accent="red"
            />
          </div>
        </div>
        )}

        {currentStep === 2 && (
        <div className="space-y-6">
          {/* B) Loqistika və Nəqliyyat Məlumatları */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-teal-700 tracking-wider border-b pb-1">{t('vendorTourForms.internationalTourForm.sections.logistics')}</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={intlTourFlightIncluded} onChange={(e) => setIntlTourFlightIncluded(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500" />
                <span className="text-xs font-black text-slate-800">{t('vendorTourForms.internationalTourForm.fields.flightIncluded')}</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.flightDetails.label')}</label>
                  <textarea rows={2} value={intlTourFlightDetails} onChange={(e) => setIntlTourFlightDetails(e.target.value)} placeholder={t('vendorTourForms.internationalTourForm.fields.flightDetails.placeholder')} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.transferDetails.label')}</label>
                  <textarea rows={2} value={intlTourTransferDetails} onChange={(e) => setIntlTourTransferDetails(e.target.value)} placeholder={t('vendorTourForms.internationalTourForm.fields.transferDetails.placeholder')} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* C) Yerləşmə (Otel) Məlumatları */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-emerald-750 tracking-wider border-b pb-1">{t('vendorTourForms.internationalTourForm.sections.accommodation')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.hotelName.label')}</label>
                <input type="text" required value={intlTourHotelName} onChange={(e) => setIntlTourHotelName(e.target.value)} placeholder={t('vendorTourForms.internationalTourForm.fields.hotelName.placeholder')} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.hotelStars.label')}</label>
                <select value={intlTourHotelStars} onChange={(e) => setIntlTourHotelStars(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none bg-white cursor-pointer">
                  <option value={5}>{t('vendorTourForms.internationalTourForm.fields.hotelStars.option5')}</option>
                  <option value={4}>{t('vendorTourForms.internationalTourForm.fields.hotelStars.option4')}</option>
                  <option value={3}>{t('vendorTourForms.internationalTourForm.fields.hotelStars.option3')}</option>
                  <option value={2}>{t('vendorTourForms.internationalTourForm.fields.hotelStars.option2')}</option>
                  <option value={1}>{t('vendorTourForms.internationalTourForm.fields.hotelStars.option1')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.mealType.label')}</label>
                <select value={intlTourMealType} onChange={(e) => setIntlTourMealType(e.target.value)} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none bg-white cursor-pointer">
                  <option value="Səhər yeməyi">{t('vendorTourForms.internationalTourForm.fields.mealType.bb')}</option>
                  <option value="Hər şey daxil (AI)">{t('vendorTourForms.internationalTourForm.fields.mealType.ai')}</option>
                  <option value="Yarım pansion (HB)">{t('vendorTourForms.internationalTourForm.fields.mealType.hb')}</option>
                  <option value="Tam pansion (FB)">{t('vendorTourForms.internationalTourForm.fields.mealType.fb')}</option>
                  <option value="Qidalanma daxil deyil">{t('vendorTourForms.internationalTourForm.fields.mealType.ro')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-emerald-800 mb-2">{t('vendorTourForms.internationalTourForm.fields.roomDiffs.label')}</label>
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">{t('vendorTourForms.internationalTourForm.fields.roomDiffs.double')}</label>
                  <input type="number" value={intlRoomDoubleDiff} onChange={handleNumberInput(setIntlRoomDoubleDiff)} className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">{t('vendorTourForms.internationalTourForm.fields.roomDiffs.twin')}</label>
                  <input type="number" value={intlRoomTwinDiff} onChange={handleNumberInput(setIntlRoomTwinDiff)} className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">{t('vendorTourForms.internationalTourForm.fields.roomDiffs.single')}</label>
                  <input type="number" value={intlRoomSingleDiff} onChange={handleNumberInput(setIntlRoomSingleDiff)} className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700" />
                </div>
              </div>
            </div>
          </div>

          {/* E) Proqram (Günbəgün) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-1">
              <h3 className="text-xs font-bold text-emerald-800 tracking-wider">{t('vendorTourForms.internationalTourForm.sections.itinerary')}</h3>
              <button type="button" onClick={handleIntlAddDay} className="bg-emerald-700 hover:bg-emerald-850 text-white font-black text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs">{t('vendorTourForms.internationalTourForm.itinerary.addDay')}</button>
            </div>
            <div className="space-y-4">
              {intlItinerary.map((iti, index) => (
                <div key={index} className="border border-slate-200 p-4 rounded-xl bg-slate-50 relative space-y-3">
                  <div className="flex justify-between items-center bg-slate-200/50 p-1.5 rounded-lg">
                    <span className="text-xs font-extrabold text-primary-800">{t('vendorTourForms.internationalTourForm.itinerary.dayPlan', { day: iti.day })}</span>
                    {intlItinerary.length > 1 && (
                      <button type="button" onClick={() => handleIntlRemoveDay(index)} className="text-red-500 hover:text-red-705 text-xs font-bold px-2 py-0.5">{t('vendorTourForms.internationalTourForm.itinerary.removeDay')}</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">{t('vendorTourForms.internationalTourForm.itinerary.dayTitleLabel')}</label>
                      <input type="text" required value={iti.title} onChange={(e) => handleIntlItineraryChange(index, 'title', e.target.value)} className="w-full px-2 py-1.5 border border-slate-250 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">{t('vendorTourForms.internationalTourForm.itinerary.dayImageLabel')}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id={`intl-itinerary-file-${index}`}
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const url = await uploadSingleImage(file);
                                handleIntlItineraryChange(index, 'image', url);
                              } catch (err: any) {
                                if (onShowNotification) onShowNotification(err?.message || 'Şəkil yüklənmədi.', 'error');
                              }
                            }
                          }}
                        />
                        {!iti.image ? (
                          <button type="button" onClick={() => document.getElementById(`intl-itinerary-file-${index}`)?.click()} className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/20 text-slate-500 hover:text-emerald-700 text-xs py-2 px-3 rounded-lg transition-all cursor-pointer font-bold">
                            {t('vendorTourForms.internationalTourForm.itinerary.uploadImage')}
                          </button>
                        ) : (
                          <div className="flex items-center gap-3 bg-emerald-50/35 border border-emerald-100 p-1.5 rounded-lg w-full">
                            <img src={iti.image || undefined} alt={`Gün ${iti.day}`} className="w-12 h-9 object-cover rounded-md border border-emerald-200/50 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-bold text-emerald-800 block leading-tight">{t('vendorTourForms.internationalTourForm.itinerary.imageUploaded')}</span>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button type="button" onClick={() => document.getElementById(`intl-itinerary-file-${index}`)?.click()} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold px-1.5 py-1 cursor-pointer hover:bg-white rounded transition-all">{t('vendorTourForms.internationalTourForm.itinerary.changeImage')}</button>
                              <button type="button" onClick={() => handleIntlItineraryChange(index, 'image', '')} className="text-[10px] text-red-500 hover:text-red-700 font-bold px-1.5 py-1 cursor-pointer hover:bg-white rounded transition-all">{t('vendorTourForms.internationalTourForm.itinerary.removeImage')}</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">{t('vendorTourForms.internationalTourForm.itinerary.descriptionLabel')}</label>
                      <textarea rows={2} required value={iti.description} onChange={(e) => handleIntlItineraryChange(index, 'description', e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-250 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        {currentStep === 3 && (
        <div className="space-y-6">
          {/* D) Qiymət, Təqvim və Paket İnformasiyası */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-teal-800 tracking-wider border-b pb-1">{t('vendorTourForms.internationalTourForm.sections.pricing')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.basePrice.label')}</label>
                <input type="number" required min={1} value={intlTourPrice} onChange={handleNumberInput(setIntlTourPrice)} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700" />
              </div>
              <div>
                <label className="block text-xs font-bold text-rose-600 mb-1">{t('vendorTourForms.internationalTourForm.fields.discountPrice.label')}</label>
                <input type="number" min="0" placeholder={t('vendorTourForms.internationalTourForm.fields.discountPrice.placeholder')} value={intlTourDiscountPrice} onChange={(e) => setIntlTourDiscountPrice(e.target.value)} className="w-full px-3 py-2 border border-rose-200 rounded-lg text-xs text-rose-700 placeholder-rose-300 focus:ring-1 focus:ring-rose-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.currency.label')}</label>
                <select value={intlTourCurrency} onChange={(e) => setIntlTourCurrency(e.target.value as 'AZN' | 'USD' | 'EUR')} className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 bg-white cursor-pointer">
                  <option value="AZN">AZN (₼)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div className="bg-primary-50/60 p-4 rounded-xl border border-emerald-100 space-y-3">
              <h4 className="text-[10px] font-extrabold text-emerald-800 tracking-widest">{t('vendorTourForms.internationalTourForm.sections.activeDatesHeading')}</h4>
              <MultiDateCalendar selectedDates={selectedDates} onChange={setSelectedDates} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('vendorTourForms.internationalTourForm.fields.mainImage.label')}</label>
              {intlTourImage ? (
                <div className="relative border border-slate-200 rounded-lg overflow-hidden group h-24 bg-slate-50 flex items-center justify-between px-3">
                  <div className="flex items-center gap-3">
                    <img src={intlTourImage || undefined} alt="Yüklənən şəkil" className="w-16 h-16 object-cover rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
                    <div>
                      <span className="text-[10px] text-emerald-700 font-extrabold block">{t('vendorTourForms.internationalTourForm.fields.mainImage.uploadedBadge')}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIntlTourImage('')} className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-black rounded-lg transition">{t('vendorTourForms.internationalTourForm.fields.mainImage.remove')}</button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIntlDragActive(true); }}
                  onDragLeave={() => setIntlDragActive(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setIntlDragActive(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      try {
                        const url = await uploadSingleImage(file);
                        setIntlTourImage(url);
                        clearFieldError('image');
                      } catch (err: any) {
                        if (onShowNotification) onShowNotification(err?.message || 'Şəkil yüklənmədi.', 'error');
                      }
                    }
                  }}
                  onClick={() => document.getElementById('intl-file-uploader-input')?.click()}
                  className={`h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer ${fieldErrors.image ? 'border-red-500 bg-red-50/50' : intlDragActive ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100/75 hover:border-slate-400'}`}
                >
                  <input
                    type="file"
                    id="intl-file-uploader-input"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const url = await uploadSingleImage(file);
                          setIntlTourImage(url);
                          clearFieldError('image');
                        } catch (err: any) {
                          if (onShowNotification) onShowNotification(err?.message || 'Şəkil yüklənmədi.', 'error');
                        }
                      }
                    }}
                  />
                  <span className="text-lg">📸</span>
                  <span className="text-[10px] font-bold text-slate-705 mt-1">{t('vendorTourForms.internationalTourForm.fields.mainImage.dropHint')}</span>
                  <span className={`text-[9px] mt-0.5 font-semibold block leading-tight px-2 ${fieldErrors.image ? 'text-red-600' : 'text-slate-400'}`}>
                    {fieldErrors.image ? `⚠️ ${t('vendorTourForms.internationalTourForm.fields.mainImage.required')}` : t('vendorTourForms.internationalTourForm.fields.mainImage.requiredHint')}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DynamicStringListInput label={t('vendorTourForms.internationalTourForm.fields.includes.label')} items={intlIncludes} onChange={(items) => { setIntlIncludes(items); clearFieldError('includes'); }} placeholder={t('vendorTourForms.internationalTourForm.fields.includes.placeholder')} error={fieldErrors.includes} />
              <DynamicStringListInput label={t('vendorTourForms.internationalTourForm.fields.notIncludes.label')} items={intlNotIncludes} onChange={(items) => { setIntlNotIncludes(items); clearFieldError('notIncludes'); }} placeholder={t('vendorTourForms.internationalTourForm.fields.notIncludes.placeholder')} accent="red" error={fieldErrors.notIncludes} />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">{t('vendorTourForms.internationalTourForm.fields.highlights.label')}</label>
              <input
                type="text"
                value={intlHighlights}
                onChange={(e) => { setIntlHighlights(e.target.value); clearFieldError('highlights'); }}
                placeholder={t('vendorTourForms.internationalTourForm.fields.highlights.placeholder')}
                className={`w-full px-3 py-2 border rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none ${fieldErrors.highlights ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-250'}`}
              />
              {fieldErrors.highlights && <p className="text-[10px] font-semibold text-red-600 mt-1">⚠️ {t('vendorTourForms.internationalTourForm.fields.highlights.error')}</p>}
            </div>
          </div>
        </div>
        )}

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

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 sm:justify-end pt-4 border-t border-slate-200">
          {currentStep === 1 && (
            <button type="button" onClick={() => onNavigateBack()} className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-slate-250 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50">{t('vendorTourForms.internationalTourForm.buttons.cancel')}</button>
          )}
          {currentStep > 1 && (
            <button
              type="button"
              onClick={goToPrevStep}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
            >
              {t('vendorTourForms.internationalTourForm.buttons.back')}
            </button>
          )}
          <button type="submit" disabled={isSavingForm} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-emerald-800 hover:bg-emerald-850 text-white font-black text-xs rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
            {currentStep < 3 ? (
              <>{t('vendorTourForms.internationalTourForm.buttons.next')}</>
            ) : (
              <>
                {isEditMode && <Check className="w-4 h-4" />}
                {isSavingForm ? t('vendorTourForms.internationalTourForm.buttons.submitting') : isEditMode ? t('vendorTourForms.internationalTourForm.buttons.saveChanges') : t('vendorTourForms.internationalTourForm.buttons.createTour')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}