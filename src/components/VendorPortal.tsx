import React, { useState } from 'react';
import { Tour, TourSlot, Booking, User } from '../types';
import { ProfileTab } from './vendor/ProfileTab';
import { AddSlotForm } from './vendor/AddSlotForm';
import { AddTourForm } from './vendor/AddTourForm';
import { AddInternationalTourForm } from './vendor/AddInternationalTourForm';
import { EditTourModal } from './vendor/EditTourModal';
import { TicketModal } from './vendor/TicketModal';
import { CrmTab } from './vendor/CrmTab';
import { MyToursTab } from './vendor/MyToursTab';
import {
  Users,
  DollarSign,
  Briefcase
} from 'lucide-react';

interface VendorPortalProps {
  tours: Tour[];
  slots: TourSlot[];
  bookings: Booking[];
  currentUser: User;
  operatorToken?: string | null;
  onAddSlot: (newSlot: TourSlot) => Promise<void>;
  onAddTour: (newTour: Tour) => Promise<void>;
  onEditTour?: (updatedTour: Tour) => Promise<void>;
  onDeleteTour?: (tourId: string) => Promise<void>;
  platformCommission: number; // e.g., 10%
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onApproveBooking?: (bookingId: string) => Promise<void>;
  onEditBooking?: (updatedBooking: Booking) => Promise<void>;
  onAddBooking?: (newBooking: Booking) => Promise<void>;
  onUpdateSlotBookedCount?: (slotId: string, qty: number) => void;
  exchangeRates: { USD: number; EUR: number };
  onUpdateExchangeRates: (newRates: { USD: number; EUR: number }) => void;
}

export default function VendorPortal({
  tours,
  slots,
  bookings,
  currentUser,
  operatorToken,
  onAddSlot,
  onAddTour,
  onEditTour,
  onDeleteTour,
  platformCommission,
  onShowNotification,
  onApproveBooking,
  onEditBooking,
  onAddBooking,
  onUpdateSlotBookedCount,
  exchangeRates,
  onUpdateExchangeRates
}: VendorPortalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'my-tours' | 'add-tour' | 'add-intl-tour' | 'add-slot' | 'profile' | 'crm'>('my-tours');
  const [tourSearchTerm, setTourSearchTerm] = useState('');
  const [selectedTicketBooking, setSelectedTicketBooking] = useState<Booking | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('all');

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
        if (onShowNotification) onShowNotification('Sifariş üçün PDF bilet uğurla yaradıldı!', 'success');
        return data.ticketUrl;
      } else {
        if (onShowNotification) onShowNotification(data.error || 'Bilet yaradılarkən xəta baş verdi.', 'error');
      }
    } catch (err) {
      console.error('Bilet yaradılarkən xəta baş verdi:', err);
      if (onShowNotification) onShowNotification('Sistem xətası: Bilet yaradıla bilmədi.', 'error');
    }
  };

  // Editing Tour States
  const [editingTour, setEditingTour] = useState<Tour | null>(null);

  // Tours Form State
  const [newTourCategory, setNewTourCategory] = useState<'peak' | 'camp' | 'hiking' | 'active'>('hiking');

  // Filter tours owned by selected operator workspace (or all)
  const unfilteredMyTours = tours.filter(t => {
    if (selectedVendorId === 'all') return true;
    return t.vendorId === selectedVendorId;
  });

  const myTours = unfilteredMyTours.filter(t =>
    t.name.toLowerCase().includes(tourSearchTerm.toLowerCase()) ||
    t.region.toLowerCase().includes(tourSearchTerm.toLowerCase())
  );

  // Calculations
  const allMyTourIds = unfilteredMyTours.map(t => t.id);
  const myTourIds = myTours.map(t => t.id);
  const myBookings = bookings.filter(b => allMyTourIds.includes(b.tourId));
  const myTotalRevenue = myBookings.reduce((sum, b) => {
    if (b.status === 'paid') {
      const platformFee = b.totalAmount * (platformCommission / 100);
      return sum + (b.totalAmount - platformFee);
    }
    return sum;
  }, 0);

  const subDate = currentUser.subscriptionValidUntil ? new Date(currentUser.subscriptionValidUntil) : null;
  const isAutoDeactivated = subDate ? (Date.now() > subDate.getTime() + 3 * 24 * 60 * 60 * 1000) : false;
  const isExpired = subDate ? (Date.now() > subDate.getTime()) : false;
  const isWarning = subDate ? (subDate.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000) : false;

  return (
    <div className="space-y-6">
      
      {/* Subscription Banner */}
      {subDate && (isAutoDeactivated || isExpired || isWarning) && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${isAutoDeactivated ? 'bg-red-50 border-red-200' : isExpired ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="space-y-1">
            <h4 className={`text-sm font-bold flex items-center gap-2 ${isAutoDeactivated ? 'text-red-800' : isExpired ? 'text-orange-800' : 'text-amber-800'}`}>
              ⚠️ Abunəlik Statusu
            </h4>
            <p className={`text-xs ${isAutoDeactivated ? 'text-red-700' : isExpired ? 'text-orange-700' : 'text-amber-700'}`}>
              {isAutoDeactivated 
                ? 'Sizin abunəlik vaxtınız bitmişdir və 3 gün keçmişdir. Bütün turlarınız müştərilər üçün deaktiv edilib. Yenidən aktivləşdirmək üçün admin ilə əlaqə saxlayın.' 
                : isExpired 
                ? `Abunəlik vaxtınız bitib (${subDate.toLocaleDateString()}). 3 gün ərzində yenilənməsə, turlarınız avtomatik gizlədiləcəkdir.`
                : `Abunəlik vaxtınızın bitməsinə az qalıb: ${subDate.toLocaleDateString()}. Vaxt bitdikdən 3 gün sonra turlarınız deaktiv ediləcək.`}
            </p>
          </div>
        </div>
      )}

      {/* Operator Filter Selector */}
      <div className="bg-[#f0fdf4]/80 backdrop-blur-xs border border-emerald-100 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-center shadow-xs">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
            <span className="text-[9px] text-emerald-800 font-extrabold bg-emerald-100 border border-emerald-200/50 px-2 py-0.5 rounded tracking-wide">
              Operator İş Sahəsi
            </span>
            <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
              Demo İnteqrasiya
            </span>
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">
            {selectedVendorId === 'all' 
              ? 'Bütün Operatorlar (Ümumi İdarəetmə Rejimi)' 
              : selectedVendorId === 'user-vendor-1' 
              ? 'GedəkGörək' 
              : selectedVendorId === 'user-vendor-2'
              ? 'NDA'
              : 'Peak&Trails'}
          </h3>
          <p className="text-[11px] text-slate-550 text-slate-500">
            Müştərinin qeydiyyatsız sifariş etdiyi hər bir bilet avtomatik müvafiq operatorun buradakı iş sahəsinə düşür.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center">
          <button
            type="button"
            onClick={() => {
              setSelectedVendorId('all');
              if (onShowNotification) onShowNotification('Bütün operatorların məlumatları göstərilir', 'info');
            }}
            className={`px-3 py-2 text-[10px] font-extrabold uppercase rounded-lg transition-all border cursor-pointer ${
              selectedVendorId === 'all'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Bütün Turlar ({tours.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedVendorId('user-vendor-1');
              if (onShowNotification) onShowNotification('Siyahı "GedəkGörək" üzrə filtrləndi', 'info');
            }}
            className={`px-3 py-2 text-[10px] font-extrabold uppercase rounded-lg transition-all border cursor-pointer ${
              selectedVendorId === 'user-vendor-1'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            GedəkGörək ({bookings.filter(b => tours.find(t => t.id === b.tourId)?.vendorId === 'user-vendor-1').length} bilet)
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedVendorId('user-vendor-2');
              if (onShowNotification) onShowNotification('Siyahı "NDA" üzrə filtrləndi', 'info');
            }}
            className={`px-3 py-2 text-[10px] font-extrabold uppercase rounded-lg transition-all border cursor-pointer ${
              selectedVendorId === 'user-vendor-2'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            NDA ({bookings.filter(b => tours.find(t => t.id === b.tourId)?.vendorId === 'user-vendor-2').length} bilet)
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedVendorId('user-vendor-3');
              if (onShowNotification) onShowNotification('Siyahı "Peak&Trails" üzrə filtrləndi', 'info');
            }}
            className={`px-3 py-2 text-[10px] font-extrabold uppercase rounded-lg transition-all border cursor-pointer ${
              selectedVendorId === 'user-vendor-3'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Peak&Trails ({bookings.filter(b => tours.find(t => t.id === b.tourId)?.vendorId === 'user-vendor-3').length} bilet)
          </button>
        </div>
      </div>
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest">Mənim Turlarım</span>
            <h4 className="text-xl font-extrabold text-slate-900">{myTours.length} Marşrut</h4>
            <p className="text-[10px] text-slate-500">Platformada daxil edilən aktiv turlar</p>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-150 text-slate-700 rounded-lg">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest">Net Gəlir (AZN)</span>
            <h4 className="text-xl font-extrabold text-emerald-750">{myTotalRevenue.toFixed(2)} AZN</h4>
            <p className="text-[10px] text-slate-500">Komissiya (-{platformCommission}%) çıxılmaqla</p>
          </div>
          <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest">Satılan Biletlər</span>
            <h4 className="text-xl font-extrabold text-[#0369a1]">{myBookings.length} Bilet</h4>
            <p className="text-[10px] text-slate-500">Uğurlu iştirakçı qeydiyyatı</p>
          </div>
          <div className="p-2.5 bg-sky-50 border border-sky-100 text-sky-700 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Internal Navigation tabs */}
      <div className="flex border-b border-slate-200 bg-white/50 backdrop-blur-xs rounded-t-xl px-2 overflow-x-auto scrollbar-thin">
        <button
          onClick={() => setActiveSubTab('my-tours')}
          className={`px-5 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'my-tours' 
              ? 'border-emerald-700 text-emerald-800' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          🗄️ Turlarım və Cari Rezervasiyalar
        </button>

        <button
          onClick={() => setActiveSubTab('crm')}
          className={`px-5 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'crm' 
              ? 'border-emerald-700 text-emerald-800' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          📊 CRM & İştirakçılar
        </button>

        <button
          onClick={() => {
            setActiveSubTab('add-tour');
            if (newTourCategory === 'active') {
              setNewTourCategory('hiking');
            }
          }}
          className={`px-5 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'add-tour' && newTourCategory !== 'active'
              ? 'border-emerald-700 text-emerald-800' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          ➕ Yeni Marşrut Yarat
        </button>

        <button
          onClick={() => {
            setActiveSubTab('add-tour');
            setNewTourCategory('active');
          }}
          className={`px-5 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
            activeSubTab === 'add-tour' && newTourCategory === 'active'
              ? 'border-emerald-700 text-emerald-800' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          🏃‍♂️ Aktiv Həyat (İdman) Yarat
        </button>

        <button
          onClick={() => setActiveSubTab('add-intl-tour')}
          className={`px-5 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
            activeSubTab === 'add-intl-tour' 
              ? 'border-emerald-700 text-emerald-800' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          ✈️ <span className="text-emerald-750 font-black animate-pulse">Yeni Xarici Tur Yarat</span>
        </button>

        <button
          onClick={() => setActiveSubTab('add-slot')}
          className={`px-5 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'add-slot' 
              ? 'border-emerald-700 text-emerald-800' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          📅 Cari Tura Təqvim Əlavə Et
        </button>

        <button
          onClick={() => setActiveSubTab('profile')}
          className={`px-5 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'profile' 
              ? 'border-emerald-700 text-emerald-800' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          👤 Profil Məlumatları
        </button>
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
          onEditClick={(tour) => setEditingTour(tour)}
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
        <AddTourForm
          currentUser={currentUser}
          category={newTourCategory}
          onCategoryChange={setNewTourCategory}
          onAddTour={onAddTour}
          onAddSlot={onAddSlot}
          onShowNotification={onShowNotification}
          onNavigateBack={() => setActiveSubTab('my-tours')}
        />
      )}

      {/* Subtab HTML Form: Add International Tour */}
      {activeSubTab === 'add-intl-tour' && (
        <AddInternationalTourForm
          currentUser={currentUser}
          onAddTour={onAddTour}
          onAddSlot={onAddSlot}
          onShowNotification={onShowNotification}
          onNavigateBack={() => setActiveSubTab('my-tours')}
        />
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
        onEditTour={onEditTour}
        onDeleteTour={onDeleteTour}
        onShowNotification={onShowNotification}
        onClose={() => setEditingTour(null)}
      />

    {/* Subtab HTML Form: Operator Profile */}
    {activeSubTab === 'profile' && (
      <ProfileTab
        currentUser={currentUser}
        onShowNotification={onShowNotification}
        onCancel={() => setActiveSubTab('my-tours')}
      />
    )}

    </div>
  );
}
