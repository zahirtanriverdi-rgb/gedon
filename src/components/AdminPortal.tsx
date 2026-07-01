import React, { useState } from 'react';
import { Tour, Booking, User, PlatformConfig } from '../types';
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

interface AdminPortalProps {
  tours: Tour[];
  bookings: Booking[];
  users: User[];
  platformConfig: PlatformConfig;
  onUpdateCommissionPercent: (newValue: number) => void;
  onApproveTour: (tourId: string) => Promise<void>;
  onEditTour?: (updatedTour: Tour) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  exchangeRates: { USD: number; EUR: number };
  onUpdateExchangeRates: (newRates: { USD: number; EUR: number }) => void;
  onUpdateUser?: (userId: string, data: Partial<User>) => void;
  onUpdateTourStatus?: (tourId: string, isActive: boolean) => Promise<void>;
}

export default function AdminPortal({
  tours,
  bookings,
  users,
  platformConfig,
  onUpdateCommissionPercent,
  onApproveTour,
  onEditTour,
  onShowNotification,
  exchangeRates,
  onUpdateExchangeRates,
  onUpdateUser,
  onUpdateTourStatus
}: AdminPortalProps) {
  const [commissionInput, setCommissionInput] = useState<string | number>(platformConfig.commissionPercentage);

  const [cbarLoading, setCbarLoading] = useState<boolean>(false);
  const [approvingTourIds, setApprovingTourIds] = useState<Set<string>>(new Set());
  const [isSavingEditedTour, setIsSavingEditedTour] = useState(false);
  const [editTourError, setEditTourError] = useState<string | null>(null);

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

  // Editing Tour States
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [editTourName, setEditTourName] = useState<string>('');
  const [editTourCategory, setEditTourCategory] = useState<'peak' | 'camp' | 'hiking' | 'active'>('hiking');
  const [editTourDifficulty, setEditTourDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme'>('medium');
  const [editTourRegion, setEditTourRegion] = useState<string>('');
  const [editTourDays, setEditTourDays] = useState<number>(1);
  const [editTourDescription, setEditTourDescription] = useState<string>('');
  const [editTourIncludes, setEditTourIncludes] = useState<string>('');
  const [editTourImage, setEditTourImage] = useState<string>('');
  const [editTourWhatsApp, setEditTourWhatsApp] = useState<string>('');
  const [editTourImages, setEditTourImages] = useState<string[]>([]);
  const [editTourVideos, setEditTourVideos] = useState<string[]>([]);
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

  // Stats calculate
  const totalVolume = bookings.reduce((sum, b) => b.status === 'paid' ? sum + b.totalAmount : sum, 0);
  const platformEarnings = bookings.reduce((sum, b) => {
    if (b.status === 'paid') {
      return sum + (b.totalAmount * (platformConfig.commissionPercentage / 100));
    }
    return sum;
  }, 0);

  const pendingTours = tours.filter(t => !t.isApproved);
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
                        onClick={() => {
                          setEditingTour(t);
                          setEditTourName(t.name);
                          setEditTourCategory(t.category);
                          setEditTourDifficulty(t.difficulty);
                          setEditTourRegion(t.region);
                          setEditTourDays(t.durationDays);
                          setEditTourDescription(t.description || '');
                          setEditTourIncludes(Array.isArray(t.includes) ? t.includes.join(', ') : '');
                          setEditTourImage(t.image || '');
                          setEditTourWhatsApp(t.whatsapp_number || '');
                          setEditTourImages(t.images || []);
                          setEditTourRating(t.rating !== undefined ? t.rating : 5.0);

                          // Active Lifestyle specifics
                          setEditTourActivityType(t.activityType || 'volleyball');
                          setEditTourActiveDifficulty(t.activeDifficulty || 'medium');
                          setEditTourAgeLimit(t.ageLimit || '18-45 yaş');
                          setEditTourMeetingPoint(t.meetingPoint || '');
                          setEditTourRequiredEquipment(t.requiredEquipment || '');
                          setEditTourEquipmentIncluded(t.equipmentIncluded !== false);
                          setEditTourEquipmentRentalPrice(t.equipmentRentalPrice || 0);
                          setEditTourSafetyInstructions(t.safetyInstructions || '');
                          setEditTourAllowTeamRegistration(t.allowTeamRegistration !== false);
                          setEditTourScheduleFrequency(t.scheduleFrequency || 'one-time');
                        }}
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Active/Approved tours */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest">Aktiv (Təsdiqlənmiş) Marşrutlar</h3>
            
            {tours.filter(t => t.isApproved).length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-lg text-xs italic text-slate-400 border border-slate-150 border-dashed">
                Hazırda platformada heç bir təsdiqlənmiş aktiv tur tapılmadı.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                {tours.filter(t => t.isApproved).map((t) => (
                  <div key={t.id} className="p-4 bg-slate-50 rounded-lg border border-slate-210 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <strong className="text-slate-800 font-bold block">{t.name}</strong>
                      <span className="text-slate-400 block">Təşkilatçı: {t.vendorName} • Region: {t.region} • Müddət: {t.durationDays} Gün • Kateqoriya: {t.category === 'hiking' ? 'Yürüş' : t.category === 'camp' ? 'Kamp' : 'Zirvə'}</span>
                    </div>

                    <button
                      onClick={() => {
                        setEditingTour(t);
                        setEditTourName(t.name);
                        setEditTourCategory(t.category);
                        setEditTourDifficulty(t.difficulty);
                        setEditTourRegion(t.region);
                        setEditTourDays(t.durationDays);
                        setEditTourDescription(t.description || '');
                        setEditTourIncludes(Array.isArray(t.includes) ? t.includes.join(', ') : '');
                        setEditTourImage(t.image || '');
                        setEditTourWhatsApp(t.whatsapp_number || '');
                        setEditTourImages(t.images || []);
                        setEditTourRating(t.rating !== undefined ? t.rating : 5.0);

                        // Active Lifestyle specifics
                        setEditTourActivityType(t.activityType || 'volleyball');
                        setEditTourActiveDifficulty(t.activeDifficulty || 'medium');
                        setEditTourAgeLimit(t.ageLimit || '18-45 yaş');
                        setEditTourMeetingPoint(t.meetingPoint || '');
                        setEditTourRequiredEquipment(t.requiredEquipment || '');
                        setEditTourEquipmentIncluded(t.equipmentIncluded !== false);
                        setEditTourEquipmentRentalPrice(t.equipmentRentalPrice || 0);
                        setEditTourSafetyInstructions(t.safetyInstructions || '');
                        setEditTourAllowTeamRegistration(t.allowTeamRegistration !== false);
                        setEditTourScheduleFrequency(t.scheduleFrequency || 'one-time');
                      }}
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

      {/* Edit Tour Modal Overlay */}
      {editingTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <Edit className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Tur Reqlamentini Yeniləyin (Admin)</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Tur operatorunun qeyd etdiyi marşrutu yoxlayın və lazımi düzəlişləri edin</p>
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

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-xs">
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
                      id="editAdminOptAvt"
                      checked={editTourEquipmentIncluded}
                      onChange={(e) => setEditTourEquipmentIncluded(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <label htmlFor="editAdminOptAvt" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">
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
                      id="editAdminOptTeam"
                      checked={editTourAllowTeamRegistration}
                      onChange={(e) => setEditTourAllowTeamRegistration(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <label htmlFor="editAdminOptTeam" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">
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
                <label className="block text-[10px] font-extrabold text-[#111111]/70 tracking-widest">Kover Foto / Şəkil Seçimi:</label>
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
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-md transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Multiple Gallery Images for Editing */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <label className="block text-[10px] font-extrabold text-slate-500 tracking-wide">Qalereya Şəkilləri (Çoxlu şəkil yükləyin):</label>
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
                <label className="block text-[10px] font-extrabold text-emerald-850 tracking-wide mb-1">
                  Back-Office Reytinq Təyini (Manual Ulduz Override):
                </label>
                <select
                  value={editTourRating}
                  onChange={(e) => setEditTourRating(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-emerald-50 border border-emerald-205 rounded-xl text-xs font-extrabold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="5">⭐⭐⭐⭐⭐ 5.0 (Təşviq edilən / Sponsorlu / 5-Ulduz)</option>
                  <option value="4.8">⭐⭐⭐⭐⭐ 4.8 (Çox Yüksək Satışlı)</option>
                  <option value="4.5">⭐⭐⭐⭐☆ 4.5 (Yüksək Tövsiyəli)</option>
                  <option value="4">⭐⭐⭐⭐☆ 4.0 (Yaxşı Qiymətləndirilən)</option>
                  <option value="3">⭐⭐⭐☆☆ 3.0 (Orta dərəcə)</option>
                  <option value="2">⭐⭐☆☆☆ 2.0 (Zəif və Deaktiv öncəsi)</option>
                </select>
                <p className="text-[9px] text-slate-400 mt-1 italic font-medium">
                  * Zəif satılan, yeni və ya sponsorlu turları filtr siyahısında və ana səhifədə 5 ulduzla önə çıxarır.
                </p>
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

            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition"
                onClick={() => setEditingTour(null)}
              >
                Ləğv Et
              </button>
              
              <button
                type="button"
                disabled={isSavingEditedTour}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl cursor-pointer transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                onClick={async () => {
                  if (onEditTour && editingTour) {
                    const cleanIncludes = editTourIncludes.split(',').map(s => s.trim()).filter(Boolean);
                    setIsSavingEditedTour(true);
                    setEditTourError(null);
                    try {
                      await onEditTour({
                        ...editingTour,
                        name: editTourName,
                        category: editTourCategory,
                        difficulty: editTourDifficulty,
                        region: editTourRegion,
                        durationDays: Number(editTourDays),
                        description: editTourDescription,
                        includes: cleanIncludes.length > 0 ? cleanIncludes : ['Müşayiət bələdçisi'],
                        image: editTourImage,
                        images: editTourImages,
                        videos: editingTour.videos,
                        whatsapp_number: editTourWhatsApp || '+994706717804',
                        rating: editTourRating
                      });
                      if (onShowNotification) {
                        onShowNotification('Tur məlumatları uğurla yadda saxlanıldı! 📝', 'success');
                      }
                      setEditingTour(null);
                    } catch (err: any) {
                      setEditTourError(err?.message || 'Tur yenilənərkən xəta baş verdi.');
                    } finally {
                      setIsSavingEditedTour(false);
                    }
                  }
                }}
              >
                <Check className="w-4 h-4 text-white" />
                {isSavingEditedTour ? 'Saxlanılır...' : 'Dəyişiklikləri Saxla'}
              </button>

              <button
                type="button"
                disabled={isSavingEditedTour}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                onClick={async () => {
                  if (editingTour) {
                    const cleanIncludes = editTourIncludes.split(',').map(s => s.trim()).filter(Boolean);
                    const updated: Tour = {
                      ...editingTour,
                      name: editTourName,
                      category: editTourCategory,
                      difficulty: editTourDifficulty,
                      region: editTourRegion,
                      durationDays: Number(editTourDays),
                      description: editTourDescription,
                      includes: cleanIncludes.length > 0 ? cleanIncludes : ['Müşayiət bələdçisi'],
                      image: editTourImage,
                      images: editTourImages,
                      videos: editingTour.videos,
                      whatsapp_number: editTourWhatsApp || '+994706717804',
                      rating: editTourRating,

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
                    setIsSavingEditedTour(true);
                    setEditTourError(null);
                    try {
                      if (onEditTour) {
                        await onEditTour(updated);
                      }
                      await onApproveTour(editingTour.id);
                      if (onShowNotification) {
                        onShowNotification('Tur uğurla redaktə edildi və dərhal TƏSDİQLƏNDİ! 🚀✨', 'success');
                      }
                      setEditingTour(null);
                    } catch (err: any) {
                      setEditTourError(err?.message || 'Tur yenilənərkən xəta baş verdi.');
                    } finally {
                      setIsSavingEditedTour(false);
                    }
                  }
                }}
              >
                <ThumbsUp className="w-4 h-4 text-white" />
                {isSavingEditedTour ? 'Saxlanılır...' : 'Saxla və Təsdiqlə'}
              </button>
            </div>

            {editTourError && (
              <div className="px-4 pb-4 -mt-2">
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">
                  ⚠️ {editTourError}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
