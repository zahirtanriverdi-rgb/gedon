import React, { useState } from 'react';
import { Tour, TourSlot, Booking, User } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { ProfileTab } from './vendor/ProfileTab';
import { AddSlotForm } from './vendor/AddSlotForm';
import { TourForm } from './vendor/TourForm';
import { InternationalTourForm } from './vendor/InternationalTourForm';
import { EditTourModal } from './vendor/EditTourModal';
import { TicketModal } from './vendor/TicketModal';
import { CrmTab } from './vendor/CrmTab';
import { MyToursTab } from './vendor/MyToursTab';
import DashboardSidebarLayout, { DashboardNavItem } from './layout/DashboardSidebarLayout';
import StatCard from './layout/StatCard';
import LanguageSwitcher from './LanguageSwitcher';
import {
  Users,
  DollarSign,
  Briefcase,
  LayoutList,
  BarChart3,
  PlusCircle,
  Activity,
  Plane,
  CalendarPlus,
  User as UserIcon
} from 'lucide-react';

// Shown in place of a tour create/edit form once the vendor's subscription has expired
// (grace period active or over) — read-only tabs (my-tours, CRM, profile) stay unaffected.
function SubscriptionExpiredNotice({ message }: { message: string }) {
  const { t } = useLanguage();
  return (
    <div className="bg-white p-8 rounded-xl border border-orange-200 text-center space-y-3">
      <h3 className="text-base font-bold text-orange-800">⚠️ {t('vendorMisc.vendorPortal.subscriptionExpiredTitle')}</h3>
      <p className="text-sm text-slate-600 max-w-md mx-auto">{message}</p>
    </div>
  );
}

interface VendorPortalProps {
  tours: Tour[];
  slots: TourSlot[];
  bookings: Booking[];
  currentUser: User;
  operatorToken?: string | null;
  onAddSlot: (newSlot: TourSlot) => Promise<void>;
  onDeleteSlot?: (slotId: string) => Promise<void>;
  onAddTour: (newTour: Tour) => Promise<void>;
  onEditTour?: (updatedTour: Tour) => Promise<void>;
  onDeleteTour?: (tourId: string) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onApproveBooking?: (bookingId: string) => Promise<void>;
  onEditBooking?: (updatedBooking: Booking) => Promise<void>;
  onAddBooking?: (newBooking: Booking) => Promise<void>;
  onUpdateSlotBookedCount?: (slotId: string, qty: number) => void;
  exchangeRates: { USD: number; EUR: number };
  onUpdateExchangeRates: (newRates: { USD: number; EUR: number }) => void;
  onToggleFeatured?: (tourId: string, isManuallyFeatured: boolean) => Promise<void>;
  onUserUpdated?: (updatedUser: User) => void;
  onLogout: () => void;
}

export default function VendorPortal({
  tours,
  slots,
  bookings,
  currentUser,
  operatorToken,
  onAddSlot,
  onDeleteSlot,
  onAddTour,
  onEditTour,
  onDeleteTour,
  onShowNotification,
  onApproveBooking,
  onEditBooking,
  onAddBooking,
  onUpdateSlotBookedCount,
  exchangeRates,
  onUpdateExchangeRates,
  onToggleFeatured,
  onUserUpdated,
  onLogout
}: VendorPortalProps) {
  const { t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'my-tours' | 'add-tour' | 'add-intl-tour' | 'add-slot' | 'profile' | 'crm'>('my-tours');
  const [tourSearchTerm, setTourSearchTerm] = useState('');
  const [selectedTicketBooking, setSelectedTicketBooking] = useState<Booking | null>(null);

  const triggerTicketGeneration = async (
    booking: Booking,
    passedTourName?: string,
    passedRegion?: string,
    passedDate?: string
  ) => {
    try {
      const bTour = tours.find(t => t.id === booking.tourId);
      const bSlot = slots.find(s => s.id === booking.slotId);
      const tourName = passedTourName || bTour?.name || '';
      const region = passedRegion || bTour?.region || '';
      const date = passedDate || bSlot?.startDate || booking.bookingDate || '';

      const bRef = booking.booking_reference || `TUR-${booking.id.slice(0, 5).toUpperCase()}`;
      const response = await fetch('/api/bookings/generate-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.id,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          tourName: tourName,
          region: region,
          date: date,
          reference: bRef,
          participantsCount: booking.participantsCount,
          amount: booking.totalAmount,
          status: booking.status,
          attendanceStatus: booking.attendanceStatus || 'Təsdiqlənib',
          paymentStatus: booking.paymentStatus || 'Ödənilib'
        })
      });
      const data = await response.json();
      if (data.success && data.ticketUrl) {
        if (onEditBooking) {
          onEditBooking({
            ...booking,
            ticketUrl: data.ticketUrl
          });
        }
        if (onShowNotification) onShowNotification(t('vendorMisc.vendorPortal.ticketCreated'), 'success');
        return data.ticketUrl;
      } else {
        if (onShowNotification) onShowNotification(data.error || t('vendorMisc.vendorPortal.ticketCreateError'), 'error');
      }
    } catch (err) {
      console.error('Bilet yaradılarkən xəta baş verdi:', err);
      if (onShowNotification) onShowNotification(t('vendorMisc.vendorPortal.ticketSystemError'), 'error');
    }
  };

  // Editing Tour States
  const [editingTour, setEditingTour] = useState<Tour | null>(null);

  // Tours Form State
  const [newTourCategory, setNewTourCategory] = useState<'peak' | 'camp' | 'hiking' | 'active'>('hiking');

  // The backend already scopes GET /api/tours to the logged-in vendor's own tours.
  const myTours = tours.filter(t =>
    t.name.toLowerCase().includes(tourSearchTerm.toLowerCase()) ||
    t.region.toLowerCase().includes(tourSearchTerm.toLowerCase())
  );

  // Calculations
  const allMyTourIds = tours.map(t => t.id);
  const myTourIds = myTours.map(t => t.id);
  const myBookings = bookings.filter(b => allMyTourIds.includes(b.tourId));
  const myTotalGrossRevenue = myBookings.reduce((sum, b) => {
    if (b.status === 'paid') return sum + b.totalAmount;
    return sum;
  }, 0);

  const subDate = currentUser.subscriptionValidUntil ? new Date(currentUser.subscriptionValidUntil) : null;
  const GRACE_MS = 3 * 24 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const isAutoDeactivated = subDate ? (Date.now() > subDate.getTime() + GRACE_MS) : false;
  const isExpired = subDate ? (Date.now() > subDate.getTime()) : false;
  const isWarning = subDate ? (subDate.getTime() - Date.now() < GRACE_MS) : false;
  // Days left in the 3-day grace period (once expired) or days left until expiry (while
  // still active but inside the 3-day warning window) — rounded up so "0 gün qalıb" only
  // shows once there's genuinely less than a day left.
  const graceDaysLeft = subDate ? Math.max(0, Math.ceil((subDate.getTime() + GRACE_MS - Date.now()) / DAY_MS)) : 0;
  const daysUntilExpiry = subDate ? Math.max(0, Math.ceil((subDate.getTime() - Date.now()) / DAY_MS)) : 0;
  // Once the subscription has expired — whether still inside the 3-day grace window or past
  // it — the vendor keeps full read access to their panel (my-tours, CRM, profile) but can no
  // longer create or edit tours. `isAutoDeactivated` is already a subset of `isExpired`, so this
  // is just `isExpired` under a name that reads clearly at each gating call site below.
  const isSubscriptionExpiredOrInGracePeriod = isExpired;
  const subscriptionExpiredMessage = t('vendorMisc.vendorPortal.subscriptionExpiredMessage', { days: graceDaysLeft });

  // Sidebar nav items — 'add-tour' covers two categories (hiking-default vs. active/sports)
  // sharing the same activeSubTab value, so the active pill needs its own derived id.
  const navItems: DashboardNavItem[] = [
    { id: 'my-tours', label: t('vendorMisc.vendorPortal.tabMyTours'), icon: LayoutList },
    { id: 'crm', label: t('vendorMisc.vendorPortal.tabCrm'), icon: BarChart3 },
    { id: 'add-tour', label: t('vendorMisc.vendorPortal.tabAddTour'), icon: PlusCircle },
    { id: 'add-active-tour', label: t('vendorMisc.vendorPortal.tabAddActiveTour'), icon: Activity },
    { id: 'add-intl-tour', label: t('vendorMisc.vendorPortal.tabAddIntlTour'), icon: Plane },
    { id: 'add-slot', label: t('vendorMisc.vendorPortal.tabAddSlot'), icon: CalendarPlus },
    { id: 'profile', label: t('vendorMisc.vendorPortal.tabProfile'), icon: UserIcon },
  ];
  const activeNavId = activeSubTab === 'add-tour'
    ? (newTourCategory === 'active' ? 'add-active-tour' : 'add-tour')
    : activeSubTab;
  const handleNavSelect = (id: string) => {
    if (id === 'add-tour') {
      setActiveSubTab('add-tour');
      if (newTourCategory === 'active') setNewTourCategory('hiking');
    } else if (id === 'add-active-tour') {
      setActiveSubTab('add-tour');
      setNewTourCategory('active');
    } else {
      setActiveSubTab(id as typeof activeSubTab);
    }
  };
  const activeNavItem = navItems.find((item) => item.id === activeNavId);

  return (
    <DashboardSidebarLayout
      wordmark="GedəkGörək"
      subtitle={t('vendorMisc.vendorPortal.sidebarSubtitle')}
      navItems={navItems}
      activeId={activeNavId}
      onSelect={handleNavSelect}
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
      {/* Subscription Banner */}
      {subDate && (isAutoDeactivated || isExpired || isWarning) && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${isAutoDeactivated ? 'bg-red-50 border-red-200' : isExpired ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="space-y-1">
            <h4 className={`text-sm font-bold flex items-center gap-2 ${isAutoDeactivated ? 'text-red-800' : isExpired ? 'text-orange-800' : 'text-amber-800'}`}>
              ⚠️ {t('vendorMisc.vendorPortal.subscriptionStatusTitle')}
            </h4>
            <p className={`text-xs ${isAutoDeactivated ? 'text-red-700' : isExpired ? 'text-orange-700' : 'text-amber-700'}`}>
              {isAutoDeactivated
                ? t('vendorMisc.vendorPortal.subscriptionAutoDeactivated')
                : isExpired
                ? t('vendorMisc.vendorPortal.subscriptionExpiredGrace', { date: subDate.toLocaleDateString(), days: graceDaysLeft })
                : t('vendorMisc.vendorPortal.subscriptionExpiringSoon', { days: daysUntilExpiry, date: subDate.toLocaleDateString() })}
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          label={t('vendorMisc.vendorPortal.metricMyTours')}
          value={t('vendorMisc.vendorPortal.metricMyToursValue', { count: myTours.length })}
          subtitle={t('vendorMisc.vendorPortal.metricMyToursSubtitle')}
          icon={Briefcase}
          color="primary"
        />
        <StatCard
          label={t('vendorMisc.vendorPortal.metricRevenue')}
          value={`${myTotalGrossRevenue.toFixed(2)} AZN`}
          subtitle={t('vendorMisc.vendorPortal.metricRevenueSubtitle')}
          icon={DollarSign}
          color="gold"
        />
        <StatCard
          label={t('vendorMisc.vendorPortal.metricTickets')}
          value={t('vendorMisc.vendorPortal.metricTicketsValue', { count: myBookings.length })}
          subtitle={t('vendorMisc.vendorPortal.metricTicketsSubtitle')}
          icon={Users}
          color="pink"
        />
      </div>

      {/* Subtab Contents */}
      {/* Subtab Content: My Tours */}
      {activeSubTab === 'my-tours' && (
        <MyToursTab
          tours={tours}
          slots={slots}
          myTours={myTours}
          myTourIds={myTourIds}
          tourSearchTerm={tourSearchTerm}
          onTourSearchChange={setTourSearchTerm}
          exchangeRates={exchangeRates}
          onUpdateExchangeRates={onUpdateExchangeRates}
          onShowNotification={onShowNotification}
          onEditClick={(tour) => {
            if (isSubscriptionExpiredOrInGracePeriod) {
              if (onShowNotification) onShowNotification(subscriptionExpiredMessage, 'warning');
              return;
            }
            setEditingTour(tour);
          }}
          onToggleFeatured={onToggleFeatured}
        />
      )}

      {/* Subtab Content: CRM & Tour Manifest */}
      {/* CRM & Bookings Tab */}
      {activeSubTab === 'crm' && (
        <CrmTab
          tours={tours}
          slots={slots}
          bookings={bookings}
          currentUser={currentUser}
          operatorToken={operatorToken}
          onEditBooking={onEditBooking}
          onAddBooking={onAddBooking}
          onShowNotification={onShowNotification}
          triggerTicketGeneration={triggerTicketGeneration}
        />
      )}

      {/* Subtab HTML Form: Add Tour */}
      {activeSubTab === 'add-tour' && (
        isSubscriptionExpiredOrInGracePeriod ? (
          <SubscriptionExpiredNotice message={subscriptionExpiredMessage} />
        ) : (
          <TourForm
            currentUser={currentUser}
            slots={slots}
            category={newTourCategory}
            onCategoryChange={setNewTourCategory}
            onAddTour={onAddTour}
            onAddSlot={onAddSlot}
            onDeleteSlot={onDeleteSlot}
            onShowNotification={onShowNotification}
            onNavigateBack={() => setActiveSubTab('my-tours')}
          />
        )
      )}

      {/* Subtab HTML Form: Add International Tour */}
      {activeSubTab === 'add-intl-tour' && (
        isSubscriptionExpiredOrInGracePeriod ? (
          <SubscriptionExpiredNotice message={subscriptionExpiredMessage} />
        ) : (
          <InternationalTourForm
            currentUser={currentUser}
            slots={slots}
            onAddTour={onAddTour}
            onAddSlot={onAddSlot}
            onDeleteSlot={onDeleteSlot}
            onShowNotification={onShowNotification}
            onNavigateBack={() => setActiveSubTab('my-tours')}
          />
        )
      )}

      {/* Subtab HTML Form: Add Slot Calendar */}
      {activeSubTab === 'add-slot' && (
        <AddSlotForm
          myTours={myTours}
          onAddSlot={onAddSlot}
          onShowNotification={onShowNotification}
          onSuccess={() => setActiveSubTab('my-tours')}
        />
      )}

      {/* TICKET / VOUCHER MODAL */}
      <TicketModal
        booking={selectedTicketBooking}
        tours={tours}
        onApproveBooking={onApproveBooking}
        onShowNotification={onShowNotification}
        triggerTicketGeneration={triggerTicketGeneration}
        onUpdateBooking={setSelectedTicketBooking}
      />

      {/* Edit Tour Modal Overlay */}
      <EditTourModal
        tour={editingTour}
        slots={slots}
        currentUser={currentUser}
        onAddTour={onAddTour}
        onEditTour={onEditTour}
        onDeleteTour={onDeleteTour}
        onAddSlot={onAddSlot}
        onDeleteSlot={onDeleteSlot}
        onShowNotification={onShowNotification}
        onClose={() => setEditingTour(null)}
      />

    {/* Subtab HTML Form: Operator Profile */}
    {activeSubTab === 'profile' && (
      <ProfileTab
        currentUser={currentUser}
        operatorToken={operatorToken}
        onShowNotification={onShowNotification}
        onCancel={() => setActiveSubTab('my-tours')}
        onUserUpdated={onUserUpdated}
      />
    )}

    </DashboardSidebarLayout>
  );
}
