import React, { useState, useEffect } from 'react';
import { Tour, TourSlot, User, Guide } from '../../types';
import { parseGpsFile } from '../../utils/gpxParser';
import { Plus, X, Check } from 'lucide-react';
import { DynamicStringListInput } from './DynamicStringListInput';
import { MEETING_POINTS } from '../../data/meetingPoints';
import { MultiDateCalendar, toIsoDate } from './MultiDateCalendar';
import { TourDangerZone } from './TourDangerZone';

// Older guides saved before Guide.id existed have no stable identifier — fall back to their
// name so tour-guide assignment still works for pre-existing profile data.
const getGuideKey = (guide: Guide): string => guide.id || guide.name;

const FORM_STEPS = [
  { number: 1 as const, label: 'Əsas Məlumatlar' },
  { number: 2 as const, label: 'Logistika və Proqram' },
  { number: 3 as const, label: 'Qiymət və Qaydalar' },
];

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
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onNavigateBack: () => void;
}

// Unified create/edit form for domestic (peak/camp/hiking/active) tours. Same component is
// used from VendorPortal's "add-tour" tab (tour=null) and from the edit modal (tour set) —
// only the Danger Zone is mode-specific.
export function TourForm({ currentUser, tour, slots, category: tourCategory, onCategoryChange: setTourCategory, onAddTour, onEditTour, onDeleteTour, onAddSlot, onDeleteSlot, onShowNotification, onNavigateBack }: TourFormProps) {
  const isEditMode = !!tour;

  // Number inputs are bound to `number | ''` state (not plain `number`) so the field can be
  // fully cleared: clearing the input sets state to '' instead of forcing a "0" back into the
  // box. Number(tourX || 0)-style fallbacks elsewhere already treat '' like a missing value.
  const handleNumberInput = (setter: (v: number | '') => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setter(raw === '' ? '' : Number(raw));
  };

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
  const [dateTimeError, setDateTimeError] = useState<string | null>(null);
  const [tourBringItems, setTourBringItems] = useState<string[]>([]);
  const [tourNotAllowedItems, setTourNotAllowedItems] = useState<string[]>([]);
  const [tourImage, setTourImage] = useState<string>('');
  const [tourImages, setTourImages] = useState<string[]>([]);
  const [tourVideos, setTourVideos] = useState<string[]>([]);
  const [tourWhatsApp, setTourWhatsApp] = useState<string>('');
  const [tourPrice, setTourPrice] = useState<number | ''>(35);
  const [tourDiscountPrice, setTourDiscountPrice] = useState<string>('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [tourGpxData, setTourGpxData] = useState<string>('');
  const [tourGpxFileName, setTourGpxFileName] = useState<string>('');
  const [tourIsActive, setTourIsActive] = useState<boolean>(true);

  // Active Lifestyle specifics
  const [tourActivityType, setTourActivityType] = useState<string>('volleyball');
  const [tourActiveDifficulty, setTourActiveDifficulty] = useState<string>('medium');
  const [tourAgeLimit, setTourAgeLimit] = useState<string>('18-45 yaş');
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

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const goToNextStep = () => setCurrentStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  const goToPrevStep = () => setCurrentStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));

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
      if (!tourLanguages.trim()) missing.push({ key: 'languages', label: 'Danışılan dillər' });
      if (tourBringItems.filter(Boolean).length === 0) missing.push({ key: 'bringItems', label: 'Özünüzlə gətirin' });
    } else if (step === 2) {
      if (tourImages.length === 0) missing.push({ key: 'media', label: 'Media (ən azı 1 şəkil)' });
    } else if (step === 3) {
      if (tourIncludes.filter(Boolean).length === 0) missing.push({ key: 'includes', label: 'Qiymətə daxildir' });
      if (tourNotIncluded.filter(Boolean).length === 0) missing.push({ key: 'notIncluded', label: 'Qiymətə daxil deyil' });
      if (!tourHighlights.trim()) missing.push({ key: 'highlights', label: 'Önə çıxanlar' });
    }
    return missing;
  };

  const validateStepAndNotify = (step: 1 | 2 | 3): boolean => {
    const missing = getMissingFieldsForStep(step);
    if (missing.length === 0) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        for (const key of ['languages', 'bringItems', 'media', 'includes', 'notIncluded', 'highlights']) delete next[key];
        return next;
      });
      return true;
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const { key } of missing) next[key] = true;
      return next;
    });
    const message = `Zəhmət olmasa bu xanaları doldurun: ${missing.map((m) => m.label).join(', ')}.`;
    if (onShowNotification) onShowNotification(message, 'error');
    else alert(message);
    return false;
  };

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
      setDateTimeError('Dönüş tarixi çıxış tarixindən sonra olmalıdır.');
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
    setTourImage(tour.image || '');
    // Legacy tours may have a cover (`image`) that isn't part of the gallery array yet —
    // fold it in so the cover badge has something to highlight in the unified media grid.
    const existingGallery = tour.images || [];
    setTourImages(tour.image && !existingGallery.includes(tour.image) ? [tour.image, ...existingGallery] : existingGallery);
    setTourVideos(tour.videos || []);
    setTourWhatsApp(tour.whatsapp_number || currentUser.whatsapp_number || currentUser.phone || '');
    setTourGpxData(tour.gpxData || '');
    setTourGpxFileName(tour.gpxFileName || '');
    setTourIsActive(tour.isActive !== false);
    setTourCategory(tour.category as any);

    setTourActivityType(tour.activityType || 'volleyball');
    setTourActiveDifficulty(tour.activeDifficulty || 'medium');
    setTourAgeLimit(tour.ageLimit || '18-45 yaş');
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

    const tourSlots = slots.filter(s => s.tourId === tour.id);
    setSelectedDates(tourSlots.map(s => new Date(s.startDate)));
    setTourPrice(tour.price !== undefined ? tour.price : (tourSlots.length > 0 ? tourSlots[0].price : 35));
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
      if (onShowNotification) {
        onShowNotification('Zəhmət olmasa bütün məcburi xanaları doldurun.', 'error');
      } else {
        alert('Zəhmət olmasa bütün məcburi xanaları doldurun.');
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
      isActive: tourIsActive,
      isActiveLife: tourCategory === 'active',
      activityType: tourCategory === 'active' ? tourActivityType : undefined,
      activeDifficulty: tourCategory === 'active' ? (tourActiveDifficulty as 'beginner' | 'medium' | 'professional') : undefined,
      ageLimit: tourCategory === 'active' ? tourAgeLimit : undefined,
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
    };

    setIsSavingForm(true);
    setFormSubmitError(null);
    try {
      let tourId: string;
      if (isEditMode && tour) {
        const changes: string[] = [];
        if (tour.name !== tourName) changes.push(`Ad (${tour.name} ➡️ ${tourName})`);
        if ((tour.isActive !== false) !== tourIsActive) {
          changes.push(`Status (${(tour.isActive !== false) ? 'Aktiv' : 'Deaktiv'} ➡️ ${tourIsActive ? 'Aktiv' : 'Deaktiv'})`);
        }
        if (tour.image !== tourImage) changes.push('Kover Şəkil dəyişdi 🖼️');
        const lastChangeLog = changes.length > 0 ? changes.join(' | ') : 'Xırda düzəlişlər';

        const updatedTour: Tour = { ...tour, ...sharedFields, lastChangeLog };
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
          rating: 0, // Real average will accumulate from customer reviews once payment verification ships — no more vendor/back-office self-assigned stars
          reviewsCount: 0,
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
        if (!existingByDate.has(iso)) {
          await onAddSlot({
            id: 'slot-' + Math.floor(Math.random() * 90000 + 10000),
            tourId,
            startDate: iso,
            endDate: iso,
            price: Number(tourPrice || 35),
            capacity: 20,
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
      setFormSubmitError(err?.message || 'Tur yadda saxlanılarkən xəta baş verdi.');
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
          onShowNotification(`🎉 GPX/KML marşrut xəritəsi uğurla yükləndi! (${parsed.stats.distanceKm} km, Yüksəklik: +${parsed.stats.elevationGainM}m)`, 'success');
        }
      } catch (err: any) {
        if (onShowNotification) onShowNotification(`❌ Fayl oxunarkən xəta: ${err.message || 'Format dəstəklənmir'}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  // Unified media dropzone: routes each dropped/selected file into the images or videos
  // gallery based on its MIME type. Replaces the old three separate upload fields
  // (cover photo / gallery photos / gallery videos).
  const handleMediaFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allFiles: File[] = Array.from(files);
    const imageFiles = allFiles.filter((f) => f.type.startsWith('image/'));
    const videoFiles = allFiles.filter((f) => f.type.startsWith('video/'));
    const readAsDataUrl = (file: File) => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    if (imageFiles.length > 0) {
      Promise.all(imageFiles.map(readAsDataUrl)).then(base64s => {
        setTourImages(prev => {
          const next = [...prev, ...base64s];
          // First images ever added automatically become the cover photo.
          if (!tourImage && next.length > 0) setTourImage(next[0]);
          return next;
        });
        clearFieldError('media');
      });
    }
    if (videoFiles.length > 0) {
      Promise.all(videoFiles.map(readAsDataUrl)).then(base64s => {
        setTourVideos(prev => [...prev, ...base64s]);
      });
    }
    if (onShowNotification && (imageFiles.length > 0 || videoFiles.length > 0)) {
      const parts: string[] = [];
      if (imageFiles.length > 0) parts.push(`${imageFiles.length} şəkil`);
      if (videoFiles.length > 0) parts.push(`${videoFiles.length} video`);
      onShowNotification(`${parts.join(' və ')} qalereyaya əlavə edildi! 📸🎥`, 'success');
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleTourSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <span className="text-[10px] tracking-widest text-slate-400 font-bold block mb-1">
            {isEditMode ? 'Tur Reqlamentini Yeniləyin' : (tourCategory === 'active' ? 'Yeni Aktiv Həyat Tədbiri' : 'Yeni Marşrut')}
          </span>
          <h3 className="font-extrabold text-slate-900 text-sm">
            {isEditMode ? 'Marşrut bələdçisi, kateqoriyası və ətraflı rekvizitlərinə düzəliş edin' : (tourCategory === 'active' ? 'Aktiv həyat tərzi və idman tədbiri yaradın' : 'Azərbaycan daxili yeni tur paradiqması tərtib edin')}
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
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Turun Başlığı:</label>
            <input
              type="text"
              required
              value={tourName}
              onChange={(e) => setTourName(e.target.value)}
              placeholder="Məsələn: Sulut zirvə yürüşü"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Regionlar və Nöqtələr:</label>
            <input
              type="text"
              required
              value={tourRegion}
              onChange={(e) => setTourRegion(e.target.value)}
              placeholder="Məsələn: İsmayıllı (Sulut kəndi)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Kateqoriya:</label>
            <select
              value={tourCategory}
              onChange={(e) => setTourCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="hiking">🥾 Hiking (Yürüş, gəzinti)</option>
              <option value="peak">🏔️ Zirvə Turları (Alpinizm)</option>
              <option value="camp">⛺ Camp Turları (Düşərgə)</option>
              <option value="active">🏃‍♂️ Aktiv Həyat (İdman və Macəra)</option>
            </select>
          </div>

          {tourCategory !== 'active' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Çətinlik dərəcəsi:</label>
              <select
                value={tourDifficulty}
                onChange={(e) => setTourDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value="easy">Asan (Yorucu olmayan təbiət yürüşü)</option>
                <option value="medium">Orta (Kanyon və azdere yürüşləri)</option>
                <option value="hard">Çətin (Dik aşırımlar)</option>
                <option value="extreme">Ekstremal (Yüksək dağlıq yürüşlər)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Müddət (Gün):</label>
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
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Danışılan dillər (Vergüllə ayırın):</label>
            <input
              type="text"
              value={tourLanguages}
              onChange={(e) => { setTourLanguages(e.target.value); clearFieldError('languages'); }}
              placeholder="Azərbaycanca, Rusca, İngiliscə"
              className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs text-slate-800 ${fieldErrors.languages ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-200'}`}
            />
            {fieldErrors.languages && <p className="text-[10px] font-semibold text-red-600 mt-1">⚠️ Ən azı bir dil qeyd edin.</p>}
          </div>

          {tourCategory === 'active' && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-xs">
              <div className="md:col-span-2 pb-2 mb-2 border-b border-amber-200">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 tracking-wider">🏅 AKTİV HƏYAT VƏ MACƏRA PARAMETRLƏRİ</h4>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">İdman / Fəaliyyət Növü:</label>
                <select value={tourActivityType} onChange={(e) => setTourActivityType(e.target.value)} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-slate-700">
                  <option value="volleyball">🏐 Voleybol</option>
                  <option value="running">🏃‍♂️ Qaçış (Marafon)</option>
                  <option value="ski">⛷️ Xizək</option>
                  <option value="rafting">🚣‍♂️ Rafting</option>
                  <option value="bike">🚴‍♂️ Velosiped</option>
                  <option value="canyon">🧗‍♂️ Kanyoninq</option>
                  <option value="other">🏆 Digər İdmanlar</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">Fiziki Hazırlıq (Çətinlik):</label>
                <select value={tourActiveDifficulty} onChange={(e) => setTourActiveDifficulty(e.target.value)} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-slate-700">
                  <option value="beginner">🟢 Başlanğıc (Hər kəs qatıla bilər)</option>
                  <option value="medium">🟡 Orta (Fiziki aktiv insanlar)</option>
                  <option value="professional">🔴 Professional (Peşəkar idmançılar)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">Yaş Limiti:</label>
                <input type="text" value={tourAgeLimit} onChange={(e) => setTourAgeLimit(e.target.value)} placeholder="Məs: 18-45 yaş" className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">Zəruri Avadanlıqlar (Təchizat Siyahısı):</label>
                <textarea rows={2} value={tourRequiredEquipment} onChange={(e) => setTourRequiredEquipment(e.target.value)} placeholder="Məs: Xizək dəsti, kaska, əlcək..." className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="optAvt" checked={tourEquipmentIncluded} onChange={(e) => setTourEquipmentIncluded(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
                <label htmlFor="optAvt" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">✅ Avadanlıqlar bilet qiymətinə daxildir</label>
              </div>
              {!tourEquipmentIncluded ? (
                <div>
                  <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">Kirayə Haqqı (+AZN):</label>
                  <input type="number" min="0" value={tourEquipmentRentalPrice} onChange={handleNumberInput(setTourEquipmentRentalPrice)} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs" placeholder="Məs: 15 AZN" />
                </div>
              ) : <div />}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="optTeam" checked={tourAllowTeamRegistration} onChange={(e) => setTourAllowTeamRegistration(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
                <label htmlFor="optTeam" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">👥 Komanda qeydiyyatına izn verilsin</label>
              </div>
              <div className="md:col-span-2 mt-2">
                <label className="block text-[11px] font-bold text-rose-700 tracking-wide mb-1">Təhlükəsizlik və Tibbi Təlimat:</label>
                <textarea rows={3} value={tourSafetyInstructions} onChange={(e) => setTourSafetyInstructions(e.target.value)} placeholder="Macəra idmanının risklərini bura yazın..." className="w-full px-3 py-2 bg-white border border-rose-300 ring-1 ring-rose-100 rounded-lg text-xs" />
              </div>
            </div>
          )}

          <div>
            <DynamicStringListInput
              label="Özünüzlə gətirin:"
              items={tourBringItems}
              onChange={(items) => { setTourBringItems(items); clearFieldError('bringItems'); }}
              placeholder="Məs: Rahat ayaqqabı, Pasport"
              error={fieldErrors.bringItems}
            />
          </div>
          <div>
            <DynamicStringListInput
              label="İcazə verilmir:"
              items={tourNotAllowedItems}
              onChange={setTourNotAllowedItems}
              placeholder="Məs: Böyük çamadanlar"
              accent="red"
            />
          </div>
        </div>
        )}

        {currentStep === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Görüş Yeri:</label>
            <select
              value={tourMeetingPoint}
              onChange={(e) => {
                const selected = MEETING_POINTS.find((p) => p.name === e.target.value);
                setTourMeetingPoint(selected?.name || '');
                setTourMeetingPointEmbedUrl(selected?.embedUrl || '');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="">— Görüş yeri seçin —</option>
              {MEETING_POINTS.map((point) => (
                <option key={point.name} value={point.name}>{point.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">WhatsApp Bələdçi Nömrəsi:</label>
            <input type="tel" required value={tourWhatsApp} onChange={(e) => setTourWhatsApp(e.target.value)} placeholder="Məs: +994 XX XXX XX XX" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-bold" />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Çıxış tarixi və saatı:</label>
            <input
              type="datetime-local"
              value={tourDepartureDateTime}
              onChange={(e) => setTourDepartureDateTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Bakıya dönüş tarixi və saatı:</label>
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

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">
              Tam müddət (saat){tourDepartureDateTime && tourReturnDateTime ? ' — avtomatik hesablanır' : ''}:
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
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Bu tur üçün bələdçilər:</label>
            {(currentUser.guides || []).length === 0 ? (
              <p className="text-[10px] text-slate-400 italic bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                Hələ profilinizə bələdçi əlavə etməmisiniz. Əvvəlcə "Profil Məlumatları" bölməsindən bələdçi əlavə edin, sonra buradan bu tura təyin edə bilərsiniz.
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
                      {guide.name || 'Adsız bələdçi'}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* GPX Track Uploader */}
          <div className="md:col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-extrabold text-slate-400 tracking-wide">GPS Marşrut Faylı (GPX və ya KML)</label>
              <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">3D XƏRİTƏ VİZUALİZASİYASI ⛰️</span>
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
                  <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition">Bura klikləyin və ya GPX / KML faylını dartın</p>
                  <p className="text-[10px] text-slate-400">Operator GPX trek faylı yüklədikdə müştərilərə 3D hündürlük və real trek xəritəsi göstərilir</p>
                </div>
              </div>
            ) : (
              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-1.5 text-[10px] font-bold text-white bg-indigo-600 rounded animate-pulse">GPS</span>
                    <span className="text-xs font-bold text-indigo-950 truncate max-w-[200px]" title={tourGpxFileName}>{tourGpxFileName}</span>
                  </div>
                  <button type="button" onClick={() => { setTourGpxData(''); setTourGpxFileName(''); }} className="text-[10px] font-black text-red-600 hover:text-red-700 tracking-wide cursor-pointer transition">Sil ✕</button>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Əhatəli marşrut planı və açıqlama:</label>
            <textarea
              required
              rows={4}
              value={tourDescription}
              onChange={(e) => setTourDescription(e.target.value)}
              placeholder="Tur iştirakçılarını hansı inanılmaz fəaliyyətlər gözləyir?"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div className="md:col-span-2 space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-450 tracking-wide">Media Qalereyası (ən azı 1 şəkil məcburidir):</label>
              <span className="text-[9px] text-slate-400 font-semibold">Şəkillərdən birini "Ana səhifə şəkli" et</span>
            </div>
            <div className="relative">
              <input type="file" multiple accept="image/*,video/*" onChange={handleMediaFilesChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className={`w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed rounded-xl text-xs flex items-center justify-center gap-2 text-emerald-800 font-bold transition ${fieldErrors.media ? 'border-red-500 ring-1 ring-red-300' : 'border-emerald-300 hover:border-emerald-500'}`}>
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Cihazdan şəkil və ya video seçin (Multi-upload) 📁📸🎥</span>
              </div>
            </div>
            {fieldErrors.media && <p className="text-[10px] font-semibold text-red-600">⚠️ Ən azı 1 şəkil əlavə edin.</p>}

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
                          <span>ƏSAS ŞƏKİL</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setTourImage(img)}
                          className="absolute bottom-1 left-1 right-1 bg-slate-900/80 hover:bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded transition opacity-0 group-hover:opacity-100"
                        >
                          Ana səhifə şəkli et
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
                      <span>VİDEO</span>
                    </div>
                    <button type="button" onClick={() => setTourVideos(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-0.5 rounded-full shadow-xs transition cursor-pointer z-10">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {tourImages.length === 0 && tourVideos.length === 0 && (
              <p className="text-[10px] text-slate-400 italic">Hələ heç bir media əlavə edilməyib.</p>
            )}
          </div>
        </div>
        )}

        {currentStep === 3 && (
        <div className="space-y-5">
          <div className="bg-primary-50/60 p-4 rounded-xl border border-emerald-100 space-y-3">
            <h4 className="text-[10px] font-extrabold text-emerald-800 tracking-widest">📅 Aktiv Olacağı Günlər və Bilet Qiyməti</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:max-w-2xl">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 tracking-wide mb-1">Qiymət (AZN):</label>
                <input type="number" min="1" required value={tourPrice} onChange={handleNumberInput(setTourPrice)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-rose-600 tracking-wide mb-1">Endirimli Qiymət (opsional):</label>
                <input type="number" min="0" placeholder="Məs: 25" value={tourDiscountPrice} onChange={(e) => setTourDiscountPrice(e.target.value)} className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg text-xs font-bold text-rose-700 placeholder-rose-300" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 tracking-wide mb-1">Ləğv qaydası:</label>
                <select value={tourCancellationHours} onChange={(e) => setTourCancellationHours(Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                  <option value={24}>24 saat</option>
                  <option value={48}>48 saat</option>
                  <option value={72}>72 saat</option>
                  <option value={0}>Ləğv edilmir</option>
                </select>
              </div>
            </div>
            <MultiDateCalendar selectedDates={selectedDates} onChange={setSelectedDates} />
            {tourCategory === 'active' && (
              <div>
                <label className="block text-[11px] font-bold text-emerald-700 tracking-wide mb-1">Tədbirin Planlaması:</label>
                <select value={tourScheduleFrequency} onChange={(e) => setTourScheduleFrequency(e.target.value)} className="w-full sm:w-64 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
                  <option value="one-time">Bir dəfəlik (Göstərilən tarixlərdə)</option>
                  <option value="daily">Hər gün (Mütəmadi)</option>
                  <option value="every-weekend">Hər həftəsonu (Şənbə və Bazar)</option>
                </select>
              </div>
            )}
          </div>

          <DynamicStringListInput
            label="Qiymətə daxildir:"
            items={tourIncludes}
            onChange={(items) => { setTourIncludes(items); clearFieldError('includes'); }}
            placeholder="Məs: Səhər yeməyi, Giriş bileti, Professional Bələdçi"
            error={fieldErrors.includes}
          />
          <DynamicStringListInput
            label="Qiymətə daxil deyil:"
            items={tourNotIncluded}
            onChange={(items) => { setTourNotIncluded(items); clearFieldError('notIncluded'); }}
            placeholder="Məs: Şəxsi xərclər, Nahar"
            accent="red"
            error={fieldErrors.notIncluded}
          />

          <div>
            <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Önə çıxanlar (Vergüllə ayırın):</label>
            <input
              type="text"
              value={tourHighlights}
              onChange={(e) => { setTourHighlights(e.target.value); clearFieldError('highlights'); }}
              placeholder="Məs: Panoram mənzərəli marşrut"
              className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs text-slate-800 ${fieldErrors.highlights ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-200'}`}
            />
            {fieldErrors.highlights && <p className="text-[10px] font-semibold text-red-600 mt-1">⚠️ Ən azı bir xüsusiyyət qeyd edin.</p>}
          </div>
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

        <div className="flex items-center gap-3">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={goToPrevStep}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
            >
              ← Geri
            </button>
          )}

          <button
            type="submit"
            disabled={isSavingForm}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {currentStep < 3 ? (
              <>İrəli →</>
            ) : (
              <>
                {isEditMode && <Check className="w-3.5 h-3.5" />}
                {isSavingForm ? 'Göndərilir...' : isEditMode ? 'Dəyişiklikləri Saxla' : (tourCategory === 'active' ? 'Tədbiri Platformaya Göndər' : 'Marşrutu Platformaya Göndər')}
              </>
            )}
          </button>

          {currentStep === 1 && (
            <button type="button" onClick={onNavigateBack} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer">
              Ləğv et
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
