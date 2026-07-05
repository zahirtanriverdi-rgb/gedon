import React, { useState, useMemo, useEffect } from 'react';
import { Tour, TourSlot, Booking, User, PlatformConfig, PriceCalculatorConfig } from '../types';
import { TourForm } from './vendor/TourForm';
import { InternationalTourForm } from './vendor/InternationalTourForm';
import { useLanguage } from '../i18n/LanguageContext';
import DashboardSidebarLayout, { DashboardNavItem } from './layout/DashboardSidebarLayout';
import StatCard from './layout/StatCard';
import LanguageSwitcher from './LanguageSwitcher';
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
  Plus,
  MessageCircle,
  Wifi,
  WifiOff,
  LayoutDashboard,
  Compass,
  Building2,
  Settings
} from 'lucide-react';

function isTourInternational(t: Tour): boolean {
  return !!t.isInternational || t.category === 'international';
}

// Human-readable labels for the fields most likely to show up in a vendor's edit proposal.
// Anything not listed here falls back to the raw field key so nothing silently disappears.
// Maps each field to its translation key under adminPortal.diffFields.*
const DIFF_FIELD_LABEL_KEYS: Record<string, string> = {
  name: 'name', description: 'description', region: 'region', category: 'category',
  difficulty: 'difficulty', durationDays: 'durationDays', durationHours: 'durationHours',
  price: 'price', discountPrice: 'discountPrice', priceCurrency: 'priceCurrency',
  image: 'image', images: 'images', videos: 'videos',
  includes: 'includes', notIncluded: 'notIncluded', highlights: 'highlights',
  languages: 'languages', whatsapp_number: 'whatsappNumber', meetingPoint: 'meetingPoint',
  isActive: 'isActive', gpxData: 'gpxData', gpxFileName: 'gpxFileName',
  activityType: 'activityType', activeDifficulty: 'activeDifficulty',
  ageLimit: 'ageLimit', requiredEquipment: 'requiredEquipment',
  equipmentIncluded: 'equipmentIncluded', equipmentRentalPrice: 'equipmentRentalPrice',
  safetyInstructions: 'safetyInstructions', allowTeamRegistration: 'allowTeamRegistration',
  scheduleFrequency: 'scheduleFrequency', destinationCountry: 'destinationCountry',
  destinationCity: 'destinationCity', durationNights: 'durationNights',
  flightIncluded: 'flightIncluded', flightDetails: 'flightDetails',
  transferDetails: 'transferDetails', hotelName: 'hotelName', hotelStars: 'hotelStars',
  roomTypes: 'roomTypes', mealType: 'mealType', itinerary: 'itinerary',
  importantInfo: 'importantInfo',
};

// Fields that are bookkeeping/derived, never a meaningful "vendor changed this" fact.
const DIFF_IGNORE_KEYS = new Set([
  'id', 'vendorId', 'vendorName', 'status', 'isApproved', 'pendingData', 'createdAt',
  'rejectionReason', 'lastChangeLog', 'rating', 'reviewsCount',
]);

function formatDiffValue(v: any, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (v === undefined || v === null || v === '') return t('adminPortal.diffFields.empty');
  if (typeof v === 'boolean') return v ? t('adminPortal.diffFields.yes') : t('adminPortal.diffFields.no');
  if (Array.isArray(v)) return v.length ? v.join(', ') : t('adminPortal.diffFields.empty');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// Compares the tour's currently-live fields against a vendor's proposed edit (pendingData) and
// returns only the fields that actually changed — far more reliable than trusting the vendor's
// self-reported lastChangeLog, which only ever tracked name/isActive/image.
function computeTourDiff(live: Tour, proposed: Record<string, any>, t: (key: string, vars?: Record<string, string | number>) => string): { label: string; from: string; to: string }[] {
  const diffs: { label: string; from: string; to: string }[] = [];
  for (const key of Object.keys(proposed)) {
    if (DIFF_IGNORE_KEYS.has(key)) continue;
    const fromVal = (live as any)[key];
    const toVal = proposed[key];
    if (JSON.stringify(fromVal ?? null) === JSON.stringify(toVal ?? null)) continue;
    const labelKey = DIFF_FIELD_LABEL_KEYS[key];
    const label = labelKey ? t(`adminPortal.diffFields.${labelKey}`) : key;
    diffs.push({ label, from: formatDiffValue(fromVal, t), to: formatDiffValue(toVal, t) });
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
  authToken?: string | null;
  onLogout: () => void;
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
  onUpdateTourStatus,
  authToken,
  onLogout
}: AdminPortalProps) {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState<'dashboard' | 'tours' | 'vendors' | 'settings'>('dashboard');

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
      if (onShowNotification) onShowNotification(t('adminPortal.priceCalculator.destinationRequiredError'), 'error');
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
            onShowNotification(t('adminPortal.exchangeRates.cbarFetchSuccess', { usd: data.USD, eur: data.EUR }), 'success');
          }
        } else {
          throw new Error(t('adminPortal.exchangeRates.cbarDataError'));
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || t('adminPortal.exchangeRates.cbarServerError'));
      }
    } catch (err: any) {
      if (onShowNotification) {
        onShowNotification(t('adminPortal.exchangeRates.cbarFetchError', { message: err.message }), 'error');
      }
    } finally {
      setCbarLoading(false);
    }
  };

  // WhatsApp verification connection (see server/whatsapp.ts) — polled while this panel is
  // mounted so the QR code / connected status stays current without a manual refresh.
  const [whatsappStatus, setWhatsappStatus] = useState<'disconnected' | 'connecting' | 'qr_pending' | 'connected'>('disconnected');
  const [whatsappQr, setWhatsappQr] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [whatsappActionLoading, setWhatsappActionLoading] = useState(false);

  const whatsappAuthHeaders = React.useMemo(() => ({
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  }), [authToken]);

  useEffect(() => {
    let cancelled = false;
    const pollStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status', { headers: whatsappAuthHeaders });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setWhatsappStatus(data.status);
        setWhatsappQr(data.qr);
        setWhatsappNumber(data.number);
      } catch {
        // Polling failure is silent — the status badge simply keeps its last known value.
      }
    };
    pollStatus();
    const intervalId = setInterval(pollStatus, 4000);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, [whatsappAuthHeaders]);

  const handleWhatsAppConnect = async () => {
    setWhatsappActionLoading(true);
    try {
      const res = await fetch('/api/whatsapp/connect', { method: 'POST', headers: whatsappAuthHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setWhatsappStatus(data.status);
      setWhatsappQr(data.qr);
      setWhatsappNumber(data.number);
    } catch (err: any) {
      if (onShowNotification) onShowNotification(t('adminPortal.whatsappConnection.connectError', { message: err.message }), 'error');
    } finally {
      setWhatsappActionLoading(false);
    }
  };

  const handleWhatsAppLogout = async () => {
    if (!window.confirm(t('adminPortal.whatsappConnection.logoutConfirm'))) return;
    setWhatsappActionLoading(true);
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST', headers: whatsappAuthHeaders });
      setWhatsappStatus('disconnected');
      setWhatsappQr(null);
      setWhatsappNumber(null);
      if (onShowNotification) onShowNotification(t('adminPortal.whatsappConnection.logoutSuccess'), 'info');
    } finally {
      setWhatsappActionLoading(false);
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
        if (onShowNotification) onShowNotification(t('adminPortal.loginCredentials.emptyFieldsError'), 'error');
        return;
      }
      onUpdateUser(vendorId, { username: vendorUsername, password: vendorPassword });
      setEditingVendorAuth(null);
      if (onShowNotification) onShowNotification(t('adminPortal.loginCredentials.updateSuccess'), 'success');
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
      if (onShowNotification) onShowNotification(t('adminPortal.createVendor.requiredFieldsError'), 'error');
      return;
    }
    if (newVendorPassword.length < 6) {
      if (onShowNotification) onShowNotification(t('adminPortal.createVendor.passwordTooShortError'), 'error');
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
      if (onShowNotification) onShowNotification(t('adminPortal.deleteVendor.passwordRequiredError'), 'error');
      return;
    }
    if (deleteAdminPassword !== deleteAdminPasswordConfirm) {
      if (onShowNotification) onShowNotification(t('adminPortal.deleteVendor.passwordMismatchError'), 'error');
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

  const navItems: DashboardNavItem[] = [
    { id: 'dashboard', label: t('adminPortal.sidebar.dashboard'), icon: LayoutDashboard },
    { id: 'tours', label: t('adminPortal.sidebar.tours'), icon: Compass },
    { id: 'vendors', label: t('adminPortal.sidebar.vendors'), icon: Building2 },
    { id: 'settings', label: t('adminPortal.sidebar.settings'), icon: Settings },
  ];
  const activeNavItem = navItems.find((item) => item.id === activeSection);

  return (
    <DashboardSidebarLayout
      wordmark="GedəkGörək"
      subtitle={t('adminPortal.sidebar.subtitle')}
      navItems={navItems}
      activeId={activeSection}
      onSelect={(id) => setActiveSection(id as typeof activeSection)}
      title={activeNavItem?.label ?? ''}
      rightSlot={
        <>
          <LanguageSwitcher />
          <button
            onClick={onLogout}
            className="text-xs font-semibold py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
          >
            {t('app.nav.logout')}
          </button>
        </>
      }
    >
      {activeSection === 'dashboard' && (
      <>
      {/* Metrics board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('adminPortal.metrics.successfulBookings')}
          value={t('adminPortal.metrics.ticketCount', { count: totalPaidBookingsCount })}
          subtitle={t('adminPortal.metrics.successfulBookingsHint')}
          icon={DollarSign}
          color="primary"
        />
        <StatCard
          label={t('adminPortal.metrics.turnover')}
          value={`${totalVolume.toFixed(2)} AZN`}
          subtitle={t('adminPortal.metrics.turnoverHint')}
          icon={TrendingUp}
          color="gold"
        />
        <StatCard
          label={t('adminPortal.metrics.partnerCompanies')}
          value={t('adminPortal.metrics.operatorCount', { count: totalVendors })}
          subtitle={t('adminPortal.metrics.partnerCompaniesHint')}
          icon={Building}
          color="pink"
        />
        <StatCard
          label={t('adminPortal.metrics.registeredCustomers')}
          value={t('adminPortal.metrics.activeCount', { count: totalCustomers })}
          subtitle={t('adminPortal.metrics.registeredCustomersHint')}
          icon={UserCheck}
          color="blue"
        />
      </div>

      {/* Financial Ledger */}
      <div className="bg-ink-900 p-5 rounded-xl border border-slate-850 text-slate-300 space-y-4 shadow-md">
        <h4 className="text-xs font-bold text-emerald-400 tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          {t('adminPortal.ledger.title')}
        </h4>

        <p className="text-[11px] text-slate-400 leading-normal">
          {t('adminPortal.ledger.description')}
        </p>

        <div className="space-y-2.5 font-mono text-[9px] max-h-96 overflow-y-auto scrollbar-none">
          {bookings.filter(b => b.status === 'paid').map((b, i) => {
            return (
              <div key={b.id || i} className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded text-slate-400 space-y-1">
                <span className="text-amber-500 tracking-wider font-bold">LOG_TRANSACT_#{b.id} OK</span>
                <div className="text-slate-300">{t('adminPortal.ledger.grossAmount')}: {b.totalAmount.toFixed(2)} AZN</div>
                <div className="text-sky-400">{t('adminPortal.ledger.vendorIncome')}: {b.totalAmount.toFixed(2)} AZN</div>
              </div>
            );
          })}
        </div>
      </div>
      </>
      )}

      {activeSection === 'settings' && (
        <div className="space-y-6">

          {/* Section: Price Calculator Cost Elements */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-emerald-700" />
              {t('adminPortal.priceCalculator.title')}
            </h3>
            <p className="text-xs text-slate-500 leading-normal">
              {t('adminPortal.priceCalculator.description')}
            </p>

            <div>
              <h4 className="text-[10px] font-extrabold text-slate-400 tracking-wide mb-2">{t('adminPortal.priceCalculator.destinationsLabel')}</h4>
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
                  placeholder={t('adminPortal.priceCalculator.destinationNamePlaceholder')}
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="number"
                  min="1"
                  value={newDestKm}
                  onChange={(e) => setNewDestKm(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={t('adminPortal.priceCalculator.kmPlaceholder')}
                  className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <button type="button" onClick={handleAddDestination} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition">
                  {t('adminPortal.common.add')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.priceCalculator.busRatePerKm')}</label>
                <input type="number" step="0.1" min="0" value={pcConfig.busRatePerKm} onChange={handlePcNumberChange('busRatePerKm')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.priceCalculator.busCampSurcharge')}</label>
                <input type="number" min="0" value={pcConfig.busCampSurcharge} onChange={handlePcNumberChange('busCampSurcharge')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.priceCalculator.guideDailyBase')}</label>
                <input type="number" min="0" value={pcConfig.guideDailyBase} onChange={handlePcNumberChange('guideDailyBase')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.priceCalculator.guideCampBase')}</label>
                <input type="number" min="0" value={pcConfig.guideCampBase} onChange={handlePcNumberChange('guideCampBase')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.priceCalculator.guidePerParticipant')}</label>
                <input type="number" step="0.1" min="0" value={pcConfig.guidePerParticipant} onChange={handlePcNumberChange('guidePerParticipant')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.priceCalculator.foodDailyKendPrice')}</label>
                <input type="number" min="0" value={pcConfig.foodDailyKendPrice} onChange={handlePcNumberChange('foodDailyKendPrice')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.priceCalculator.foodDailySendvicPrice')}</label>
                <input type="number" min="0" value={pcConfig.foodDailySendvicPrice} onChange={handlePcNumberChange('foodDailySendvicPrice')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.priceCalculator.campBreakfastPrice')}</label>
                <input type="number" min="0" value={pcConfig.campBreakfastPrice} onChange={handlePcNumberChange('campBreakfastPrice')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.priceCalculator.campLunchPrice')}</label>
                <input type="number" min="0" value={pcConfig.campLunchPrice} onChange={handlePcNumberChange('campLunchPrice')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.priceCalculator.tentRentalPrice')}</label>
                <input type="number" min="0" value={pcConfig.tentRentalPrice} onChange={handlePcNumberChange('tentRentalPrice')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.priceCalculator.sleepingBagRentalPrice')}</label>
                <input type="number" min="0" value={pcConfig.sleepingBagRentalPrice} onChange={handlePcNumberChange('sleepingBagRentalPrice')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.priceCalculator.matRentalPrice')}</label>
                <input type="number" min="0" value={pcConfig.matRentalPrice} onChange={handlePcNumberChange('matRentalPrice')} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSavePcConfig}
              className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all"
            >
              {t('adminPortal.common.save')}
            </button>
          </div>

          {/* Section: Central Currency Exchange Rates */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-700" />
              {t('adminPortal.exchangeRates.title')}
            </h3>
            <p className="text-xs text-slate-500 leading-normal">
              {t('adminPortal.exchangeRates.description')}
            </p>

            <div className="flex flex-wrap gap-4 items-end max-w-xl">
              <div className="w-40">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.exchangeRates.usdLabel')}</label>
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
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.exchangeRates.eurLabel')}</label>
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
                      onShowNotification(t('adminPortal.exchangeRates.saveSuccess'), 'success');
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  {t('adminPortal.exchangeRates.saveButton')}
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
                      {t('adminPortal.exchangeRates.loading')}
                    </>
                  ) : (
                    <>
                      {t('adminPortal.exchangeRates.fetchCbar')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section: WhatsApp Verification Connection */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-emerald-700" />
              {t('adminPortal.whatsappConnection.title')}
            </h3>
            <p className="text-xs text-slate-500 leading-normal">
              {t('adminPortal.whatsappConnection.description')}
            </p>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-slate-400 tracking-wide">{t('adminPortal.whatsappConnection.statusLabel')}</span>
              {whatsappStatus === 'connected' ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                  <Wifi className="w-3.5 h-3.5" /> {t('adminPortal.whatsappConnection.statusConnected')}
                </span>
              ) : whatsappStatus === 'qr_pending' ? (
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
                  <Wifi className="w-3.5 h-3.5" /> {t('adminPortal.whatsappConnection.statusQrPending')}
                </span>
              ) : whatsappStatus === 'connecting' ? (
                <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                  <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> {t('adminPortal.whatsappConnection.statusConnecting')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded-md">
                  <WifiOff className="w-3.5 h-3.5" /> {t('adminPortal.whatsappConnection.statusDisconnected')}
                </span>
              )}
            </div>

            {whatsappStatus === 'connected' && whatsappNumber && (
              <p className="text-xs font-mono text-slate-600">
                {t('adminPortal.whatsappConnection.connectedNumber', { number: whatsappNumber })}
              </p>
            )}

            {whatsappStatus === 'qr_pending' && whatsappQr && (
              <div className="flex flex-col items-start gap-2">
                <img src={whatsappQr} alt="WhatsApp QR" className="w-44 h-44 border border-slate-200 rounded-lg p-2" />
                <p className="text-[10px] text-slate-500 max-w-sm">{t('adminPortal.whatsappConnection.scanInstructions')}</p>
              </div>
            )}

            <div className="flex gap-3">
              {whatsappStatus !== 'connected' && (
                <button
                  type="button"
                  disabled={whatsappActionLoading}
                  onClick={handleWhatsAppConnect}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  {whatsappStatus === 'qr_pending' ? t('adminPortal.whatsappConnection.reconnectButton') : t('adminPortal.whatsappConnection.connectButton')}
                </button>
              )}
              {whatsappStatus === 'connected' && (
                <button
                  type="button"
                  disabled={whatsappActionLoading}
                  onClick={handleWhatsAppLogout}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  {t('adminPortal.whatsappConnection.logoutButton')}
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {activeSection === 'vendors' && (
        <div className="space-y-6">

          {/* Section: Subscription Management (Operator Planlaması) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              {t('adminPortal.subscriptions.title')}
            </h3>
            <p className="text-[10px] text-slate-500 mb-2">
              {t('adminPortal.subscriptions.description')}
            </p>
            <div className="space-y-3">
              {users.filter(u => u.role === 'vendor' && !u.isArchived).map(vendor => {
                const GRACE_MS = 3 * 24 * 60 * 60 * 1000;
                const DAY_MS = 24 * 60 * 60 * 1000;
                const subDate = vendor.subscriptionValidUntil ? new Date(vendor.subscriptionValidUntil) : null;
                const isWarning = subDate ? (subDate.getTime() - Date.now() < GRACE_MS) : true;
                const isExpired = subDate ? (Date.now() > subDate.getTime()) : true;
                const isAutoDeactivated = subDate ? (Date.now() > subDate.getTime() + GRACE_MS) : true;
                // Days left in the 3-day grace period (once expired) or days left until expiry
                // (while still active but inside the 3-day warning window) — always rounded up
                // so "0 gün qalıb" only shows once there's genuinely less than a day left.
                const graceDaysLeft = subDate ? Math.max(0, Math.ceil((subDate.getTime() + GRACE_MS - Date.now()) / DAY_MS)) : 0;
                const daysUntilExpiry = subDate ? Math.max(0, Math.ceil((subDate.getTime() - Date.now()) / DAY_MS)) : 0;

                return (
                  <div key={vendor.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div>
                      <strong className="text-slate-900 block">{vendor.name}</strong>
                      <span className="text-[10px] text-slate-500">{vendor.companyName || t('adminPortal.subscriptions.noCompanyName')}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {subDate ? (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isAutoDeactivated ? 'bg-red-100 text-red-800' : isExpired ? 'bg-orange-100 text-orange-800' : isWarning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {isAutoDeactivated
                              ? t('adminPortal.subscriptions.statusAutoDeactivated')
                              : isExpired
                              ? t('adminPortal.subscriptions.statusExpiredGrace', { days: graceDaysLeft })
                              : isWarning
                              ? t('adminPortal.subscriptions.statusExpiringSoon', { days: daysUntilExpiry, date: subDate.toLocaleDateString() })
                              : t('adminPortal.subscriptions.statusActive', { date: subDate.toLocaleDateString() })}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                            {t('adminPortal.subscriptions.notSet')}
                          </span>
                        )}
                        {vendor.isManuallyDeactivated && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                            {t('adminPortal.subscriptions.manuallyDeactivated')}
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
                              onShowNotification(t('adminPortal.subscriptions.extendSuccess', { name: vendor.name }), 'success');
                            }
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-1.5 px-3 rounded text-xs transition"
                      >
                        {t('adminPortal.subscriptions.extendOneMonth')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdateUser) {
                            const next = !vendor.isManuallyDeactivated;
                            onUpdateUser(vendor.id, { isManuallyDeactivated: next });
                            if (onShowNotification) {
                              onShowNotification(
                                next
                                  ? t('adminPortal.subscriptions.deactivateSuccess', { name: vendor.name })
                                  : t('adminPortal.subscriptions.reactivateSuccess', { name: vendor.name }),
                                'success'
                              );
                            }
                          }
                        }}
                        className={`font-bold p-1.5 px-3 rounded text-xs transition border ${
                          vendor.isManuallyDeactivated
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                        }`}
                      >
                        {vendor.isManuallyDeactivated ? t('adminPortal.subscriptions.activate') : t('adminPortal.subscriptions.deactivate')}
                      </button>
                      {onDeleteVendor && (
                        <button
                          type="button"
                          onClick={() => setDeletingVendor({ id: vendor.id, name: vendor.name })}
                          className="bg-red-50 hover:bg-red-100 text-red-700 font-bold p-1.5 px-3 rounded text-xs transition border border-red-200"
                        >
                          {t('adminPortal.common.delete')}
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
              {t('adminPortal.createVendor.title')}
            </h3>
            <p className="text-[10px] text-slate-500 mb-2">
              {t('adminPortal.createVendor.description')}
            </p>
            <form onSubmit={handleCreateVendorSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.createVendor.companyNameLabel')}</label>
                <input
                  type="text"
                  required
                  value={newVendorCompanyName}
                  onChange={(e) => setNewVendorCompanyName(e.target.value)}
                  placeholder={t('adminPortal.createVendor.companyNamePlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.createVendor.loginLabel')}</label>
                <input
                  type="text"
                  required
                  value={newVendorLogin}
                  onChange={(e) => setNewVendorLogin(e.target.value)}
                  placeholder={t('adminPortal.createVendor.loginPlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.createVendor.initialPasswordLabel')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={newVendorPassword}
                    onChange={(e) => setNewVendorPassword(e.target.value)}
                    placeholder={t('adminPortal.createVendor.passwordPlaceholder')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingVendor}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {isCreatingVendor ? t('adminPortal.createVendor.creating') : t('adminPortal.createVendor.createButton')}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Section: Operator Login Credentials Management */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
               <ShieldAlert className="w-4 h-4 text-emerald-700" />
               {t('adminPortal.loginCredentials.title')}
            </h3>
            <p className="text-[10px] text-slate-500 mb-2">
               {t('adminPortal.loginCredentials.description')}
            </p>
            <div className="space-y-3">
              {users.filter(u => u.role === 'vendor' && !u.isArchived).map(vendor => (
                <div key={`auth-${vendor.id}`} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <strong className="text-slate-900 block">{vendor.name} </strong>
                      <span className="text-[10px] text-slate-500">{vendor.companyName} | {t('adminPortal.loginCredentials.currentLogin')}: <span className="font-mono text-emerald-700 bg-emerald-50 px-1 rounded">{vendor.username || vendor.email}</span></span>
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
                         {t('adminPortal.loginCredentials.changeLogin')}
                      </button>
                    )}
                  </div>
                  {editingVendorAuth === vendor.id && (
                    <div className="mt-2 pt-2 border-t border-slate-200 flex flex-col md:flex-row gap-2">
                       <input
                         type="text"
                         className="flex-1 p-1.5 border border-slate-300 rounded text-xs font-mono"
                         placeholder={t('adminPortal.loginCredentials.usernamePlaceholder')}
                         value={vendorUsername}
                         onChange={(e) => setVendorUsername(e.target.value)}
                       />
                       <input
                         type="text"
                         className="flex-1 p-1.5 border border-slate-300 rounded text-xs font-mono"
                         placeholder={t('adminPortal.loginCredentials.newPasswordPlaceholder')}
                         value={vendorPassword}
                         onChange={(e) => setVendorPassword(e.target.value)}
                       />
                       <div className="flex gap-2">
                         <button
                           onClick={() => handleUpdateVendorAuth(vendor.id)}
                           className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-1.5 px-3 rounded text-xs transition"
                         >
                           {t('adminPortal.common.confirm')}
                         </button>
                         <button
                           onClick={() => setEditingVendorAuth(null)}
                           className="bg-red-50 hover:bg-red-100 text-red-600 font-bold p-1.5 px-3 rounded text-xs transition"
                         >
                           {t('adminPortal.common.cancel')}
                         </button>
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {activeSection === 'tours' && (
        <div className="space-y-6">

          {/* Section: Queue of pending tours */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest">{t('adminPortal.pendingQueue.title')}</h3>

            {pendingTours.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-lg text-xs italic text-slate-400 border border-slate-150 border-dashed">
                {t('adminPortal.pendingQueue.empty')}
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTours.map((tour) => {
                  const diffs = tour.pendingData ? computeTourDiff(tour, tour.pendingData, t) : [];
                  const isRejectingThis = rejectingTourId === tour.id;
                  return (
                  <div key={tour.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <strong className="text-slate-800 font-bold block">{tour.name}</strong>
                      <span className="text-slate-400 block">{t('adminPortal.pendingQueue.organizer')}: {tour.vendorName} • {t('adminPortal.pendingQueue.region')}: {tour.region}</span>
                      {diffs.length > 0 ? (
                        <div className="mt-1.5 bg-amber-50/75 border border-amber-200 text-amber-850 px-2 py-1.5 rounded-lg text-[10px] space-y-1 max-w-xl">
                          <span className="font-extrabold tracking-widest text-[8px] text-amber-700 block">{t('adminPortal.pendingQueue.vendorChanges')}</span>
                          <ul className="space-y-0.5">
                            {diffs.map((d, i) => (
                              <li key={i} className="font-medium text-slate-700">
                                <strong>{d.label}:</strong> {d.from} → {d.to}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : tour.lastChangeLog && (
                        <div className="mt-1.5 bg-amber-50/75 border border-amber-200 text-amber-850 px-2 py-1.5 rounded-lg text-[10px] space-y-0.5 max-w-xl">
                          <span className="font-extrabold tracking-widest text-[8px] text-amber-700 block">{t('adminPortal.pendingQueue.editNotice')}</span>
                          <p className="font-medium text-slate-700">{tour.lastChangeLog}</p>
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
                          placeholder={t('adminPortal.pendingQueue.rejectReasonPlaceholder')}
                          className="w-full px-2.5 py-1.5 bg-white border border-red-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-red-400"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => { setRejectingTourId(null); setRejectionReasonDraft(''); }}
                            className="text-slate-500 hover:text-slate-700 text-[10px] font-bold px-2 py-1.5 rounded cursor-pointer transition"
                          >
                            {t('adminPortal.common.cancelAction')}
                          </button>
                          <button
                            type="button"
                            disabled={!rejectionReasonDraft.trim() || approvingTourIds.has(tour.id)}
                            onClick={async () => {
                              if (!onRejectTour) return;
                              setApprovingTourIds(prev => new Set(prev).add(tour.id));
                              try {
                                await onRejectTour(tour.id, rejectionReasonDraft.trim());
                                setRejectingTourId(null);
                                setRejectionReasonDraft('');
                              } catch {
                                // App.tsx's handleRejectTour already showed an error toast
                              } finally {
                                setApprovingTourIds(prev => {
                                  const next = new Set(prev);
                                  next.delete(tour.id);
                                  return next;
                                });
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                          >
                            <X className="w-3 h-3" /> {t('adminPortal.pendingQueue.confirmReject')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openTourForReview(tour)}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition flex items-center gap-1 shadow-xs"
                        >
                          <Edit className="w-3 h-3" /> {t('adminPortal.pendingQueue.reviewAndEdit')}
                        </button>

                        <button
                          disabled={approvingTourIds.has(tour.id)}
                          onClick={async () => {
                            setApprovingTourIds(prev => new Set(prev).add(tour.id));
                            try {
                              await onApproveTour(tour.id);
                            } catch {
                              // App.tsx's handleApproveTour already showed an error toast
                            } finally {
                              setApprovingTourIds(prev => {
                                const next = new Set(prev);
                                next.delete(tour.id);
                                return next;
                              });
                            }
                          }}
                          className="bg-emerald-700 hover:bg-emerald-850 text-white text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                        >
                          <ThumbsUp className="w-3 h-3" /> {approvingTourIds.has(tour.id) ? t('adminPortal.pendingQueue.approving') : t('adminPortal.pendingQueue.approve')}
                        </button>

                        {onRejectTour && (
                          <button
                            disabled={approvingTourIds.has(tour.id)}
                            onClick={() => { setRejectingTourId(tour.id); setRejectionReasonDraft(''); }}
                            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                          >
                            <X className="w-3 h-3" /> {t('adminPortal.pendingQueue.reject')}
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
            <h3 className="text-xs font-bold text-slate-400 tracking-widest">{t('adminPortal.activeTours.title')}</h3>

            {tours.filter(tour => tour.status === 'approved').length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-lg text-xs italic text-slate-400 border border-slate-150 border-dashed">
                {t('adminPortal.activeTours.empty')}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                {tours.filter(tour => tour.status === 'approved').map((tour) => (
                  <div key={tour.id} className="p-4 bg-slate-50 rounded-lg border border-slate-210 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <strong className="text-slate-800 font-bold block">{tour.name}</strong>
                      <span className="text-slate-400 block">{t('adminPortal.pendingQueue.organizer')}: {tour.vendorName} • {t('adminPortal.pendingQueue.region')}: {tour.region} • {t('adminPortal.activeTours.duration')}: {tour.durationDays} {t('adminPortal.activeTours.days')} • {t('adminPortal.activeTours.category')}: {tour.category === 'hiking' ? t('adminPortal.activeTours.categoryHiking') : tour.category === 'camp' ? t('adminPortal.activeTours.categoryCamp') : t('adminPortal.activeTours.categoryPeak')}</span>
                    </div>

                    <button
                      onClick={() => openTourForReview(tour)}
                      className="bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition flex items-center gap-1 shadow-xs self-start md:self-auto"
                    >
                      <Edit className="w-3 h-3" /> {t('adminPortal.activeTours.editAction')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

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
                  <h3 className="font-extrabold text-slate-900 text-sm">{t('adminPortal.reviewModal.title')}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {editingTour.pendingData ? t('adminPortal.reviewModal.subtitlePending') : t('adminPortal.reviewModal.subtitleDefault')}
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
                {t('adminPortal.reviewModal.quickActionsHint')}
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
                      setModalActionError(err?.message || t('adminPortal.reviewModal.approveError'));
                    } finally {
                      setIsDecidingInModal(false);
                    }
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                >
                  <ThumbsUp className="w-3.5 h-3.5" /> {t('adminPortal.pendingQueue.approve')}
                </button>
                {onRejectTour && editingTour.status === 'pending_approval' && !showModalRejectReason && (
                  <button
                    type="button"
                    disabled={isDecidingInModal}
                    onClick={() => { setShowModalRejectReason(true); setModalRejectionReason(''); }}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" /> {t('adminPortal.pendingQueue.reject')}
                  </button>
                )}
              </div>
            </div>

            {showModalRejectReason && (
              <div className="p-4 bg-red-50/60 border-b border-red-100 flex-shrink-0 space-y-2">
                <label className="block text-[10px] font-bold text-red-800">{t('adminPortal.reviewModal.rejectReasonLabel')}</label>
                <textarea
                  autoFocus
                  rows={2}
                  value={modalRejectionReason}
                  onChange={(e) => setModalRejectionReason(e.target.value)}
                  placeholder={t('adminPortal.reviewModal.rejectReasonPlaceholder')}
                  className="w-full px-2.5 py-1.5 bg-white border border-red-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-red-400"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowModalRejectReason(false); setModalRejectionReason(''); }}
                    className="text-slate-500 hover:text-slate-700 text-[10px] font-bold px-2 py-1.5 rounded cursor-pointer transition"
                  >
                    {t('adminPortal.common.cancelAction')}
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
                        setModalActionError(err?.message || t('adminPortal.reviewModal.rejectError'));
                      } finally {
                        setIsDecidingInModal(false);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" /> {t('adminPortal.pendingQueue.confirmReject')}
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
              const diffs = computeTourDiff(editingTour, editingTour.pendingData, t);
              return diffs.length > 0 ? (
                <div className="px-4 pt-3 flex-shrink-0">
                  <div className="bg-amber-50/75 border border-amber-200 text-amber-850 px-3 py-2 rounded-lg text-[11px] space-y-1">
                    <span className="font-extrabold tracking-widest text-[9px] text-amber-700 block">{t('adminPortal.pendingQueue.vendorChanges')}</span>
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
              <h3 className="text-sm font-extrabold text-slate-900">{t('adminPortal.deleteVendor.title')}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {t('adminPortal.deleteVendor.confirmPrefix')} <strong className="text-slate-800">{deletingVendor.name}</strong> {t('adminPortal.deleteVendor.confirmSuffix')}
              </p>
            </div>
            <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {t('adminPortal.deleteVendor.passwordHint')}
            </p>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.deleteVendor.passwordLabel')}</label>
              <input
                type="password"
                value={deleteAdminPassword}
                onChange={(e) => setDeleteAdminPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminPortal.deleteVendor.passwordConfirmLabel')}</label>
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
                {isDeletingVendor ? t('adminPortal.deleteVendor.archiving') : t('adminPortal.deleteVendor.confirmButton')}
              </button>
              <button
                type="button"
                onClick={closeDeleteVendorModal}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-lg transition"
              >
                {t('adminPortal.common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardSidebarLayout>
  );
}
