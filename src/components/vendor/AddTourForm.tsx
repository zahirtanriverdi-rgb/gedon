import React, { useState } from 'react';
import { Tour, TourSlot, User } from '../../types';
import { parseGpsFile } from '../../utils/gpxParser';
import { Plus, Sparkles, Instagram, X } from 'lucide-react';

interface AddTourFormProps {
  currentUser: User;
  category: 'peak' | 'camp' | 'hiking' | 'active';
  onCategoryChange: (category: 'peak' | 'camp' | 'hiking' | 'active') => void;
  onAddTour: (newTour: Tour) => Promise<void>;
  onAddSlot: (newSlot: TourSlot) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onNavigateBack: () => void;
}

export function AddTourForm({ currentUser, category: newTourCategory, onCategoryChange: setNewTourCategory, onAddTour, onAddSlot, onShowNotification, onNavigateBack }: AddTourFormProps) {
  const [newTourName, setNewTourName] = useState<string>('');
  const [newTourDifficulty, setNewTourDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme'>('medium');
  const [newTourRegion, setNewTourRegion] = useState<string>('');
  const [newTourDays, setNewTourDays] = useState<number>(1);
  const [newTourDescription, setNewTourDescription] = useState<string>('');
  const [newTourIncludes, setNewTourIncludes] = useState<string>('Professional Bələdçi, Komfort Transit, Səhər yeməyi, Yol Sığortası');
  const [newTourImage, setNewTourImage] = useState<string>('');
  const [newTourImages, setNewTourImages] = useState<string[]>([]);
  const [newTourVideos, setNewTourVideos] = useState<string[]>([]);
  const [newTourWhatsApp, setNewTourWhatsApp] = useState<string>('+994706717804');
  const [newTourPrice, setNewTourPrice] = useState<number>(35);
  const [newTourStartDate, setNewTourStartDate] = useState<string>('');
  const [newTourEndDate, setNewTourEndDate] = useState<string>('');
  const [newTourGpxData, setNewTourGpxData] = useState<string>('');
  const [newTourGpxFileName, setNewTourGpxFileName] = useState<string>('');
  const [newTourRating, setNewTourRating] = useState<number>(5.0);
  
  // Active Lifestyle specifics
  const [newTourActivityType, setNewTourActivityType] = useState<string>('volleyball');
  const [newTourActiveDifficulty, setNewTourActiveDifficulty] = useState<string>('medium');
  const [newTourAgeLimit, setNewTourAgeLimit] = useState<string>('18-45 yaş');
  const [newTourMeetingPoint, setNewTourMeetingPoint] = useState<string>('');
  const [newTourRequiredEquipment, setNewTourRequiredEquipment] = useState<string>('');
  const [newTourEquipmentIncluded, setNewTourEquipmentIncluded] = useState<boolean>(true);
  const [newTourEquipmentRentalPrice, setNewTourEquipmentRentalPrice] = useState<number>(0);
  const [newTourSafetyInstructions, setNewTourSafetyInstructions] = useState<string>('');
  const [newTourAllowTeamRegistration, setNewTourAllowTeamRegistration] = useState<boolean>(true);
  const [newTourScheduleFrequency, setNewTourScheduleFrequency] = useState<string>('one-time');

  const [tourCreationMethod, setTourCreationMethod] = useState<'instagram' | 'manual'>('instagram');
  const [instagramUrl, setInstagramUrl] = useState<string>('');
  const [instagramCaption, setInstagramCaption] = useState<string>('');
  const [isParsingInstagram, setIsParsingInstagram] = useState<boolean>(false);
  const [parsingStep, setParsingStep] = useState<string>('');

  const [isSavingForm, setIsSavingForm] = useState(false);
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);

  const handleTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTourName || !newTourRegion || !newTourDescription) {
      if (onShowNotification) {
        onShowNotification('Zəhmət olmasa bütün məcburi xanaları doldurun.', 'error');
      } else {
        alert('Zəhmət olmasa bütün məcburi xanaları doldurun.');
      }
      return;
    }

    const defaultImg = newTourCategory === 'peak' 
      ? 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800' 
      : newTourCategory === 'camp' 
      ? 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800'
      : 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800';

    const cleanIncludes = newTourIncludes.split(',').map(s => s.trim()).filter(Boolean);

    const newTour: Tour = {
      id: 'tour-' + Math.floor(Math.random() * 90000 + 10000),
      name: newTourName,
      category: newTourCategory,
      difficulty: newTourDifficulty,
      description: newTourDescription,
      region: newTourRegion,
      durationDays: Number(newTourDays),
      includes: cleanIncludes.length > 0 ? cleanIncludes : ['Müşayiət bələdçisi'],
      vendorId: currentUser.id,
      vendorName: currentUser.name,
      image: newTourImage || defaultImg,
      images: newTourImages.length > 0 ? newTourImages : (newTourImage ? [newTourImage] : [defaultImg]),
      videos: newTourVideos,
      rating: newTourRating,
      reviewsCount: 0,
      isApproved: false, // Must be approved by admin panel first
      whatsapp_number: newTourWhatsApp || '+994706717804',
      gpxData: newTourGpxData || undefined,
      gpxFileName: newTourGpxFileName || undefined,
      
      // Active Lifestyle specifics
      isActiveLife: newTourCategory === 'active',
      activityType: newTourCategory === 'active' ? newTourActivityType : undefined,
      activeDifficulty: newTourCategory === 'active' ? (newTourActiveDifficulty as 'beginner' | 'medium' | 'professional') : undefined,
      ageLimit: newTourCategory === 'active' ? newTourAgeLimit : undefined,
      meetingPoint: newTourCategory === 'active' ? newTourMeetingPoint : undefined,
      requiredEquipment: newTourCategory === 'active' ? newTourRequiredEquipment : undefined,
      equipmentIncluded: newTourCategory === 'active' ? newTourEquipmentIncluded : undefined,
      equipmentRentalPrice: newTourCategory === 'active' ? newTourEquipmentRentalPrice : undefined,
      safetyInstructions: newTourCategory === 'active' ? newTourSafetyInstructions : undefined,
      allowTeamRegistration: newTourCategory === 'active' ? newTourAllowTeamRegistration : undefined,
      scheduleFrequency: newTourCategory === 'active' ? newTourScheduleFrequency : undefined,
    };

    setIsSavingForm(true);
    setFormSubmitError(null);
    try {
      await onAddTour(newTour);

      // If we have a startDate and price, automatically add the corresponding slot/date listing!
      if (newTourStartDate) {
        const newSlot: TourSlot = {
          id: 'slot-' + Math.floor(Math.random() * 90000 + 10000),
          tourId: newTour.id,
          startDate: newTourStartDate,
          endDate: newTourEndDate || newTourStartDate,
          price: Number(newTourPrice || 35),
          capacity: 20,
          bookedCount: 0
        };
        await onAddSlot(newSlot);
      }

      onNavigateBack();
      // Clear Form
      setNewTourName('');
      setNewTourRegion('');
      setNewTourDescription('');
      setNewTourPrice(35);
      setNewTourStartDate('');
      setNewTourEndDate('');
      setNewTourImage('');
      setNewTourImages([]);
      setNewTourGpxData('');
      setNewTourGpxFileName('');
      setNewTourActivityType('volleyball');
      setNewTourActiveDifficulty('medium');
      setNewTourAgeLimit('18-45 yaş');
      setNewTourMeetingPoint('');
      setNewTourRequiredEquipment('');
      setNewTourEquipmentIncluded(true);
      setNewTourEquipmentRentalPrice(0);
      setNewTourSafetyInstructions('');
      setNewTourAllowTeamRegistration(true);
    } catch (err: any) {
      setFormSubmitError(err?.message || 'Tur yaradılarkən xəta baş verdi.');
    } finally {
      setIsSavingForm(false);
    }
  };


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTourImage(reader.result as string);
        if (onShowNotification) {
          onShowNotification('Şəkil uğurla yükləndi və yadda saxlanıldı! 📸', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGpsFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseGpsFile(file.name, text);
        setNewTourGpxData(JSON.stringify(parsed));
        setNewTourGpxFileName(file.name);
        if (onShowNotification) {
          onShowNotification(`🎉 GPX/KML marşrut xəritəsi uğurla yükləndi! (${parsed.stats.distanceKm} km, Yüksəklik: +${parsed.stats.elevationGainM}m)`, 'success');
        }
      } catch (err: any) {
        if (onShowNotification) {
          onShowNotification(`❌ Fayl oxunarkən xəta: ${err.message || 'Format dəstəklənmir'}`, 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleMultipleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const promises = Array.from(files).map((file: File) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then(base64s => {
        setNewTourImages(prev => [...prev, ...base64s]);
        if (onShowNotification) {
          onShowNotification(`${base64s.length} şəkil qalerayaya əlavə edildi! 📸`, 'success');
        }
      });
    }
  };

  const handleMultipleVideosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const promises = Array.from(files).map((file: File) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then(base64s => {
        setNewTourVideos(prev => [...prev, ...base64s]);
        if (onShowNotification) {
          onShowNotification(`${base64s.length} video qalerayaya əlavə edildi! 🎥`, 'success');
        }
      });
    }
  };

  const handleParseInstagram = async () => {
    const captionText = instagramCaption.trim();
    if (!captionText) {
      if (onShowNotification) {
        onShowNotification('Zəhmət olmasa kopyalanan postun mətnini daxil edin.', 'warning');
      }
      return;
    }

    setIsParsingInstagram(true);
    setParsingStep('📖 Paylaşım mətni Gemini API vasitəsilə təhlil edilir...');

    try {
      // Fetch structured extraction results from our full-stack server backend
      const response = await fetch('/api/parse-caption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ caption: captionText })
      });

      if (!response.ok) {
        throw new Error('API serverindən səhv cavab alındı.');
      }

      const data = await response.json();

      setParsingStep('⚙️ Çıxarılan məlumatlar form xanalarına doldurulur...');

      // Fill in parsed data adhering strictly to the FIELD EXTRACTION RULES
      setNewTourName(data.tour_title || '');
      setNewTourRegion(data.location || '');

      // Standardize categorized mode from caption keywords
      let parsedCategory: 'hiking' | 'camp' | 'peak' = 'hiking';
      const combinedText = captionText.toLowerCase();
      if (combinedText.includes('camp') || combinedText.includes('kamp') || combinedText.includes('çadır') || combinedText.includes('cadir') || combinedText.includes('düşərgə') || combinedText.includes('duserge') || combinedText.includes('gecələmə') || combinedText.includes('geceleve')) {
        parsedCategory = 'camp';
      } else if (combinedText.includes('zirvə') || combinedText.includes('zirve') || combinedText.includes('peak') || combinedText.includes('alpinizm') || combinedText.includes('alpinist') || combinedText.includes('bazardüzü') || combinedText.includes('bazarduzu') || combinedText.includes('shakhdag') || combinedText.includes('şahdağ') || combinedText.includes('tufandag')) {
        parsedCategory = 'peak';
      }
      setNewTourCategory(parsedCategory);

      // Map strict difficulty values to matching React local state types
      let mappedDiff: 'easy' | 'medium' | 'hard' | 'extreme' = 'medium';
      if (data.difficulty === 'Asan' || data.difficulty === 'Asan-Orta') {
        mappedDiff = 'easy';
      } else if (data.difficulty === 'Orta') {
        mappedDiff = 'medium';
      } else if (data.difficulty === 'Çətin' || data.difficulty === 'Orta-Çətin') {
        mappedDiff = 'hard';
      }
      setNewTourDifficulty(mappedDiff);

      // Duration & Price
      const parsedDays = data.duration_days || 1;
      setNewTourDays(parsedDays);
      setNewTourPrice(data.price || 35);

      // WhatsApp sanitized contact link
      setNewTourWhatsApp(data.guide_whatsapp || '+994706717804');

      // Includes joining list
      if (data.included_services && data.included_services.length > 0) {
        setNewTourIncludes(data.included_services.join(', '));
      } else {
        setNewTourIncludes('Müşayiət bələdçisi, Komfort Nəqliyyat');
      }

      // Description formatting
      let finalDesc = captionText;
      if (data.required_gear && data.required_gear.length > 0) {
        finalDesc += `\n\n🎒 Lazımi ləvazimatlar:\n- ${data.required_gear.join('\n- ')}`;
      }
      if (data.important_note) {
        finalDesc += `\n\n⚠️ Vacib qeyd:\n${data.important_note}`;
      }
      setNewTourDescription(finalDesc);

      // Robust Date parsing (keep existing dates heuristic processing from caption)
      let parsedStartDate = '';
      let parsedEndDate = '';
      const dotDateMatch = combinedText.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
      if (dotDateMatch) {
         const day = parseInt(dotDateMatch[1], 10);
         const month = parseInt(dotDateMatch[2], 10);
         let year = new Date().getFullYear();
         if (dotDateMatch[3]) {
           const yStr = dotDateMatch[3];
           year = yStr.length === 2 ? 2000 + parseInt(yStr, 10) : parseInt(yStr, 10);
         }
         if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
           const formattedMonth = month.toString().padStart(2, '0');
           const formattedDay = day.toString().padStart(2, '0');
           parsedStartDate = `${year}-${formattedMonth}-${formattedDay}`;
         }
      }

      if (!parsedStartDate) {
        const azMonths: { [key: string]: string } = {
          'yanvar': '01', 'yan': '01', 'fevral': '02', 'fev': '02', 'mart': '03', 'mar': '03',
          'aprel': '04', 'apr': '04', 'may': '05', 'iyun': '06', 'iyul': '07', 'avqust': '08', 'avq': '08',
          'sentyabr': '09', 'sen': '09', 'oktyabr': '10', 'okt': '10', 'noyabr': '11', 'noy': '11', 'dekabr': '12', 'dek': '12'
        };
        const monthNamesGroup = Object.keys(azMonths).join('|');
        const rangeMonthRx = new RegExp(`(\\d{1,2})\\s*(?:-|–|ve|və|\\s)\\s*(\\d{1,2})?\\s*(${monthNamesGroup})`, 'i');
        const monthMatch = combinedText.match(rangeMonthRx);

        if (monthMatch) {
          const dayStart = parseInt(monthMatch[1], 10);
          const dayEndStr = monthMatch[2];
          const mName = monthMatch[3].toLowerCase();
          const mVal = azMonths[mName];
          const year = new Date().getFullYear();
          if (dayStart >= 1 && dayStart <= 31) {
            const formattedDay = dayStart.toString().padStart(2, '0');
            parsedStartDate = `${year}-${mVal}-${formattedDay}`;

            if (dayEndStr) {
              const dayEnd = parseInt(dayEndStr, 10);
              if (dayEnd >= 1 && dayEnd <= 31) {
                const formattedDayEnd = dayEnd.toString().padStart(2, '0');
                parsedEndDate = `${year}-${mVal}-${formattedDayEnd}`;
              }
            }
          }
        }
      }

      if (!parsedStartDate) {
        const today = new Date();
        const currentDay = today.getDay();
        const daysUntilSaturday = (6 - currentDay + 7) % 7 || 7;
        const nextSaturday = new Date(today);
        nextSaturday.setDate(today.getDate() + daysUntilSaturday);
        parsedStartDate = `${nextSaturday.getFullYear()}-${(nextSaturday.getMonth() + 1).toString().padStart(2, '0')}-${nextSaturday.getDate().toString().padStart(2, '0')}`;
      }

      if (parsedStartDate && !parsedEndDate) {
        try {
          const sDate = new Date(parsedStartDate);
          if (!isNaN(sDate.getTime())) {
            const eDate = new Date(sDate);
            eDate.setDate(sDate.getDate() + (parsedDays - 1));
            parsedEndDate = `${eDate.getFullYear()}-${(eDate.getMonth() + 1).toString().padStart(2, '0')}-${eDate.getDate().toString().padStart(2, '0')}`;
          }
        } catch (err) {
          parsedEndDate = parsedStartDate;
        }
      } else if (!parsedEndDate) {
        parsedEndDate = parsedStartDate;
      }

      setNewTourStartDate(parsedStartDate);
      setNewTourEndDate(parsedEndDate);

      // Scenic high-quality geographic image matching based on Extracted Location
      let parsedImage = 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800';
      const parsedRegionLower = (data.location || '').toLowerCase();
      if (parsedCategory === 'camp') {
        parsedImage = 'https://images.unsplash.com/photo-1523987355122-830607129406?w=800';
        if (parsedRegionLower.includes('lerik') || parsedRegionLower.includes('lənkəran') || parsedRegionLower.includes('lenkeran')) {
          parsedImage = 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800';
        }
      } else if (parsedCategory === 'peak') {
        parsedImage = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800';
        if (parsedRegionLower.includes('qusar') || parsedRegionLower.includes('şahdağ') || parsedRegionLower.includes('shahdag')) {
          parsedImage = 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800';
        }
      } else {
        if (parsedRegionLower.includes('göygöl') || parsedRegionLower.includes('goygol') || parsedRegionLower.includes('gəncə') || parsedRegionLower.includes('gence')) {
          parsedImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800';
        } else if (parsedRegionLower.includes('lənkəran') || parsedRegionLower.includes('lenkeran') || parsedRegionLower.includes('lerik') || parsedRegionLower.includes('astara')) {
          parsedImage = 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800';
        } else if (parsedRegionLower.includes('quba') || parsedRegionLower.includes('xınalıq') || parsedRegionLower.includes('xinaliq')) {
          parsedImage = 'https://images.unsplash.com/photo-1548053146-72479768bada?w=800';
        } else if (parsedRegionLower.includes('ismayıllı') || parsedRegionLower.includes('ismayilli') || parsedRegionLower.includes('şamaxı') || parsedRegionLower.includes('samaxi')) {
          parsedImage = 'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=800';
        } else {
          parsedImage = 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800';
        }
      }
      setNewTourImage(parsedImage);

      setIsParsingInstagram(false);
      setParsingStep('');

      if (onShowNotification) {
        onShowNotification('🎉 AI uğurla paylaşım mətnini təhlil etdi! Qiymət, çətinlik, bələdçi nömrəsi və daxil olan xidmətlər form xanalarına mükəmməl dolduruldu!', 'success');
      }

    } catch (error: any) {
      console.error('API Error during parsing:', error);
      setIsParsingInstagram(false);
      setParsingStep('');
      if (onShowNotification) {
        onShowNotification('Xəta: Paylaşımın mətni analiz edilə bilmədi. Sistem şifrəsini və daxil etdiyiniz mətni əmin edin.', 'error');
      }
    }
  };


  return (
        <div className="space-y-5">
          {/* Method Selector Tabs */}
          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setTourCreationMethod('instagram');
                if (onShowNotification) onShowNotification('Süni İntellekt və Instagram metodu seçildi!', 'info');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
                tourCreationMethod === 'instagram'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-transparent text-slate-650 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse fill-amber-400" />
              <span>Instagram Mətni ilə Sürətli Quraşdırma</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTourCreationMethod('manual');
                if (onShowNotification) onShowNotification('Sıfırdan əl ilə yerləşdirmə metodu seçildi!', 'info');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
                tourCreationMethod === 'manual'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-transparent text-slate-650 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Sıfırdan Əl ilə Yerləşdirmək</span>
            </button>
          </div>

          {/* Instagram Auto-Creation Panel */}
          {tourCreationMethod === 'instagram' && (
            <div className="bg-emerald-50/50 border border-emerald-150/80 p-5 rounded-2xl md:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-100 rounded-lg text-pink-600">
                  <Instagram className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-800 tracking-wide">Instagram AI ilə Avto-Doldurma Sistemi</h4>
                  <p className="text-[11px] text-slate-500">Instagram və ya digər sosial şəbəkə postunuzun mətnini (caption) kopyalayıb aşağıdakı sahəyə yapışdırın. Sistem qiyməti, tarixi, bələdçi nömrəsini və regionu dərhal təhlil edəcək!</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-emerald-700 tracking-wide mb-1">Instagram Postunun Mətni (Kopyalayaraq bura yapışdırın):</label>
                  <textarea
                    rows={6}
                    value={instagramCaption}
                    onChange={(e) => setInstagramCaption(e.target.value)}
                    placeholder="Məsələn:
⛰️ KUZUN-LAZA DAĞ YÜRÜŞÜ!
Tarix: 24 May, Qiymət: 30 AZN.
Region: Qusar (Laza kəndi).
Daxildir: Səhər yeməyi, Komfortlu Sprinter, Dağ bələdçisi, Fotoçəkiliş, Giriş bileti.
Əlaqə nömrəsi: +994 50 671 78 04"
                    className="w-full p-3 bg-white border border-slate-250 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleParseInstagram}
                    disabled={isParsingInstagram}
                    className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 justify-center cursor-pointer disabled:opacity-50"
                  >
                    {isParsingInstagram ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Instagram Mətni Analiz Edilir...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-white fill-current animate-bounce" />
                        <span>Mətni Analiz Et və Avto-Doldur ✨</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Loader Steps for Simulating AI Parsing */}
              {isParsingInstagram && (
                <div className="bg-white/95 border border-slate-100 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
                  <div className="relative flex items-center justify-center font-bold">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <Sparkles className="w-2.5 h-2.5 text-amber-500 absolute animate-ping" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 font-mono animate-pulse">{parsingStep}</span>
                </div>
              )}

              <div className="text-[10px] text-slate-450 text-slate-400 leading-relaxed bg-white border border-slate-100 px-3 py-2.5 rounded-lg flex items-start gap-1.5">
                <span className="font-bold text-emerald-650 text-emerald-600 shrink-0">💡 Qeyd:</span>
                <span>Sosial şəbəkələrin (Instagram) CORS təhlükəsizlik qaydalarına görə paylaşım mətnini birbaşa kopyalayıb yapışdırmaq <strong>100% dəqiq və bütün mətn elementlərini (region, gün, daxil olan bilet) tərtib etməyə</strong> imkan verir!</span>
              </div>
            </div>
          )}

          {/* Form */}
           <form onSubmit={handleTourSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <div>
              <span className="text-[10px] tracking-widest text-slate-400 font-bold block mb-1">
                {tourCreationMethod === 'instagram' ? 'Təsdiq və Redaktə Et' : (newTourCategory === 'active' ? 'Yeni Aktiv Həyat Tədbiri' : 'Yeni Marşrut')}
              </span>
              <h3 className="font-extrabold text-slate-900 text-sm">
                {tourCreationMethod === 'instagram' 
                  ? 'Uğurla gətirilən turu təsdiqləyin və ya marşrutu dəyişdirin' 
                  : (newTourCategory === 'active' ? 'Aktiv həyat tərzi və idman tədbiri (turnir, marafon, rafting) yaradın' : 'Yenidən sıfırlayaraq Azərbaycan daxili yeni tur paradiqması tərtib edin')}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Turun Başlığı:</label>
                <input
                  type="text"
                  required
                  value={newTourName}
                  onChange={(e) => setNewTourName(e.target.value)}
                  placeholder="Məsələn: Sulut zirvə yürüşü"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Regionlar və Nöqtələr:</label>
                <input
                  type="text"
                  required
                  value={newTourRegion}
                  onChange={(e) => setNewTourRegion(e.target.value)}
                  placeholder="Məsələn: İsmayıllı (Sulut kəndi)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Kateqoriya:</label>
                <select
                  value={newTourCategory}
                  onChange={(e) => setNewTourCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                >
                  <option value="hiking">🥾 Hiking (Yürüş, gəzinti)</option>
                  <option value="peak">🏔️ Zirvə Turları (Alpinizm)</option>
                  <option value="camp">⛺ Camp Turları (Düşərgə)</option>
                  <option value="active">🏃‍♂️ Aktiv Həyat (İdman və Macəra)</option>
                </select>
              </div>

              {newTourCategory !== 'active' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Çətinlik dərəcəsi:</label>
                  <select
                    value={newTourDifficulty}
                    onChange={(e) => setNewTourDifficulty(e.target.value as any)}
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
                  value={newTourDays}
                  onChange={(e) => setNewTourDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>

              {newTourCategory === 'active' && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-xs">
                  <div className="md:col-span-2 pb-2 mb-2 border-b border-amber-200">
                    <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 tracking-wider">
                      🏅 AKTİV HƏYAT VƏ MACƏRA PARAMETRLƏRİ
                    </h4>
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">İdman / Fəaliyyət Növü:</label>
                    <select
                      value={newTourActivityType}
                      onChange={(e) => setNewTourActivityType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-slate-700"
                    >
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
                    <select
                      value={newTourActiveDifficulty}
                      onChange={(e) => setNewTourActiveDifficulty(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-slate-700"
                    >
                      <option value="beginner">🟢 Başlanğıc (Hər kəs qatıla bilər)</option>
                      <option value="medium">🟡 Orta (Fiziki aktiv insanlar)</option>
                      <option value="professional">🔴 Professional (Peşəkar idmançılar)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">Yaş Limiti:</label>
                    <input
                      type="text"
                      value={newTourAgeLimit}
                      onChange={(e) => setNewTourAgeLimit(e.target.value)}
                      placeholder="Məs: 18-45 yaş, Qadınlar üçün"
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">Görüş Yeri & Toplanış Nöqtəsi:</label>
                    <input
                      type="text"
                      value={newTourMeetingPoint}
                      onChange={(e) => setNewTourMeetingPoint(e.target.value)}
                      placeholder="Məs: Gənclik Mall M/S və ya Maps Link"
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">Zəruri Avadanlıqlar (Təchizat Siyahısı):</label>
                    <textarea
                      rows={2}
                      value={newTourRequiredEquipment}
                      onChange={(e) => setNewTourRequiredEquipment(e.target.value)}
                      placeholder="Məs: Xizək dəsti, kaska, əlcək, termal geyim, su qabı..."
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="optAvt"
                      checked={newTourEquipmentIncluded}
                      onChange={(e) => setNewTourEquipmentIncluded(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <label htmlFor="optAvt" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">
                      ✅ Avadanlıqlar bilet qiymətinə daxildir
                    </label>
                  </div>

                  {!newTourEquipmentIncluded && (
                    <div>
                      <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">Kirayə Haqqı (+AZN):</label>
                      <input
                        type="number"
                        min="0"
                        value={newTourEquipmentRentalPrice}
                        onChange={(e) => setNewTourEquipmentRentalPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs"
                        placeholder="Məs: 15 AZN"
                      />
                    </div>
                  )}
                  {newTourEquipmentIncluded && <div />}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="optTeam"
                      checked={newTourAllowTeamRegistration}
                      onChange={(e) => setNewTourAllowTeamRegistration(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <label htmlFor="optTeam" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">
                      👥 Komanda qeydiyyatına izn verilsin (Tək biletə ~6 nəfər)
                    </label>
                  </div>

                  <div className="md:col-span-2 mt-2">
                    <label className="block text-[11px] font-bold text-rose-700 tracking-wide mb-1">Təhlükəsizlik və Tibbi Təlimat:</label>
                    <textarea
                      rows={3}
                      value={newTourSafetyInstructions}
                      onChange={(e) => setNewTourSafetyInstructions(e.target.value)}
                      placeholder="Macəra idmanının risklərini və iştirakçının sağlamlıqla bağlı bilməli olduğu təhlükəsizlik razılaşmasını bura yazın..."
                      className="w-full px-3 py-2 bg-white border border-rose-300 ring-1 ring-rose-100 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">WhatsApp Bələdçi Nömrəsi:</label>
                <input
                  type="tel"
                  required
                  value={newTourWhatsApp}
                  onChange={(e) => setNewTourWhatsApp(e.target.value)}
                  placeholder="+994706717804"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-800 tracking-wide mb-1">
                  Back-office Reytinq Təyini (1-5 Ulduz):
                </label>
                <select
                  value={newTourRating}
                  onChange={(e) => setNewTourRating(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-emerald-50/80 border border-emerald-205 rounded-lg text-xs font-bold text-slate-800 cursor-pointer shadow-3xs"
                >
                  <option value="5">⭐⭐⭐⭐⭐ 5.0 (Tövsiyə olunan / Sponsorlu)</option>
                  <option value="4.8">⭐⭐⭐⭐⭐ 4.8 (Əla satışlı)</option>
                  <option value="4.5">⭐⭐⭐⭐☆ 4.5 (Çox yaxşı)</option>
                  <option value="4">⭐⭐⭐⭐☆ 4.0 (Yaxşı)</option>
                  <option value="3">⭐⭐⭐☆☆ 3.0 (Orta)</option>
                  <option value="2">⭐⭐☆☆☆ 2.0 (Zəif)</option>
                </select>
                <span className="text-[9px] text-slate-400 mt-1 block italic leading-[1.1] font-medium">
                  * Tədbir/Tur zəif satıldıqda süni reytinq xalı təyin edib tövsiyələrdə yüksəldin.
                </span>
              </div>

              {/* Direct Slot/Price Creation for convenient publishes */}
              <div className="md:col-span-2 bg-[#f0fdf4]/60 p-4 rounded-xl border border-emerald-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <h4 className="text-[10px] font-extrabold text-emerald-800 tracking-widest flex items-center gap-1.5">
                    <span>📅 Tarix və Qiymət Təyini (Bilet)</span>
                    <span className="normal-case text-[9px] text-emerald-600 font-semibold">(Platformada dərhal satışa və təqvimə buraxılacaq)</span>
                  </h4>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 tracking-wide mb-1">Bilet Qiyməti (AZN):</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newTourPrice}
                    onChange={(e) => setNewTourPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 tracking-wide mb-1">Başlanğıc Tarixi:</label>
                  <input
                    type="date"
                    required
                    value={newTourStartDate}
                    onChange={(e) => setNewTourStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 tracking-wide mb-1">Bitmə Tarixi:</label>
                  <input
                    type="date"
                    required
                    value={newTourEndDate}
                    onChange={(e) => setNewTourEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
                {newTourCategory === 'active' && (
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-700 tracking-wide mb-1">Tədbirin Planlaması:</label>
                    <select
                      value={newTourScheduleFrequency}
                      onChange={(e) => setNewTourScheduleFrequency(e.target.value)}
                      className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800"
                    >
                      <option value="one-time">Bir dəfəlik (Göstərilən tarixlərdə)</option>
                      <option value="daily">Hər gün (Mütəmadi)</option>
                      <option value="every-monday">Hər bazar ertəsi</option>
                      <option value="every-tuesday">Hər çərşənbə axşamı</option>
                      <option value="every-wednesday">Hər çərşənbə</option>
                      <option value="every-thursday">Hər cümə axşamı</option>
                      <option value="every-friday">Hər cümə</option>
                      <option value="every-saturday">Hər şənbə günü</option>
                      <option value="every-sunday">Hər bazar günü</option>
                      <option value="every-weekend">Hər həftəsonu (Şənbə və Bazar)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 tracking-wide">Turun Şəkli (İstənilən şəkli əlavə edin):</label>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Cihazınızdan yerli şəkil faylı seçin:</span>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-emerald-350 hover:border-emerald-500 rounded-lg text-xs flex items-center justify-center gap-2 text-emerald-800 font-semibold transition">
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Fayl Seçin 📁</span>
                    </div>
                  </div>
                </div>

                {newTourImage && (
                  <div className="relative inline-block mt-2.5 rounded-xl overflow-hidden border border-slate-200 shadow-sm max-h-36 group">
                    <img src={newTourImage || undefined} alt="Preview" className="h-28 w-auto object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => {
                        setNewTourImage('');
                        if (onShowNotification) onShowNotification('Şəkil təmizləndi', 'info');
                      }}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-md transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Multiple Gallery Images Form Field */}
              <div className="md:col-span-2 space-y-3 pt-3 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-450 tracking-wide">Qalereya Şəkilləri (Çoxlu şəkil daxil edin):</label>
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleMultipleImagesChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl text-xs flex items-center justify-center gap-2 text-emerald-800 font-bold transition">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span>Cihazdan çoxlu şəkil seçin (Multi-upload) 📁📸</span>
                  </div>
                </div>

                {newTourImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newTourImages.map((img, idx) => (
                       <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 shadow-xs h-16 w-24 flex-shrink-0 group">
                        <img src={img || undefined} alt={`Gallery Preview ${idx}`} className="h-full w-full object-cover rounded-xl" />
                        <button
                          type="button"
                          onClick={() => {
                            setNewTourImages(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-0.5 rounded-full shadow-xs transition cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Multiple Gallery Videos Form Field */}
              <div className="md:col-span-2 space-y-3 pt-3 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-450 tracking-wide">Qalereya Videoları (Videolar daxil edin):</label>
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept="video/*"
                    onChange={handleMultipleVideosChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-sky-300 hover:border-sky-500 rounded-xl text-xs flex items-center justify-center gap-2 text-sky-800 font-bold transition">
                    <Plus className="w-4 h-4 text-sky-600" />
                    <span>Cihazdan çoxlu video seçin (Video-upload) 📁🎥</span>
                  </div>
                </div>

                {newTourVideos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newTourVideos.map((vid, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 shadow-xs h-20 w-32 flex-shrink-0 group bg-black">
                        <video src={vid || undefined} className="h-full w-full object-contain" muted playsInline />
                        <div className="absolute bottom-1 left-1 bg-slate-900/80 text-white font-bold text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                          <span>VİDEO</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewTourVideos(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-0.5 rounded-full shadow-xs transition cursor-pointer z-10"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Daxil olan təminatlar (Vergüllə ayırın):</label>
              <input
                type="text"
                value={newTourIncludes}
                onChange={(e) => setNewTourIncludes(e.target.value)}
                placeholder="Səhər yeməyi, Giriş bileti, Professional Bələdçi, Komfort Transfer"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
              />
            </div>

            {/* GPX Track Uploader */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-extrabold text-slate-400 tracking-wide">
                  GPS Marşrut Faylı (GPX və ya KML)
                </label>
                <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                  3D XƏRİTƏ VİZUALİZASİYASI ⛰️
                </span>
              </div>
              
              {!newTourGpxFileName ? (
                <div className="border border-dashed border-slate-350 rounded-lg p-4 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition cursor-pointer relative group">
                  <input
                    type="file"
                    accept=".gpx,.kml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleGpsFileUpload(file);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition">
                      Bura klikləyin və ya GPX / KML faylını dartın
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Operator GPX trek faylı yüklədikdə müştərilərə 3D hündürlük və real trek xəritəsi göstərilir
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1 px-1.5 text-[10px] font-bold text-white bg-indigo-600 rounded animate-pulse">GPS</span>
                      <span className="text-xs font-bold text-indigo-950 truncate max-w-[200px]" title={newTourGpxFileName}>
                        {newTourGpxFileName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTourGpxData('');
                        setNewTourGpxFileName('');
                      }}
                      className="text-[10px] font-black text-red-600 hover:text-red-700 tracking-wide cursor-pointer transition"
                    >
                      Sil ✕
                    </button>
                  </div>
                  
                  {/* Parsed stats preview */}
                  {newTourGpxData && (() => {
                    try {
                      const parsed = JSON.parse(newTourGpxData);
                      return (
                        <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-indigo-250 text-[10px] text-indigo-950 font-bold">
                          <div>
                            <span className="text-slate-400 block font-normal text-[8px]">Uzunluq</span>
                            <span>{parsed.stats.distanceKm} km</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-normal text-[8px]">Zirvə Hündürlüyü</span>
                            <span>{parsed.stats.highestPointM} m</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-normal text-[8px]">Hündürlük Artımı</span>
                            <span className="text-emerald-700">+{parsed.stats.elevationGainM} m</span>
                          </div>
                        </div>
                      );
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Əhatəli marşrut planı və açıqlama:</label>
              <textarea
                required
                rows={4}
                value={newTourDescription}
                onChange={(e) => setNewTourDescription(e.target.value)}
                placeholder="Tur iştirakçılarını hansı inanılmaz fəaliyyətlər gözləyir? Çıxış nöqtəsi haradır? Bu bölmədə dərindən qeyd edin."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            {formSubmitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">
                ⚠️ {formSubmitError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSavingForm}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingForm ? 'Göndərilir...' : (newTourCategory === 'active' ? 'Tədbiri Platformaya Göndər' : 'Marşrutu Platformaya Göndər')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigateBack();
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                Ləğv et
              </button>
            </div>
          </form>
        </div>

  );
}
