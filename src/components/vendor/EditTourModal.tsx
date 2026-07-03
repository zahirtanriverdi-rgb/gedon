import React, { useState, useEffect } from 'react';
import { Tour, TourSlot } from '../../types';
import { parseGpsFile } from '../../utils/gpxParser';
import { Edit, X, Check, Trash, Plus } from 'lucide-react';

interface EditTourModalProps {
  tour: Tour | null;
  slots: TourSlot[];
  onEditTour?: (updatedTour: Tour) => Promise<void>;
  onDeleteTour?: (tourId: string) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onClose: () => void;
}

export function EditTourModal({ tour, slots, onEditTour, onDeleteTour, onShowNotification, onClose }: EditTourModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [editTourIsActive, setEditTourIsActive] = useState<boolean>(true);
  const [editTourName, setEditTourName] = useState<string>('');
  const [editTourCategory, setEditTourCategory] = useState<Tour['category']>('hiking');
  const [editTourDifficulty, setEditTourDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme'>('medium');
  const [editTourRegion, setEditTourRegion] = useState<string>('');
  const [editTourDays, setEditTourDays] = useState<number>(1);
  const [editTourDescription, setEditTourDescription] = useState<string>('');
  const [editTourIncludes, setEditTourIncludes] = useState<string>('');
  const [editTourHighlights, setEditTourHighlights] = useState<string>('');
  const [editTourLanguages, setEditTourLanguages] = useState<string>('');
  const [editTourDurationHours, setEditTourDurationHours] = useState<number>(8);
  const [editTourBringItems, setEditTourBringItems] = useState<string>('');
  const [editTourNotAllowedItems, setEditTourNotAllowedItems] = useState<string>('');
  const [editTourImage, setEditTourImage] = useState<string>('');
  const [editTourWhatsApp, setEditTourWhatsApp] = useState<string>('');
  const [editTourImages, setEditTourImages] = useState<string[]>([]);
  const [editTourVideos, setEditTourVideos] = useState<string[]>([]);
  const [editTourGpxData, setEditTourGpxData] = useState<string>('');
  const [editTourGpxFileName, setEditTourGpxFileName] = useState<string>('');
  const [editTourRating, setEditTourRating] = useState<number>(5.0);

  // Editing Active Lifestyle specifics
  const [editTourActivityType, setEditTourActivityType] = useState<string>('volleyball');
  const [editTourActiveDifficulty, setEditTourActiveDifficulty] = useState<string>('medium');
  const [editTourAgeLimit, setEditTourAgeLimit] = useState<string>('18-45 yaş');
  const [editTourMeetingPoint, setEditTourMeetingPoint] = useState<string>('');
  const [editTourRequiredEquipment, setEditTourRequiredEquipment] = useState<string>('');
  const [editTourEquipmentIncluded, setEditTourEquipmentIncluded] = useState<boolean>(true);
  const [editTourEquipmentRentalPrice, setEditTourEquipmentRentalPrice] = useState<number>(0);
  const [editTourSafetyInstructions, setEditTourSafetyInstructions] = useState<string>('');
  const [editTourAllowTeamRegistration, setEditTourAllowTeamRegistration] = useState<boolean>(true);
  const [editTourScheduleFrequency, setEditTourScheduleFrequency] = useState<string>('one-time');

  // Editing International Outbound Tour specific states
  const [editIntlTourCountry, setEditIntlTourCountry] = useState<string>('');
  const [editIntlTourCity, setEditIntlTourCity] = useState<string>('');
  const [editIntlTourNights, setEditIntlTourNights] = useState<number>(3);
  const [editIntlTourFlightIncluded, setEditIntlTourFlightIncluded] = useState<boolean>(true);
  const [editIntlTourFlightDetails, setEditIntlTourFlightDetails] = useState<string>('');
  const [editIntlTourTransferDetails, setEditIntlTourTransferDetails] = useState<string>('');
  const [editIntlTourHotelName, setEditIntlTourHotelName] = useState<string>('');
  const [editIntlTourHotelStars, setEditIntlTourHotelStars] = useState<number>(4);
  const [editIntlTourMealType, setEditIntlTourMealType] = useState<string>('Səhər yeməyi');
  const [editIntlRoomDoubleDiff, setEditIntlRoomDoubleDiff] = useState<number>(0);
  const [editIntlRoomTwinDiff, setEditIntlRoomTwinDiff] = useState<number>(25);
  const [editIntlRoomSingleDiff, setEditIntlRoomSingleDiff] = useState<number>(75);
  const [editIntlTourPrice, setEditIntlTourPrice] = useState<number>(499);
  const [editIntlTourCurrency, setEditIntlTourCurrency] = useState<'AZN' | 'USD' | 'EUR'>('USD');
  const [editIntlIncludes, setEditIntlIncludes] = useState<string[]>([]);
  const [editIntlNotIncludes, setEditIntlNotIncludes] = useState<string[]>([]);
  const [editIntlItinerary, setEditIntlItinerary] = useState<Array<{ day: number; title: string; description: string; image?: string }>>([]);
  const [editNewInclInput, setEditNewInclInput] = useState<string>('');
  const [editNewNotInclInput, setEditNewNotInclInput] = useState<string>('');

  useEffect(() => {
    if (!tour) return;
    setShowDeleteConfirm(false);
    setEditTourIsActive(tour.isActive !== false);
    setEditTourName(tour.name);
    setEditTourCategory(tour.category);
    setEditTourDifficulty(tour.difficulty);
    setEditTourRegion(tour.region);
    setEditTourDays(tour.durationDays);
    setEditTourDescription(tour.description || '');
    setEditTourIncludes(Array.isArray(tour.includes) ? tour.includes.join(', ') : '');
    setEditTourHighlights(Array.isArray(tour.highlights) ? tour.highlights.join(', ') : '');
    setEditTourLanguages(Array.isArray(tour.languages) ? tour.languages.join(', ') : '');
    setEditTourDurationHours(tour.durationHours || (tour.durationDays ? tour.durationDays * 8 : 8));
    setEditTourBringItems(Array.isArray(tour.importantInfo?.bring) ? tour.importantInfo!.bring!.join(', ') : '');
    setEditTourNotAllowedItems(Array.isArray(tour.importantInfo?.notAllowed) ? tour.importantInfo!.notAllowed!.join(', ') : '');
    setEditTourImage(tour.image || '');
    setEditTourWhatsApp(tour.whatsapp_number || '');
    setEditTourGpxData(tour.gpxData || '');
    setEditTourGpxFileName(tour.gpxFileName || '');
    setEditTourRating(tour.rating !== undefined ? tour.rating : 5.0);

    // Active Lifestyle specifics
    setEditTourActivityType(tour.activityType || 'volleyball');
    setEditTourActiveDifficulty(tour.activeDifficulty || 'medium');
    setEditTourAgeLimit(tour.ageLimit || '18-45 yaş');
    setEditTourMeetingPoint(tour.meetingPoint || '');
    setEditTourRequiredEquipment(tour.requiredEquipment || '');
    setEditTourEquipmentIncluded(tour.equipmentIncluded !== false);
    setEditTourEquipmentRentalPrice(tour.equipmentRentalPrice || 0);
    setEditTourSafetyInstructions(tour.safetyInstructions || '');
    setEditTourAllowTeamRegistration(tour.allowTeamRegistration !== false);
    setEditTourScheduleFrequency(tour.scheduleFrequency || 'one-time');

    // Populate international fields
    setEditIntlTourCountry(tour.destinationCountry || '');
    setEditIntlTourCity(tour.destinationCity || '');
    setEditIntlTourNights(tour.durationNights || (tour.durationDays > 1 ? tour.durationDays - 1 : 1));
    setEditIntlTourFlightIncluded(tour.flightIncluded !== false);
    setEditIntlTourFlightDetails(tour.flightDetails || '');
    setEditIntlTourTransferDetails(tour.transferDetails || '');
    setEditIntlTourHotelName(tour.hotelName || '');
    setEditIntlTourHotelStars(tour.hotelStars || 4);
    setEditIntlTourMealType(tour.mealType || 'Səhər yeməyi');

    const defaultDoubleDiff = tour.roomTypes?.find(r => r.name === 'Double')?.priceDiff ?? 0;
    const defaultTwinDiff = tour.roomTypes?.find(r => r.name === 'Twin')?.priceDiff ?? 25;
    const defaultSingleDiff = tour.roomTypes?.find(r => r.name === 'Single')?.priceDiff ?? 75;
    setEditIntlRoomDoubleDiff(defaultDoubleDiff);
    setEditIntlRoomTwinDiff(defaultTwinDiff);
    setEditIntlRoomSingleDiff(defaultSingleDiff);

    // Find price from existing slot or default to 499
    const tourSlots = slots.filter(s => s.tourId === tour.id);
    const initialPrice = tourSlots.length > 0 ? tourSlots[0].price : 499;
    setEditIntlTourPrice(initialPrice);
    setEditIntlTourCurrency(tour.priceCurrency || 'USD');
    setEditIntlIncludes(tour.includes || []);
    setEditIntlNotIncludes(tour.notIncluded || []);
    setEditIntlItinerary(tour.itinerary || [{ day: 1, title: 'Bakıdan Uçuş', description: 'Uçuş və qarşılanma.' }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  // Edit Itinerary helpers
  const handleEditIntlAddDay = () => {
    const nextDay = editIntlItinerary.length + 1;
    setEditIntlItinerary([
      ...editIntlItinerary,
      { day: nextDay, title: `${nextDay}-ci Gün fəaliyyətləri`, description: '', image: '' }
    ]);
  };

  const handleEditIntlRemoveDay = (index: number) => {
    if (editIntlItinerary.length <= 1) return;
    const updated = editIntlItinerary.filter((_, idx) => idx !== index).map((day, idx) => ({
      ...day,
      day: idx + 1
    }));
    setEditIntlItinerary(updated);
  };

  const handleEditIntlItineraryChange = (index: number, field: 'title' | 'description' | 'image', value: string) => {
    const updated = [...editIntlItinerary];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setEditIntlItinerary(updated);
  };

  // Edit Dynamic lists actions
  const addEditInclItem = () => {
    if (editNewInclInput.trim()) {
      setEditIntlIncludes([...editIntlIncludes, editNewInclInput.trim()]);
      setEditNewInclInput('');
    }
  };
  const removeEditInclItem = (idx: number) => {
    setEditIntlIncludes(editIntlIncludes.filter((_, i) => i !== idx));
  };

  const addEditNotInclItem = () => {
    if (editNewNotInclInput.trim()) {
      setEditIntlNotIncludes([...editIntlNotIncludes, editNewNotInclInput.trim()]);
      setEditNewNotInclInput('');
    }
  };
  const removeEditNotInclItem = (idx: number) => {
    setEditIntlNotIncludes(editIntlNotIncludes.filter((_, i) => i !== idx));
  };

  const handleEditTourImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditTourImage(reader.result as string);
        if (onShowNotification) {
          onShowNotification('Şəkil uğurla yükləndi! 📸', 'success');
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
        setEditTourGpxData(JSON.stringify(parsed));
        setEditTourGpxFileName(file.name);
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

  const handleEditMultipleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setEditTourImages(prev => [...prev, ...base64s]);
        if (onShowNotification) {
          onShowNotification(`${base64s.length} şəkil qalerayaya əlavə edildi! 📸`, 'success');
        }
      });
    }
  };

  const handleEditMultipleVideosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setEditTourVideos(prev => [...prev, ...base64s]);
        if (onShowNotification) {
          onShowNotification(`${base64s.length} video qalerayaya əlavə edildi! 🎥`, 'success');
        }
      });
    }
  };

  if (!tour) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <Edit className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Tur Reqlamentini Yeniləyin</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Marşrut bələdçisi, kateqoriyası və ətraflı rekvizitlərinə düzəliş edin</p>
                </div>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                onClick={() => onClose()}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              
              {(() => {
                const isIntl = tour.isInternational || tour.category === 'international';
                if (isIntl) {
                  return (
                    <>
                      {/* A) Əsas Səyahət Məlumatları */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-emerald-700 tracking-wider border-b pb-1">
                          A) Əsas Səyahət Məlumatları
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">Turun Tam Adı *</label>
                            <input
                              type="text"
                              required
                              value={editTourName}
                              onChange={(e) => setEditTourName(e.target.value)}
                              placeholder="Məsələn: Kapadokya Sehrli Payız Turu (Şar gəzintisi ilə)"
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">İstiqamət Ölkə *</label>
                            <input
                              type="text"
                              required
                              value={editIntlTourCountry}
                              onChange={(e) => setEditIntlTourCountry(e.target.value)}
                              placeholder="Ölkə (məs: Türkiyə, İtaliya, Gürcüstan)"
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">İstiqamət Şəhər / Region *</label>
                            <input
                              type="text"
                              required
                              value={editIntlTourCity}
                              onChange={(e) => setEditIntlTourCity(e.target.value)}
                              placeholder="Şəhər (məs: Kapadokya, Roma, Tbilisi)"
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-xs"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Gecə sayısı *</label>
                              <input
                                type="number"
                                required
                                min={1}
                                value={editIntlTourNights}
                                onChange={(e) => setEditIntlTourNights(Number(e.target.value))}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Gündüz sayısı *</label>
                              <input
                                type="number"
                                required
                                min={1}
                                value={editTourDays}
                                onChange={(e) => setEditTourDays(Number(e.target.value))}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* B) Loqistika və Nəqliyyat Məlumatları */}
                      <div className="space-y-4 pt-3 border-t border-slate-100">
                        <h3 className="text-xs font-bold text-teal-700 tracking-wider border-b pb-1">
                          B) Loqistika və Nəqliyyat Məlumatları
                        </h3>

                        <div className="space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={editIntlTourFlightIncluded}
                              onChange={(e) => setEditIntlTourFlightIncluded(e.target.checked)}
                              className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
                            />
                            <span className="text-xs font-black text-slate-800">Aviabilet qiymətə daxildir</span>
                          </label>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Uçuş Təfərrüatları</label>
                              <textarea
                                rows={2}
                                value={editIntlTourFlightDetails}
                                onChange={(e) => setEditIntlTourFlightDetails(e.target.value)}
                                placeholder="Məsələn: Bakı - Kayseri Pegasus Hava yolları gediş-dönüş, 23kg baqaj daxildir."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-medium text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Ölkədaxili Transfer növü</label>
                              <textarea
                                rows={2}
                                value={editIntlTourTransferDetails}
                                onChange={(e) => setEditIntlTourTransferDetails(e.target.value)}
                                placeholder="Məsələn: Hava limanında VIP transfer."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-medium text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* C) Yerləşmə (Otel) Məlumatları */}
                      <div className="space-y-4 pt-3 border-t border-slate-100">
                        <h3 className="text-xs font-bold text-emerald-750 tracking-wider border-b pb-1">
                          C) Yerləşmə (Otel) Məlumatları
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Otelin Adı *</label>
                            <input
                              type="text"
                              required
                              value={editIntlTourHotelName}
                              onChange={(e) => setEditIntlTourHotelName(e.target.value)}
                              placeholder="Məsələn: Crowne Plaza Cappadocia"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Otelin Ulduz Sayı *</label>
                            <select
                              value={editIntlTourHotelStars}
                              onChange={(e) => setEditIntlTourHotelStars(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold text-xs cursor-pointer"
                            >
                              <option value={5}>⭐⭐⭐⭐⭐ 5 Ulduzlu Lüks Otel</option>
                              <option value={4}>⭐⭐⭐⭐☆ 4 Ulduzlu Premium Otel</option>
                              <option value={3}>⭐⭐⭐☆☆ 3 Ulduzlu Standart Otel</option>
                              <option value={2}>⭐⭐☆☆☆ 2 Ulduzlu Butik</option>
                              <option value={1}>⭐☆☆☆☆ 1 Ulduzlu Qonaq Evi</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Qidalanma Seçimi *</label>
                            <select
                              value={editIntlTourMealType}
                              onChange={(e) => setEditIntlTourMealType(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold text-xs cursor-pointer"
                            >
                              <option value="Səhər yeməyi">Səhər yeməyi daxildir (BB)</option>
                              <option value="Hər şey daxil (AI)">Hər şey daxil (All Inclusive - AI)</option>
                              <option value="Yarım pansion (HB)">Yarım pansion (HB)</option>
                              <option value="Tam pansion (FB)">Tam pansion (FB)</option>
                              <option value="Qidalanma daxil deyil">Qidalanma daxil DEYİL (Only Room - RO)</option>
                            </select>
                          </div>
                        </div>

                        {/* Room differences */}
                        <div>
                          <label className="block text-[11px] font-black text-emerald-800 mb-2">Otaq Altdərnək Qiymət fərqləri:</label>
                          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                            <div>
                              <label className="block text-[10px] text-slate-500 font-bold mb-1">Double Otaq fərqi</label>
                              <input
                                type="number"
                                value={editIntlRoomDoubleDiff}
                                onChange={(e) => setEditIntlRoomDoubleDiff(Number(e.target.value))}
                                className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 font-bold mb-1">Twin otaq fərqi</label>
                              <input
                                type="number"
                                value={editIntlRoomTwinDiff}
                                onChange={(e) => setEditIntlRoomTwinDiff(Number(e.target.value))}
                                className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 font-bold mb-1">Single otaq fərqi</label>
                              <input
                                type="number"
                                value={editIntlRoomSingleDiff}
                                onChange={(e) => setEditIntlRoomSingleDiff(Number(e.target.value))}
                                className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* D) Qiymət və Paket İnformasiyası */}
                      <div className="space-y-4 pt-3 border-t border-slate-100">
                        <h3 className="text-xs font-bold text-teal-800 tracking-wider border-b pb-1">
                          D) Qiymət və Paket İnformasiyası
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Baza Paket Qiyməti *</label>
                            <input
                              type="number"
                              required
                              min={1}
                              value={editIntlTourPrice}
                              onChange={(e) => setEditIntlTourPrice(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700 font-bold text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Valyuta Seçimi *</label>
                            <select
                              value={editIntlTourCurrency}
                              onChange={(e) => setEditIntlTourCurrency(e.target.value as 'AZN' | 'USD' | 'EUR')}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700 font-bold text-xs bg-white cursor-pointer"
                            >
                              <option value="AZN">AZN (₼)</option>
                              <option value="USD">USD ($)</option>
                              <option value="EUR">EUR (€)</option>
                            </select>
                          </div>
                        </div>

                        {/* Image/Cover Upload */}
                        <div className="space-y-3">
                          <label className="block text-[10px] font-extrabold text-slate-500 tracking-widest">Kover Foto / Şəkil Seçimi:</label>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                            <span className="text-[10px] text-slate-500 block font-bold">Cihazdan yeni kover şəkil faylı yükləyin:</span>
                            <div className="relative">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleEditTourImageChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div className="w-full px-3 py-2.5 bg-white hover:bg-slate-50 border border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl text-xs flex items-center justify-center gap-2 text-emerald-800 font-bold transition">
                                <Plus className="w-4 h-4 text-emerald-600" />
                                <span>Kover Foto Seçin 📁</span>
                              </div>
                            </div>

                            {editTourImage && (
                              <div className="relative inline-block mt-1.5 rounded-xl overflow-hidden border border-slate-200 shadow-xs max-h-36 group">
                                <img src={editTourImage || undefined} alt="Kover Şəkil" className="h-24 w-auto object-cover rounded-xl" />
                                <button
                                  type="button"
                                  onClick={() => setEditTourImage('')}
                                  className="absolute top-1 right-1 bg-red-650 hover:bg-red-750 text-white p-1 rounded-full shadow-md transition cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Gallery Multi images */}
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          <label className="block text-[10px] font-extrabold text-slate-500 tracking-widest">Qalereya Şəkilləri (Çoxlu şəkil yükləyin):</label>
                          <div className="relative">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleEditMultipleImagesChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-emerald-350 hover:border-emerald-500 rounded-xl text-xs flex items-center justify-center gap-2 text-emerald-800 font-bold transition">
                              <Plus className="w-4 h-4 text-emerald-600" />
                              <span>Cihazdan çoxlu şəkil seçin (Multi-upload) 📁📸</span>
                            </div>
                          </div>

                          {editTourImages.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {editTourImages.map((img, idx) => (
                                <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 shadow-xs h-16 w-24 flex-shrink-0 group">
                                  <img src={img || undefined} alt={`Gallery Preview ${idx}`} className="h-full w-full object-cover rounded-xl" />
                                  <button
                                    type="button"
                                    onClick={() => setEditTourImages(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute top-1 right-1 bg-red-650 hover:bg-red-750 text-white p-0.5 rounded-full shadow-xs transition cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Gallery Multi videos */}
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          <label className="block text-[10px] font-extrabold text-slate-500 tracking-widest">Qalereya Videoları (Videolar yükləyin):</label>
                          <div className="relative">
                            <input
                              type="file"
                              multiple
                              accept="video/*"
                              onChange={handleEditMultipleVideosChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-sky-350 hover:border-sky-500 rounded-xl text-xs flex items-center justify-center gap-2 text-sky-800 font-bold transition">
                              <Plus className="w-4 h-4 text-sky-600" />
                              <span>Cihazdan video seçin (Video-upload) 📁🎥</span>
                            </div>
                          </div>

                          {editTourVideos.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {editTourVideos.map((vid, idx) => (
                                <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 shadow-xs h-20 w-32 flex-shrink-0 group bg-black">
                                  <video src={vid || undefined} className="h-full w-full object-contain" muted playsInline />
                                  <button
                                    type="button"
                                    onClick={() => setEditTourVideos(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute top-1 right-1 bg-red-650 hover:bg-red-750 text-white p-0.5 rounded-full shadow-xs transition z-10"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* WhatsApp & Rating */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 tracking-wide mb-1">WhatsApp Əlaqə Nömrəsi:</label>
                            <input
                              type="text"
                              value={editTourWhatsApp}
                              onChange={(e) => setEditTourWhatsApp(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold font-mono text-xs"
                              placeholder="+994XXXXXXXXX"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-extrabold text-emerald-800 tracking-wide mb-1">Back-office Reytinq Təyini (1-5 Ulduz):</label>
                            <select
                              value={editTourRating}
                              onChange={(e) => setEditTourRating(Number(e.target.value))}
                              className="w-full px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-xs font-bold text-slate-800"
                            >
                              <option value="5">⭐⭐⭐⭐⭐ 5.0 (Tövsiyə olunan / Sponsorlu)</option>
                              <option value="4.8">⭐⭐⭐⭐⭐ 4.8 (Əla satışlı)</option>
                              <option value="4.5">⭐⭐⭐⭐☆ 4.5 (Çox yaxşı)</option>
                              <option value="4">⭐⭐⭐⭐☆ 4.0 (Yaxşı)</option>
                              <option value="3">⭐⭐⭐☆☆ 3.0 (Orta)</option>
                              <option value="2">⭐⭐☆☆☆ 2.0 (Zəif)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Inclusions & Exclusions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                        <div>
                          <label className="block text-xs font-bold text-emerald-800 mb-1">Paketə Daxildir (Dinamik Siyahı):</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editNewInclInput}
                              onChange={(e) => setEditNewInclInput(e.target.value)}
                              placeholder="Məs: Oteldə spa, Yerli sığorta"
                              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                            />
                            <button
                              type="button"
                              onClick={addEditInclItem}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
                            >
                              Əlavə et
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {editIntlIncludes.map((inc, index) => (
                              <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 rounded-sm">
                                {inc}
                                <button type="button" onClick={() => removeEditInclItem(index)} className="text-red-500 hover:text-red-700 font-extrabold ml-1">×</button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-red-000 text-red-800 mb-1">Paketə Daxil DEYİL (Dinamik Siyahı):</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editNewNotInclInput}
                              onChange={(e) => setEditNewNotInclInput(e.target.value)}
                              placeholder="Məs: Alış-veriş, Şəxsi xərclər"
                              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={addEditNotInclItem}
                              className="px-3 py-1.5 bg-red-650 hover:bg-red-750 text-white font-bold text-xs rounded-lg transition animate-pulse"
                            >
                              Əlavə et
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {editIntlNotIncludes.map((exc, index) => (
                              <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-800 text-[10px] font-bold border border-red-150 rounded-sm">
                                {exc}
                                <button type="button" onClick={() => removeEditNotInclItem(index)} className="text-red-500 hover:text-red-700 font-extrabold ml-1">×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Highlights, Languages & Important Info */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div>
                          <label className="block text-xs font-bold text-emerald-800 mb-1">Önə çıxanlar (Vergüllə ayırın):</label>
                          <input
                            type="text"
                            value={editTourHighlights}
                            onChange={(e) => setEditTourHighlights(e.target.value)}
                            placeholder="Panoram mənzərəli marşrut, Peşəkar bələdçi müşayiəti"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-emerald-800 mb-1">Danışılan dillər (Vergüllə ayırın):</label>
                            <input
                              type="text"
                              value={editTourLanguages}
                              onChange={(e) => setEditTourLanguages(e.target.value)}
                              placeholder="Azərbaycanca, Rusca, İngiliscə"
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-emerald-800 mb-1">Özünüzlə gətirin (Vergüllə ayırın):</label>
                            <input
                              type="text"
                              value={editTourBringItems}
                              onChange={(e) => setEditTourBringItems(e.target.value)}
                              placeholder="Pasport, Hava şəraitinə uyğun geyim"
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-red-800 mb-1">İcazə verilmir (Vergüllə ayırın):</label>
                          <input
                            type="text"
                            value={editTourNotAllowedItems}
                            onChange={(e) => setEditTourNotAllowedItems(e.target.value)}
                            placeholder="Böyük çamadanlar, Müşayiətsiz yetkinlik yaşına çatmayanlar"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                          />
                        </div>
                      </div>

                      {/* Itinerary */}
                      <div className="space-y-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-emerald-800 tracking-wider">
                            E) Proqram (Günbəgün Aktiv Gündəlik Planı)
                          </h3>
                          <button
                            type="button"
                            onClick={handleEditIntlAddDay}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            ⏳ Gün Əlavə Et +
                          </button>
                        </div>

                        <div className="space-y-4">
                          {editIntlItinerary.map((iti, index) => (
                            <div key={index} className="border border-slate-200 p-4 rounded-xl bg-slate-50 relative space-y-3">
                              <div className="flex justify-between items-center bg-slate-200/50 p-1.5 rounded-lg">
                                <span className="text-xs font-extrabold text-[#065f46]">
                                  📅 {iti.day}-ci Gün Planı
                                </span>
                                {editIntlItinerary.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleEditIntlRemoveDay(index)}
                                    className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-0.5"
                                  >
                                    Günü Sil 🗑️
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Günlük Başlıq (məs: "Bakıdan gəliş")</label>
                                  <input
                                    type="text"
                                    required
                                    value={iti.title}
                                    onChange={(e) => handleEditIntlItineraryChange(index, 'title', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-250 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Günün Şəkili</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="file"
                                      id={`edit-intl-itinerary-file-${index}`}
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            handleEditIntlItineraryChange(index, 'image', reader.result as string);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                    
                                    {!iti.image ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          document.getElementById(`edit-intl-itinerary-file-${index}`)?.click();
                                        }}
                                        className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/20 text-slate-500 hover:text-emerald-700 text-xs py-2 px-3 rounded-lg transition-all cursor-pointer font-bold"
                                      >
                                        📁 Şəkil Yüklə
                                      </button>
                                    ) : (
                                      <div className="flex items-center gap-3 bg-emerald-50/40 border border-emerald-100 p-1.5 rounded-lg w-full">
                                        <img src={iti.image || undefined} alt="Step Program" className="w-12 h-9 object-cover rounded-md" />
                                        <div className="min-w-0 flex-1">
                                          <span className="text-[10px] font-bold text-emerald-800 block">Şəkil yükləndi</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => document.getElementById(`edit-intl-itinerary-file-${index}`)?.click()}
                                            className="text-[10px] text-indigo-600 font-bold"
                                          >
                                            Dəyiş
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleEditIntlItineraryChange(index, 'image', '')}
                                            className="text-[10px] text-red-500 font-bold"
                                          >
                                            Sil
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Günlük fəaliyyətlərin tam təsviri</label>
                                  <textarea
                                    rows={2}
                                    required
                                    value={iti.description}
                                    onChange={(e) => handleEditIntlItineraryChange(index, 'description', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-slate-250 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                } else {
                  return (
                    <>
                      {/* Tour Name */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 tracking-wider mb-1">Turun Başlığı (Adı/İpucu):</label>
                        <input
                          type="text"
                          value={editTourName}
                          onChange={(e) => setEditTourName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-xs"
                          placeholder="Məsələn: Kuzun Laza Dağ Yürüşü"
                        />
                      </div>

                      {/* Grid: Category, Difficulty, Days, Region */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 tracking-wide mb-1">Kateqoriya:</label>
                          <select
                            value={editTourCategory}
                            onChange={(e) => setEditTourCategory(e.target.value as any)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold text-xs"
                          >
                            <option value="hiking">Dağ Yürüşü (Hiking)</option>
                            <option value="camp">Gecələməli Kamp (Camping)</option>
                            <option value="peak">Zirvə Dırmanışı (Mountain Peak)</option>
                            <option value="active">🏃‍♂️ Aktiv Həyat (İdman və Macəra)</option>
                          </select>
                        </div>

                        {editTourCategory !== 'active' && (
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 tracking-wide mb-1">Çətinlik Kriteriyası:</label>
                            <select
                              value={editTourDifficulty}
                              onChange={(e) => setEditTourDifficulty(e.target.value as any)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold text-xs"
                            >
                              <option value="easy">Asan (Gəzinti)</option>
                              <option value="medium">Orta (Standart dağlıq)</option>
                              <option value="hard">Çətin (Dik dırmanış)</option>
                              <option value="extreme">Ekstremal (Xüsusi hazırlıq)</option>
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 tracking-wide mb-1">Coğrafi Region / İstiqamət:</label>
                          <input
                            type="text"
                            value={editTourRegion}
                            onChange={(e) => setEditTourRegion(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold text-xs"
                            placeholder="Məsələn: Qusar (Laza kəndi)"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 tracking-wide mb-1">Müddət (Gün sayı):</label>
                          <input
                            type="number"
                            min={1}
                            max={14}
                            value={editTourDays}
                            onChange={(e) => setEditTourDays(parseInt(e.target.value, 10) || 1)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold text-xs"
                          />
                        </div>
                      </div>

                      {editTourCategory === 'active' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-xs mt-4">
                          <div className="md:col-span-2 pb-2 mb-2 border-b border-amber-200">
                            <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 tracking-wider">
                              🏅 AKTİV HƏYAT VƏ MACƏRA PARAMETRLƏRİ
                            </h4>
                          </div>
                          
                          <div>
                            <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">İdman / Fəaliyyət Növü:</label>
                            <select
                              value={editTourActivityType}
                              onChange={(e) => setEditTourActivityType(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                              value={editTourActiveDifficulty}
                              onChange={(e) => setEditTourActiveDifficulty(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                              value={editTourAgeLimit}
                              onChange={(e) => setEditTourAgeLimit(e.target.value)}
                              placeholder="Məs: 18-45 yaş, Qadınlar üçün"
                              className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">Görüş Yeri & Toplanış Nöqtəsi:</label>
                            <input
                              type="text"
                              value={editTourMeetingPoint}
                              onChange={(e) => setEditTourMeetingPoint(e.target.value)}
                              placeholder="Məs: Gənclik Mall M/S və ya Maps Link"
                              className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">Zəruri Avadanlıqlar (Təchizat Siyahısı):</label>
                            <textarea
                              rows={2}
                              value={editTourRequiredEquipment}
                              onChange={(e) => setEditTourRequiredEquipment(e.target.value)}
                              placeholder="Məs: Xizək dəsti, kaska, əlcək, termal geyim, su qabı..."
                              className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="editOptAvt"
                              checked={editTourEquipmentIncluded}
                              onChange={(e) => setEditTourEquipmentIncluded(e.target.checked)}
                              className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <label htmlFor="editOptAvt" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">
                              ✅ Avadanlıqlar bilet qiymətinə daxildir
                            </label>
                          </div>

                          {!editTourEquipmentIncluded && (
                            <div>
                              <label className="block text-[11px] font-bold text-amber-700 tracking-wide mb-1">Kirayə Haqqı (+AZN):</label>
                              <input
                                type="number"
                                min="0"
                                value={editTourEquipmentRentalPrice}
                                onChange={(e) => setEditTourEquipmentRentalPrice(Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                                placeholder="Məs: 15 AZN"
                              />
                            </div>
                          )}
                          {editTourEquipmentIncluded && <div />}

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="editOptTeam"
                              checked={editTourAllowTeamRegistration}
                              onChange={(e) => setEditTourAllowTeamRegistration(e.target.checked)}
                              className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <label htmlFor="editOptTeam" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">
                              👥 Komanda qeydiyyatına izn verilsin
                            </label>
                          </div>

                          <div className="md:col-span-2 mt-2">
                            <label className="block text-[11px] font-bold text-rose-700 tracking-wide mb-1">Təhlükəsizlik və Tibbi Təlimat:</label>
                            <textarea
                              rows={3}
                              value={editTourSafetyInstructions}
                              onChange={(e) => setEditTourSafetyInstructions(e.target.value)}
                              placeholder="Macəra idmanının risklərini və iştirakçının sağlamlıqla bağlı bilməli olduğu təhlükəsizlik razılaşmasını bura yazın..."
                              className="w-full px-3.5 py-2.5 bg-white border border-rose-300 ring-1 ring-rose-100 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                          </div>

                          <div className="md:col-span-2 mt-2">
                            <label className="block text-[11px] font-bold text-emerald-700 tracking-wide mb-1">Tədbirin Planlaması:</label>
                            <select
                              value={editTourScheduleFrequency}
                              onChange={(e) => setEditTourScheduleFrequency(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                        </div>
                      )}

                      {/* Grid: Image URL, WhatsApp */}
                      <div className="space-y-3">
                        <label className="block text-[10px] font-extrabold text-slate-500 tracking-widest">Kover Foto / Şəkil Seçimi:</label>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                          <span className="text-[10px] text-slate-500 block font-bold">Cihazdan yeni kover şəkil faylı yükləyin:</span>
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEditTourImageChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-full px-3 py-2.5 bg-white hover:bg-slate-50 border border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl text-xs flex items-center justify-center gap-2 text-emerald-800 font-bold transition shadow-2xs">
                              <Plus className="w-4 h-4 text-emerald-600" />
                              <span>Kover Foto Seçin 📁</span>
                            </div>
                          </div>

                          {editTourImage && (
                            <div className="relative inline-block mt-1.5 rounded-xl overflow-hidden border border-slate-200 shadow-xs max-h-36 group">
                              <img src={editTourImage || undefined} alt="Kover Şəkil" className="h-24 w-auto object-cover rounded-xl" />
                              <button
                                type="button"
                                onClick={() => {
                                  setEditTourImage('');
                                  if (onShowNotification) onShowNotification('Şəkil təmizləndi', 'info');
                                }}
                                className="absolute top-1 right-1 bg-red-650 hover:bg-red-750 text-white p-1 rounded-full shadow-md transition cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Multiple Gallery Images for Editing */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <label className="block text-[10px] font-extrabold text-slate-500 tracking-widest">Qalereya Şəkilləri (Çoxlu şəkil yükləyin):</label>
                        <div className="relative">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleEditMultipleImagesChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-emerald-350 hover:border-emerald-500 rounded-xl text-xs flex items-center justify-center gap-2 text-emerald-800 font-bold transition">
                            <Plus className="w-4 h-4 text-emerald-600" />
                            <span>Cihazdan çoxlu şəkil seçin (Multi-upload) 📁📸</span>
                          </div>
                        </div>

                        {editTourImages.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {editTourImages.map((img, idx) => (
                              <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 shadow-xs h-16 w-24 flex-shrink-0 group">
                                <img src={img || undefined} alt={`Gallery Preview ${idx}`} className="h-full w-full object-cover rounded-xl" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditTourImages(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="absolute top-1 right-1 bg-red-650 hover:bg-red-750 text-white p-0.5 rounded-full shadow-xs transition cursor-pointer"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Multiple Gallery Videos for Editing */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <label className="block text-[10px] font-extrabold text-slate-500 tracking-widest">Qalereya Videoları (Videolar yükləyin):</label>
                        <div className="relative">
                          <input
                            type="file"
                            multiple
                            accept="video/*"
                            onChange={handleEditMultipleVideosChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-sky-350 hover:border-sky-500 rounded-xl text-xs flex items-center justify-center gap-2 text-sky-800 font-bold transition">
                            <Plus className="w-4 h-4 text-sky-600" />
                            <span>Cihazdan çoxlu video seçin (Video-upload) 📁🎥</span>
                          </div>
                        </div>

                        {editTourVideos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {editTourVideos.map((vid, idx) => (
                              <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 shadow-xs h-20 w-32 flex-shrink-0 group bg-black font-sans">
                                <video src={vid || undefined} className="h-full w-full object-contain" muted playsInline />
                                <div className="absolute bottom-1 left-1 bg-slate-900/80 text-white font-bold text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                                  <span>VİDEO</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditTourVideos(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="absolute top-1 right-1 bg-red-650 hover:bg-red-750 text-white p-0.5 rounded-full shadow-xs transition cursor-pointer z-10"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 tracking-wide mb-1">WhatsApp Əlaqə Nömrəsi:</label>
                        <input
                          type="text"
                          value={editTourWhatsApp}
                          onChange={(e) => setEditTourWhatsApp(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold font-mono text-xs"
                          placeholder="+994XXXXXXXXX"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-emerald-800 tracking-wide mb-1">
                          Back-office Reytinq Təyini (1-5 Ulduz):
                        </label>
                        <select
                          value={editTourRating}
                          onChange={(e) => setEditTourRating(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-xs font-bold text-slate-800"
                        >
                          <option value="5">⭐⭐⭐⭐⭐ 5.0 (Tövsiyə olunan / Sponsorlu)</option>
                          <option value="4.8">⭐⭐⭐⭐⭐ 4.8 (Əla satışlı)</option>
                          <option value="4.5">⭐⭐⭐⭐☆ 4.5 (Çox yaxşı)</option>
                          <option value="4">⭐⭐⭐⭐☆ 4.0 (Yaxşı)</option>
                          <option value="3">⭐⭐⭐☆☆ 3.0 (Orta)</option>
                          <option value="2">⭐⭐☆☆☆ 2.0 (Zəif)</option>
                        </select>
                        <span className="text-[9px] text-slate-400 mt-1 block italic font-medium">
                          * Zəif satılan turlara süni 5 ulduz xalı təyin edib tövsiyələrdə ön sıralara yerləşdirin.
                        </span>
                      </div>

                      {/* Inclusions */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 tracking-wide mb-1">Təminatlar / Daxil olanlar (Vergüllə ayırın):</label>
                        <textarea
                          rows={2}
                          value={editTourIncludes}
                          onChange={(e) => setEditTourIncludes(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold text-xs"
                          placeholder="Komfort Nəqliyyat, Səhər Yeməyi, Dağ bələdçisi, Milli Parka giriş"
                        />
                      </div>

                      {/* Highlights */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 tracking-wide mb-1">Önə çıxanlar (Vergüllə ayırın):</label>
                        <textarea
                          rows={2}
                          value={editTourHighlights}
                          onChange={(e) => setEditTourHighlights(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold text-xs"
                          placeholder="Panoram mənzərəli marşrut, Peşəkar bələdçi müşayiəti"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 tracking-wide mb-1">Danışılan dillər (Vergüllə ayırın):</label>
                          <input
                            type="text"
                            value={editTourLanguages}
                            onChange={(e) => setEditTourLanguages(e.target.value)}
                            placeholder="Azərbaycanca, Rusca, İngiliscə"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 tracking-wide mb-1">Tam müddət (saat):</label>
                          <input
                            type="number"
                            min={1}
                            value={editTourDurationHours}
                            onChange={(e) => setEditTourDurationHours(Number(e.target.value))}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 tracking-wide mb-1">Özünüzlə gətirin (Vergüllə ayırın):</label>
                          <input
                            type="text"
                            value={editTourBringItems}
                            onChange={(e) => setEditTourBringItems(e.target.value)}
                            placeholder="Rahat ayaqqabı, Pasport, Hava şəraitinə uyğun geyim"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 tracking-wide mb-1">İcazə verilmir (Vergüllə ayırın):</label>
                          <input
                            type="text"
                            value={editTourNotAllowedItems}
                            onChange={(e) => setEditTourNotAllowedItems(e.target.value)}
                            placeholder="Böyük çamadanlar, Müşayiətsiz yetkinlik yaşına çatmayanlar"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold text-xs"
                          />
                        </div>
                      </div>

                      {/* GPX Track Uploader (Edit Mode) */}
                      <div className="bg-slate-50 border border-slate-205 p-4 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-extrabold text-slate-500 tracking-wide">
                            GPS Marşrut Faylı (GPX və ya KML)
                          </label>
                          <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            3D XƏRİTƏ VİZUALİZASİYASI ⛰️
                          </span>
                        </div>
                        
                        {!editTourGpxFileName ? (
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
                                Müştərilərə 3D hündürlük və real trek xəritəsi göstərmək üçün GPX faylı yükləyin
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="p-1 px-1.5 text-[10px] font-bold text-white bg-indigo-600 rounded animate-pulse">GPS</span>
                                <span className="text-xs font-bold text-indigo-950 truncate max-w-[200px]" title={editTourGpxFileName}>
                                  {editTourGpxFileName}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditTourGpxData('');
                                  setEditTourGpxFileName('');
                                }}
                                className="text-[10px] font-black text-red-650 hover:text-red-750 tracking-wide cursor-pointer transition"
                              >
                                Sil ✕
                              </button>
                            </div>
                            
                            {/* Parsed stats preview */}
                            {editTourGpxData && (() => {
                              try {
                                const parsed = JSON.parse(editTourGpxData);
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

                      {/* Description */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 tracking-wide mb-1">Turun Detallı Reqlamenti və Təsviri:</label>
                        <textarea
                          rows={6}
                          value={editTourDescription}
                          onChange={(e) => setEditTourDescription(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-xs font-medium"
                          placeholder="Tur haqqında tam ətraflı məlumat mətni"
                        />
                      </div>
                    </>
                  );
                }
              })()}

              {/* Status & Danger Zone */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-[10px] font-extrabold text-red-700 tracking-widest flex items-center gap-1">⚠️ Status və Təhlükəli Zona</h4>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  {/* Status Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block font-extrabold text-slate-850 text-xs">Aktiv / Deaktiv Rejimi</span>
                      <span className="block text-[10px] text-slate-500 font-medium">Deaktiv edildikdə bu tur və onun daxilindəki bütün yürüş tarixləri (slotlar) müştərilərə göstərilmir.</span>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setEditTourIsActive(!editTourIsActive)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          editTourIsActive ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            editTourIsActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Delete Option */}
                  <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="block font-extrabold text-red-000 text-slate-800 text-xs">Məlumatı Sil (Geri Qaytarıla Bilməz!)</span>
                      <span className="block text-[10px] text-slate-500 font-medium">Bu tur marşrutunu bazadan birdəfəlik təmizləmək istəyirsinizsə, aşağıdan "Turu Sil" düyməsini klikləyin.</span>
                    </div>
                    <div>
                      {showDeleteConfirm ? (
                        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200/60 p-2 rounded-xl animate-fadeIn">
                          <span className="text-[9px] font-black text-rose-800 tracking-wide">Silinsin?</span>
                          <button
                            type="button"
                            onClick={async () => {
                              if (onDeleteTour && tour) {
                                try {
                                  await onDeleteTour(tour.id);
                                  onClose();
                                  setShowDeleteConfirm(false);
                                } catch {
                                  // App.tsx's handleDeleteTour already showed an error toast
                                }
                              } else if (onShowNotification) {
                                onShowNotification('Silmə funksiyası sistem tərəfindən idarə edilə bilmədi.', 'error');
                              }
                            }}
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[9px] rounded-lg transition active:scale-95 cursor-pointer shadow-xs"
                          >
                            Bəli, Sil
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[9px] rounded-lg transition active:scale-95 cursor-pointer"
                          >
                            İmtina et
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-xl font-bold text-[10px] cursor-pointer transition active:scale-95 flex items-center gap-1 shadow-xs"
                        >
                          <Trash className="w-3.5 h-3.5" />
                          <span>Turu Tamamilə Sil</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition"
                onClick={() => onClose()}
              >
                Ləğv Et
              </button>
              <button
                type="button"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition flex items-center gap-1.5 shadow-sm"
                onClick={async () => {
                  if (onEditTour && tour) {
                    const isIntl = tour.isInternational || tour.category === 'international';
                    const cleanIncludes = isIntl ? editIntlIncludes : editTourIncludes.split(',').map(s => s.trim()).filter(Boolean);
                    const cleanHighlights = editTourHighlights.split(',').map(s => s.trim()).filter(Boolean);
                    const cleanLanguages = editTourLanguages.split(',').map(s => s.trim()).filter(Boolean);
                    const cleanBringItems = editTourBringItems.split(',').map(s => s.trim()).filter(Boolean);
                    const cleanNotAllowedItems = editTourNotAllowedItems.split(',').map(s => s.trim()).filter(Boolean);
                    const cleanImportantInfo = (cleanBringItems.length > 0 || cleanNotAllowedItems.length > 0) ? {
                      bring: cleanBringItems.length > 0 ? cleanBringItems : undefined,
                      notAllowed: cleanNotAllowedItems.length > 0 ? cleanNotAllowedItems : undefined,
                    } : undefined;

                    // Track edited fields for Admin notification
                    const changes: string[] = [];
                    if (tour.name !== editTourName) changes.push(`Ad (${tour.name} ➡️ ${editTourName})`);
                    if ((tour.isActive !== false) !== editTourIsActive) {
                      changes.push(`Status (${(tour.isActive !== false) ? 'Aktiv' : 'Deaktiv'} ➡️ ${editTourIsActive ? 'Aktiv' : 'Deaktiv'})`);
                    }
                    if (tour.image !== editTourImage) {
                      changes.push("Kover Şəkil dəyişdi 🖼️");
                    }
                    if ((tour.whatsapp_number || '') !== editTourWhatsApp) {
                      changes.push(`WhatsApp (${tour.whatsapp_number || 'Yoxdur'} ➡️ ${editTourWhatsApp || 'Yoxdur'})`);
                    }

                    let lastChangeLog = '';
                    let updatedTour: Tour;

                    if (isIntl) {
                      changes.push("Xarici tur rekvizitləri yeniləndi ✈️");
                      lastChangeLog = changes.join(' | ');

                      updatedTour = {
                        ...tour,
                        name: editTourName,
                        category: 'international',
                        difficulty: 'easy',
                        description: `Bu ${editIntlTourCountry} (${editIntlTourCity}) turu üçün xüsusi layihələndirilib. ${editIntlTourNights} gecə və ${editTourDays} gündüz davam edir. Otel: ${editIntlTourHotelName} (${editIntlTourHotelStars}*).`,
                        region: `${editIntlTourCountry}, ${editIntlTourCity}`,
                        durationDays: Number(editTourDays),
                        includes: editIntlIncludes.length > 0 ? editIntlIncludes : ['Müşayiət bələdçisi'],
                        notIncluded: editIntlNotIncludes,
                        image: editTourImage,
                        images: editTourImages,
                        videos: editTourVideos,
                        isActive: editTourIsActive,
                        isApproved: false, // Reset approval state so admin must re-check edited content
                        whatsapp_number: editTourWhatsApp || '+994706717804',
                        rating: editTourRating,
                        lastChangeLog,
                        isInternational: true,
                        destinationCountry: editIntlTourCountry,
                        destinationCity: editIntlTourCity,
                        durationNights: Number(editIntlTourNights),
                        flightIncluded: editIntlTourFlightIncluded,
                        flightDetails: editIntlTourFlightDetails || (editIntlTourFlightIncluded ? 'Azərbaycan Hava Yolları, Bakıdan gediş-dönüş baqaj daxil' : 'Aviabilet daxil deyil'),
                        transferDetails: editIntlTourTransferDetails || 'Hava limanından qarşılanma və otelə transfer daxildir.',
                        hotelName: editIntlTourHotelName,
                        hotelStars: Number(editIntlTourHotelStars),
                        roomTypes: [
                          { name: 'Double', priceDiff: Number(editIntlRoomDoubleDiff) },
                          { name: 'Twin', priceDiff: Number(editIntlRoomTwinDiff) },
                          { name: 'Single', priceDiff: Number(editIntlRoomSingleDiff) }
                        ],
                        mealType: editIntlTourMealType,
                        priceCurrency: editIntlTourCurrency,
                        itinerary: editIntlItinerary,
                        durationHours: editTourDurationHours ? Number(editTourDurationHours) : undefined,
                        highlights: cleanHighlights.length > 0 ? cleanHighlights : undefined,
                        languages: cleanLanguages.length > 0 ? cleanLanguages : undefined,
                        importantInfo: cleanImportantInfo
                      };
                    } else {
                      if (tour.category !== editTourCategory) changes.push(`Kateqoriya (${tour.category} ➡️ ${editTourCategory})`);
                      if (tour.difficulty !== editTourDifficulty) changes.push(`Çətinlik (${tour.difficulty} ➡️ ${editTourDifficulty})`);
                      if (tour.region !== editTourRegion) changes.push(`Region (${tour.region} ➡️ ${editTourRegion})`);
                      if (tour.durationDays !== Number(editTourDays)) changes.push(`Gün sayısı (${tour.durationDays} Gün ➡️ ${editTourDays} Gün)`);
                      if (tour.description !== editTourDescription) {
                        changes.push("Təsvir mətni (Dəyişdirildi 📝)");
                      }
                      
                      const oldIncludesStr = (tour.includes || []).join(', ');
                      const newIncludesStr = cleanIncludes.join(', ');
                      if (oldIncludesStr !== newIncludesStr) {
                        changes.push("Təminatlar (Dəyişdirildi)");
                      }
                      
                      const oldImagesCount = (tour.images || []).length;
                      const newImagesCount = editTourImages.length;
                      if (oldImagesCount !== newImagesCount) {
                        changes.push(`Qalereya şəkilləri (Sayı: ${oldImagesCount} ➡️ ${newImagesCount})`);
                      }
                      const oldVideosCount = (tour.videos || []).length;
                      const newVideosCount = editTourVideos.length;
                      if (oldVideosCount !== newVideosCount) {
                        changes.push(`Qalereya videoları (Sayı: ${oldVideosCount} ➡️ ${newVideosCount})`);
                      }

                      lastChangeLog = changes.length > 0 ? changes.join(' | ') : 'Xırda düzəlişlər';

                      updatedTour = {
                        ...tour,
                        name: editTourName,
                        category: editTourCategory,
                        difficulty: editTourDifficulty,
                        region: editTourRegion,
                        durationDays: Number(editTourDays),
                        durationHours: editTourDurationHours ? Number(editTourDurationHours) : undefined,
                        description: editTourDescription,
                        includes: cleanIncludes.length > 0 ? cleanIncludes : ['Müşayiət bələdçisi'],
                        highlights: cleanHighlights.length > 0 ? cleanHighlights : undefined,
                        languages: cleanLanguages.length > 0 ? cleanLanguages : undefined,
                        importantInfo: cleanImportantInfo,
                        image: editTourImage,
                        images: editTourImages,
                        videos: editTourVideos,
                        isActive: editTourIsActive,
                        isApproved: false, // Reset approval state so admin must re-check edited content
                        whatsapp_number: editTourWhatsApp || '+994706717804',
                        rating: editTourRating,
                        lastChangeLog,
                        gpxData: editTourGpxData || undefined,
                        gpxFileName: editTourGpxFileName || undefined,
                        
                        // Active Lifestyle specifics
                        isActiveLife: editTourCategory === 'active',
                        activityType: editTourCategory === 'active' ? editTourActivityType : undefined,
                        activeDifficulty: editTourCategory === 'active' ? (editTourActiveDifficulty as 'beginner' | 'medium' | 'professional') : undefined,
                        ageLimit: editTourCategory === 'active' ? editTourAgeLimit : undefined,
                        meetingPoint: editTourCategory === 'active' ? editTourMeetingPoint : undefined,
                        requiredEquipment: editTourCategory === 'active' ? editTourRequiredEquipment : undefined,
                        equipmentIncluded: editTourCategory === 'active' ? editTourEquipmentIncluded : undefined,
                        equipmentRentalPrice: editTourCategory === 'active' ? editTourEquipmentRentalPrice : undefined,
                        safetyInstructions: editTourCategory === 'active' ? editTourSafetyInstructions : undefined,
                        allowTeamRegistration: editTourCategory === 'active' ? editTourAllowTeamRegistration : undefined,
                        scheduleFrequency: editTourCategory === 'active' ? editTourScheduleFrequency : undefined,
                      };
                    }

                    try {
                      await onEditTour(updatedTour);
                      if (onShowNotification) {
                        onShowNotification('Tur məlumatları yeniləndi və yenidən təsdiqlənməsi üçün Admin nümayəndəsinə göndərildi! ⏳✨', 'info');
                      }
                      onClose();
                    } catch {
                      // App.tsx's handleEditTour already showed an error toast
                    }
                  }
                }}
              >
                <Check className="w-4 h-4 text-white" />
                Dəyişiklikləri Saxla
              </button>
            </div>

          </div>
        </div>
  );
}
