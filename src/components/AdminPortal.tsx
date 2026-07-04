import React, { useState, useMemo, useEffect } from 'react';
import { Tour, TourSlot, Booking, User, PlatformConfig, PriceCalculatorConfig } from '../types';
import { TourForm } from './vendor/TourForm';
import { InternationalTourForm } from './vendor/InternationalTourForm';
import {
  Building,
  Calculator,
  TrendingUp,
  UserCheck,
  Briefcase,
  ShieldAlert,
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

// Human-readable labels for the fields most likely to show up in a vendor's edit proposal.
// Anything not listed here falls back to the raw field key so nothing silently disappears.
const DIFF_FIELD_LABELS: Record<string, string> = {
  name: 'Ad', description: 'Təsvir', region: 'Region', category: 'Kateqoriya',
  difficulty: 'Çətinlik', durationDays: 'Müddət (gün)', durationHours: 'Müddət (saat)',
  price: 'Qiymət', discountPrice: 'Endirimli qiymət', priceCurrency: 'Valyuta',
  image: 'Kover şəkil', images: 'Qalereya şəkilləri', videos: 'Videolar',
  includes: 'Daxildir', notIncluded: 'Daxil deyil', highlights: 'Xüsusiyyətlər',
  languages: 'Dillər', whatsapp_number: 'WhatsApp nömrəsi', meetingPoint: 'Görüş yeri',
  isActive: 'Aktivlik statusu', gpxData: 'GPX marşrut faylı', gpxFileName: 'GPX fayl adı',
  activityType: 'Fəaliyyət növü', activeDifficulty: 'Fiziki hazırlıq səviyyəsi',
  ageLimit: 'Yaş limiti', requiredEquipment: 'Zəruri avadanlıq',
  equipmentIncluded: 'Avadanlıq daxildir', equipmentRentalPrice: 'Kirayə haqqı',
  safetyInstructions: 'Təhlükəsizlik təlimatı', allowTeamRegistration: 'Komanda qeydiyyatı',
  scheduleFrequency: 'Təkrarlanma tezliyi', destinationCountry: 'İstiqamət ölkə',
  destinationCity: 'İstiqamət şəhər', durationNights: 'Gecə sayı',
  flightIncluded: 'Aviabilet daxildir', flightDetails: 'Uçuş təfərrüatları',
  transferDetails: 'Transfer təfərrüatları', hotelName: 'Otel adı', hotelStars: 'Otel ulduz sayı',
  roomTypes: 'Otaq növləri', mealType: 'Qidalanma', itinerary: 'Gündəlik marşrut',
  importantInfo: 'Mühüm məlumatlar',
};

// Fields that are bookkeeping/derived, never a meaningful "vendor changed this" fact.
const DIFF_IGNORE_KEYS = new Set([
  'id', 'vendorId', 'vendorName', 'status', 'isApproved', 'pendingData', 'createdAt',
  'rejectionReason', 'lastChangeLog', 'rating', 'reviewsCount',
]);

function formatDiffValue(v: any): string {
  if (v === undefined || v === null || v === '') return '(boş)';
  if (typeof v === 'boolean') return v ? 'Bəli' : 'Xeyr';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '(boş)';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// Compares the tour's currently-live fields against a vendor's proposed edit (pendingData) and
// returns only the fields that actually changed — far more reliable than trusting the vendor's
// self-reported lastChangeLog, which only ever tracked name/isActive/image.
function computeTourDiff(live: Tour, proposed: Record<string, any>): { label: string; from: string; to: string }[] {
  const diffs: { label: string; from: string; to: string }[] = [];
  for (const key of Object.keys(proposed)) {
    if (DIFF_IGNORE_KEYS.has(key)) continue;
    const fromVal = (live as any)[key];
    const toVal = proposed[key];
    if (JSON.stringify(fromVal ?? null) === JSON.stringify(toVal ?? null)) continue;
    diffs.push({ label: DIFF_FIELD_LABELS[key] || key, from: formatDiffValue(fromVal), to: formatDiffValue(toVal) });
  }
  return diffs;
}

interface AdminPortalProps {
  tours: Tour[];
  slots: TourSlot[];
  bookings: Booking[];
  users: User[];
  currentUser: User;
  platformConfig: PlatformConfig;
  onUpdatePriceCalculatorConfig?: (newConfig: PriceCalculatorConfig) => void;
  onApproveTour: (tourId: string) => Promise<void>;
  onRejectTour?: (tourId: string, rejectionReason: string) => Promise<void>;
  onEditTour?: (updatedTour: Tour) => Promise<void>;
  onDeleteTour?: (tourId: string) => Promise<void>;
  onAddSlot: (newSlot: TourSlot) => Promise<void>;
  onDeleteSlot?: (slotId: string) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  exchangeRates: { USD: number; EUR: number };
  onUpdateExchangeRates: (newRates: { USD: number; EUR: number }) => void;
  onUpdateUser?: (userId: string, data: Partial<User>) => void;
  onCreateVendor?: (data: { companyName: string; login: string; password: string }) => Promise<void>;
  onDeleteVendor?: (vendorId: string, adminPassword: string) => Promise<void>;
  onUpdateTourStatus?: (tourId: string, isActive: boolean) => Promise<void>;
}

export default function AdminPortal({
  tours,
  slots,
  bookings,
  users,
  currentUser,
  platformConfig,
  onUpdatePriceCalculatorConfig,
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
  onCreateVendor,
  onDeleteVendor,
  onUpdateTourStatus
}: AdminPortalProps) {
  // Price calculator cost elements (destinations + rates) — editable draft, synced from
  // platformConfig whenever it changes elsewhere, saved explicitly via the button below.
  const [pcConfig, setPcConfig] = useState<PriceCalculatorConfig>(platformConfig.priceCalculatorConfig);
  const [newDestName, setNewDestName] = useState<string>('');
  const [newDestKm, setNewDestKm] = useState<number | ''>('');

  React.useEffect(() => {
    setPcConfig(platformConfig.priceCalculatorConfig);
  }, [platformConfig.priceCalculatorConfig]);

  const handlePcNumberChange = (field: keyof Omit<PriceCalculatorConfig, 'destinations'>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setPcConfig(prev => ({ ...prev, [field]: raw === '' ? 0 : Number(raw) }));
  };

  const handleAddDestination = () => {
    if (!newDestName.trim() || newDestKm === '' || Number(newDestKm) <= 0) {
      if (onShowNotification) onShowNotification('Məkan adı və məsafə (km) tələb olunur.', 'error');
      return;
    }
    setPcConfig(prev => ({ ...prev, destinations: { ...prev.destinations, [newDestName.trim()]: Number(newDestKm) } }));
    setNewDestName('');
    setNewDestKm('');
  };

  const handleRemoveDestination = (name: string) => {
    setPcConfig(prev => {
      const next = { ...prev.destinations };
      delete next[name];
      return { ...prev, destinations: next };
    });
  };

  const handleSavePcConfig = () => {
    if (onUpdatePriceCalculatorConfig) onUpdatePriceCalculatorConfig(pcConfig);
  };

  const [cbarLoading, setCbarLoading] = useState<boolean>(false);
  const [approvingTourIds, setApprovingTourIds] = useState<Set<string>>(new Set());

  // Same fix as MyToursTab.tsx: exchangeRates is a plain-number prop, so the field can't be
  // fully cleared without an intermediate empty-string draft — otherwise Number('') === 0
  // gets pushed straight back into the input and it looks "stuck".
  const [usdRateDraft, setUsdRateDraft] = useState<string>(String(exchangeRates.USD));
  const [eurRateDraft, setEurRateDraft] = useState<string>(String(exchangeRates.EUR));
  useEffect(() => { setUsdRateDraft(String(exchangeRates.USD)); }, [exchangeRates.USD]);
  useEffect(() => { setEurRateDraft(String(exchangeRates.EUR)); }, [exchangeRates.EUR]);

  const handleRateChange = (currency: 'USD' | 'EUR') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (currency === 'USD') setUsdRateDraft(raw); else setEurRateDraft(raw);
    if (raw !== '' && !isNaN(Number(raw))) {
      onUpdateExchangeRates({ ...exchangeRates, [currency]: Number(raw) });
    }
  };
  const handleRateBlur = (currency: 'USD' | 'EUR') => () => {
    if (currency === 'USD' && usdRateDraft === '') setUsdRateDraft(String(exchangeRates.USD));
    if (currency === 'EUR' && eurRateDraft === '') setEurRateDraft(String(exchangeRates.EUR));
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

  // Editing Tour States — field-level state now lives inside the shared TourForm/
  // InternationalTourForm components; AdminPortal only tracks which tour is under review.
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [isDecidingInModal, setIsDecidingInModal] = useState(false);
  const [modalActionError, setModalActionError] = useState<string | null>(null);

  // Rejection always requires a stated reason — these track the inline reason box shown by
  // the "Rədd Et" button before the actual API call fires, both in the queue list and modal.
  const [rejectingTourId, setRejectingTourId] = useState<string | null>(null);
  const [rejectionReasonDraft, setRejectionReasonDraft] = useState('');
  const [showModalRejectReason, setShowModalRejectReason] = useState(false);
  const [modalRejectionReason, setModalRejectionReason] = useState('');

  // Stats calculate
  const totalVolume = bookings.reduce((sum, b) => b.status === 'paid' ? sum + b.totalAmount : sum, 0);
  const totalPaidBookingsCount = bookings.filter(b => b.status === 'paid').length;

  const pendingTours = tours.filter(t => t.status === 'pending_approval');

  const openTourForReview = (t: Tour) => {
    setModalActionError(null);
    setShowModalRejectReason(false);
    setModalRejectionReason('');
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

  const totalVendors = users.filter(u => u.role === 'vendor' && !u.isArchived).length;
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

  // New vendor/operator account creation
  const [newVendorCompanyName, setNewVendorCompanyName] = useState<string>('');
  const [newVendorLogin, setNewVendorLogin] = useState<string>('');
  const [newVendorPassword, setNewVendorPassword] = useState<string>('');
  const [isCreatingVendor, setIsCreatingVendor] = useState<boolean>(false);

  const handleCreateVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorCompanyName || !newVendorLogin || !newVendorPassword) {
      if (onShowNotification) onShowNotification('Şirkət adı, login və ilkin parol tələb olunur.', 'error');
      return;
    }
    if (newVendorPassword.length < 6) {
      if (onShowNotification) onShowNotification('Parol ən azı 6 simvol olmalıdır.', 'error');
      return;
    }
    if (!onCreateVendor) return;
    setIsCreatingVendor(true);
    try {
      await onCreateVendor({ companyName: newVendorCompanyName, login: newVendorLogin, password: newVendorPassword });
      setNewVendorCompanyName('');
      setNewVendorLogin('');
      setNewVendorPassword('');
    } catch {
      // onCreateVendor already surfaces the error via onShowNotification
    } finally {
      setIsCreatingVendor(false);
    }
  };

  // Vendor deletion (soft-delete / archive) — admin confirms with their own password, typed
  // twice, before the request is sent.
  const [deletingVendor, setDeletingVendor] = useState<{ id: string; name: string } | null>(null);
  const [deleteAdminPassword, setDeleteAdminPassword] = useState<string>('');
  const [deleteAdminPasswordConfirm, setDeleteAdminPasswordConfirm] = useState<string>('');
  const [isDeletingVendor, setIsDeletingVendor] = useState<boolean>(false);

  const closeDeleteVendorModal = () => {
    setDeletingVendor(null);
    setDeleteAdminPassword('');
    setDeleteAdminPasswordConfirm('');
  };

  const handleConfirmDeleteVendor = async () => {
    if (!deletingVendor || !onDeleteVendor) return;
    if (!deleteAdminPassword || !deleteAdminPasswordConfirm) {
      if (onShowNotification) onShowNotification('Zəhmət olmasa parolu iki dəfə daxil edin.', 'error');
      return;
    }
    if (deleteAdminPassword !== deleteAdminPasswordConfirm) {
      if (onShowNotification) onShowNotification('Daxil etdiyiniz iki parol uyğun gəlmir.', 'error');
      return;
    }
    setIsDeletingVendor(true);
    try {
      await onDeleteVendor(deletingVendor.id, deleteAdminPassword);
      closeDeleteVendorModal();
    } catch {
      // onDeleteVendor already surfaces the error via onShowNotification
    } finally {
      setIsDeletingVendor(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Metrics board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Successful Bookings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 text-slate-900 flex items-center justify-between shadow-xs">
          <div className="space-y-1 bg-transparent">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest">Uğurlu Rezervasiyalar</span>
            <h4 className="text-lg font-extrabold text-slate-900">{totalPaidBookingsCount} Bilet</h4>
            <p className="text-[10px] text-slate-500">Ödənişi təsdiqlənən bütün biletlər</p>
          </div>
          <div className="p-2.5 bg-violet-50 border border-violet-100 text-violet-700 rounded-lg">
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
          <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg">
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
          <div className="p-2.5 bg-amber-50 border border-amber-100 text-amber-800 rounded-lg">
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
          <div className="p-2.5 bg-[#eff6ff] border border-[#dbeafe] text-[#1d4ed8] rounded-lg">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Platform settings & approvals */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Price Calculator Cost Elements */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-emerald-700" />
              QİYMƏT HESABLAYICISI — XƏRC ELEMENTLƏRİ
            </h3>
            <p className="text-xs text-slate-500 leading-normal">
              Müştərilərin "Qrup üçün qiymət hesabla" alətində gördüyü avtobus, bələdçi, yemək və avadanlıq tariflərini buradan idarə edin. Dəyişiklik "Yadda saxla" ilə tətbiq olunan kimi hesablayıcıya dərhal təsir edir.
            </p>

            <div>
              <h4 className="text-[10px] font-extrabold text-slate-400 tracking-wide mb-2">Məkanlar və məsafələr (km):</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(pcConfig.destinations).map(([name, km]) => (
                  <span key={name} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                    <strong className="text-slate-800">{name}</strong>
                    <span className="text-slate-400">({km} km)</span>
                    <button type="button" onClick={() => handleRemoveDestination(name)} className="text-red-500 hover:text-red-700 font-bold ml-1">✕</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 max-w-md">
                <input
                  type="text"
                  value={newDestName}
                  onChange={(e) => setNewDestName(e.target.value)}
                  placeholder="Məkan adı (məs: Xınalıq)"
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="number"
                  min="1"
                  value={newDestKm}
                  onChange={(e) => setNewDestKm(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="km"
                  className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <button type="button" onClick={handleAddDestination} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition">
                  Əlavə et
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Avtobus (AZN/km):</label>
                <input type="number" step="0.1" min="0" value={pcConfig.busRatePerKm} onChange={handlePcNumberChange('busRatePerKm')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Kamp üçün əlavə (AZN):</label>
                <input type="number" min="0" value={pcConfig.busCampSurcharge} onChange={handlePcNumberChange('busCampSurcharge')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Bələdçi (gündəlik baza):</label>
                <input type="number" min="0" value={pcConfig.guideDailyBase} onChange={handlePcNumberChange('guideDailyBase')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Bələdçi (kamp baza):</label>
                <input type="number" min="0" value={pcConfig.guideCampBase} onChange={handlePcNumberChange('guideCampBase')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Bələdçi (adam başı əlavə):</label>
                <input type="number" step="0.1" min="0" value={pcConfig.guidePerParticipant} onChange={handlePcNumberChange('guidePerParticipant')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Kənd evi naharı (AZN):</label>
                <input type="number" min="0" value={pcConfig.foodDailyKendPrice} onChange={handlePcNumberChange('foodDailyKendPrice')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Sendviç (AZN):</label>
                <input type="number" min="0" value={pcConfig.foodDailySendvicPrice} onChange={handlePcNumberChange('foodDailySendvicPrice')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Kamp səhər yeməyi (AZN/adam):</label>
                <input type="number" min="0" value={pcConfig.campBreakfastPrice} onChange={handlePcNumberChange('campBreakfastPrice')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Kamp günorta yeməyi (AZN/adam):</label>
                <input type="number" min="0" value={pcConfig.campLunchPrice} onChange={handlePcNumberChange('campLunchPrice')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Çadır kirayəsi (AZN/adam):</label>
                <input type="number" min="0" value={pcConfig.tentRentalPrice} onChange={handlePcNumberChange('tentRentalPrice')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Yataq kisəsi (AZN/adam):</label>
                <input type="number" min="0" value={pcConfig.sleepingBagRentalPrice} onChange={handlePcNumberChange('sleepingBagRentalPrice')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Mat (AZN/adam):</label>
                <input type="number" min="0" value={pcConfig.matRentalPrice} onChange={handlePcNumberChange('matRentalPrice')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSavePcConfig}
              className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all"
            >
              Yadda saxla
            </button>
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
                    value={usdRateDraft}
                    onChange={handleRateChange('USD')}
                    onBlur={handleRateBlur('USD')}
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
                    value={eurRateDraft}
                    onChange={handleRateChange('EUR')}
                    onBlur={handleRateBlur('EUR')}
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
              {users.filter(u => u.role === 'vendor' && !u.isArchived).map(vendor => {
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
                      {onDeleteVendor && (
                        <button
                          type="button"
                          onClick={() => setDeletingVendor({ id: vendor.id, name: vendor.name })}
                          className="bg-red-50 hover:bg-red-100 text-red-700 font-bold p-1.5 px-3 rounded text-xs transition border border-red-200"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Create New Vendor/Operator Account */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-700" />
              YENİ VENDOR / OPERATOR HESABI YARAT
            </h3>
            <p className="text-[10px] text-slate-500 mb-2">
              Yeni tur operatoru üçün hesap açın. Şirkət qalan profil məlumatlarını (telefon, haqqında, bələdçilər) ilk girişdən sonra özü tamamlayacaq.
            </p>
            <form onSubmit={handleCreateVendorSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Şirkət adı:</label>
                <input
                  type="text"
                  required
                  value={newVendorCompanyName}
                  onChange={(e) => setNewVendorCompanyName(e.target.value)}
                  placeholder="Məs: Qafqaz Adventure MMC"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Login (istifadəçi adı və ya e-poçt):</label>
                <input
                  type="text"
                  required
                  value={newVendorLogin}
                  onChange={(e) => setNewVendorLogin(e.target.value)}
                  placeholder="Məs: qafqaz_adventure"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">İlkin parol:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={newVendorPassword}
                    onChange={(e) => setNewVendorPassword(e.target.value)}
                    placeholder="Ən azı 6 simvol"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingVendor}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {isCreatingVendor ? 'Yaradılır...' : 'Hesabı Yarat'}
                  </button>
                </div>
              </div>
            </form>
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
              {users.filter(u => u.role === 'vendor' && !u.isArchived).map(vendor => (
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
                {pendingTours.map((t) => {
                  const diffs = t.pendingData ? computeTourDiff(t, t.pendingData) : [];
                  const isRejectingThis = rejectingTourId === t.id;
                  return (
                  <div key={t.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <strong className="text-slate-800 font-bold block">{t.name}</strong>
                      <span className="text-slate-400 block">Təşkilatçı: {t.vendorName} • Region: {t.region}</span>
                      {diffs.length > 0 ? (
                        <div className="mt-1.5 bg-amber-50/75 border border-amber-200 text-amber-850 px-2 py-1.5 rounded-lg text-[10px] space-y-1 max-w-xl">
                          <span className="font-extrabold tracking-widest text-[8px] text-amber-700 block">📝 VENDORUN ETDİYİ DƏYİŞİKLİKLƏR:</span>
                          <ul className="space-y-0.5">
                            {diffs.map((d, i) => (
                              <li key={i} className="font-medium text-slate-700">
                                <strong>{d.label}:</strong> {d.from} → {d.to}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : t.lastChangeLog && (
                        <div className="mt-1.5 bg-amber-50/75 border border-amber-200 text-amber-850 px-2 py-1.5 rounded-lg text-[10px] space-y-0.5 max-w-xl">
                          <span className="font-extrabold tracking-widest text-[8px] text-amber-700 block">📝 EDİT BİLDİRİŞİ (YENİLƏNƏN BÖLMƏLƏR):</span>
                          <p className="font-medium text-slate-700">{t.lastChangeLog}</p>
                        </div>
                      )}
                    </div>

                    {isRejectingThis ? (
                      <div className="flex flex-col gap-2 w-full md:w-96">
                        <textarea
                          autoFocus
                          rows={2}
                          value={rejectionReasonDraft}
                          onChange={(e) => setRejectionReasonDraft(e.target.value)}
                          placeholder="Rədd səbəbini yazın (vendor bunu görəcək)..."
                          className="w-full px-2.5 py-1.5 bg-white border border-red-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-red-400"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => { setRejectingTourId(null); setRejectionReasonDraft(''); }}
                            className="text-slate-500 hover:text-slate-700 text-[10px] font-bold px-2 py-1.5 rounded cursor-pointer transition"
                          >
                            İmtina et
                          </button>
                          <button
                            type="button"
                            disabled={!rejectionReasonDraft.trim() || approvingTourIds.has(t.id)}
                            onClick={async () => {
                              if (!onRejectTour) return;
                              setApprovingTourIds(prev => new Set(prev).add(t.id));
                              try {
                                await onRejectTour(t.id, rejectionReasonDraft.trim());
                                setRejectingTourId(null);
                                setRejectionReasonDraft('');
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
                            className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                          >
                            <X className="w-3 h-3" /> Rəddi Təsdiqlə
                          </button>
                        </div>
                      </div>
                    ) : (
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
                            onClick={() => { setRejectingTourId(t.id); setRejectionReasonDraft(''); }}
                            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                          >
                            <X className="w-3 h-3" /> Rədd Et
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
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
          <div className="bg-ink-900 p-5 rounded-xl border border-slate-850 text-slate-300 space-y-4 h-full shadow-md">
            <h4 className="text-xs font-bold text-emerald-400 tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              Sistem Maliyyə Jurnalı (Ledger Audits)
            </h4>
            
            <p className="text-[11px] text-slate-400 leading-normal">
              Aşağıda ödənişi təsdiqlənən hər bir rezervasiyanın real-time daxili SQL ticarət jurnalı göstərilir:
            </p>

            <div className="space-y-2.5 font-mono text-[9px] max-h-96 overflow-y-auto scrollbar-none">
              {bookings.filter(b => b.status === 'paid').map((b, i) => {
                return (
                  <div key={b.id || i} className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded text-slate-400 space-y-1">
                    <span className="text-amber-500 tracking-wider font-bold">LOG_TRANSACT_#{b.id} OK</span>
                    <div className="text-slate-300">Gross Amount: {b.totalAmount.toFixed(2)} AZN</div>
                    <div className="text-sky-400">Vendor Income: {b.totalAmount.toFixed(2)} AZN</div>
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
                {onRejectTour && editingTour.status === 'pending_approval' && !showModalRejectReason && (
                  <button
                    type="button"
                    disabled={isDecidingInModal}
                    onClick={() => { setShowModalRejectReason(true); setModalRejectionReason(''); }}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" /> Rədd Et
                  </button>
                )}
              </div>
            </div>

            {showModalRejectReason && (
              <div className="p-4 bg-red-50/60 border-b border-red-100 flex-shrink-0 space-y-2">
                <label className="block text-[10px] font-bold text-red-800">Rədd səbəbi (vendor bunu görəcək):</label>
                <textarea
                  autoFocus
                  rows={2}
                  value={modalRejectionReason}
                  onChange={(e) => setModalRejectionReason(e.target.value)}
                  placeholder="Məs: Şəkillər aşağı keyfiyyətlidir, qiymət bazar səviyyəsindən uzaqdır..."
                  className="w-full px-2.5 py-1.5 bg-white border border-red-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-red-400"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowModalRejectReason(false); setModalRejectionReason(''); }}
                    className="text-slate-500 hover:text-slate-700 text-[10px] font-bold px-2 py-1.5 rounded cursor-pointer transition"
                  >
                    İmtina et
                  </button>
                  <button
                    type="button"
                    disabled={isDecidingInModal || !modalRejectionReason.trim()}
                    onClick={async () => {
                      if (!editingTour || !onRejectTour) return;
                      setIsDecidingInModal(true);
                      setModalActionError(null);
                      try {
                        await onRejectTour(editingTour.id, modalRejectionReason.trim());
                        setShowModalRejectReason(false);
                        setModalRejectionReason('');
                        setEditingTour(null);
                      } catch (err: any) {
                        setModalActionError(err?.message || 'Tur rədd edilərkən xəta baş verdi.');
                      } finally {
                        setIsDecidingInModal(false);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" /> Rəddi Təsdiqlə
                  </button>
                </div>
              </div>
            )}

            {modalActionError && (
              <div className="px-4 pt-3 flex-shrink-0">
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">
                  ⚠️ {modalActionError}
                </div>
              </div>
            )}

            {editingTour.pendingData && (() => {
              const diffs = computeTourDiff(editingTour, editingTour.pendingData);
              return diffs.length > 0 ? (
                <div className="px-4 pt-3 flex-shrink-0">
                  <div className="bg-amber-50/75 border border-amber-200 text-amber-850 px-3 py-2 rounded-lg text-[11px] space-y-1">
                    <span className="font-extrabold tracking-widest text-[9px] text-amber-700 block">📝 VENDORUN ETDİYİ DƏYİŞİKLİKLƏR:</span>
                    <ul className="space-y-0.5">
                      {diffs.map((d, i) => (
                        <li key={i} className="font-medium text-slate-700">
                          <strong>{d.label}:</strong> {d.from} → {d.to}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null;
            })()}

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

      {deletingVendor && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4" onClick={closeDeleteVendorModal}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Operatoru arxivləşdir</h3>
              <p className="text-xs text-slate-500 mt-1">
                <strong className="text-slate-800">{deletingVendor.name}</strong> hesabını arxivləşdirmək istədiyinizə əminsiniz?
                Turları, slotları və rezervasiyaları qorunacaq, amma hesab artıq platformaya daxil ola bilməyəcək və müştərilərə görünməyəcək.
              </p>
            </div>
            <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Təsdiq üçün öz parolunuzu iki dəfə daxil edin.
            </p>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Parolunuz:</label>
              <input
                type="password"
                value={deleteAdminPassword}
                onChange={(e) => setDeleteAdminPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Parolunuzu təkrar daxil edin:</label>
              <input
                type="password"
                value={deleteAdminPasswordConfirm}
                onChange={(e) => setDeleteAdminPasswordConfirm(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmDeleteVendor}
                disabled={isDeletingVendor}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {isDeletingVendor ? 'Arxivləşdirilir...' : 'Arxivləşdirməyi Təsdiqlə'}
              </button>
              <button
                type="button"
                onClick={closeDeleteVendorModal}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-lg transition"
              >
                Ləğv et
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
