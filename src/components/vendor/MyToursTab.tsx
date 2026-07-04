import React, { useState, useEffect } from 'react';
import { Tour, TourSlot } from '../../types';
import { Calendar, Edit, Search, Star } from 'lucide-react';
import { computeFeaturedTourIds } from '../../utils/featuredTours';

interface MyToursTabProps {
  tours: Tour[];
  slots: TourSlot[];
  myTours: Tour[];
  myTourIds: string[];
  tourSearchTerm: string;
  onTourSearchChange: (value: string) => void;
  exchangeRates: { USD: number; EUR: number };
  onUpdateExchangeRates: (newRates: { USD: number; EUR: number }) => void;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onEditClick: (tour: Tour) => void;
  onToggleFeatured?: (tourId: string, isManuallyFeatured: boolean) => Promise<void>;
}

export function MyToursTab({ tours, slots, myTours, myTourIds, tourSearchTerm, onTourSearchChange, exchangeRates, onUpdateExchangeRates, onShowNotification, onEditClick, onToggleFeatured }: MyToursTabProps) {
  const [cbarLoading, setCbarLoading] = useState<boolean>(false);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<string | null>(null);
  const featuredTourIds = React.useMemo(() => computeFeaturedTourIds(tours, slots), [tours, slots]);

  const handleFeaturedClick = async (tour: Tour) => {
    if (!onToggleFeatured) return;
    setTogglingFeaturedId(tour.id);
    try {
      await onToggleFeatured(tour.id, !tour.isManuallyFeatured);
    } finally {
      setTogglingFeaturedId(null);
    }
  };

  // exchangeRates is owned by the parent (plain numbers), so the input can't just bind
  // straight to it — clearing the field would send Number('') === 0 straight back in and
  // the box would look "stuck". These local string drafts let the field go empty while
  // typing; a valid number is pushed up to the parent on every keystroke, and an empty
  // field snaps back to the last known-good rate on blur instead of silently becoming 0.
  const [usdDraft, setUsdDraft] = useState<string>(String(exchangeRates.USD));
  const [eurDraft, setEurDraft] = useState<string>(String(exchangeRates.EUR));
  useEffect(() => { setUsdDraft(String(exchangeRates.USD)); }, [exchangeRates.USD]);
  useEffect(() => { setEurDraft(String(exchangeRates.EUR)); }, [exchangeRates.EUR]);

  const handleRateChange = (currency: 'USD' | 'EUR') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (currency === 'USD') setUsdDraft(raw); else setEurDraft(raw);
    if (raw !== '' && !isNaN(Number(raw))) {
      onUpdateExchangeRates({ ...exchangeRates, [currency]: Number(raw) });
    }
  };
  const handleRateBlur = (currency: 'USD' | 'EUR') => () => {
    if (currency === 'USD' && usdDraft === '') setUsdDraft(String(exchangeRates.USD));
    if (currency === 'EUR' && eurDraft === '') setEurDraft(String(exchangeRates.EUR));
  };

  const fetchCbarRates = async () => {
    setCbarLoading(true);
    try {
      const response = await fetch('/api/exchange-rates/cbar');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.USD && data.EUR) {
          onUpdateExchangeRates({ USD: data.USD, EUR: data.EUR });
          if (onShowNotification) {
            onShowNotification(`🎉 CBAR rəsmi məzənnələri uğurla yeniləndi! USD: ${data.USD} AZN, EUR: ${data.EUR} AZN`, 'success');
          }
        } else {
          throw new Error("Məlumat düzgün oxunmadı");
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Məzənnə serverindən xəta cavabı alındı");
      }
    } catch (err: any) {
      if (onShowNotification) {
        onShowNotification(`❌ Məzənnə gətirilərkən səhv oldu: ${err.message}`, 'error');
      }
    } finally {
      setCbarLoading(false);
    }
  };

  return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of current tours */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-slate-400 tracking-widest">Aktiv Marşrutlarım</h3>
              <div className="relative w-full sm:max-w-[240px]">
                <input
                  type="text"
                  placeholder="Məkan və ya tur adı ilə axtar..."
                  value={tourSearchTerm}
                  onChange={(e) => onTourSearchChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-700 p-2 pl-8 pr-3 text-xs rounded-xl focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/50 transition shadow-xs placeholder-slate-400"
                />
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
            
            {myTours.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-400 italic text-xs">
                Hələ heç bir tur marşrutu daxil etməmisiniz. Yeni Marşrut Yarat düyməsindən istifadə edin.
              </div>
            ) : (
              myTours.map((tour) => {
                const tourSlots = slots.filter(s => s.tourId === tour.id);
                return (
                  <div key={tour.id} className="bg-white border border-slate-200 rounded-lg p-4 flex gap-4 items-center justify-between shadow-xs">
                    <img 
                      src={tour.image || undefined} 
                      alt="" 
                      className="w-14 h-14 rounded object-cover border border-slate-150 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-xs leading-tight">{tour.name}</h4>
                        {featuredTourIds.has(tour.id) && (
                          <span className="inline-flex items-center gap-1 text-[9px] bg-amber-100 text-amber-800 border border-amber-200 font-extrabold px-1.5 py-0.5 rounded-full">
                            🔥 Ayın Ən Çox Satılanı{tour.isManuallyFeatured ? ' (Seçilmiş)' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>📍 {tour.region}</span>
                        <span>•</span>
                        <span className="font-bold text-emerald-700 tracking-wider">
                          {tour.category.toUpperCase()} ({tour.difficulty.toUpperCase()})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        Aktiv Satış Slotu: <strong className="text-slate-700 font-mono">{tourSlots.length} ədəd</strong>
                      </div>
                      {tour.status === 'rejected' && (
                        <div className="text-[10px] text-red-700 font-semibold bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 max-w-md">
                          <span className="block">⚠️ Admin tərəfindən rədd edildi — düzəliş edib yenidən göndərməlisiniz. Təsdiqlənənə qədər müştərilərə görünməyəcək.</span>
                          {tour.rejectionReason && (
                            <span className="block mt-1 text-red-800">
                              <strong>Səbəb:</strong> {tour.rejectionReason}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {tour.isActive === false ? (
                        <span className="text-[9px] bg-rose-50 text-rose-800 border border-rose-100 font-bold px-2 py-0.5 rounded-full">
                          Deaktiv edilib (Görünmür)
                        </span>
                      ) : tour.status === 'rejected' ? (
                        <span className="text-[9px] bg-red-50 text-red-800 border border-red-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          ❌ Rədd olundu - Düzəliş et
                        </span>
                      ) : tour.status === 'pending_approval' ? (
                        <span className="text-[9px] bg-amber-55/60 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          ⏳ Təsdiq gözləyir
                        </span>
                      ) : (
                        <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold px-2 py-0.5 rounded-full">
                          Aktiv Satışda
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditClick(tour)}
                        className="flex items-center gap-1 py-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] rounded-md transition-all cursor-pointer shadow-xs"
                      >
                        <Edit className="w-2.5 h-2.5" />
                        <span>Düzəliş et</span>
                      </button>
                      {onToggleFeatured && (
                        <button
                          type="button"
                          onClick={() => handleFeaturedClick(tour)}
                          disabled={togglingFeaturedId === tour.id}
                          className={`flex items-center gap-1 py-1 px-2.5 font-extrabold text-[10px] rounded-md transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
                            tour.isManuallyFeatured
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                              : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <Star className="w-2.5 h-2.5" />
                          <span>{tour.isManuallyFeatured ? 'Seçimi ləğv et' : 'Seçilmiş et'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Valyuta Məzənnələri Manager Card */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl border border-amber-250 bg-gradient-to-b from-amber-500/3 to-transparent space-y-4 h-fit shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">💱</span>
                <div>
                  <h4 className="text-xs font-black text-amber-950 tracking-wider">Cari Valyuta Məzənnələri</h4>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Xarici turlarda xərclərin AZN ekvivalentini hesablamaq üçün məzənnələri tənzimləyin.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 space-y-1">
                  <span className="text-[9px] text-slate-400 font-extrabold tracking-wider block">1 USD ($)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={usdDraft}
                      onChange={handleRateChange('USD')}
                      onBlur={handleRateBlur('USD')}
                      className="w-full bg-white border border-slate-200 text-slate-900 font-bold p-1 text-center text-xs rounded focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-500 font-bold">₼</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 space-y-1">
                  <span className="text-[9px] text-slate-400 font-extrabold tracking-wider block">1 EUR (€)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={eurDraft}
                      onChange={handleRateChange('EUR')}
                      onBlur={handleRateBlur('EUR')}
                      className="w-full bg-white border border-slate-200 text-slate-900 font-bold p-1 text-center text-xs rounded focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-500 font-bold">₼</span>
                  </div>
                </div>
              </div>
              
              <div className="text-[9px] text-amber-800 bg-amber-50/70 p-2 rounded border border-amber-200/50 flex gap-1 items-start leading-relaxed font-medium">
                <span className="mt-0.5">ℹ️</span>
                <p>Məzənnə dəyişdikdə, müştəri tərəfindəki xarici bilet qiymətlərinin AZN ekvivalentləri avtomatik yenilənəcəkdir.</p>
              </div>

              <button
                type="button"
                disabled={cbarLoading}
                onClick={fetchCbarRates}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {cbarLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Məzənnə gətirilir...
                  </>
                ) : (
                  <>
                    🔄 Canlı CBAR Məzənnəsini Yenilə
                  </>
                )}
              </button>
            </div>

            {/* Slots overview widget */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 h-fit shadow-xs">
            <h4 className="text-xs font-bold text-slate-400 tracking-widest">Aktiv Təqvim Planı (Capacity)</h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              Aşağıdakı bələdçi tarixlərindən limitlərin və ümumi doluluq faizlərinin real-time göstəricilərini izləyin.
            </p>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {slots.filter(s => myTourIds.includes(s.tourId)).length === 0 ? (
                <div className="text-center p-6 text-slate-400 italic text-[11px]">Planlaşdırılmış aktiv slot yoxdur.</div>
              ) : (
                slots.filter(s => myTourIds.includes(s.tourId)).map((slot) => {
                  const associatedTour = tours.find(t => t.id === slot.tourId);
                  const tourName = associatedTour?.name || '';
                  const isFull = slot.bookedCount >= slot.capacity;
                  const fillPercent = Math.min(100, Math.floor((slot.bookedCount / slot.capacity) * 100));
                  
                  const curr = associatedTour?.priceCurrency || 'AZN';
                  let formattedPrice = `${slot.price} ₼`;
                  if (curr === 'USD') {
                    const aznPortion = Math.round(slot.price * (exchangeRates?.USD || 1.7));
                    formattedPrice = `${slot.price} $ (~ ${aznPortion} ₼)`;
                  } else if (curr === 'EUR') {
                    const aznPortion = Math.round(slot.price * (exchangeRates?.EUR || 1.85));
                    formattedPrice = `${slot.price} € (~ ${aznPortion} ₼)`;
                  }
                  
                  return (
                    <div key={slot.id} className="bg-slate-50 p-3 rounded-lg border border-slate-150 text-xs space-y-1.5">
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-slate-900 block line-clamp-1 flex-1">{tourName}</span>
                        <span className="font-bold text-emerald-750 ml-2 font-mono text-[10px]">{formattedPrice} / nəfər</span>
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>📆 Tarix: {slot.startDate}</span>
                        <span className={isFull ? 'text-red-600 font-bold' : 'text-slate-600'}>
                          {slot.bookedCount} / {slot.capacity} Yer
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${isFull ? 'bg-red-500' : 'bg-emerald-600'}`}
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          </div>

        </div>
  );
}
