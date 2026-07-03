import React, { useState, useMemo } from 'react';
import { Tour, TourSlot, Booking, User, PlatformConfig } from '../types';
import { TourForm } from './vendor/TourForm';
import { InternationalTourForm } from './vendor/InternationalTourForm';
import {
  Building,
  Settings,
  TrendingUp,
  UserCheck,
  Briefcase,
  ShieldAlert,
  Percent,
  DollarSign,
  Activity,
  CheckCircle,
  ThumbsUp,
  Edit,
  X,
  Check,
  Plus
} from 'lucide-react';

function isTourInternational(t: Tour): boolean {
  return !!t.isInternational || t.category === 'international';
}

interface AdminPortalProps {
  tours: Tour[];
  slots: TourSlot[];
  bookings: Booking[];
  users: User[];
  currentUser: User;
  platformConfig: PlatformConfig;
  onUpdateCommissionPercent: (newValue: number) => void;
  onApproveTour: (tourId: string) => Promise<void>;
  onRejectTour?: (tourId: string) => Promise<void>;
  onEditTour?: (updatedTour: Tour) => Promise<void>;
  onDeleteTour?: (tourId: string) => Promise<void>;
  onAddSlot: (newSlot: TourSlot) => Promise<void>;
  onDeleteSlot?: (slotId: string) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  exchangeRates: { USD: number; EUR: number };
  onUpdateExchangeRates: (newRates: { USD: number; EUR: number }) => void;
  onUpdateUser?: (userId: string, data: Partial<User>) => void;
  onUpdateTourStatus?: (tourId: string, isActive: boolean) => Promise<void>;
}

export default function AdminPortal({
  tours,
  slots,
  bookings,
  users,
  currentUser,
  platformConfig,
  onUpdateCommissionPercent,
  onApproveTour,
  onRejectTour,
  onEditTour,
  onDeleteTour,
  onAddSlot,
  onDeleteSlot,
  onShowNotification,
  exchangeRates,
  onUpdateExchangeRates,
  onUpdateUser,
  onUpdateTourStatus
}: AdminPortalProps) {
  const [commissionInput, setCommissionInput] = useState<string | number>(platformConfig.commissionPercentage);

  const [cbarLoading, setCbarLoading] = useState<boolean>(false);
  const [approvingTourIds, setApprovingTourIds] = useState<Set<string>>(new Set());

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

  // Editing Tour States — field-level state now lives inside the shared TourForm/
  // InternationalTourForm components; AdminPortal only tracks which tour is under review.
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [isDecidingInModal, setIsDecidingInModal] = useState(false);
  const [modalActionError, setModalActionError] = useState<string | null>(null);

  // Stats calculate
  const totalVolume = bookings.reduce((sum, b) => b.status === 'paid' ? sum + b.totalAmount : sum, 0);
  const platformEarnings = bookings.reduce((sum, b) => {
    if (b.status === 'paid') {
      return sum + (b.totalAmount * (platformConfig.commissionPercentage / 100));
    }
    return sum;
  }, 0);

  const pendingTours = tours.filter(t => t.status === 'pending_approval');

  const openTourForReview = (t: Tour) => {
    setModalActionError(null);
    setEditingTour(t);
  };

  // The tour under review always displays the proposal (pendingData) when one exists — that's
  // what the admin should be inspecting/approving, not the stale still-live content the
  // proposal is meant to replace. Memoized on `editingTour` so the shared form's edit-mode
  // useEffect doesn't reset on every unrelated AdminPortal re-render.
  const reviewTour = useMemo<Tour | null>(() => {
    if (!editingTour) return null;
    return editingTour.pendingData ? ({ ...editingTour, ...editingTour.pendingData } as Tour) : editingTour;
  }, [editingTour]);

  const totalVendors = users.filter(u => u.role === 'vendor').length;
  const totalCustomers = users.filter(u => u.role === 'customer').length;

  // Password management states
  const [editingVendorAuth, setEditingVendorAuth] = useState<string | null>(null);
  const [vendorUsername, setVendorUsername] = useState<string>('');
  const [vendorPassword, setVendorPassword] = useState<string>('');

  const handleUpdateVendorAuth = (vendorId: string) => {
    if (onUpdateUser) {
      if (!vendorUsername || !vendorPassword) {
        if (onShowNotification) onShowNotification('İstifadəçi adı və şifrə boş ola bilməz.', 'error');
        return;
      }
      onUpdateUser(vendorId, { username: vendorUsername, password: vendorPassword });
      setEditingVendorAuth(null);
      if (onShowNotification) onShowNotification('Operator giriş məlumatları uğurla yeniləndi! 🔐', 'success');
    }
  };

  const handleUpdateCommissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedVal = Number(commissionInput);
    if (isNaN(parsedVal) || parsedVal < 1 || parsedVal > 50) {
      if (onShowNotification) {
        onShowNotification('Zəhmət olmasa 1 ilə 50 arasında düzgün bir faiz dərəcəsi daxil edin!', 'error');
      }
      return;
    }
    onUpdateCommissionPercent(parsedVal);
  };

  return (
    <div className="space-y-6">
      
      {/* Metrics board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Platform Earned */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 text-slate-900 flex items-center justify-between shadow-xs">
          <div className="space-y-1 bg-transparent">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest">Komissiya Gəliri</span>
            <h4 className="text-lg font-extrabold text-slate-900">{platformEarnings.toFixed(2)} AZN</h4>
            <p className="text-[10px] text-slate-500">Mövcud faiz: {platformConfig.commissionPercentage}%</p>
          </div>
          <div className="p-2.5 bg-emerald-50 border border-emerald-105 text-emerald-800 rounded-lg">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 2: Gross Merchandise Volume */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 text-slate-900 flex items-center justify-between shadow-xs">
          <div className="space-y-1 bg-transparent">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest">Turnover (GMV)</span>
            <h4 className="text-lg font-extrabold text-slate-900">{totalVolume.toFixed(2)} AZN</h4>
            <p className="text-[10px] text-slate-500">Cəmi satılan bilet dövriyyəsi</p>
          </div>
          <div className="p-2.5 bg-sky-50 border border-sky-105 text-sky-800 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 3: Vendors register */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 text-slate-900 flex items-center justify-between shadow-xs">
          <div className="space-y-1 bg-transparent">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest">Tərəfdaş Şirkətlər</span>
            <h4 className="text-lg font-extrabold text-slate-900">{totalVendors} Operator</h4>
            <p className="text-[10px] text-slate-500">Taksi & Alpinist bələdçiləri</p>
          </div>
          <div className="p-2.5 bg-amber-50 border border-amber-105 text-amber-800 rounded-lg">
            <Building className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 4: Platform Members */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 text-slate-900 flex items-center justify-between shadow-xs">
          <div className="space-y-1 bg-transparent">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest">Qeydiyyatlı Müştəri</span>
            <h4 className="text-lg font-extrabold text-slate-900">{totalCustomers} Aktiv</h4>
            <p className="text-[10px] text-slate-500 font-semibold text-slate-400">Turları axtaran kəslər</p>
          </div>
          <div className="p-2.5 bg-blue-50 border border-blue-105 text-blue-800 rounded-lg">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Platform settings & approvals */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Dynamic Config Settings */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-emerald-700" />
              SaaS Komissiya Nizamlanması
            </h3>
            <p className="text-xs text-slate-500 leading-normal">
              GetYourGuide tipli bələdçi bazarlarında gəlir payı bələdçidən çıxılır. Mərkəzi idarəetmədən bu faiz dərəcəsini istənilən vaxt aşağı-yuxarı dəyişdirə bilərsiniz.
            </p>

            <form onSubmit={handleUpdateCommissionSubmit} className="flex items-end gap-3 max-w-sm">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Yeni Bazar Komissiyası (%):</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={commissionInput}
                    onChange={(e) => setCommissionInput(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-emerald-750"
                  />
                  <Percent className="absolute right-3 top-2.5 w-3 h-3 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all"
              >
                Tətbiq Et
              </button>
            </form>
          </div>

          {/* Section: Central Currency Exchange Rates */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-700" />
              Mərkəzi Valyuta Kurslarının Nizamlanması
            </h3>
            <p className="text-xs text-slate-500 leading-normal">
              Admin tərəfindən müəyyən edilən cari məzənnələr sistem biletlərinin avtomatik kalkulyasiyasında, xarici valyutalı (USD/EUR) turların müştərilərə həm AZN, həm də orijinal məzənnə ilə göstərilməsində istifadə olunur.
            </p>

            <div className="flex flex-wrap gap-4 items-end max-w-xl">
              <div className="w-40">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">1 USD ($) Kursu (AZN):</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={exchangeRates.USD}
                    onChange={(e) => onUpdateExchangeRates({ ...exchangeRates, USD: Number(e.target.value) })}
                    className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-emerald-750"
                  />
                  <span className="absolute right-3 top-2.5 text-[9px] font-bold text-slate-400 font-mono">₼</span>
                </div>
              </div>

              <div className="w-40">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">1 EUR (€) Kursu (AZN):</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={exchangeRates.EUR}
                    onChange={(e) => onUpdateExchangeRates({ ...exchangeRates, EUR: Number(e.target.value) })}
                    className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-emerald-750"
                  />
                  <span className="absolute right-3 top-2.5 text-[9px] font-bold text-slate-400 font-mono">₼</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-end max-w-xl">
                <button
                  type="button"
                  onClick={() => {
                    if (onShowNotification) {
                      onShowNotification('Mərkəzi məzənnələr rəsmi olaraq yeniləndi! 💱⭐', 'success');
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Məzənnəni Saxla
                </button>

                <button
                  type="button"
                  disabled={cbarLoading}
                  onClick={fetchCbarRates}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {cbarLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Yüklənir...
                    </>
                  ) : (
                    <>
                      🔄 Canlı CBAR Məzənnəsini Gətir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section: Subscription Management (Operator Planlaması) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              OPERATORLARIN AYLIQ ABUNƏLİK İDARƏETMƏSİ
            </h3>
            <p className="text-[10px] text-slate-500 mb-2">
              Buradan operatorların platformadan istifadə müddətini təyin edə bilərsiniz. Vaxt bitdikdən 3 gün sonra müvafiq operatorun bütün turları müştərilər üçün gizlədiləcək (deaktiv olacaq).
            </p>
            <div className="space-y-3">
              {users.filter(u => u.role === 'vendor').map(vendor => {
                const subDate = vendor.subscriptionValidUntil ? new Date(vendor.subscriptionValidUntil) : null;
                const isWarning = subDate ? (subDate.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000) : true;
                const isExpired = subDate ? (Date.now() > subDate.getTime()) : true;
                const isAutoDeactivated = subDate ? (Date.now() > subDate.getTime() + 3 * 24 * 60 * 60 * 1000) : true;
                
                return (
                  <div key={vendor.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div>
                      <strong className="text-slate-900 block">{vendor.name}</strong>
                      <span className="text-[10px] text-slate-500">{vendor.companyName || 'Şirkət adı yoxdur'}</span>
                      <div className="mt-1">
                        {subDate ? (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isAutoDeactivated ? 'bg-red-100 text-red-800' : isExpired ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {isAutoDeactivated ? 'Turlar Deaktiv Edilib' : isExpired ? `Abunəlik bitib: ${subDate.toLocaleDateString()}` : `Aktivdir: ${subDate.toLocaleDateString()}`}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                            Abunəlik təyin edilməyib
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="date"
                        className="p-1.5 border border-slate-300 rounded text-xs bg-white"
                        value={subDate ? subDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          if (onUpdateUser) {
                            onUpdateUser(vendor.id, { subscriptionValidUntil: e.target.value ? new Date(e.target.value).toISOString() : undefined });
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (onUpdateUser) {
                            const newDate = new Date();
                            newDate.setMonth(newDate.getMonth() + 1);
                            onUpdateUser(vendor.id, { subscriptionValidUntil: newDate.toISOString() });
                            if (onShowNotification) {
                              onShowNotification(`${vendor.name} üçün abunəlik 1 ay uzadıldı və turları avtomatik aktivləşdirildi!`, 'success');
                            }
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-1.5 px-3 rounded text-xs transition"
                      >
                        +1 Ay
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Operator Login Credentials Management */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
               <ShieldAlert className="w-4 h-4 text-emerald-700" />
               OPERATOR GİRİŞ MƏLUMATLARI (LİGİN/PAROL)
            </h3>
            <p className="text-[10px] text-slate-500 mb-2">
               Operatorlar üçün fərdi istifadəçi adı (və ya e-poçt) və panel giriş şifrəsi təyin edin və ya mövcud şifrəni yeniləyin. 
            </p>
            <div className="space-y-3">
              {users.filter(u => u.role === 'vendor').map(vendor => (
                <div key={`auth-${vendor.id}`} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <strong className="text-slate-900 block">{vendor.name} </strong>
                      <span className="text-[10px] text-slate-500">{vendor.companyName} | Mövcud Login: <span className="font-mono text-emerald-700 bg-emerald-50 px-1 rounded">{vendor.username || vendor.email}</span></span>
                    </div>
                    {editingVendorAuth !== vendor.id && (
                      <button 
                        onClick={() => {
                           setEditingVendorAuth(vendor.id);
                           setVendorUsername(vendor.username || vendor.email);
                           setVendorPassword(vendor.password || '');
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold p-1.5 px-3 rounded text-xs transition"
                      >
                         Girişi Dəyiş
                      </button>
                    )}
                  </div>
                  {editingVendorAuth === vendor.id && (
                    <div className="mt-2 pt-2 border-t border-slate-200 flex flex-col md:flex-row gap-2">
                       <input 
                         type="text"
                         className="flex-1 p-1.5 border border-slate-300 rounded text-xs font-mono"
                         placeholder="İstifadəçi adı / Email"
                         value={vendorUsername}
                         onChange={(e) => setVendorUsername(e.target.value)}
                       />
                       <input 
                         type="text"
                         className="flex-1 p-1.5 border border-slate-300 rounded text-xs font-mono"
                         placeholder="Yeni Parol"
                         value={vendorPassword}
                         onChange={(e) => setVendorPassword(e.target.value)}
                       />
                       <div className="flex gap-2">
                         <button 
                           onClick={() => handleUpdateVendorAuth(vendor.id)}
                           className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-1.5 px-3 rounded text-xs transition"
                         >
                           Təsdiqlə
                         </button>
                         <button 
                           onClick={() => setEditingVendorAuth(null)}
                           className="bg-red-50 hover:bg-red-100 text-red-600 font-bold p-1.5 px-3 rounded text-xs transition"
                         >
                           Ləğv
                         </button>
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section: Queue of pending tours */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest">Təsdiq Gözləyən Ekskursiya / Tur Yürüşləri</h3>
            
            {pendingTours.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-lg text-xs italic text-slate-400 border border-slate-150 border-dashed">
                Hazırda növbədə təsdiq gözləyən yeni operator turu yoxdur. Platforma tam təmizdir!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTours.map((t) => (
                  <div key={t.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <strong className="text-slate-800 font-bold block">{t.name}</strong>
                      <span className="text-slate-400 block">Təşkilatçı: {t.vendorName} • Region: {t.region}</span>
                      {t.lastChangeLog && (
                        <div className="mt-1.5 bg-amber-50/75 border border-amber-200 text-amber-850 px-2 py-1.5 rounded-lg text-[10px] space-y-0.5 max-w-xl">
                          <span className="font-extrabold tracking-widest text-[8px] text-amber-700 block">📝 EDİT BİLDİRİŞİ (YENİLƏNƏN BÖLMƏLƏR):</span>
                          <p className="font-medium text-slate-700">{t.lastChangeLog}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openTourForReview(t)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition flex items-center gap-1 shadow-xs"
                      >
                        <Edit className="w-3 h-3" /> Yoxla & Düzəliş Et
                      </button>

                      <button
                        disabled={approvingTourIds.has(t.id)}
                        onClick={async () => {
                          setApprovingTourIds(prev => new Set(prev).add(t.id));
                          try {
                            await onApproveTour(t.id);
                          } catch {
                            // App.tsx's handleApproveTour already showed an error toast
                          } finally {
                            setApprovingTourIds(prev => {
                              const next = new Set(prev);
                              next.delete(t.id);
                              return next;
                            });
                          }
                        }}
                        className="bg-emerald-700 hover:bg-emerald-850 text-white text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                      >
                        <ThumbsUp className="w-3 h-3" /> {approvingTourIds.has(t.id) ? 'Təsdiqlənir...' : 'Təsdiqlə'}
                      </button>

                      {onRejectTour && (
                        <button
                          disabled={approvingTourIds.has(t.id)}
                          onClick={async () => {
                            setApprovingTourIds(prev => new Set(prev).add(t.id));
                            try {
                              await onRejectTour(t.id);
                            } catch {
                              // App.tsx's handleRejectTour already showed an error toast
                            } finally {
                              setApprovingTourIds(prev => {
                                const next = new Set(prev);
                                next.delete(t.id);
                                return next;
                              });
                            }
                          }}
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                        >
                          <X className="w-3 h-3" /> Rədd Et
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Active/Approved tours */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest">Aktiv (Təsdiqlənmiş) Marşrutlar</h3>
            
            {tours.filter(t => t.status === 'approved').length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-lg text-xs italic text-slate-400 border border-slate-150 border-dashed">
                Hazırda platformada heç bir təsdiqlənmiş aktiv tur tapılmadı.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                {tours.filter(t => t.status === 'approved').map((t) => (
                  <div key={t.id} className="p-4 bg-slate-50 rounded-lg border border-slate-210 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <strong className="text-slate-800 font-bold block">{t.name}</strong>
                      <span className="text-slate-400 block">Təşkilatçı: {t.vendorName} • Region: {t.region} • Müddət: {t.durationDays} Gün • Kateqoriya: {t.category === 'hiking' ? 'Yürüş' : t.category === 'camp' ? 'Kamp' : 'Zirvə'}</span>
                    </div>

                    <button
                      onClick={() => openTourForReview(t)}
                      className="bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition flex items-center gap-1 shadow-xs self-start md:self-auto"
                    >
                      <Edit className="w-3 h-3" /> Redaktə Et
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Mini Logs */}
        <div className="space-y-6">
          <div className="bg-[#0f172a] p-5 rounded-xl border border-slate-850 text-slate-300 space-y-4 h-full shadow-md">
            <h4 className="text-xs font-bold text-emerald-400 tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              Sistem Maliyyə Jurnalı (Ledger Audits)
            </h4>
            
            <p className="text-[11px] text-slate-400 leading-normal">
              Aşağıda real-time paylaşılan komissiyaların hər bir rezervasiya üzrə necə tutulduğunu nümayiş etdirən daxili SQL ticarət jurnalı göstərilir:
            </p>

            <div className="space-y-2.5 font-mono text-[9px] max-h-96 overflow-y-auto scrollbar-none">
              {bookings.filter(b => b.status === 'paid').map((b, i) => {
                const commissionVal = b.totalAmount * (platformConfig.commissionPercentage / 100);
                const vendorPay = b.totalAmount - commissionVal;
                return (
                  <div key={b.id || i} className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded text-slate-400 space-y-1">
                    <span className="text-amber-500 tracking-wider font-bold">LOG_TRANSACT_#{b.id} OK</span>
                    <div className="text-slate-300">Gross Amount: {b.totalAmount.toFixed(2)} AZN</div>
                    <div className="text-emerald-400">Platform Share ({platformConfig.commissionPercentage}%): +{commissionVal.toFixed(2)} AZN</div>
                    <div className="text-sky-400">Vendor Income: {vendorPay.toFixed(2)} AZN</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Edit Tour Modal Overlay — same TourForm/InternationalTourForm the vendor uses, so
          admin reviews/edits tours through an identical interface. Approve/Reject act on the
          tour as-is; the form's own "Dəyişiklikləri Saxla" persists field edits directly. */}
      {editingTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <Edit className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Tur Reqlamentini Yoxlayın (Admin)</h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {editingTour.pendingData ? 'Vendorun təklif etdiyi dəyişikliklər aşağıda göstərilir.' : 'Marşrut detallarına baxın və ya düzəliş edin'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                onClick={() => setEditingTour(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admin quick actions — approve/reject the tour as-is, without touching field values */}
            <div className="p-4 bg-amber-50/60 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <p className="text-[10px] text-amber-800 font-semibold max-w-md">
                Sahələri dəyişmədən birbaşa qərar qəbul edə, ya da aşağıdakı formada düzəliş edib "Dəyişiklikləri Saxla" düyməsini basa bilərsiniz.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isDecidingInModal}
                  onClick={async () => {
                    if (!editingTour) return;
                    setIsDecidingInModal(true);
                    setModalActionError(null);
                    try {
                      await onApproveTour(editingTour.id);
                      setEditingTour(null);
                    } catch (err: any) {
                      setModalActionError(err?.message || 'Tur təsdiqlənərkən xəta baş verdi.');
                    } finally {
                      setIsDecidingInModal(false);
                    }
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                >
                  <ThumbsUp className="w-3.5 h-3.5" /> Təsdiqlə
                </button>
                {onRejectTour && editingTour.status === 'pending_approval' && (
                  <button
                    type="button"
                    disabled={isDecidingInModal}
                    onClick={async () => {
                      if (!editingTour) return;
                      setIsDecidingInModal(true);
                      setModalActionError(null);
                      try {
                        await onRejectTour(editingTour.id);
                        setEditingTour(null);
                      } catch (err: any) {
                        setModalActionError(err?.message || 'Tur rədd edilərkən xəta baş verdi.');
                      } finally {
                        setIsDecidingInModal(false);
                      }
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" /> Rədd Et
                  </button>
                )}
              </div>
            </div>

            {modalActionError && (
              <div className="px-4 pt-3 flex-shrink-0">
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">
                  ⚠️ {modalActionError}
                </div>
              </div>
            )}

            <div className="overflow-y-auto">
              {reviewTour && (isTourInternational(reviewTour) ? (
                <InternationalTourForm
                  currentUser={currentUser}
                  tour={reviewTour}
                  slots={slots}
                  onAddTour={async () => {}}
                  onEditTour={onEditTour}
                  onDeleteTour={onDeleteTour}
                  onAddSlot={onAddSlot}
                  onDeleteSlot={onDeleteSlot}
                  onShowNotification={onShowNotification}
                  onNavigateBack={() => setEditingTour(null)}
                />
              ) : (
                <TourForm
                  currentUser={currentUser}
                  tour={reviewTour}
                  slots={slots}
                  category={reviewTour.category as 'peak' | 'camp' | 'hiking' | 'active'}
                  onCategoryChange={() => {}}
                  onAddTour={async () => {}}
                  onEditTour={onEditTour}
                  onDeleteTour={onDeleteTour}
                  onAddSlot={onAddSlot}
                  onDeleteSlot={onDeleteSlot}
                  onShowNotification={onShowNotification}
                  onNavigateBack={() => setEditingTour(null)}
                />
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
