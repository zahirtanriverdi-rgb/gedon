'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Tour, TourSlot, User, Guide, InquiryQuestion, DayProgramStep } from '../../types';
import { InquiryQuestionsEditor } from './InquiryQuestionsEditor';
import { parseGpsFile } from '../../utils/gpxParser';
import { Plus, X, Check } from 'lucide-react';
import { DynamicStringListInput } from './DynamicStringListInput';
import { MEETING_POINTS } from '../../data/meetingPoints';
import { MultiDateCalendar, toIsoDate } from './MultiDateCalendar';
import { TourDangerZone } from './TourDangerZone';
import { WhatsAppVerifyField } from '../shared/WhatsAppVerifyField';
import { handleNumberInput, useStepWizard } from './useTourFormWizard';
import { useLanguage } from '../../i18n/LanguageContext';
import { uploadMediaFiles } from '../../utils/uploadMedia';

// Older guides saved before Guide.id existed have no stable identifier — fall back to their
// name so tour-guide assignment still works for pre-existing profile data.
const getGuideKey = (guide: Guide): string => guide.id || guide.name;

interface TourFormProps {
  currentUser: User;
  tour?: Tour | null; // undefined/null = create mode; provided = edit mode
  slots: TourSlot[];
  category: 'peak' | 'camp' | 'hiking' | 'active';
  onCategoryChange: (category: 'peak' | 'camp' | 'hiking' | 'active') => void;
  onAddTour: (newTour: Tour) => Promise<void>;
  onEditTour?: (updatedTour: Tour) => Promise<void>;
  onDeleteTour?: (tourId: string) => Promise<void>;
  onAddSlot: (newSlot: TourSlot) => Promise<void>;
  onDeleteSlot?: (slotId: string) => Promise<void>;
  onUpdateSlot?: (slotId: string, updates: Partial<TourSlot>) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onNavigateBack: () => void;
}

// Unified create/edit form for domestic (peak/camp/hiking/active) tours. Same component is
// used from VendorPortal's "add-tour" tab (tour=null) and from the edit modal (tour set) —
// only the Danger Zone is mode-specific.
export function TourForm({ currentUser, tour, slots, category: tourCategory, onCategoryChange: setTourCategory, onAddTour, onEditTour, onDeleteTour, onAddSlot, onDeleteSlot, onUpdateSlot, onShowNotification, onNavigateBack }: TourFormProps) {
  const { t } = useLanguage();
  const isEditMode = !!tour;

  const FORM_STEPS = [
    { number: 1 as const, label: t('vendorTourForms.tourForm.steps.basic') },
    { number: 2 as const, label: t('vendorTourForms.tourForm.steps.logistics') },
    { number: 3 as const, label: t('vendorTourForms.tourForm.steps.pricing') },
  ];

  const [tourName, setTourName] = useState<string>('');
  const [tourDifficulty, setTourDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme'>('medium');
  const [tourRegion, setTourRegion] = useState<string>('');
  const [tourDays, setTourDays] = useState<number | ''>(1);
  const [tourDescription, setTourDescription] = useState<string>('');
  const [tourIncludes, setTourIncludes] = useState<string[]>(['Professional Bələdçi', 'Komfort Transit', 'Səhər yeməyi', 'Yol Sığortası']);
  const [tourNotIncluded, setTourNotIncluded] = useState<string[]>([]);
  const [tourHighlights, setTourHighlights] = useState<string>('');
  const [tourLanguages, setTourLanguages] = useState<string>('Azərbaycanca');
  const [tourDurationHours, setTourDurationHours] = useState<number | ''>(8);
  const [tourDepartureDateTime, setTourDepartureDateTime] = useState<string>('');
  const [tourReturnDateTime, setTourReturnDateTime] = useState<string>('');
  // Bu tura xas əlavə sorğu sualları (ad/telefon + 2 standart sual həmişə soruşulur)
  const [tourInquiryQuestions, setTourInquiryQuestions] = useState<InquiryQuestion[]>([]);
  const [dateTimeError, setDateTimeError] = useState<string | null>(null);
  const [tourBringItems, setTourBringItems] = useState<string[]>([]);
  const [tourNotAllowedItems, setTourNotAllowedItems] = useState<string[]>([]);
  const [tourImage, setTourImage] = useState<string>('');
  const [tourImages, setTourImages] = useState<string[]>([]);
  const [tourVideos, setTourVideos] = useState<string[]>([]);
  const [tourWhatsApp, setTourWhatsApp] = useState<string>('');
  // New tours require a fresh live-WhatsApp check on the guide number; editing an existing tour
  // starts pre-verified since that number was already checked when the tour was first created.
  const [isWhatsAppVerified, setIsWhatsAppVerified] = useState<boolean>(!!tour);
  const [tourPrice, setTourPrice] = useState<number | ''>(35);
  const [tourCapacity, setTourCapacity] = useState<number | ''>(20);
  // Per-date seat overrides, keyed by ISO date — lets a vendor give each departure date its
  // own total capacity (slotCapacities) and its own remaining/free seats (slotRemaining)
  // instead of every date sharing the single `tourCapacity` default above. "Taken" seats
  // (booked_count, which includes this platform's own bookings) are derived on submit as
  // total − remaining, so a vendor can account for registrations that came in off-platform.
  const [slotCapacities, setSlotCapacities] = useState<Record<string, number | ''>>({});
  const [slotRemaining, setSlotRemaining] = useState<Record<string, number | ''>>({});
  const [tourDiscountPrice, setTourDiscountPrice] = useState<string>('');
  const [tourRating, setTourRating] = useState<number | ''>('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [tourGpxData, setTourGpxData] = useState<string>('');
  const [tourGpxFileName, setTourGpxFileName] = useState<string>('');
  const [tourIsActive, setTourIsActive] = useState<boolean>(true);

  // Active Lifestyle specifics
  const [tourActivityType, setTourActivityType] = useState<string>('volleyball');
const [tourCustomActivityType, setTourCustomActivityType] = useState<string>(''); // ← YENİ: "digər" üçün manual yazı
const [tourActiveDifficulty, setTourActiveDifficulty] = useState<string>('medium');
  // Ümumi yaş limiti — bütün kateqoriyalar üçün (boş = detal səhifəsində göstərilmir)
  const [tourAgeLimit, setTourAgeLimit] = useState<string>('');
  // "Günün proqramı" timeline addımları (vaxt + başlıq + qeyd) — yerli turların detal səhifəsində göstərilir
  const [tourDayProgram, setTourDayProgram] = useState<DayProgramStep[]>([]);
  const [tourMeetingPoint, setTourMeetingPoint] = useState<string>('');
  const [tourMeetingPointEmbedUrl, setTourMeetingPointEmbedUrl] = useState<string>('');
  const [tourRequiredEquipment, setTourRequiredEquipment] = useState<string>('');
  const [tourEquipmentIncluded, setTourEquipmentIncluded] = useState<boolean>(true);
  const [tourEquipmentRentalPrice, setTourEquipmentRentalPrice] = useState<number | ''>(0);
  const [tourSafetyInstructions, setTourSafetyInstructions] = useState<string>('');
  const [tourAllowTeamRegistration, setTourAllowTeamRegistration] = useState<boolean>(true);
  const [tourScheduleFrequency, setTourScheduleFrequency] = useState<string>('one-time');
  const [tourCancellationHours, setTourCancellationHours] = useState<number>(48);
  const [tourGuideIds, setTourGuideIds] = useState<string[]>([]);

  const [isSavingForm, setIsSavingForm] = useState(false);
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);
const STANDARD_ACTIVITY_TYPES = ['volleyball', 'running', 'ski', 'rafting', 'bike', 'canyon', 'other'];
  const { currentStep, goToNextStep, goToPrevStep } = useStepWizard();

  // Per-field invalid markers for fields HTML5 `required` can't cover (tag lists, media) or
  // that we validate with a custom message instead of relying on native browser tooltips.
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
  };

  // Returns the labels of every required-but-empty field in `step`, so goToNextStep (and the
  // final submit, which re-checks step 3) can report every gap at once instead of one at a time.
  const getMissingFieldsForStep = (step: 1 | 2 | 3): { key: string; label: string }[] => {
    const missing: { key: string; label: string }[] = [];
    if (step === 1) {
      if (!tourLanguages.trim()) missing.push({ key: 'languages', label: t('vendorTourForms.tourForm.validation.fieldLanguages') });
      if (tourBringItems.filter(Boolean).length === 0) missing.push({ key: 'bringItems', label: t('vendorTourForms.tourForm.validation.fieldBringItems') });
      // If category is active and user chose "other", the manual activity name is required
      if (tourCategory === 'active' && (tourActivityType === 'other' || !STANDARD_ACTIVITY_TYPES.includes(tourActivityType)) && !tourCustomActivityType.trim()) {
        missing.push({ key: 'activityCustom', label: t('vendorTourForms.tourForm.validation.fieldActivityCustom') });
      }
    } else if (step === 2) {
      if (tourImages.length === 0) missing.push({ key: 'media', label: t('vendorTourForms.tourForm.validation.fieldMedia') });
      if (!isWhatsAppVerified) missing.push({ key: 'whatsappVerification', label: t('vendorTourForms.tourForm.validation.fieldWhatsappVerification') });
    } else if (step === 3) {
      if (tourIncludes.filter(Boolean).length === 0) missing.push({ key: 'includes', label: t('vendorTourForms.tourForm.validation.fieldIncludes') });
      if (tourNotIncluded.filter(Boolean).length === 0) missing.push({ key: 'notIncluded', label: t('vendorTourForms.tourForm.validation.fieldNotIncluded') });
      if (!tourHighlights.trim()) missing.push({ key: 'highlights', label: t('vendorTourForms.tourForm.validation.fieldHighlights') });
    }
    return missing;
  };

  const validateStepAndNotify = (step: 1 | 2 | 3): boolean => {
    const missing = getMissingFieldsForStep(step);
    if (missing.length === 0) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        for (const key of ['languages', 'bringItems', 'media', 'whatsappVerification', 'includes', 'notIncluded', 'highlights', 'activityCustom']) delete next[key];
        return next;
      });
      return true;
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const { key } of missing) next[key] = true;
      return next;
    });
    const message = `${t('vendorTourForms.tourForm.validation.missingFieldsPrefix')} ${missing.map((m) => m.label).join(', ')}.`;
    if (onShowNotification) onShowNotification(message, 'error');
    else alert(message);
    return false;
  };

  // This tour's existing slots, keyed by ISO date — used to seed/display each date's current
  // capacity and booked count (remaining-seats indicator) in the per-date list below.
  const existingSlotByDate = useMemo(() => {
    const tourSlots = tour ? slots.filter((s) => s.tourId === tour.id) : [];
    return new Map(tourSlots.map((s) => [toIsoDate(new Date(s.startDate)), s]));
  }, [slots, tour]);

  // Keeps slotCapacities + slotRemaining in sync with the calendar's selectedDates: a newly-
  // picked date seeds its total from its existing slot's capacity (or the form's default
  // tourCapacity) and its remaining from the existing slot's free seats (capacity − bookedCount),
  // or the full total for a brand-new date. Deselected dates are dropped so they don't linger.
  useEffect(() => {
    setSlotCapacities((prev) => {
      const next: Record<string, number | ''> = {};
      for (const date of selectedDates) {
        const iso = toIsoDate(date);
        if (prev[iso] !== undefined) {
          next[iso] = prev[iso];
        } else {
          const existing = existingSlotByDate.get(iso);
          next[iso] = existing ? existing.capacity : (Number(tourCapacity) || 20);
        }
      }
      return next;
    });
    setSlotRemaining((prev) => {
      const next: Record<string, number | ''> = {};
      for (const date of selectedDates) {
        const iso = toIsoDate(date);
        if (prev[iso] !== undefined) {
          next[iso] = prev[iso];
        } else {
          const existing = existingSlotByDate.get(iso);
          next[iso] = existing
            ? Math.max(0, existing.capacity - existing.bookedCount)
            : (Number(tourCapacity) || 20);
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDates, existingSlotByDate]);

  // New tour (create mode): pre-fill the WhatsApp guide number with the vendor's own official
  // contact number instead of a hardcoded placeholder. Still editable — a vendor may want a
  // different guide's number for a specific tour.
  useEffect(() => {
    if (tour) return; // edit mode is populated separately below, from the tour itself
    setTourWhatsApp(currentUser.whatsapp_number || currentUser.phone || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-calculate the trip's total duration (in hours) from departure/return date-time —
  // the field is derived, not hand-typed, so it can't drift out of sync with the actual dates.
  useEffect(() => {
    if (!tourDepartureDateTime || !tourReturnDateTime) {
      setDateTimeError(null);
      return;
    }
    const departure = new Date(tourDepartureDateTime).getTime();
    const returnTime = new Date(tourReturnDateTime).getTime();
    if (isNaN(departure) || isNaN(returnTime)) return;
    if (returnTime <= departure) {
      setDateTimeError(t('vendorTourForms.tourForm.dateTimeError'));
      return;
    }
    setDateTimeError(null);
    const diffHours = Math.round(((returnTime - departure) / (1000 * 60 * 60)) * 10) / 10;
    setTourDurationHours(diffHours);
  }, [tourDepartureDateTime, tourReturnDateTime]);


  useEffect(() => {
    if (!tour) return;
    setTourName(tour.name);
    setTourDifficulty(tour.difficulty as any);
    setTourRegion(tour.region);
    setTourDays(tour.durationDays);
    setTourDescription(tour.description || '');
    setTourIncludes(Array.isArray(tour.includes) ? tour.includes : []);
    setTourNotIncluded(Array.isArray(tour.notIncluded) ? tour.notIncluded : []);
    setTourHighlights(Array.isArray(tour.highlights) ? tour.highlights.join(', ') : '');
    setTourLanguages(Array.isArray(tour.languages) ? tour.languages.join(', ') : '');
    setTourDurationHours(tour.durationHours || (tour.durationDays ? tour.durationDays * 8 : 8));
    setTourDepartureDateTime(tour.departureDateTime || '');
    setTourReturnDateTime(tour.returnDateTime || '');
    setTourBringItems(Array.isArray(tour.importantInfo?.bring) ? tour.importantInfo!.bring! : []);
    setTourNotAllowedItems(Array.isArray(tour.importantInfo?.notAllowed) ? tour.importantInfo!.notAllowed! : []);
    setTourRating(tour.rating !== undefined && tour.rating !== null ? tour.rating : '');
    setTourImage(tour.image || '');
    // Legacy tours may have a cover (`image`) that isn't part of the gallery array yet —
    // fold it in so the cover badge has something to highlight in the unified media grid.
    const existingGallery = tour.images || [];
    setTourImages(tour.image && !existingGallery.includes(tour.image) ? [tour.image, ...existingGallery] : existingGallery);
    setTourVideos(tour.videos || []);
    setTourWhatsApp(tour.whatsapp_number || currentUser.whatsapp_number || currentUser.phone || '');
    setIsWhatsAppVerified(true);
    setTourGpxData(tour.gpxData || '');
    setTourGpxFileName(tour.gpxFileName || '');
    setTourIsActive(tour.isActive !== false);
    setTourCategory(tour.category as any);

    const savedActivity = tour.activityType || 'volleyball';
if (STANDARD_ACTIVITY_TYPES.includes(savedActivity)) {
  setTourActivityType(savedActivity);
  setTourCustomActivityType('');
} else {
  setTourActivityType('other');
  setTourCustomActivityType(savedActivity);
}
setTourActiveDifficulty(tour.activeDifficulty || 'medium');
    setTourAgeLimit(tour.ageLimit || '');
    setTourDayProgram(Array.isArray(tour.dayProgram) ? tour.dayProgram : []);
    setTourMeetingPoint(tour.meetingPoint || '');
    setTourMeetingPointEmbedUrl(tour.meetingPointEmbedUrl || '');
    setTourRequiredEquipment(tour.requiredEquipment || '');
    setTourEquipmentIncluded(tour.equipmentIncluded !== false);
    setTourEquipmentRentalPrice(tour.equipmentRentalPrice || 0);
    setTourSafetyInstructions(tour.safetyInstructions || '');
    setTourAllowTeamRegistration(tour.allowTeamRegistration !== false);
    setTourScheduleFrequency(tour.scheduleFrequency || 'one-time');
    setTourCancellationHours(tour.cancellationHours !== undefined ? tour.cancellationHours : 48);
    setTourGuideIds(tour.guideIds || []);
    setTourInquiryQuestions(Array.isArray(tour.inquiryQuestions) ? tour.inquiryQuestions : []);

    const tourSlots = slots.filter(s => s.tourId === tour.id);
    setSelectedDates(tourSlots.map(s => new Date(s.startDate)));
    setTourPrice(tour.price !== undefined ? tour.price : (tourSlots.length > 0 ? tourSlots[0].price : 35));
    setTourCapacity(tourSlots.length > 0 ? tourSlots[0].capacity : 20);
    setTourDiscountPrice(tour.discountPrice !== undefined ? String(tour.discountPrice) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  const handleTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dateTimeError) {
      if (onShowNotification) onShowNotification(dateTimeError, 'error');
      else alert(dateTimeError);
      return;
    }
    if (currentStep !== 3) {
      if (!validateStepAndNotify(currentStep)) return;
      goToNextStep();
      return;
    }
    if (!tourName || !tourRegion || !tourDescription) {
      const requiredFieldsMessage = t('vendorTourForms.tourForm.validation.missingRequiredFields');
      if (onShowNotification) {
        onShowNotification(requiredFieldsMessage, 'error');
      } else {
        alert(requiredFieldsMessage);
      }
      return;
    }
    if (!validateStepAndNotify(3)) return;

    const defaultImg = tourCategory === 'peak'
      ? 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800'
      : tourCategory === 'camp'
      ? 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800'
      : 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800';

    const cleanHighlights = tourHighlights.split(',').map(s => s.trim()).filter(Boolean);
    const cleanLanguages = tourLanguages.split(',').map(s => s.trim()).filter(Boolean);
    const cleanBringItems = tourBringItems.filter(Boolean);
    const cleanNotAllowedItems = tourNotAllowedItems.filter(Boolean);
    const cleanIncludes = tourIncludes.filter(Boolean);
    const cleanNotIncluded = tourNotIncluded.filter(Boolean);

    const sharedFields = {
      name: tourName,
      category: tourCategory,
      difficulty: tourDifficulty,
      description: tourDescription,
      region: tourRegion,
      durationDays: Number(tourDays),
      durationHours: tourDurationHours ? Number(tourDurationHours) : undefined,
      departureDateTime: tourDepartureDateTime || undefined,
      returnDateTime: tourReturnDateTime || undefined,
      includes: cleanIncludes.length > 0 ? cleanIncludes : ['Müşayiət bələdçisi'],
      notIncluded: cleanNotIncluded.length > 0 ? cleanNotIncluded : undefined,
      highlights: cleanHighlights.length > 0 ? cleanHighlights : undefined,
      languages: cleanLanguages.length > 0 ? cleanLanguages : undefined,
      importantInfo: (cleanBringItems.length > 0 || cleanNotAllowedItems.length > 0) ? {
        bring: cleanBringItems.length > 0 ? cleanBringItems : undefined,
        notAllowed: cleanNotAllowedItems.length > 0 ? cleanNotAllowedItems : undefined,
      } : undefined,
      image: tourImage || defaultImg,
      images: tourImages.length > 0 ? tourImages : (tourImage ? [tourImage] : [defaultImg]),
      videos: tourVideos,
      whatsapp_number: tourWhatsApp || currentUser.whatsapp_number || currentUser.phone || '',
      gpxData: tourGpxData || undefined,
      gpxFileName: tourGpxFileName || undefined,
      price: Number(tourPrice) || 0,
      discountPrice: tourDiscountPrice !== '' && Number(tourDiscountPrice) > 0 ? Number(tourDiscountPrice) : undefined,
      rating: tourRating !== '' ? Math.min(5, Math.max(1, Number(tourRating))) : undefined,
      isActive: tourIsActive,
      isActiveLife: tourCategory === 'active',
activityType: tourCategory === 'active'
  ? (tourActivityType === 'other' || !STANDARD_ACTIVITY_TYPES.includes(tourActivityType)
      ? (tourCustomActivityType.trim() || 'other')
      : tourActivityType)
  : undefined,
        activeDifficulty: tourCategory === 'active' ? (tourActiveDifficulty as 'beginner' | 'medium' | 'professional') : undefined,
      ageLimit: tourAgeLimit.trim() || undefined,
      dayProgram: (() => {
        const cleaned = tourDayProgram
          .map(s => ({ time: s.time.trim(), title: s.title.trim(), note: s.note?.trim() || undefined }))
          .filter(s => s.time && s.title);
        return cleaned.length > 0 ? cleaned : undefined;
      })(),
      meetingPoint: tourMeetingPoint || undefined,
      meetingPointEmbedUrl: tourMeetingPoint ? tourMeetingPointEmbedUrl : undefined,
      requiredEquipment: tourCategory === 'active' ? tourRequiredEquipment : undefined,
      equipmentIncluded: tourCategory === 'active' ? tourEquipmentIncluded : undefined,
      equipmentRentalPrice: tourCategory === 'active' ? (Number(tourEquipmentRentalPrice) || 0) : undefined,
      safetyInstructions: tourCategory === 'active' ? tourSafetyInstructions : undefined,
      allowTeamRegistration: tourCategory === 'active' ? tourAllowTeamRegistration : undefined,
      scheduleFrequency: tourCategory === 'active' ? tourScheduleFrequency : undefined,
      guideIds: tourGuideIds.length > 0 ? tourGuideIds : undefined,
      cancellationHours: tourCancellationHours,
      inquiryQuestions: (() => {
        const cleaned = tourInquiryQuestions
          .map(q => ({ ...q, question: q.question.trim(), options: q.options.map(o => o.trim()).filter(Boolean) }))
          .filter(q => q.question && q.options.length >= 2);
        return cleaned.length > 0 ? cleaned : undefined;
      })(),
    };

    setIsSavingForm(true);
    setFormSubmitError(null);
    try {
      let tourId: string;
      if (isEditMode && tour) {
        const activeLabel = t('vendorTourForms.tourForm.changeLog.statusActive');
        const inactiveLabel = t('vendorTourForms.tourForm.changeLog.statusInactive');
        const changes: string[] = [];
        if (tour.name !== tourName) changes.push(t('vendorTourForms.tourForm.changeLog.nameChange', { oldName: tour.name, newName: tourName }));
        if ((tour.isActive !== false) !== tourIsActive) {
          changes.push(t('vendorTourForms.tourForm.changeLog.statusChange', {
            oldStatus: (tour.isActive !== false) ? activeLabel : inactiveLabel,
            newStatus: tourIsActive ? activeLabel : inactiveLabel,
          }));
        }
        if (tour.image !== tourImage) changes.push(t('vendorTourForms.tourForm.changeLog.coverImageChanged'));
        const lastChangeLog = changes.length > 0 ? changes.join(' | ') : t('vendorTourForms.tourForm.changeLog.minorChanges');

        const updatedTour: Tour = { ...tour, ...sharedFields, lastChangeLog };
        tourId = tour.id;
        if (onEditTour) await onEditTour(updatedTour);
        if (onShowNotification) {
          // Admin edits write straight to the live row (no re-approval round) — the
          // "sent to admin for re-approval" wording is only true for vendors.
          onShowNotification(
            currentUser.role === 'admin'
              ? t('vendorTourForms.tourForm.notifications.tourUpdatedByAdmin')
              : t('vendorTourForms.tourForm.notifications.tourUpdatedPendingApproval'),
            'info'
          );
        }
      } else {
        const newTour: Tour = {
          id: 'tour-' + Math.floor(Math.random() * 90000 + 10000),
          ...sharedFields,
          vendorId: currentUser.id,
          vendorName: currentUser.name,
          isApproved: false,
          status: 'pending_approval',
        };
        tourId = newTour.id;
        await onAddTour(newTour);
      }

      // Diff the calendar's selected dates against this tour's existing slots: new dates
      // become new TourSlots (at the form's price), deselected dates get their slot removed.
      const existingSlots = isEditMode ? slots.filter(s => s.tourId === tourId) : [];
      const existingByDate = new Map(existingSlots.map(s => [toIsoDate(new Date(s.startDate)), s]));
      const selectedIso = new Set(selectedDates.map(toIsoDate));

      for (const date of selectedDates) {
        const iso = toIsoDate(date);
        const existing = existingByDate.get(iso);
        const desiredCapacity = Number(slotCapacities[iso]) || Number(tourCapacity) || 20;
        // "Taken" seats are derived from what the vendor entered as remaining: a blank
        // remaining field means "all free". bookedCount = total − remaining, clamped so it
        // can't exceed the total or go negative. This bookedCount includes this platform's
        // own bookings plus any off-platform registrations the vendor accounted for.
        const desiredRemaining = slotRemaining[iso] === '' || slotRemaining[iso] === undefined
          ? desiredCapacity
          : Number(slotRemaining[iso]);
        const desiredBooked = Math.min(desiredCapacity, Math.max(0, desiredCapacity - desiredRemaining));
        if (!existing) {
          await onAddSlot({
            id: 'slot-' + Math.floor(Math.random() * 90000 + 10000),
            tourId,
            startDate: iso,
            endDate: iso,
            price: Number(tourPrice || 35),
            capacity: desiredCapacity,
            bookedCount: desiredBooked,
          });
        } else if (onUpdateSlot && (desiredCapacity !== existing.capacity || desiredBooked !== existing.bookedCount)) {
          await onUpdateSlot(existing.id, { capacity: desiredCapacity, bookedCount: desiredBooked });
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
      setFormSubmitError(err?.message || t('vendorTourForms.tourForm.submitErrors.generic'));
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleGpsFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseGpsFile(file.name, text);
        setTourGpxData(JSON.stringify(parsed));
        setTourGpxFileName(file.name);
        if (onShowNotification) {
          onShowNotification(t('vendorTourForms.tourForm.notifications.gpxUploaded', { distanceKm: parsed.stats.distanceKm, elevationGainM: parsed.stats.elevationGainM }), 'success');
        }
      } catch (err: any) {
        if (onShowNotification) onShowNotification(t('vendorTourForms.tourForm.notifications.gpxError', { error: err.message || t('vendorTourForms.tourForm.notifications.gpxErrorDefault') }), 'error');
      }
    };
    reader.readAsText(file);
  };

// Unified media upload to server (S3-compatible storage və ya dev-də lokal disk;
// bax src/utils/uploadMedia.ts) — DB-yə yalnız URL yazılır, base64 yox.
const handleMediaFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  try {
    const { images: imageUrls, videos: videoUrls } = await uploadMediaFiles(files);

    setTourImages(prev => [...prev, ...imageUrls]);
    setTourVideos(prev => [...prev, ...videoUrls]);

    if (imageUrls.length > 0 && !tourImage) setTourImage(imageUrls[0]);

    if (onShowNotification) {
      onShowNotification(`✅ ${imageUrls.length} şəkil və ${videoUrls.length} video yükləndi`, 'success');
    }
    if (imageUrls.length > 0 || videoUrls.length > 0) clearFieldError('media');
  } catch (err: any) {
    console.error(err);
    if (onShowNotification) onShowNotification(err?.message || "Şəkil yüklənərkən xəta baş verdi", 'error');
  }
};

  return (
    <div className="space-y-5">
      <form onSubmit={handleTourSubmit} className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <span className="text-[10px] tracking-widest text-slate-400 font-bold block mb-1">
            {isEditMode ? t('vendorTourForms.tourForm.header.eyebrowEdit') : (tourCategory === 'active' ? t('vendorTourForms.tourForm.header.eyebrowNewActive') : t('vendorTourForms.tourForm.header.eyebrowNewStandard'))}
          </span>
          <h3 className="font-extrabold text-slate-900 text-sm">
            {isEditMode ? t('vendorTourForms.tourForm.header.titleEdit') : (tourCategory === 'active' ? t('vendorTourForms.tourForm.header.titleNewActive') : t('vendorTourForms.tourForm.header.titleNewStandard'))}
          </h3>
        </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.name.label')}</label>
            <input
              type="text"
              required
              value={tourName}
              onChange={(e) => setTourName(e.target.value)}
              placeholder={t('vendorTourForms.tourForm.fields.name.placeholder')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.region.label')}</label>
            <input
              type="text"
              required
              value={tourRegion}
              onChange={(e) => setTourRegion(e.target.value)}
              placeholder={t('vendorTourForms.tourForm.fields.region.placeholder')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.category.label')}</label>
            <select
              value={tourCategory}
              onChange={(e) => setTourCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="hiking">{t('vendorTourForms.tourForm.fields.category.hiking')}</option>
              <option value="peak">{t('vendorTourForms.tourForm.fields.category.peak')}</option>
              <option value="camp">{t('vendorTourForms.tourForm.fields.category.camp')}</option>
              <option value="active">{t('vendorTourForms.tourForm.fields.category.active')}</option>
            </select>
          </div>

          {tourCategory !== 'active' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.difficulty.label')}</label>
              <select
                value={tourDifficulty}
                onChange={(e) => setTourDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value="easy">{t('vendorTourForms.tourForm.fields.difficulty.easy')}</option>
                <option value="medium">{t('vendorTourForms.tourForm.fields.difficulty.medium')}</option>
                <option value="hard">{t('vendorTourForms.tourForm.fields.difficulty.hard')}</option>
                <option value="extreme">{t('vendorTourForms.tourForm.fields.difficulty.extreme')}</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.days.label')}</label>
            <input
              type="number"
              min="1"
              max="14"
              required
              value={tourDays}
              onChange={handleNumberInput(setTourDays)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.languages.label')}</label>
            <input
              type="text"
              value={tourLanguages}
              onChange={(e) => { setTourLanguages(e.target.value); clearFieldError('languages'); }}
              placeholder={t('vendorTourForms.tourForm.fields.languages.placeholder')}
              className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs text-slate-800 ${fieldErrors.languages ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-200'}`}
            />
            {fieldErrors.languages && <p className="text-[10px] font-semibold text-red-600 mt-1">⚠️ {t('vendorTourForms.tourForm.fields.languages.error')}</p>}
          </div>

          {tourCategory === 'active' && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-xs">
              <div className="md:col-span-3 pb-2 mb-2 border-b border-amber-200">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 tracking-wider">{t('vendorTourForms.tourForm.activeSection.heading')}</h4>
              </div>
              <div>
  <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">{t('vendorTourForms.tourForm.activeSection.activityType.label')}</label>
  <select
    value={STANDARD_ACTIVITY_TYPES.includes(tourActivityType) ? tourActivityType : 'other'}
    onChange={(e) => {
      const v = e.target.value;
      setTourActivityType(v);
      if (v !== 'other') setTourCustomActivityType('');
    }}
    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-slate-700"
  >
    <option value="volleyball">{t('vendorTourForms.tourForm.activeSection.activityType.volleyball')}</option>
    <option value="running">{t('vendorTourForms.tourForm.activeSection.activityType.running')}</option>
    <option value="ski">{t('vendorTourForms.tourForm.activeSection.activityType.ski')}</option>
    <option value="rafting">{t('vendorTourForms.tourForm.activeSection.activityType.rafting')}</option>
    <option value="bike">{t('vendorTourForms.tourForm.activeSection.activityType.bike')}</option>
    <option value="canyon">{t('vendorTourForms.tourForm.activeSection.activityType.canyon')}</option>
    <option value="other">{t('vendorTourForms.tourForm.activeSection.activityType.other')}</option>
  </select>

  {/* "Digər" seçildikdə manual yazı sahəsi */}
  {(tourActivityType === 'other' || !STANDARD_ACTIVITY_TYPES.includes(tourActivityType)) && (
    <div>
      <input
        type="text"
        value={tourCustomActivityType}
        onChange={(e) => { setTourCustomActivityType(e.target.value); clearFieldError('activityCustom'); }}
        placeholder="İdman növünü yazın (məs: paragliding, yelkən...)"
        className={`w-full mt-2 px-3 py-2 bg-white rounded-lg text-xs font-semibold text-slate-800 placeholder-amber-400 ${fieldErrors.activityCustom ? 'border-red-500 ring-1 ring-red-300' : 'border-amber-300 ring-amber-100'}`}
      />
      {fieldErrors.activityCustom && <p className="text-[10px] font-semibold text-red-600 mt-1">⚠️ {t('vendorTourForms.tourForm.validation.fieldActivityCustom')}</p>}
    </div>
  )}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.ageLimit.label')}</label>
            <input
              type="text"
              value={tourAgeLimit}
              onChange={(e) => setTourAgeLimit(e.target.value)}
              placeholder={t('vendorTourForms.tourForm.fields.ageLimit.placeholder')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <DynamicStringListInput
              label={t('vendorTourForms.tourForm.fields.bringItems.label')}
              items={tourBringItems}
              onChange={(items) => { setTourBringItems(items); clearFieldError('bringItems'); }}
              placeholder={t('vendorTourForms.tourForm.fields.bringItems.placeholder')}
              error={fieldErrors.bringItems}
            />
          </div>
          <div>
            <DynamicStringListInput
              label={t('vendorTourForms.tourForm.fields.notAllowedItems.label')}
              items={tourNotAllowedItems}
              onChange={setTourNotAllowedItems}
              placeholder={t('vendorTourForms.tourForm.fields.notAllowedItems.placeholder')}
              accent="red"
            />
          </div>
        </div>
        )}

        {currentStep === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tourCategory === 'active' && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-xs">
              <div className="md:col-span-2 pb-2 mb-2 border-b border-amber-200">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 tracking-wider">{t('vendorTourForms.tourForm.activeSection.equipmentHeading')}</h4>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">{t('vendorTourForms.tourForm.activeSection.requiredEquipment.label')}</label>
                <textarea rows={2} value={tourRequiredEquipment} onChange={(e) => setTourRequiredEquipment(e.target.value)} placeholder={t('vendorTourForms.tourForm.activeSection.requiredEquipment.placeholder')} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="optAvt" checked={tourEquipmentIncluded} onChange={(e) => setTourEquipmentIncluded(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
                <label htmlFor="optAvt" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">✅ {t('vendorTourForms.tourForm.activeSection.equipmentIncluded')}</label>
              </div>
              {!tourEquipmentIncluded ? (
                <div>
                  <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">{t('vendorTourForms.tourForm.activeSection.rentalPrice.label')}</label>
                  <input type="number" min="0" value={tourEquipmentRentalPrice} onChange={handleNumberInput(setTourEquipmentRentalPrice)} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs" placeholder={t('vendorTourForms.tourForm.activeSection.rentalPrice.placeholder')} />
                </div>
              ) : <div />}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="optTeam" checked={tourAllowTeamRegistration} onChange={(e) => setTourAllowTeamRegistration(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
                <label htmlFor="optTeam" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">👥 {t('vendorTourForms.tourForm.activeSection.allowTeamRegistration')}</label>
              </div>
              <div className="md:col-span-2 mt-2">
                <label className="block text-[11px] font-bold text-rose-700 tracking-wide mb-1">{t('vendorTourForms.tourForm.activeSection.safetyInstructions.label')}</label>
                <textarea rows={3} value={tourSafetyInstructions} onChange={(e) => setTourSafetyInstructions(e.target.value)} placeholder={t('vendorTourForms.tourForm.activeSection.safetyInstructions.placeholder')} className="w-full px-3 py-2 bg-white border border-rose-300 ring-1 ring-rose-100 rounded-lg text-xs" />
              </div>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.meetingPoint.label')}</label>
            <select
              value={tourMeetingPoint}
              onChange={(e) => {
                const selected = MEETING_POINTS.find((p) => p.name === e.target.value);
                setTourMeetingPoint(selected?.name || '');
                setTourMeetingPointEmbedUrl(selected?.embedUrl || '');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="">{t('vendorTourForms.tourForm.fields.meetingPoint.placeholderOption')}</option>
              {MEETING_POINTS.map((point) => (
                <option key={point.name} value={point.name}>{point.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.whatsapp.label')}</label>
            <WhatsAppVerifyField
              value={tourWhatsApp}
              onChange={setTourWhatsApp}
              isVerified={isWhatsAppVerified}
              onVerifiedChange={setIsWhatsAppVerified}
              onShowNotification={onShowNotification}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.departureDateTime.label')}</label>
            <input
              type="datetime-local"
              value={tourDepartureDateTime}
              onChange={(e) => setTourDepartureDateTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.returnDateTime.label')}</label>
            <input
              type="datetime-local"
              value={tourReturnDateTime}
              onChange={(e) => setTourReturnDateTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
            />
          </div>
          {dateTimeError && (
            <div className="md:col-span-2 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {dateTimeError}</div>
          )}

          {/* Günün proqramı builder — detal səhifəsindəki timeline bu addımlardan qurulur */}
          <div className="md:col-span-2 bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-700 tracking-wider">🗓 {t('vendorTourForms.tourForm.fields.dayProgram.heading')}</h4>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{t('vendorTourForms.tourForm.fields.dayProgram.hint')}</p>
            </div>
            {tourDayProgram.map((step, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-white border border-slate-200 rounded-lg p-2.5">
                <input
                  type="text"
                  value={step.time}
                  onChange={(e) => setTourDayProgram(prev => prev.map((s, i) => i === idx ? { ...s, time: e.target.value } : s))}
                  placeholder={t('vendorTourForms.tourForm.fields.dayProgram.timePlaceholder')}
                  className="w-full sm:w-32 shrink-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                />
                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => setTourDayProgram(prev => prev.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))}
                  placeholder={t('vendorTourForms.tourForm.fields.dayProgram.titlePlaceholder')}
                  className="w-full flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <div className="flex gap-2 flex-1">
                  <input
                    type="text"
                    value={step.note || ''}
                    onChange={(e) => setTourDayProgram(prev => prev.map((s, i) => i === idx ? { ...s, note: e.target.value } : s))}
                    placeholder={t('vendorTourForms.tourForm.fields.dayProgram.notePlaceholder')}
                    className="w-full flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setTourDayProgram(prev => prev.filter((_, i) => i !== idx))}
                    className="shrink-0 w-8 h-8 self-center flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition"
                    aria-label={t('vendorTourForms.tourForm.fields.dayProgram.removeStep')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setTourDayProgram(prev => [...prev, { time: '', title: '', note: '' }])}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-2 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> {t('vendorTourForms.tourForm.fields.dayProgram.addStep')}
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">
              {t('vendorTourForms.tourForm.fields.durationHours.label', { autoSuffix: tourDepartureDateTime && tourReturnDateTime ? t('vendorTourForms.tourForm.fields.durationHours.autoSuffix') : '' })}
            </label>
            <input
              type="number"
              min={1}
              value={tourDurationHours}
              onChange={handleNumberInput(setTourDurationHours)}
              readOnly={!!(tourDepartureDateTime && tourReturnDateTime)}
              className={`w-full px-3 py-2 border rounded-lg text-xs ${
                tourDepartureDateTime && tourReturnDateTime ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.guides.label')}</label>
            {(currentUser.guides || []).length === 0 ? (
              <p className="text-[10px] text-slate-400 italic bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {t('vendorTourForms.tourForm.fields.guides.empty')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(currentUser.guides || []).map((guide) => {
                  const key = getGuideKey(guide);
                  const isSelected = tourGuideIds.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTourGuideIds(prev => isSelected ? prev.filter(id => id !== key) : [...prev, key])}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                        isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      {guide.name || t('vendorTourForms.tourForm.fields.guides.unnamed')}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* GPX Track Uploader */}
          <div className="md:col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-extrabold text-slate-400 tracking-wide">{t('vendorTourForms.tourForm.fields.gpx.label')}</label>
              <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{t('vendorTourForms.tourForm.fields.gpx.badge')}</span>
            </div>
            {!tourGpxFileName ? (
              <div className="border border-dashed border-slate-350 rounded-lg p-4 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition cursor-pointer relative group">
                <input
                  type="file"
                  accept=".gpx,.kml"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleGpsFileUpload(file); }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition">{t('vendorTourForms.tourForm.fields.gpx.dropHint')}</p>
                  <p className="text-[10px] text-slate-400">{t('vendorTourForms.tourForm.fields.gpx.helpText')}</p>
                </div>
              </div>
            ) : (
              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-1.5 text-[10px] font-bold text-white bg-indigo-600 rounded animate-pulse">GPS</span>
                    <span className="text-xs font-bold text-indigo-950 truncate max-w-[200px]" title={tourGpxFileName}>{tourGpxFileName}</span>
                  </div>
                  <button type="button" onClick={() => { setTourGpxData(''); setTourGpxFileName(''); }} className="text-[10px] font-black text-red-600 hover:text-red-700 tracking-wide cursor-pointer transition">{t('vendorTourForms.tourForm.fields.gpx.remove')}</button>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.description.label')}</label>
            <textarea
              required
              rows={4}
              value={tourDescription}
              onChange={(e) => setTourDescription(e.target.value)}
              placeholder={t('vendorTourForms.tourForm.fields.description.placeholder')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div className="md:col-span-2 space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-450 tracking-wide">{t('vendorTourForms.tourForm.fields.media.label')}</label>
              <span className="text-[9px] text-slate-400 font-semibold">{t('vendorTourForms.tourForm.fields.media.coverHint')}</span>
            </div>
            <div className="relative">
              <input type="file" multiple accept="image/*,video/*" onChange={handleMediaFilesChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className={`w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed rounded-xl text-xs flex items-center justify-center gap-2 text-emerald-800 font-bold transition ${fieldErrors.media ? 'border-red-500 ring-1 ring-red-300' : 'border-emerald-300 hover:border-emerald-500'}`}>
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>{t('vendorTourForms.tourForm.fields.media.selectButton')}</span>
              </div>
            </div>
            {fieldErrors.media && <p className="text-[10px] font-semibold text-red-600">⚠️ {t('vendorTourForms.tourForm.fields.media.error')}</p>}

            {(tourImages.length > 0 || tourVideos.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tourImages.map((img, idx) => {
                  const isCover = img === tourImage;
                  return (
                    <div key={`img-${idx}`} className={`relative rounded-xl overflow-hidden border shadow-xs h-24 w-32 flex-shrink-0 group ${isCover ? 'border-emerald-500 ring-2 ring-emerald-400' : 'border-slate-200'}`}>
                      <img src={img || undefined} alt={`Gallery Preview ${idx}`} className="h-full w-full object-cover" />
                      {isCover ? (
                        <div className="absolute bottom-1 left-1 right-1 bg-emerald-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded flex items-center justify-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>{t('vendorTourForms.tourForm.fields.media.coverBadge')}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setTourImage(img)}
                          className="absolute bottom-1 left-1 right-1 bg-slate-900/80 hover:bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded transition opacity-0 group-hover:opacity-100"
                        >
                          {t('vendorTourForms.tourForm.fields.media.makeCover')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setTourImages(prev => prev.filter((_, i) => i !== idx));
                          if (isCover) setTourImage('');
                        }}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-0.5 rounded-full shadow-xs transition cursor-pointer z-10"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
                {tourVideos.map((vid, idx) => (
                  <div key={`vid-${idx}`} className="relative rounded-xl overflow-hidden border border-slate-200 shadow-xs h-24 w-32 flex-shrink-0 group bg-black">
                    <video src={vid || undefined} className="h-full w-full object-contain" muted playsInline />
                    <div className="absolute bottom-1 left-1 bg-slate-900/80 text-white font-bold text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                      <span>{t('vendorTourForms.tourForm.fields.media.videoBadge')}</span>
                    </div>
                    <button type="button" onClick={() => setTourVideos(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-0.5 rounded-full shadow-xs transition cursor-pointer z-10">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {tourImages.length === 0 && tourVideos.length === 0 && (
              <p className="text-[10px] text-slate-400 italic">{t('vendorTourForms.tourForm.fields.media.empty')}</p>
            )}
          </div>
        </div>
        )}

        {currentStep === 3 && (
        <div className="space-y-5">
          <div className="bg-primary-50/60 p-4 rounded-xl border border-emerald-100 space-y-3">
            <h4 className="text-[10px] font-extrabold text-emerald-800 tracking-widest">{t('vendorTourForms.tourForm.pricingSection.heading')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:max-w-4xl">
              <div>
                <label className="flex items-end min-h-[30px] mb-1 text-[11px] font-bold text-slate-500 tracking-wide leading-tight">{t('vendorTourForms.tourForm.fields.price.label')}</label>
                <input type="number" min="1" required value={tourPrice} onChange={handleNumberInput(setTourPrice)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800" />
              </div>
              <div>
                <label className="flex items-end min-h-[30px] mb-1 text-[11px] font-bold text-slate-500 tracking-wide leading-tight">{t('vendorTourForms.tourForm.fields.capacity.label')}</label>
                <input type="number" min="1" max="200" required value={tourCapacity} onChange={handleNumberInput(setTourCapacity)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800" />
                <p className="text-[9px] text-slate-400 mt-1">{t('vendorTourForms.tourForm.fields.capacity.hint')}</p>
              </div>
              <div>
                <label className="flex items-end min-h-[30px] mb-1 text-[11px] font-bold text-rose-600 tracking-wide leading-tight">{t('vendorTourForms.tourForm.fields.discountPrice.label')}</label>
                <input type="number" min="0" placeholder={t('vendorTourForms.tourForm.fields.discountPrice.placeholder')} value={tourDiscountPrice} onChange={(e) => setTourDiscountPrice(e.target.value)} className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg text-xs font-bold text-rose-700 placeholder-rose-300" />
              </div>
              <div>
                <label className="flex items-end min-h-[30px] mb-1 text-[11px] font-bold text-slate-500 tracking-wide leading-tight">{t('vendorTourForms.tourForm.fields.cancellationHours.label')}</label>
                <select value={tourCancellationHours} onChange={(e) => setTourCancellationHours(Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                  <option value={24}>{t('vendorTourForms.tourForm.fields.cancellationHours.option24')}</option>
                  <option value={48}>{t('vendorTourForms.tourForm.fields.cancellationHours.option48')}</option>
                  <option value={72}>{t('vendorTourForms.tourForm.fields.cancellationHours.option72')}</option>
                  <option value={0}>{t('vendorTourForms.tourForm.fields.cancellationHours.optionNone')}</option>
                </select>
              </div>
              <div>
                <label className="flex items-end min-h-[30px] mb-1 text-[11px] font-bold text-amber-600 tracking-wide leading-tight">{t('vendorTourForms.tourForm.fields.rating.label')}</label>
                <input type="number" min="1" max="5" step="0.1" placeholder={t('vendorTourForms.tourForm.fields.rating.placeholder')} value={tourRating} onChange={handleNumberInput(setTourRating)} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-bold text-amber-800 placeholder-amber-300" />
                <p className="text-[9px] text-slate-400 mt-1">{t('vendorTourForms.tourForm.fields.rating.hint')}</p>
              </div>
            </div>
            <MultiDateCalendar selectedDates={selectedDates} onChange={setSelectedDates} />
            {selectedDates.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 tracking-wide">{t('vendorTourForms.tourForm.fields.perDateCapacity.label')}</label>
                <p className="text-[9px] text-slate-400 -mt-0.5">{t('vendorTourForms.tourForm.fields.perDateCapacity.hint')}</p>
                <div className="space-y-1.5">
                  {[...selectedDates].sort((a, b) => a.getTime() - b.getTime()).map((date) => {
                    const iso = toIsoDate(date);
                    const existing = existingSlotByDate.get(iso);
                    const totalValue = slotCapacities[iso] ?? tourCapacity;
                    const remainingValue = slotRemaining[iso] ?? '';
                    const totalNum = Number(totalValue) || 0;
                    const remainingNum = remainingValue === '' ? totalNum : Number(remainingValue);
                    const takenNum = Math.min(totalNum, Math.max(0, totalNum - remainingNum));
                    const overbooked = remainingNum > totalNum;
                    return (
                      <div key={iso} className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <span className="text-[11px] font-bold text-slate-600 flex-shrink-0 w-24">📅 {iso}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-500">{t('vendorTourForms.tourForm.fields.perDateCapacity.totalLabel')}</span>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={totalValue}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setSlotCapacities((prev) => ({ ...prev, [iso]: raw === '' ? '' : Number(raw) }));
                            }}
                            className="w-16 px-2 py-1 border border-slate-200 rounded text-xs font-bold text-slate-800"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-500">{t('vendorTourForms.tourForm.fields.perDateCapacity.remainingLabel')}</span>
                          <input
                            type="number"
                            min="0"
                            max={totalNum || undefined}
                            value={remainingValue}
                            placeholder={String(totalNum)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setSlotRemaining((prev) => ({ ...prev, [iso]: raw === '' ? '' : Number(raw) }));
                            }}
                            className={`w-16 px-2 py-1 border rounded text-xs font-bold ${overbooked ? 'border-red-400 text-red-600' : 'border-slate-200 text-slate-800'}`}
                          />
                        </div>
                        {overbooked ? (
                          <span className="text-[10px] font-semibold text-red-500">{t('vendorTourForms.tourForm.fields.perDateCapacity.overbooked')}</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">
                            {t('vendorTourForms.tourForm.fields.perDateCapacity.taken', { taken: takenNum })}
                          </span>
                        )}
                        {!existing && (
                          <span className="text-[10px] font-semibold text-emerald-500">{t('vendorTourForms.tourForm.fields.perDateCapacity.newBadge')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {tourCategory === 'active' && (
              <div>
                <label className="block text-[11px] font-bold text-emerald-700 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.scheduleFrequency.label')}</label>
                <select value={tourScheduleFrequency} onChange={(e) => setTourScheduleFrequency(e.target.value)} className="w-full sm:w-64 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
                  <option value="one-time">{t('vendorTourForms.tourForm.fields.scheduleFrequency.oneTime')}</option>
                  <option value="daily">{t('vendorTourForms.tourForm.fields.scheduleFrequency.daily')}</option>
                  <option value="every-weekend">{t('vendorTourForms.tourForm.fields.scheduleFrequency.everyWeekend')}</option>
                </select>
              </div>
            )}
          </div>

          <DynamicStringListInput
            label={t('vendorTourForms.tourForm.fields.includes.label')}
            items={tourIncludes}
            onChange={(items) => { setTourIncludes(items); clearFieldError('includes'); }}
            placeholder={t('vendorTourForms.tourForm.fields.includes.placeholder')}
            error={fieldErrors.includes}
          />
          <DynamicStringListInput
            label={t('vendorTourForms.tourForm.fields.notIncluded.label')}
            items={tourNotIncluded}
            onChange={(items) => { setTourNotIncluded(items); clearFieldError('notIncluded'); }}
            placeholder={t('vendorTourForms.tourForm.fields.notIncluded.placeholder')}
            accent="red"
            error={fieldErrors.notIncluded}
          />

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorTourForms.tourForm.fields.highlights.label')}</label>
            <input
              type="text"
              value={tourHighlights}
              onChange={(e) => { setTourHighlights(e.target.value); clearFieldError('highlights'); }}
              placeholder={t('vendorTourForms.tourForm.fields.highlights.placeholder')}
              className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs text-slate-800 ${fieldErrors.highlights ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-200'}`}
            />
            {fieldErrors.highlights && <p className="text-[10px] font-semibold text-red-600 mt-1">⚠️ {t('vendorTourForms.tourForm.fields.highlights.error')}</p>}
          </div>

          <InquiryQuestionsEditor questions={tourInquiryQuestions} onChange={setTourInquiryQuestions} />
        </div>
        )}

        {isEditMode && tour && (
          <TourDangerZone
            isActive={tourIsActive}
            onToggleActive={() => setTourIsActive(!tourIsActive)}
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

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={goToPrevStep}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
            >
              {t('vendorTourForms.tourForm.buttons.back')}
            </button>
          )}

          <button
            type="submit"
            disabled={isSavingForm}
            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {currentStep < 3 ? (
              <>{t('vendorTourForms.tourForm.buttons.next')}</>
            ) : (
              <>
                {isEditMode && <Check className="w-3.5 h-3.5" />}
                {isSavingForm ? t('vendorTourForms.tourForm.buttons.submitting') : isEditMode ? t('vendorTourForms.tourForm.buttons.saveChanges') : (tourCategory === 'active' ? t('vendorTourForms.tourForm.buttons.submitActiveEvent') : t('vendorTourForms.tourForm.buttons.submitStandardTour'))}
              </>
            )}
          </button>

          {currentStep === 1 && (
            <button type="button" onClick={onNavigateBack} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer">
              {t('vendorTourForms.tourForm.buttons.cancel')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}