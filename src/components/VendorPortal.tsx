import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Tour, TourSlot, Booking, User, TourCategory, Guide } from '../types';
import { parseGpsFile } from '../utils/gpxParser';
import { 
  Calendar, 
  Plus, 
  MapPin, 
  Tag, 
  Users, 
  DollarSign, 
  Briefcase, 
  CheckCircle,
  Clock,
  Printer,
  Download,
  Send,
  ShieldCheck,
  X,
  FileText,
  Check,
  Sparkles,
  Instagram,
  Edit,
  Search,
  Trash,
  Copy
} from 'lucide-react';

interface VendorPortalProps {
  tours: Tour[];
  slots: TourSlot[];
  bookings: Booking[];
  currentUser: User;
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

function QrScannerModal({ isOpen, onClose, onScan }: { isOpen: boolean, onClose: () => void, onScan: (text: string) => void }) {
  useEffect(() => {
    if (!isOpen) return;

    let scanner: Html5QrcodeScanner | null = null;
    let isRendered = false;

    const initScanner = () => {
      scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1
      }, false);

      scanner.render((text) => {
        if (!isRendered) {
          isRendered = true; // Prevent multiple triggers
          onScan(text);
          if (scanner) {
            scanner.clear().catch(console.error);
          }
        }
      }, () => {});
    };

    const timer = setTimeout(initScanner, 100);

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(e => console.error(e));
      }
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-scaleIn font-sans">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            📷 QR Kod İlə Check-in
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5"/>
          </button>
        </div>
        <div className="p-4 bg-slate-50 relative min-h-[350px]">
          <p className="text-xs text-slate-500 mb-4 text-center font-medium">Biletin üzərindəki QR kodu kameraya yaxınlaşdırın</p>
          <div id="reader" className="w-full rounded-xl overflow-hidden shadow-sm bg-black border-2 border-dashed border-slate-300"></div>
        </div>
      </div>
    </div>
  );
}

export default function VendorPortal({
  tours,
  slots,
  bookings,
  currentUser,
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
  const [cbarLoading, setCbarLoading] = useState<boolean>(false);

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

  // Operator Profile form states
  const [profileName, setProfileName] = useState(currentUser.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser.email || '');
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '');
  const [profileCompanyName, setProfileCompanyName] = useState(currentUser.companyName || '');
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatar || '');
  const [profileAbout, setProfileAbout] = useState(currentUser.about || '');
  const [profileGuides, setProfileGuides] = useState<Guide[]>(currentUser.guides || []);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  useEffect(() => {
    setProfileName(currentUser.name || '');
    setProfileEmail(currentUser.email || '');
    setProfilePhone(currentUser.phone || '');
    setProfileCompanyName(currentUser.companyName || '');
    setProfileAvatar(currentUser.avatar || '');
    setProfileAbout(currentUser.about || '');
    setProfileGuides(currentUser.guides || []);
  }, [currentUser]);

  const [selectedTicketBooking, setSelectedTicketBooking] = useState<Booking | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('all');

  // CRM & Tour Manifest States
  const [crmTourId, setCrmTourId] = useState<string>('');
  const [crmSlotId, setCrmSlotId] = useState<string>('');

  // CRM Advanced Filtering (Requirement 4)
  const [filterPayment, setFilterPayment] = useState<'Bütün' | 'Ödənilib' | 'Ödənilməyib'>('Bütün');

  // Shared loading/error state for the "add tour" / "add international tour" / "add slot" forms
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);

  // Manual Participant Modal (Requirement 3)
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualParticipantsCount, setManualParticipantsCount] = useState(1);
  const [manualPaymentStatus, setManualPaymentStatus] = useState<'Ödənilib' | 'Ödənilməyib'>('Ödənilməyib');
  const [manualOperatorNote, setManualOperatorNote] = useState('');
  const [isSubmittingManualBooking, setIsSubmittingManualBooking] = useState(false);
  const [manualBookingError, setManualBookingError] = useState<string | null>(null);



  useEffect(() => {
    if (crmTourId) {
      const activeSlots = slots.filter(s => s.tourId === crmTourId);
      // Only shift to a default slot if the current selection is invalid for the tour and not explicitly set to all/empty
      if (crmSlotId && !activeSlots.some(s => s.id === crmSlotId)) {
        if (activeSlots.length > 0) {
          setCrmSlotId(activeSlots[0].id);
        } else {
          setCrmSlotId('');
        }
      }
    } else {
      setCrmSlotId('');
    }
  }, [crmTourId, slots]);

  const selectedCrmTour = tours.find(t => t.id === crmTourId);
  const selectedCrmSlot = slots.find(s => s.id === crmSlotId);

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

  const handleQrScan = (scannedText: string) => {
    setIsQrScannerOpen(false);
    
    // Find booking matching the scanned reference ID
    const foundBooking = bookings.find(b => 
      b.booking_reference === scannedText || 
      `TUR-${b.id.slice(0, 5).toUpperCase()}` === scannedText
    );

    if (foundBooking) {
      if (foundBooking.attendanceStatus === 'İştirakçı gəldi') {
        if (onShowNotification) {
          onShowNotification('Bu bilet artıq check-in edilib! ⚠️', 'warning');
        }
      } else {
        if (onEditBooking) {
          const updated: Booking = { ...foundBooking, attendanceStatus: 'İştirakçı gəldi' };
          onEditBooking(updated);
          if (onShowNotification) {
            onShowNotification(`Check-in uğurludur: ${foundBooking.customerName} (${foundBooking.participantsCount} nəfər) ✅`, 'success');
          }
        }
      }
    } else {
      if (onShowNotification) {
        onShowNotification('Sistemdə bu bilet məlumatı tapılmadı! Xahiş edirik QR kodu bir daha yoxlayın. ❌', 'error');
      }
    }
  };

  const activeCrmBookingsForSlot = !crmTourId
    ? bookings.filter(b => tours.filter(t => t.vendorId === currentUser.id).map(t => t.id).includes(b.tourId))
    : (!crmSlotId
        ? bookings.filter(b => b.tourId === crmTourId)
        : bookings.filter(b => b.slotId === crmSlotId));

  const filteredCrmBookingsForSlot = activeCrmBookingsForSlot.filter(b => {
    const payStatus = b.paymentStatus || (b.status === 'paid' ? 'Ödənilib' : 'Ödənilməyib');
    if (filterPayment !== 'Bütün' && payStatus !== filterPayment) return false;
    return true;
  });
  const webBookingsCount = activeCrmBookingsForSlot
    .filter(b => b.status !== 'cancelled' && !b.id.startsWith('manual-') && b.paymentMethod !== 'Nağd / Kənar CRM')
    .reduce((sum, b) => sum + b.participantsCount, 0);

  const currentTourExternalSales = activeCrmBookingsForSlot
    .filter(b => b.status !== 'cancelled' && (b.id.startsWith('manual-') || b.paymentMethod === 'Nağd / Kənar CRM'))
    .reduce((sum, b) => sum + b.participantsCount, 0);

  const targetSlotCapacity = selectedCrmSlot?.capacity || 0;
  const remainingSeats = Math.max(0, targetSlotCapacity - webBookingsCount - currentTourExternalSales);

  // Editing Tour States
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [editTourIsActive, setEditTourIsActive] = useState<boolean>(true);
  const [editTourName, setEditTourName] = useState<string>('');
  const [editTourCategory, setEditTourCategory] = useState<TourCategory>('hiking');
  const [editTourDifficulty, setEditTourDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme'>('medium');
  const [editTourRegion, setEditTourRegion] = useState<string>('');
  const [editTourDays, setEditTourDays] = useState<number>(1);
  const [editTourDescription, setEditTourDescription] = useState<string>('');
  const [editTourIncludes, setEditTourIncludes] = useState<string>('');
  const [editTourImage, setEditTourImage] = useState<string>('');
  const [editTourWhatsApp, setEditTourWhatsApp] = useState<string>('');
  const [editTourImages, setEditTourImages] = useState<string[]>([]);
  const [editTourVideos, setEditTourVideos] = useState<string[]>([]);
  const [editTourGpxData, setEditTourGpxData] = useState<string>('');
  const [editTourGpxFileName, setEditTourGpxFileName] = useState<string>('');

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

  // Slots Form State
  const [slotTourId, setSlotTourId] = useState<string>('');
  const [slotStartDate, setSlotStartDate] = useState<string>('');
  const [slotEndDate, setSlotEndDate] = useState<string>('');
  const [slotPrice, setSlotPrice] = useState<number>(35);
  const [slotCapacity, setSlotCapacity] = useState<number>(20);

  // Tours Form State
  const [newTourName, setNewTourName] = useState<string>('');
  const [newTourCategory, setNewTourCategory] = useState<'peak' | 'camp' | 'hiking' | 'active'>('hiking');
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
  const [editTourRating, setEditTourRating] = useState<number>(5.0);

  // International Tour Form States
  const [intlTourName, setIntlTourName] = useState<string>('');
  const [intlTourCountry, setIntlTourCountry] = useState<string>('Türkiyə');
  const [intlTourCity, setIntlTourCity] = useState<string>('');
  const [intlTourNights, setIntlTourNights] = useState<number>(3);
  const [intlTourDays, setIntlTourDays] = useState<number>(4);
  const [intlTourStartDate, setIntlTourStartDate] = useState<string>('');
  const [intlTourEndDate, setIntlTourEndDate] = useState<string>('');
  const [intlTourCapacity, setIntlTourCapacity] = useState<number>(20);

  const [intlTourFlightIncluded, setIntlTourFlightIncluded] = useState<boolean>(true);
  const [intlTourFlightDetails, setIntlTourFlightDetails] = useState<string>('');
  const [intlTourTransferDetails, setIntlTourTransferDetails] = useState<string>('');

  const [intlTourHotelName, setIntlTourHotelName] = useState<string>('');
  const [intlTourHotelStars, setIntlTourHotelStars] = useState<number>(4);
  const [intlTourMealType, setIntlTourMealType] = useState<string>('Səhər yeməyi');

  // Room prices differences
  const [intlRoomDoubleDiff, setIntlRoomDoubleDiff] = useState<number>(0);
  const [intlRoomTwinDiff, setIntlRoomTwinDiff] = useState<number>(25);
  const [intlRoomSingleDiff, setIntlRoomSingleDiff] = useState<number>(75);

  // Price & Package
  const [intlTourPrice, setIntlTourPrice] = useState<number>(499);
  const [intlTourCurrency, setIntlTourCurrency] = useState<'AZN' | 'USD' | 'EUR'>('USD');
  const [intlTourImage, setIntlTourImage] = useState<string>('');
  const [intlDragActive, setIntlDragActive] = useState<boolean>(false);

  // Inclusions & Exclusions Dynamic list states
  const [intlIncludes, setIntlIncludes] = useState<string[]>(['Aviabilet', '4 ulduzlu Otel', 'Hava limanı Transferi', 'Qidalanma', 'Səyahət sığortası']);
  const [newInclInput, setNewInclInput] = useState<string>('');

  const [intlNotIncludes, setIntlNotIncludes] = useState<string[]>(['Muzey və tarixi yerlərə giriş biletləri', 'Nahar və şam yeməkləri']);
  const [newNotInclInput, setNewNotInclInput] = useState<string>('');

  // Itinerary (Day-by-day)
  const [intlItinerary, setIntlItinerary] = useState<Array<{ day: number; title: string; description: string; image?: string }>>([
    { day: 1, title: 'Bakıdan Uçuş və Qarşılanma', description: 'Göstərilən saatda hava limanında toplaşırıq. Təyyarə ilə təyinat nöqtəsinə uçuş. Qarşılanma və otelə transfer.' }
  ]);

  // Itinerary helpers
  const handleIntlAddDay = () => {
    const nextDay = intlItinerary.length + 1;
    setIntlItinerary([
      ...intlItinerary,
      { day: nextDay, title: `${nextDay}-ci Gün fəaliyyətləri`, description: '', image: '' }
    ]);
  };

  const handleIntlRemoveDay = (index: number) => {
    if (intlItinerary.length <= 1) return;
    const updated = intlItinerary.filter((_, idx) => idx !== index).map((day, idx) => ({
      ...day,
      day: idx + 1
    }));
    setIntlItinerary(updated);
  };

  const handleIntlItineraryChange = (index: number, field: 'title' | 'description' | 'image', value: string) => {
    const updated = [...intlItinerary];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setIntlItinerary(updated);
  };

  // Dynamic lists actions
  const addInclItem = () => {
    if (newInclInput.trim()) {
      setIntlIncludes([...intlIncludes, newInclInput.trim()]);
      setNewInclInput('');
    }
  };
  const removeInclItem = (idx: number) => {
    setIntlIncludes(intlIncludes.filter((_, i) => i !== idx));
  };

  const addNotInclItem = () => {
    if (newNotInclInput.trim()) {
      setIntlNotIncludes([...intlNotIncludes, newNotInclInput.trim()]);
      setNewNotInclInput('');
    }
  };
  const removeNotInclItem = (idx: number) => {
    setIntlNotIncludes(intlNotIncludes.filter((_, i) => i !== idx));
  };

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

  // Instagram Auto-Creation Integration States
  const [tourCreationMethod, setTourCreationMethod] = useState<'instagram' | 'manual'>('instagram');
  const [instagramUrl, setInstagramUrl] = useState<string>('');
  const [instagramCaption, setInstagramCaption] = useState<string>('');
  const [isParsingInstagram, setIsParsingInstagram] = useState<boolean>(false);
  const [parsingStep, setParsingStep] = useState<string>('');

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

  // Add new Tour Slot
  const handleSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotTourId || !slotStartDate || !slotEndDate) {
      if (onShowNotification) {
        onShowNotification('Zəhmət olmasa bütün xanaları doldurun.', 'error');
      } else {
        alert('Zəhmət olmasa bütün xanaları doldurun.');
      }
      return;
    }

    const newSlot: TourSlot = {
      id: 'slot-' + Math.floor(Math.random() * 90000 + 10000),
      tourId: slotTourId,
      startDate: slotStartDate,
      endDate: slotEndDate,
      price: Number(slotPrice),
      capacity: Number(slotCapacity),
      bookedCount: 0
    };

    setIsSavingForm(true);
    setFormSubmitError(null);
    try {
      await onAddSlot(newSlot);
      setActiveSubTab('my-tours');
      // Clear form
      setSlotTourId('');
      setSlotStartDate('');
      setSlotEndDate('');
    } catch (err: any) {
      setFormSubmitError(err?.message || 'Tarix əlavə edilərkən xəta baş verdi.');
    } finally {
      setIsSavingForm(false);
    }
  };

  // Add new Tour
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

      setActiveSubTab('my-tours');
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

  const handleInternationalTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intlTourName || !intlTourCity || !intlTourHotelName) {
      if (onShowNotification) {
        onShowNotification('Zəhmət olmasa operator, bütün lazımi xanaları doldurun (Ad, Şəhər və Otel adını daxil edin).', 'error');
      } else {
        alert('Zəhmət olmasa bütün vacib xanaları doldurun.');
      }
      return;
    }

    const getPremiumStockImageForDestination = (country: string, city: string): string => {
      const normCountry = (country || '').toLowerCase();
      const normCity = (city || '').toLowerCase();
      
      if (normCountry.includes('it') || normCity.includes('rom') || normCity.includes('rome')) {
        return 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1000&auto=format&fit=crop&q=80';
      }
      if (normCountry.includes('fran') || normCity.includes('par')) {
        return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1000&auto=format&fit=crop&q=80';
      }
      if (normCountry.includes('indone') || normCity.includes('bal')) {
        return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1000&auto=format&fit=crop&q=80';
      }
      if (normCountry.includes('ispan') || normCountry.includes('spai') || normCity.includes('barc') || normCity.includes('madrid')) {
        return 'https://images.unsplash.com/photo-1583422409516-2895a77efedd?w=1000&auto=format&fit=crop&q=80';
      }
      if (normCountry.includes('gürc') || normCountry.includes('gurc') || normCountry.includes('geor') || normCity.includes('tbil') || normCity.includes('batum')) {
        return 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1000&auto=format&fit=crop&q=80';
      }
      if (normCountry.includes('türkiy') || normCountry.includes('turk') || normCity.includes('ist') || normCity.includes('capa') || normCity.includes('kap')) {
        return 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1000&auto=format&fit=crop&q=80';
      }
      if (normCountry.includes('alm') || normCountry.includes('germ') || normCity.includes('berl') || normCity.includes('mün')) {
        return 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1000&auto=format&fit=crop&q=80';
      }
      if (normCountry.includes('ingil') || normCountry.includes('brit') || normCountry.includes('uk') || normCity.includes('lond')) {
        return 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1000&auto=format&fit=crop&q=80';
      }
      if (normCountry.includes('ərəb') || normCountry.includes('arab') || normCountry.includes('uae') || normCity.includes('dub')) {
        return 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1000&auto=format&fit=crop&q=80';
      }
      if (normCountry.includes('isveçr') || normCountry.includes('switz') || normCity.includes('alpa') || normCity.includes('zur') || normCity.includes('cen')) {
        return 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1000&auto=format&fit=crop&q=80';
      }
      if (normCountry.includes('chex') || normCountry.includes('czech') || normCity.includes('praq') || normCity.includes('prag')) {
        return 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1000&auto=format&fit=crop&q=80';
      }
      
      const generalTravelSights = [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1000&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1000&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1000&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1000&auto=format&fit=crop&q=80'
      ];
      
      const hash = Math.abs((country || '').length + (city || '').length) % generalTravelSights.length;
      return generalTravelSights[hash];
    };

    const finalImage = intlTourImage || getPremiumStockImageForDestination(intlTourCountry, intlTourCity);
    const tourId = 'tour-' + Math.floor(Math.random() * 90000 + 10000);

    const newTour: Tour = {
      id: tourId,
      name: intlTourName,
      category: 'international',
      difficulty: 'easy',
      description: `Bu ${intlTourCountry} (${intlTourCity}) turu üçün xüsusi layihələndirilib. ${intlTourNights} gecə və ${intlTourDays} gündüz davam edir. Otel: ${intlTourHotelName} (${intlTourHotelStars}*).`,
      region: `${intlTourCountry}, ${intlTourCity}`,
      durationDays: Number(intlTourDays),
      includes: intlIncludes,
      vendorId: currentUser.id,
      vendorName: currentUser.name,
      image: finalImage,
      images: [finalImage],
      videos: [],
      rating: 5.0,
      reviewsCount: 0,
      isApproved: false, // Must be approved by admin panel first
      whatsapp_number: '+994706717804',
      isInternational: true,
      destinationCountry: intlTourCountry,
      destinationCity: intlTourCity,
      durationNights: Number(intlTourNights),
      flightIncluded: intlTourFlightIncluded,
      flightDetails: intlTourFlightDetails || (intlTourFlightIncluded ? 'Azərbaycan Hava Yolları, Bakıdan gediş-dönüş baqaj daxil' : 'Aviabilet daxil deyil'),
      transferDetails: intlTourTransferDetails || 'Hava limanından qarşılanma və otelə transfer daxildir.',
      hotelName: intlTourHotelName,
      hotelStars: Number(intlTourHotelStars),
      roomTypes: [
        { name: 'Double', priceDiff: Number(intlRoomDoubleDiff) },
        { name: 'Twin', priceDiff: Number(intlRoomTwinDiff) },
        { name: 'Single', priceDiff: Number(intlRoomSingleDiff) }
      ],
      mealType: intlTourMealType,
      priceCurrency: intlTourCurrency,
      notIncluded: intlNotIncludes,
      itinerary: intlItinerary
    };

    setIsSavingForm(true);
    setFormSubmitError(null);
    try {
      await onAddTour(newTour);

      // If start date and end date are filled, create a slot as well
      if (intlTourStartDate && intlTourEndDate) {
        const slotId = 'slot-' + Math.floor(Math.random() * 90000 + 10000);
        const newSlot: TourSlot = {
          id: slotId,
          tourId: tourId,
          startDate: intlTourStartDate,
          endDate: intlTourEndDate,
          price: Number(intlTourPrice),
          capacity: Number(intlTourCapacity),
          bookedCount: 0
        };
        await onAddSlot(newSlot);
      }

      if (onShowNotification) {
        onShowNotification('Təbrik edirik! Yeni Xarici Tur və Təqvimi uğurla yaradıldı və təsdiq gözləmə siyahısına əlavə edildi. Admin tərəfindən təsdiqləndikdən sonra satışa buraxılacaq! ⏳✈️', 'info');
      }

      // Switch back to tours subtab
      setActiveSubTab('my-tours');

      // Reset states
      setIntlTourName('');
      setIntlTourCity('');
      setIntlTourHotelName('');
      setIntlTourImage('');
      setIntlTourStartDate('');
      setIntlTourEndDate('');
      setIntlItinerary([
        { day: 1, title: 'Bakıdan Uçuş və Qarşılanma', description: 'Göstərilən saatda hava limanında toplaşırıq. Təyyarə ilə təyinat nöqtəsinə uçuş. Qarşılanma və otelə transfer.' }
      ]);
    } catch (err: any) {
      setFormSubmitError(err?.message || 'Xarici tur yaradılarkən xəta baş verdi.');
    } finally {
      setIsSavingForm(false);
    }
  };

  // Handle local image file uploads with standard FileReader API (No backend needed!)
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

  const handleGpsFileUpload = (file: File, isEdit: boolean) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseGpsFile(file.name, text);
        if (isEdit) {
          setEditTourGpxData(JSON.stringify(parsed));
          setEditTourGpxFileName(file.name);
        } else {
          setNewTourGpxData(JSON.stringify(parsed));
          setNewTourGpxFileName(file.name);
        }
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

  // Call our bulletproof, high-performance Gemini Data Extraction API
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
      {activeSubTab === 'my-tours' && (
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
                  onChange={(e) => setTourSearchTerm(e.target.value)}
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
                      <h4 className="font-bold text-slate-900 text-xs leading-tight">{tour.name}</h4>
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
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {tour.isActive === false ? (
                        <span className="text-[9px] bg-rose-50 text-rose-800 border border-rose-100 font-bold px-2 py-0.5 rounded-full">
                          Deaktiv edilib (Görünmür)
                        </span>
                      ) : tour.isApproved ? (
                        <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold px-2 py-0.5 rounded-full">
                          Aktiv Satışda
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-55/60 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          ⚠️ Təsdiq Gözləyir
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTour(tour);
                          setShowDeleteConfirm(false);
                          setEditTourIsActive(tour.isActive !== false);
                          setEditTourName(tour.name);
                          setEditTourCategory(tour.category);
                          setEditTourDifficulty(tour.difficulty);
                          setEditTourRegion(tour.region);
                          setEditTourDays(tour.durationDays);
                          setEditTourDescription(tour.description || '');
                          setEditTourIncludes(Array.isArray(tour.includes) ? tour.includes.join(', ') : '');
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
                        }}
                        className="flex items-center gap-1 py-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] rounded-md transition-all cursor-pointer shadow-xs"
                      >
                        <Edit className="w-2.5 h-2.5" />
                        <span>Düzəliş et</span>
                      </button>
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
                      value={exchangeRates.USD}
                      onChange={(e) => onUpdateExchangeRates({ ...exchangeRates, USD: Number(e.target.value) })}
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
                      value={exchangeRates.EUR}
                      onChange={(e) => onUpdateExchangeRates({ ...exchangeRates, EUR: Number(e.target.value) })}
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
      )}

      {/* Subtab Content: CRM & Tour Manifest */}
      {activeSubTab === 'crm' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-widest flex items-center gap-2">
                  📊 İŞTİRAKÇI SİYAHISI VƏ CRM PANELİ
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Müştəri rezervasiyalarını izləyin, iştirak/ödəniş statuslarını idarə edin.
                </p>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Məlumatlar real-time olaraq avtomatik yadda saxlanılır</span>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Tour Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">📌 Tur Seçin:</label>
                <select
                  value={crmTourId}
                  onChange={(e) => {
                    setCrmTourId(e.target.value);
                    setCrmSlotId('');
                  }}
                  className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/50 transition shadow-xs font-bold"
                >
                  <option value="">-- Bütün Turlar (Son Rezervasiyalar) --</option>
                  {tours.filter(t => t.vendorId === currentUser.id).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.region})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date/Slot Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">📅 Tarix / Slot Seçin:</label>
                <select
                  value={crmSlotId}
                  onChange={(e) => setCrmSlotId(e.target.value)}
                  disabled={!crmTourId}
                  className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/50 transition shadow-xs disabled:bg-slate-100 disabled:text-slate-400 font-mono font-bold font-sans"
                >
                  <option value="">-- Bütün Tarixlər (Bütün Sifarişlər) --</option>
                  {slots.filter(s => s.tourId === crmTourId).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.startDate} ({s.price} AZN) — {s.bookedCount} nəfər qeydiyyatda
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedCrmSlot && (
            /* Capacity & CRM Metrics widget */
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold tracking-wider">Qrup Limiti (Yer)</span>
                  <strong className="text-base text-slate-800 font-mono">{selectedCrmSlot.capacity}</strong>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold tracking-wider">Platforma Rezervasiyaları</span>
                  <strong className="text-base text-slate-800 font-mono">{webBookingsCount} nəfər</strong>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 text-purple-700 rounded-lg">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold tracking-wider">Kənar Satışlar (WP/İG)</span>
                  <strong className="text-base text-slate-800 font-mono">{selectedCrmTour?.externalSales || 0} yer</strong>
                </div>
              </div>

              <div className={`p-4 rounded-xl border shadow-xs flex items-center gap-3 transition ${
                remainingSeats <= 3 
                  ? 'bg-rose-50 border-rose-200 text-rose-900' 
                  : 'bg-emerald-50/50 border-emerald-100 text-emerald-950'
              }`}>
                <div className={`p-2.5 rounded-lg ${remainingSeats <= 3 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold tracking-wider opacity-75">Boş Qalan Son Yerlər</span>
                  <strong className="text-base font-mono">{remainingSeats} yer</strong>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Participant List Data Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-2.5 bg-slate-200 text-slate-700 border border-slate-300 font-extrabold text-[10px] rounded-md font-mono font-bold">
                      {selectedCrmSlot ? `SLOT #${selectedCrmSlot.id.slice(5).toUpperCase()}` : (crmTourId ? "SEÇİLMİŞ TUR" : "BÜTÜN SİFARİŞLƏR")}
                    </span>
                    <span className="text-xs font-bold text-slate-700 font-sans">
                      İştirakçı siyahısı (Gösterilən: {filteredCrmBookingsForSlot.length} bilet qrupu, Ümumi: {activeCrmBookingsForSlot.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 justify-end self-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!crmTourId) {
                          if (onShowNotification) onShowNotification('Siyahını yükləmək üçün əvvəlcə bir Tur seçin.', 'warning');
                          return;
                        }
                        if (!selectedCrmSlot) {
                          if (onShowNotification) onShowNotification('Siyahını yükləmək üçün zəhmət olmasa yuxarıdan bir Tarix/Slot seçin.', 'warning');
                          return;
                        }
                        if (filteredCrmBookingsForSlot.length === 0) {
                          if (onShowNotification) onShowNotification('Bu slot üçün ixrac ediləcək iştirakçı tapılmadı.', 'warning');
                          return;
                        }

                        const headers = 'Sıra,Ad Soyad,Telefon,Ödəniş Statusu,Operator Qeydi,Bilet Sayı,Bilet Linki\n';
                        const rows = filteredCrmBookingsForSlot.map((b, idx) => {
                          const name = b.customerName.replace(/"/g, '""');
                          const phone = b.customerPhone.replace(/"/g, '""');
                          const payStatus = b.paymentStatus || (b.status === 'paid' ? 'Ödənilib' : 'Ödənilməyib');
                          const note = (b.operatorNote || '').replace(/"/g, '""');
                          const qty = b.participantsCount || 1;
                          const tUrl = b.ticketUrl ? `${window.location.origin}${b.ticketUrl}` : '';
                          return `${idx + 1},"${name}","${phone}","${payStatus}","${note}",${qty},"${tUrl}"`;
                        }).join('\n');

                        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + rows);
                        const link = document.createElement('a');
                        link.setAttribute('href', csvContent);
                        link.setAttribute('download', `manifest_${selectedCrmTour?.name || 'tur'}_${selectedCrmSlot?.startDate || 'tarix'}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        if (onShowNotification) {
                          onShowNotification('İştirakçı siyahısı CSV formatında yükləndi! 📥', 'success');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-800 font-extrabold text-[10px] rounded-lg transition border border-slate-250 cursor-pointer flex items-center gap-1.5 shadow-xs font-sans font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Eksport (CSV)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const confirmedBookings = filteredCrmBookingsForSlot.filter(
                          b => b.paymentStatus === 'Ödənilib' || b.status === 'paid'
                        );

                        if (confirmedBookings.length === 0) {
                          if (onShowNotification) {
                            onShowNotification('WhatsApp üçün fəal/görünən ödənişli iştirakçı siyahısı tapılmadı.', 'warning');
                          }
                          return;
                        }

                        let text = `📋 *TUR İŞTİRAKÇI MANİFESTİ (ÖDƏNİŞLİ)*\n`;
                        text += `🏔️ *Tur:* ${selectedCrmTour?.name || ''}\n`;
                        text += `📅 *Tarix:* ${selectedCrmSlot?.startDate || ''}\n`;
                        text += `👥 *İştirakçı sayı:* ${confirmedBookings.reduce((sum, b) => sum + b.participantsCount, 0)} nəfər\n\n`;

                        let count = 1;
                        confirmedBookings.forEach((b) => {
                          const noteText = b.operatorNote ? `_${b.operatorNote}_` : 'Yoxdur';
                          text += `${count}. *${b.customerName}* (Bilet: ${b.participantsCount})\n`;
                          text += `   📞 Telefon: ${b.customerPhone}\n`;
                          text += `   📝 Qeyd: ${noteText}\n\n`;
                          count++;
                        });

                        text += `*Tərtib edildi:* ${new Date().toLocaleDateString('az-AZ')} | gedekgorek.az CRM 🌲`;

                        navigator.clipboard.writeText(text).then(() => {
                          if (onShowNotification) {
                            onShowNotification('Təsdiqlənmiş iştirakçı siyahısı WhatsApp üçün kopyalandı! 📋📲', 'success');
                          }
                        }).catch(err => {
                          console.error('Kopyalama xətası:', err);
                          if (onShowNotification) {
                            onShowNotification('Panoya kopyalamaq alınmadı.', 'error');
                          }
                        });
                      }}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-950 border border-emerald-200 font-extrabold text-[10px] rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs font-sans font-bold"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>WhatsApp üçün kopyala</span>
                    </button>
                  </div>
                </div>

                {/* Advanced Live Filters & Add Participant Sidebar/Trigger Action (Requirement 3 & 4) */}
                <div className="p-4 bg-white border-b border-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 tracking-wider font-sans">Ödəniş Statusu:</span>
                      <select
                        value={filterPayment}
                        onChange={(e) => setFilterPayment(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-707 text-slate-700 p-1.5 px-2 text-xs rounded-xl focus:outline-none focus:border-emerald-600 transition cursor-pointer font-bold"
                      >
                        <option value="Bütün">Bütün (Hamısı)</option>
                        <option value="Ödənilib">Ödənilib</option>
                        <option value="Ödənilməyib">Ödənilməyib</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsQrScannerOpen(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition duration-150 cursor-pointer flex items-center gap-2 text-xs font-sans select-none"
                    >
                      <span>📷 QR İlə Yoxla</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!crmTourId) {
                          if (onShowNotification) onShowNotification('Yeni iştirakçı əlavə etmək üçün əvvəlcə bir Tur seçin.', 'warning');
                          return;
                        }
                        if (!crmSlotId) {
                          if (onShowNotification) onShowNotification('Yeni iştirakçı əlavə etmək üçün zəhmət olmasa yuxarıdan bir Tarix/Slot seçin.', 'warning');
                          return;
                        }
                        setManualName('');
                        setManualPhone('');
                        setManualParticipantsCount(1);
                        setManualPaymentStatus('Ödənilməyib');
                        setManualOperatorNote('');
                        setIsAddParticipantOpen(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition duration-150 cursor-pointer flex items-center gap-2 text-xs font-sans select-none"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Yeni İştirakçı Əlavə Et</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto font-sans">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-400 font-bold tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3 text-center w-12">Sıra</th>
                        <th className="p-3">Adı və Soyadı</th>
                        <th className="p-3">Mobil Telefon</th>
                        <th className="p-3">Ödəniş Statusu</th>
                        <th className="p-3">Bilet & Tarix</th>
                        <th className="p-3 w-64">Operator Qeydi</th>
                        <th className="p-3 text-center">PDF Bilet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-750 text-slate-700">
                      {filteredCrmBookingsForSlot.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-10 text-center italic text-slate-400 border-b-0 bg-slate-50/50">
                            Axtarış filtrinə və tənzimləmələrə uyğun heç bir bilet qrafiki tapılmadı.
                          </td>
                        </tr>
                      ) : (
                        filteredCrmBookingsForSlot.map((b, idx) => {
                          const currentPaymentStatus = b.paymentStatus || (b.status === 'paid' ? 'Ödənilib' : 'Ödənilməyib');

                          return (
                            <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-1.5 py-3 text-center font-mono font-bold text-slate-400 border-r border-slate-100/50">
                                {idx + 1}
                              </td>
                              <td className="p-1.5 py-3">
                                <input
                                  type="text"
                                  key={`${b.id}-name`}
                                  defaultValue={b.customerName}
                                  onBlur={(e) => {
                                    if (onEditBooking && e.target.value !== b.customerName) {
                                      onEditBooking({ ...b, customerName: e.target.value });
                                    }
                                  }}
                                  className="font-bold text-slate-800 bg-transparent hover:bg-slate-100 focus:bg-white text-xs p-1 rounded border border-transparent focus:border-slate-300 w-full focus:outline-none transition"
                                />
                              </td>
                              <td className="p-1.5 py-3">
                                <input
                                  type="text"
                                  key={`${b.id}-phone`}
                                  defaultValue={b.customerPhone}
                                  onBlur={(e) => {
                                    if (onEditBooking && e.target.value !== b.customerPhone) {
                                      onEditBooking({ ...b, customerPhone: e.target.value });
                                    }
                                  }}
                                  className="font-mono text-slate-600 bg-transparent hover:bg-slate-100 focus:bg-white text-[11px] p-1 rounded border border-transparent focus:border-slate-300 w-full focus:outline-none transition font-semibold"
                                />
                              </td>
                              <td className="p-1.5 py-3">
                                <select
                                  value={b.status === 'paid' ? 'paid' : (b.status === 'cancelled' ? 'cancelled' : 'pending')}
                                  onChange={async (e) => {
                                    const value = e.target.value as 'pending' | 'paid' | 'cancelled';
                                    if (!onEditBooking) return;

                                    const updated: Booking = {
                                      ...b,
                                      paymentStatus: value === 'paid' ? 'Ödənilib' : 'Ödənilməyib',
                                      status: value
                                    };
                                    try {
                                      await onEditBooking(updated);
                                      if (value === 'paid') {
                                        triggerTicketGeneration(updated, selectedCrmTour?.name || '', selectedCrmTour?.region || '', selectedCrmSlot?.startDate || '');
                                        if (onShowNotification) {
                                          onShowNotification('Sifariş təsdiqləndi. PDF bilet tənzimləndi! 🎫', 'success');
                                        }
                                      } else if (value === 'cancelled') {
                                        if (onShowNotification) {
                                          onShowNotification(`Sifariş ləğv edildi və boş yer geri qaytarıldı.`, 'warning');
                                        }
                                      } else {
                                        if (onShowNotification) {
                                          onShowNotification(`Sifariş statusu qeydə alındı.`, 'info');
                                        }
                                      }
                                    } catch {
                                      // handleEditBooking (App.tsx) already showed an error toast
                                    }
                                  }}
                                  className={`p-1.5 rounded-lg border text-[10px] font-black focus:outline-none focus:ring-1 transition cursor-pointer text-center ${
                                    b.status === 'paid'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-250 focus:ring-emerald-700/55'
                                      : b.status === 'cancelled' ? 'bg-red-50 text-red-800 border-red-250 focus:ring-red-700/55' : 'bg-amber-50 text-amber-800 border-amber-250 focus:ring-amber-700/55'
                                  }`}
                                >
                                  <option value="paid">Təsdiqləndi (Ödənilib)</option>
                                  <option value="pending">Gözləyir (WhatsApp)</option>
                                  <option value="cancelled">Ləğv Edildi</option>
                                </select>
                              </td>
                              <td className="p-1.5 py-3">
                                <span className="font-bold flex items-center gap-1 text-[11px] text-slate-800 font-mono">
                                  🎟️ {b.participantsCount} nəfər
                                </span>
                                <span className="block text-[9px] text-slate-400 font-medium font-mono">
                                  {b.bookingDate}
                                </span>
                              </td>
                              <td className="p-1.5 py-3">
                                <input
                                  type="text"
                                  placeholder="Məs: Sumqayıtdan minəcək..."
                                  key={`${b.id}-note`}
                                  defaultValue={b.operatorNote || ''}
                                  onBlur={(e) => {
                                    if (onEditBooking && e.target.value !== (b.operatorNote || '')) {
                                      onEditBooking({ ...b, operatorNote: e.target.value });
                                    }
                                  }}
                                  className="w-full text-slate-705 text-slate-700 placeholder-slate-400 bg-transparent hover:bg-slate-100 focus:bg-white text-[11px] p-1.5 rounded border border-transparent focus:border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-250/20 transition font-medium"
                                />
                              </td>
                              <td className="p-1.5 py-3 text-center">
                                {b.ticketUrl && b.status === 'paid' ? (
                                  <a
                                    href={b.ticketUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-705 text-emerald-800 border border-emerald-200 hover:border-emerald-300 rounded font-black text-[10px] transition cursor-pointer select-none"
                                    title="Klikləyin və yükləyin"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Yüklə</span>
                                  </a>
                                ) : b.status === 'paid' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      triggerTicketGeneration(b, selectedCrmTour?.name || '', selectedCrmTour?.region || '', selectedCrmSlot?.startDate || '');
                                      if (onShowNotification) {
                                        onShowNotification('Sistem bilet yaradılması sorğusunu arxa planda başlatdı... 🎫', 'info');
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 hover:border-slate-350 rounded font-bold text-[10px] transition cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Bilet Quraşdır</span>
                                  </button>
                                ) : b.status === 'cancelled' ? (
                                  <span className="text-[10px] text-red-500 font-bold">LƏĞV EDİLİB</span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Gözləmədə...</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Manual Participant Insertion Modal Dialog (Requirement 3) */}
              {isAddParticipantOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto overflow-hidden animate-scaleIn font-sans">
                    <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                      <h4 className="text-xs font-extrabold tracking-widest flex items-center gap-2">
                        🎟️ İştirakçı Əlavə Et (Kənar Satış)
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsAddParticipantOpen(false)}
                        className="p-1 text-slate-400 hover:text-white transition cursor-pointer mb-0"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!manualName || !manualPhone) {
                          if (onShowNotification) {
                            onShowNotification('Zəhmət olmasa Ad Soyad və Telefon sahələrini doldurun.', 'warning');
                          }
                          return;
                        }

                        const numParticipants = Number(manualParticipantsCount) || 1;
                        const finalAmount = numParticipants * (selectedCrmSlot?.price || 25);
                        const finalPaymentStatus = manualPaymentStatus;
                        const finalAttendanceStatus = finalPaymentStatus === 'Ödənilib' ? 'Təsdiqlənib' : 'Gözləmədə';

                        const newBooking: Booking = {
                          id: `manual-${Date.now()}`,
                          slotId: crmSlotId,
                          tourId: crmTourId,
                          customerId: `manual-customer-${Date.now()}`,
                          customerName: manualName,
                          customerPhone: manualPhone,
                          bookingDate: selectedCrmSlot?.startDate || new Date().toISOString().split('T')[0],
                          participantsCount: numParticipants,
                          totalAmount: finalAmount,
                          status: finalPaymentStatus === 'Ödənilib' ? 'paid' : 'pending',
                          paymentStatus: finalPaymentStatus,
                          attendanceStatus: finalAttendanceStatus,
                          operatorNote: manualOperatorNote,
                          smsNotificationSent: false,
                          paymentMethod: 'Nağd / Kənar CRM'
                        };

                        setIsSubmittingManualBooking(true);
                        setManualBookingError(null);
                        try {
                          // onAddBooking POSTs to /api/bookings and already syncs the
                          // slot's bookedCount from the server's response, so there's no
                          // separate increment call here.
                          if (onAddBooking) {
                            await onAddBooking(newBooking);
                          }

                          setIsAddParticipantOpen(false);

                          if (onShowNotification) {
                            onShowNotification('Kənar iştirakçı uğurla qeydiyyata alındı və yer limiti azaldıldı! 🌲✨', 'success');
                          }

                          if (finalPaymentStatus === 'Ödənilib') {
                            await triggerTicketGeneration(
                              newBooking,
                              selectedCrmTour?.name || '',
                              selectedCrmTour?.region || '',
                              selectedCrmSlot?.startDate || ''
                            );
                          }
                        } catch (err: any) {
                          setManualBookingError(err?.message || 'İştirakçı əlavə edilərkən xəta baş verdi. Yenidən cəhd edin.');
                        } finally {
                          setIsSubmittingManualBooking(false);
                        }
                      }}
                      className="p-6 text-left flex flex-col gap-4"
                    >
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700">
                        <div className="font-bold text-slate-900 mb-1">Seçilmiş Marşrut və Tarix:</div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="font-semibold text-emerald-800">{selectedCrmTour?.name}</span>
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-mono font-bold rounded">{selectedCrmSlot?.startDate}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Adı və Soyadı *</label>
                        <input
                          type="text"
                          required
                          placeholder="Məs: Əli Məmmədov"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-705 text-slate-700">Mobil Telefon Nömrəsi *</label>
                        <input
                          type="tel"
                          required
                          placeholder="Məs: +994 50 123 45 67"
                          value={manualPhone}
                          onChange={(e) => setManualPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white font-mono font-semibold transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">İştirakçı Sayı (Bilet) *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Yer sayı"
                          value={manualParticipantsCount}
                          onChange={(e) => setManualParticipantsCount(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white font-mono font-semibold transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-705 text-slate-700 font-sans">Ödəniş Statusu</label>
                        <select
                          value={manualPaymentStatus}
                          onChange={(e) => {
                            const val = e.target.value as 'Ödənilib' | 'Ödənilməyib';
                            setManualPaymentStatus(val);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-600 transition cursor-pointer font-bold"
                        >
                          <option value="Ödənilməyib">Ödənilməyib</option>
                          <option value="Ödənilib">Ödənilib</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Operator Qeydi (İstəyə uyğun)</label>
                        <textarea
                          placeholder="Məs: Sumqayıtdan minəcək, vegetarian menyu..."
                          value={manualOperatorNote}
                          onChange={(e) => setManualOperatorNote(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white font-medium resize-none transition"
                        />
                      </div>

                      {manualBookingError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">
                          ⚠️ {manualBookingError}
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddParticipantOpen(false)}
                          className="w-1/2 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-705 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          İmtina Et
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingManualBooking}
                          className="w-1/2 p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {isSubmittingManualBooking ? 'Yadda saxlanılır...' : 'Yadda Saxla'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <QrScannerModal 
                 isOpen={isQrScannerOpen} 
                 onClose={() => setIsQrScannerOpen(false)} 
                 onScan={handleQrScan} 
              />

          {crmTourId && slots.filter(s => s.tourId === crmTourId).length === 0 && (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-400 italic text-xs">
              Bu tur üçün heç bir fəal təqvim tapılmadı. Zəhmət olmasa digər tur seçin və ya yeni təqvim yaradın.
            </div>
          )}
        </div>
      )}

      {/* Subtab HTML Form: Add Tour */}
      {activeSubTab === 'add-tour' && (
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
                      if (file) handleGpsFileUpload(file, false);
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
                  setActiveSubTab('my-tours');
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                Ləğv et
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subtab HTML Form: Add International Tour */}
      {activeSubTab === 'add-intl-tour' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-6 text-white">
            <h2 className="text-sm font-bold flex items-center gap-2 tracking-wider">
              ✈️ Pasportlu Xarici Səyahət Paket Operatoru (Yeni Xarici Tur)
            </h2>
            <p className="text-[11px] text-emerald-100 mt-1">
              Türkiyə, Avropa, Asiya və digər xarici ölkələrə lüks, çoxgünlük turların qeydiyyat forması. Bu forma yerli turlardan fərqli olaraq xüsusi loqistika, otel ulduzu, aviabilet daxiliyyəti və dinamik qiymətləndirmə üstünlüyünə malikdir.
            </p>
          </div>

          <form onSubmit={handleInternationalTourSubmit} className="p-6 space-y-6">
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
                    value={intlTourName}
                    onChange={(e) => setIntlTourName(e.target.value)}
                    placeholder="Məsələn: Kapadokya Sehrli Payız Turu (Şar gəzintisi ilə)"
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">İstiqamət Ölkə *</label>
                  <input
                    type="text"
                    required
                    value={intlTourCountry}
                    onChange={(e) => setIntlTourCountry(e.target.value)}
                    placeholder="Ölkə (məs: Türkiyə, İtaliya, Gürcüstan)"
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">İstiqamət Şəhər / Region *</label>
                  <input
                    type="text"
                    required
                    value={intlTourCity}
                    onChange={(e) => setIntlTourCity(e.target.value)}
                    placeholder="Şəhər (məs: Kapadokya, Roma, Tbilisi)"
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gecə sayısı *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={intlTourNights}
                      onChange={(e) => setIntlTourNights(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gündüz sayısı *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={intlTourDays}
                      onChange={(e) => setIntlTourDays(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Maksimum Qrup Tutumu *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={intlTourCapacity}
                    onChange={(e) => setIntlTourCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Uçuş / Başlama Tarixi *</label>
                  <input
                    type="date"
                    required
                    value={intlTourStartDate}
                    onChange={(e) => setIntlTourStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Geri Dönüş / Bitmə Tarixi *</label>
                  <input
                    type="date"
                    required
                    value={intlTourEndDate}
                    onChange={(e) => setIntlTourEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* B) Loqistika və Nəqliyyat Məlumatları */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-teal-700 tracking-wider border-b pb-1">
                B) Loqistika və Nəqliyyat Məlumatları
              </h3>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={intlTourFlightIncluded}
                    onChange={(e) => setIntlTourFlightIncluded(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-black text-slate-800">Aviabilet qiymətə daxildir</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Uçuş Təfərrüatları (Uçuş saatları, Baqaj sərnişin limitləri)</label>
                    <textarea
                      rows={2}
                      value={intlTourFlightDetails}
                      onChange={(e) => setIntlTourFlightDetails(e.target.value)}
                      placeholder="Məsələn: Bakı - Kayseri Pegasus Hava yolları gediş-dönüş, 23kg baqaj daxildir."
                      className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ölkədaxili Transfer növü və təfərrüatları</label>
                    <textarea
                      rows={2}
                      value={intlTourTransferDetails}
                      onChange={(e) => setIntlTourTransferDetails(e.target.value)}
                      placeholder="Məsələn: Hava limanında 'GedəkGörək' lövhəsilə qarşılanma, komfortlu Mercedes Sprinter VIP ilə otelə transfer və hər gün ekskursiyalar."
                      className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* C) Yerləşmə (Otel) Məlumatları */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-emerald-750 tracking-wider border-b pb-1">
                C) Yerləşmə (Otel) Məlumatları
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Otelin Adı *</label>
                  <input
                    type="text"
                    required
                    value={intlTourHotelName}
                    onChange={(e) => setIntlTourHotelName(e.target.value)}
                    placeholder="Məsələn: Crowne Plaza Cappadocia"
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Otelin Ulduz Sayı *</label>
                  <select
                    value={intlTourHotelStars}
                    onChange={(e) => setIntlTourHotelStars(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none bg-white cursor-pointer"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ 5 Ulduzlu Lüks Otel</option>
                    <option value={4}>⭐⭐⭐⭐☆ 4 Ulduzlu Premium Otel</option>
                    <option value={3}>⭐⭐⭐☆☆ 3 Ulduzlu Standart Otel</option>
                    <option value={2}>⭐⭐☆☆☆ 2 Ulduzlu Butik / Hostel</option>
                    <option value={1}>⭐☆☆☆☆ 1 Ulduzlu Qonaq Evi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Qidalanma Seçimi *</label>
                  <select
                    value={intlTourMealType}
                    onChange={(e) => setIntlTourMealType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="Səhər yeməyi">Səhər yeməyi daxildir (BB)</option>
                    <option value="Hər şey daxil (AI)">Hər şey daxil (All Inclusive - AI)</option>
                    <option value="Yarım pansion (HB)">Yarım pansion (Səhər + Şam feeding - HB)</option>
                    <option value="Tam pansion (FB)">Tam pansion (Səhər, Nahar, Şam - FB)</option>
                    <option value="Qidalanma daxil deyil">Qidalanma daxil DEYİL (Only Room - RO)</option>
                  </select>
                </div>
              </div>

              {/* Room differences inputs */}
              <div>
                <label className="block text-[11px] font-black text-emerald-800 mb-2">Otaq Altdərnək Qiymət fərqləri (Əsas Paket qiymətinə nisbətdə):</label>
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Double Otaq fərqi (Valyuta eynidir)</label>
                    <input
                      type="number"
                      value={intlRoomDoubleDiff}
                      onChange={(e) => setIntlRoomDoubleDiff(Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                    <span className="text-[9px] text-slate-400">Paket baza qiymətinə əlavə (məs: +0)</span>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Twin otaq fərqi</label>
                    <input
                      type="number"
                      value={intlRoomTwinDiff}
                      onChange={(e) => setIntlRoomTwinDiff(Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                    <span className="text-[9px] text-slate-400">Ümumi baza qiymətinə əlavə</span>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Single otaq fərqi</label>
                    <input
                      type="number"
                      value={intlRoomSingleDiff}
                      onChange={(e) => setIntlRoomSingleDiff(Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                    <span className="text-[9px] text-slate-400">Fərdi tək yerləşmə əlavəsi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* D) Qiymət və Paket İnformasiyası */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-teal-800 tracking-wider border-b pb-1">
                D) Qiymət və Paket İnformasiyası
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Baza Paket Qiyməti *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={intlTourPrice}
                    onChange={(e) => setIntlTourPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valyuta Seçimi *</label>
                  <select
                    value={intlTourCurrency}
                    onChange={(e) => setIntlTourCurrency(e.target.value as 'AZN' | 'USD' | 'EUR')}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-700 bg-white cursor-pointer"
                  >
                    <option value="AZN">AZN (₼)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Əsas Tur Şəkli (Seçin və ya yükləyin) *</label>
                  {intlTourImage ? (
                    <div className="relative border border-slate-200 rounded-lg overflow-hidden group h-24 bg-slate-50 flex items-center justify-between px-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={intlTourImage || undefined} 
                          alt="Yüklənən şəkil" 
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <span className="text-[10px] text-emerald-700 font-extrabold block">✓ ŞƏKİL YÜKLƏNDİ</span>
                          <span className="text-[9px] text-slate-400 block font-mono">Hazırdır (Local Base64)</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIntlTourImage('')}
                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-black rounded-lg transition"
                      >
                        Şəkli Sil
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIntlDragActive(true);
                      }}
                      onDragLeave={() => setIntlDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIntlDragActive(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setIntlTourImage(reader.result as string);
                            if (onShowNotification) {
                              onShowNotification('Şəkil drag-and-drop ilə uğurla yükləndi! 📸✨', 'success');
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      onClick={() => {
                        document.getElementById('intl-file-uploader-input')?.click();
                      }}
                      className={`h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer ${
                        intlDragActive 
                          ? 'border-emerald-500 bg-emerald-50/50' 
                          : 'border-slate-300 bg-slate-50 hover:bg-slate-100/75 hover:border-slate-400'
                      }`}
                    >
                      <input
                        type="file"
                        id="intl-file-uploader-input"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setIntlTourImage(reader.result as string);
                              if (onShowNotification) {
                                onShowNotification('Şəkil klikləmə ilə uğurla yükləndi! 📸✨', 'success');
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <span className="text-lg">📸</span>
                      <span className="text-[10px] font-bold text-slate-705 mt-1">Sürüşdürüb buraxın və ya Seçmək üçün klikləyin</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 font-semibold block leading-tight px-2">
                        (Məcburi deyil. Yükləməsəniz, təyin olunan şəhərə uyğun rəngarəng premium şəkil avtomatik seçiləcək!)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dinamik Inclusions / Exclusions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">Paketə Daxildir (Dinamik Siyahı):</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newInclInput}
                      onChange={(e) => setNewInclInput(e.target.value)}
                      placeholder="Məs: Oteldə spa, Yerli sığorta"
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                    <button
                      type="button"
                      onClick={addInclItem}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Əlavə El.
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {intlIncludes.map((inc, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 rounded-sm">
                        {inc}
                        <button type="button" onClick={() => removeInclItem(index)} className="text-red-500 hover:text-red-705">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-red-800 mb-1">Paketə Daxil DEYİL (Dinamik Siyahı):</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNotInclInput}
                      onChange={(e) => setNewNotInclInput(e.target.value)}
                      placeholder="Məs: Alış-veriş, Şəxsi xərclər"
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                    <button
                      type="button"
                      onClick={addNotInclItem}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Əlavə El.
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {intlNotIncludes.map((exc, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-800 text-[10px] font-bold border border-red-150 rounded-sm">
                        {exc}
                        <button type="button" onClick={() => removeNotInclItem(index)} className="text-red-500 hover:text-red-705">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* E) Proqram (Günbəgün) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-1">
                <h3 className="text-xs font-bold text-emerald-800 tracking-wider">
                  E) Proqram (Günbəgün Aktiv Gündəlik Planı)
                </h3>
                <button
                  type="button"
                  onClick={handleIntlAddDay}
                  className="bg-emerald-700 hover:bg-emerald-850 text-white font-black text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
                >
                  ⏳ Gün Əlavə Et +
                </button>
              </div>

              <div className="space-y-4">
                {intlItinerary.map((iti, index) => (
                  <div key={index} className="border border-slate-200 p-4 rounded-xl bg-slate-50 relative space-y-3">
                    <div className="flex justify-between items-center bg-slate-200/50 p-1.5 rounded-lg">
                      <span className="text-xs font-extrabold text-[#065f46]">
                        📅 {iti.day}-ci Gün Planı
                      </span>
                      {intlItinerary.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleIntlRemoveDay(index)}
                          className="text-red-500 hover:text-red-705 text-xs font-bold px-2 py-0.5"
                        >
                          Günü Sil 🗑️
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Günlük Başlıq (məs: "Bakıdan gəliş və qarşılanma")</label>
                        <input
                          type="text"
                          required
                          value={iti.title}
                          onChange={(e) => handleIntlItineraryChange(index, 'title', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-250 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Günün Şəkili</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`intl-itinerary-file-${index}`}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  handleIntlItineraryChange(index, 'image', reader.result as string);
                                  if (onShowNotification) {
                                    onShowNotification(`${index + 1}-ci gün üçün şəkil uğurla yükləndi! 📸`, 'success');
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          
                          {!iti.image ? (
                            <button
                              type="button"
                              onClick={() => {
                                document.getElementById(`intl-itinerary-file-${index}`)?.click();
                              }}
                              className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/20 text-slate-500 hover:text-emerald-700 text-xs py-2 px-3 rounded-lg transition-all cursor-pointer font-bold"
                            >
                              📁 Şəkil Yüklə
                            </button>
                          ) : (
                            <div className="flex items-center gap-3 bg-emerald-50/35 border border-emerald-100 p-1.5 rounded-lg w-full">
                              <img 
                                src={iti.image || undefined} 
                                alt={`Gün ${iti.day}`} 
                                className="w-12 h-9 object-cover rounded-md border border-emerald-200/50 shrink-0" 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold text-emerald-800 block leading-tight">Şəkil yükləndi</span>
                                <span className="text-[8px] text-slate-400 block truncate">Kompüter daxilindən seçilib</span>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    document.getElementById(`intl-itinerary-file-${index}`)?.click();
                                  }}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold px-1.5 py-1 whitespace-nowrap cursor-pointer hover:bg-white rounded transition-all"
                                >
                                  Dəyiş
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleIntlItineraryChange(index, 'image', '')}
                                  className="text-[10px] text-red-500 hover:text-red-700 font-bold px-1.5 py-1 whitespace-nowrap cursor-pointer hover:bg-white rounded transition-all"
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
                          placeholder="Oteldə səhər yeməyi, Göreme tarixi bölgəsinə gediş, axşam qrup gəzintisi..."
                          onChange={(e) => handleIntlItineraryChange(index, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-250 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {formSubmitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">
                ⚠️ {formSubmitError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveSubTab('my-tours')}
                className="px-4 py-2 border border-slate-250 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50"
              >
                Ləğv Et
              </button>
              <button
                type="submit"
                disabled={isSavingForm}
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-850 text-white font-black text-xs rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                {isSavingForm ? 'Yaradılır...' : '✈️ Xarici Səyahət Turunu Və Cari Təqvimi Yarat'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subtab HTML Form: Add Slot Calendar */}
      {activeSubTab === 'add-slot' && (
        <form onSubmit={handleSlotSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div>
            <span className="text-[10px] tracking-widest text-slate-400 font-bold block mb-1">Aktiv Satış</span>
            <h3 className="font-bold text-slate-900 text-sm">Tur üçün xüsusi çıxış tarixi təyin edin</h3>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Müştərilərin bilet alması üçün bilet qiyməti və çıxış-dönüş təqvim slotunu seçin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Tur marşrutunu seçin:</label>
              <select
                required
                value={slotTourId}
                onChange={(e) => setSlotTourId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value="">İstədiyiniz marşrutu seçin</option>
                {myTours.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.region})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Bilet Qiyməti (AZN):</label>
              <input
                type="number"
                min="5"
                max="1000"
                required
                value={slotPrice}
                onChange={(e) => setSlotPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Başlama Tarixi:</label>
              <input
                type="date"
                required
                value={slotStartDate}
                onChange={(e) => setSlotStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Bitmə Tarixi:</label>
              <input
                type="date"
                required
                value={slotEndDate}
                onChange={(e) => setSlotEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Maksimum Avtobus / Bələdçi Limiti (Nəfər):</label>
              <input
                type="number"
                min="2"
                max="50"
                required
                value={slotCapacity}
                onChange={(e) => setSlotCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
              />
            </div>
          </div>

          {formSubmitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">
              ⚠️ {formSubmitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingForm}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-50"
          >
            {isSavingForm ? 'Yadda saxlanılır...' : 'Təqvim slotunu aktivləşdir (Satışa aç)'}
          </button>
        </form>
      )}

      {/* TICKET / VOUCHER MODAL */}
      {selectedTicketBooking && (() => {
        const tBooking = selectedTicketBooking;
        const linkedTour = tours.find(t => t.id === tBooking.tourId);
        const tourName = linkedTour?.name || 'Naməlum Tur';
        const tourRegion = linkedTour?.region || 'Azərbaycan';
        const bookingRef = tBooking.booking_reference || `TUR-${tBooking.id.slice(0, 5).toUpperCase()}`;

        const ticketPdfUrl = `${window.location.protocol}//${window.location.host}/tickets/ticket_${tBooking.id}.pdf`;

        // Create the pre-filled Whatsapp text
        const whatsappMsg = `*GEDƏKGÖRƏK - ELEKTRON BİLET*\n\n- *Bilet (Sifariş ID):* #${bookingRef}\n- *Tur:* ${tourName}\n- *Tarix:* ${tBooking.bookingDate}\n- *İştirakçı:* ${tBooking.participantsCount} nəfər\n- *Məbləğ:* ${tBooking.totalAmount} AZN (${tBooking.status === 'paid' ? 'ÖDƏNİLİB [Təsdiqlənib]' : 'GÖZLƏYİR [Ödənilməyib]'})\n- *Müştəri:* ${tBooking.customerName} (${tBooking.customerPhone})\n\n📲 *Elektron Biletiniz (PDF):* ${ticketPdfUrl}\n\n*MÜHÜM TƏHLÜKƏSİZLİK QAYDALARI VƏ TƏLİMATLAR:*\n1. Bələdçinin verdiyi təhlükəsizlik və yürüş təlimatlarına 100% əməl edilməlidir.\n2. Hava şəraitinə uyğun geyim və sürüşməyən rahat yürüş ayaqqabısı geyinilməlidir.\n3. Təbiətə hörmətlə yanaşılmalı, heç bir növ zibil dağ və meşə sahələrinə atılmamalıdır.\n4. Xroniki xəstəlik, astma, ürək narahatlığı barədə bələdçiyə mütləq öncədən məlumat verilməlidir.\n5. Yürüş boyu alkoqollu içkilərin qəbulu qətiyyən qadağandır.\n\nBiletiniz təsdiqləndi! Çıxış nöqtəsində bu bilet təqdim edilməlidir. Uğurlu yolculuqlar!`;

        // Direct Clean Print Trigger function
        const handlePrintTicket = async () => {
          if (onShowNotification) {
            onShowNotification('Rəsmi Elektron Bilet PDF olaraq hazırlanır, zəhmət olmasa gözləyin...', 'info');
          }
          try {
            const ticketUrl = await triggerTicketGeneration(
              tBooking,
              tourName,
              tourRegion,
              tBooking.bookingDate
            );
            if (ticketUrl) {
              const fullUrl = `${window.location.protocol}//${window.location.host}${ticketUrl}`;
              const link = document.createElement('a');
              link.href = fullUrl;
              link.setAttribute('download', `bilet_${bookingRef}.pdf`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              return;
            }
          } catch (err) {
            console.error("PDF generator error:", err);
          }

          // Fallback to client-side HTML popup printing in case of error
          const printWindow = window.open('', '_blank', 'width=850,height=950');
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head>
                  <title>GedəkGörək Elektron Bilet - #${bookingRef}</title>
                  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
                  <style>
                    @page {
                      size: A4 portrait;
                      margin: 15mm 10mm;
                    }
                    * {
                      box-sizing: border-box;
                    }
                    body {
                      font-family: 'Inter', sans-serif;
                      background: #f8fafc;
                      color: #0f172a;
                      margin: 0;
                      padding: 20px;
                      line-height: 1.5;
                      -webkit-print-color-adjust: exact;
                      print-color-adjust: exact;
                    }
                    
                    /* Boarding Pass Container */
                    .boarding-pass {
                      max-width: 650px;
                      margin: 0 auto;
                      background: #ffffff;
                      border-radius: 20px;
                      border: 1px solid #e2e8f0;
                      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
                      overflow: hidden;
                      position: relative;
                      margin-bottom: 24px;
                    }
                    
                    /* Brand Header */
                    .brand-bar {
                      background: #064e3b; /* Deep forest emerald */
                      color: #ffffff;
                      padding: 16px 28px;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                    }
                    .brand-logo-text {
                      font-family: 'Space Grotesk', sans-serif;
                      font-weight: 700;
                      font-size: 18px;
                      letter-spacing: -0.5px;
                      text-transform: uppercase;
                      display: flex;
                      align-items: center;
                      gap: 6px;
                    }
                    .brand-logo-text span {
                      color: #34d399; /* Emerald accent */
                    }
                    .badge {
                      background: #34d399;
                      color: #064e3b;
                      padding: 6px 14px;
                      font-weight: 800;
                      border-radius: 9999px;
                      font-size: 10px;
                      letter-spacing: 0.5px;
                      text-transform: uppercase;
                    }
                    .badge.unpaid {
                      background: #fef3c7;
                      color: #92400e;
                    }
                    
                    /* Pass Body Layout */
                    .pass-body {
                      display: flex;
                      position: relative;
                    }
                    
                    /* Circular punch cuts */
                    .notch-top {
                      width: 20px;
                      height: 20px;
                      background: #f8fafc;
                      border-radius: 50%;
                      position: absolute;
                      top: -10px;
                      right: 170px;
                      z-index: 10;
                      border-bottom: 1px solid #e2e8f0;
                    }
                    .notch-bottom {
                      width: 20px;
                      height: 20px;
                      background: #f8fafc;
                      border-radius: 50%;
                      position: absolute;
                      bottom: -10px;
                      right: 170px;
                      z-index: 10;
                      border-top: 1px solid #e2e8f0;
                    }
                    
                    /* Main stub (Left) */
                    .main-stub {
                      flex: 1;
                      padding: 24px 28px;
                      border-right: 2px dashed #cbd5e1;
                    }
                    
                    /* Right Stub (Validator) */
                    .side-stub {
                      width: 180px;
                      padding: 24px 20px;
                      background: #fafbfd;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: space-between;
                      text-align: center;
                      flex-shrink: 0;
                    }
                    
                    /* Ride Details Route Graphic */
                    .route-section {
                      display: flex;
                      align-items: center;
                      gap: 15px;
                      margin-bottom: 24px;
                      padding-bottom: 20px;
                      border-bottom: 1px solid #e2e8f0;
                    }
                    .route-point {
                      display: flex;
                      flex-direction: column;
                    }
                    .route-label {
                      font-size: 9px;
                      color: #64748b;
                      font-weight: 700;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
                    }
                    .route-value {
                      font-size: 14px;
                      font-weight: 800;
                      color: #0f172a;
                      margin-top: 2px;
                    }
                    .route-arrow {
                      color: #059669;
                      font-size: 18px;
                      font-weight: 700;
                    }
                    
                    /* Information details grid */
                    .details-grid {
                      display: grid;
                      grid-template-cols: 1fr 1fr;
                      gap: 16px;
                    }
                    .info-cell {
                      display: flex;
                      flex-direction: column;
                    }
                    .info-label {
                      font-size: 9px;
                      color: #627285;
                      font-weight: 700;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
                      margin-bottom: 3px;
                    }
                    .info-value {
                      font-size: 12px;
                      font-weight: 700;
                      color: #0f172a;
                    }
                    .price-highlight {
                      color: #047857;
                      font-weight: 800;
                      font-size: 15px;
                    }
                    
                    /* QR style on stub */
                    .qr-wrapper {
                      background: #ffffff;
                      border: 1px solid #e2e8f0;
                      padding: 10px;
                      border-radius: 12px;
                      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                      margin-top: 10px;
                    }
                    .qr-image {
                      width: 110px;
                      height: 110px;
                      display: block;
                    }
                    .ref-title {
                      font-size: 9px;
                      color: #64748b;
                      font-weight: 800;
                      margin-bottom: 4px;
                    }
                    .ref-id {
                      font-family: monospace;
                      font-size: 13px;
                      font-weight: 700;
                      color: #0f172a;
                      letter-spacing: 0.5px;
                    }
                    
                    /* Safety Panel */
                    .safety-panel {
                      max-width: 650px;
                      margin: 0 auto;
                      background: #ffffff;
                      border-radius: 16px;
                      border: 1px solid #e1e8f0;
                      padding: 20px 24px;
                    }
                    .safety-title {
                      font-size: 11px;
                      font-weight: 800;
                      color: #92400e;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
                      margin: 0 0 12px 0;
                      display: flex;
                      align-items: center;
                      gap: 6px;
                    }
                    .safety-list {
                      margin: 0;
                      padding-left: 18px;
                    }
                    .safety-list li {
                      font-size: 10.5px;
                      color: #475569;
                      margin-bottom: 6px;
                      line-height: 1.45;
                      font-weight: 500;
                    }
                    
                    /* Pass footer */
                    .pass-footer {
                      text-align: center;
                      font-size: 9px;
                      color: #94a3b8;
                      margin-top: 30px;
                      font-weight: 600;
                      text-transform: uppercase;
                      letter-spacing: 1px;
                    }
                    
                    @media print {
                      body {
                        background: #ffffff;
                        padding: 0;
                        margin: 0;
                      }
                      .boarding-pass {
                        box-shadow: none !important;
                        border: 1px solid #94a3b8 !important;
                      }
                      .safety-panel {
                        border: 1px solid #94a3b8 !important;
                      }
                    }
                  </style>
                </head>
                <body onload="window.print()">
                  
                  <div class="boarding-pass">
                    <div class="brand-bar">
                      <div class="brand-logo-text">🌲 GEDƏK<span>GÖRƏK</span></div>
                      <div class="badge \${tBooking.status === 'paid' ? 'paid' : 'unpaid'}">
                        \${tBooking.status === 'paid' ? 'ÖDƏNİLİB VƏ TƏSDİQLƏNİB' : 'GÖZLƏMƏDƏ'}
                      </div>
                    </div>
                    
                    <div class="pass-body">
                      <div class="notch-top"></div>
                      <div class="notch-bottom"></div>
                      
                      {/* Left Block */}
                      <div class="main-stub">
                        <div class="route-section">
                          <div class="route-point">
                            <span class="route-label">ÇIXIŞ</span>
                            <span class="route-value">Bakı, Gənclik</span>
                          </div>
                          <div class="route-arrow">➔</div>
                          <div class="route-point">
                            <span class="route-label">HƏDƏF MARŞRUT</span>
                            <span class="route-value">${tourName}</span>
                          </div>
                        </div>
                        
                        <div class="details-grid">
                          <div class="info-cell">
                            <span class="info-label">Sərnişin (Ad Soyad)</span>
                            <span class="info-value">${tBooking.customerName}</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">Əlaqə Nömrəsi</span>
                            <span class="info-value">\${tBooking.customerPhone}</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">Ekskursiya Tarixi</span>
                            <span class="info-value font-mono">\${tBooking.bookingDate}</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">İştirakçı Sayı</span>
                            <span class="info-value">\${tBooking.participantsCount} Nəfər</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">Ümumi Ödəniş</span>
                            <span class="info-value price-highlight">₼\${tBooking.totalAmount} AZN</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">Nəqliyyat Klası</span>
                            <span class="info-value">Komfortlu Tur Sprinteri</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right Stub Area */}
                      <div class="side-stub">
                        <div>
                          <div class="ref-title">SİFARİŞ ID</div>
                          <div class="ref-id">#${bookingRef}</div>
                        </div>
                        
                        <div class="qr-wrapper">
                          <img class="qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${bookingRef}" alt="Verification Qrcode" />
                        </div>
                        
                        <div style="font-size: 8px; color: #94a3b8; font-weight: 700; margin-top: 8px; letter-spacing: 0.3px; text-transform: uppercase;">
                          Validasiya üçün QR kod
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="safety-panel">
                    <h4 class="safety-title">⚠️ Mühüm Təhlükəsizlik Qaydaları və Təlimatlar</h4>
                    <ul class="safety-list">
                      <li>Bələdçinin verdiyi bütün yürüş və təhlükəsizlik təlimatlarına 100% əməl edilməlidir.</li>
                      <li>Dağlıq/meşəlik ərazilərdə hava şəraitinə uyğun geyim və sürüşməyən dabanı rahat yürüş ayaqqabısı (trekkinq) geyinilməlidir.</li>
                      <li>Təbiətə yüksək hörmətlə yanaşılmalı, heç bir növ plastık və ya digər zibil dağ və meşə sahələrinə atılmamalıdır.</li>
                      <li>Əgər tibbi xroniki bir narahatlığınız, astma, ürək narahatlığı varsa, bələdçiyə mütləq öncədən məlumat verilməlidir.</li>
                      <li>Nəqliyyatda və yürüş boyu alkoqollu içkilərin qəbulu qətiyyən qadağandır.</li>
                    </ul>
                  </div>
                  
                  <div class="pass-footer">
                    GEDEKGOREK.AZ • Təbiət turları portalı bilet xidməti
                  </div>
                  
                </body>
              </html>
            `);
            printWindow.document.close();
          }
        };

        return (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedTicketBooking(null);
              }
            }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
              
              {/* Header */}
              <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-50 text-emerald-800 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-xs tracking-wider">Müştəri Bileti Redaktoru (WhatsApp)</h3>
                    <p className="text-[10px] text-slate-500 font-bold font-mono">BİLET REF ID: #{bookingRef}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTicketBooking(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 flex-1">
                
                {/* Visual Status Indicator */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  tBooking.status === 'paid' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <div className="space-y-0.5">
                    <span className="text-[9px] tracking-wider font-extrabold text-slate-500">Mövcud Ödəniş Statusu</span>
                    <h4 className="font-extrabold flex items-center gap-1 text-xs">
                      {tBooking.status === 'paid' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Təsdiqlənib (Ödəniş qəbul olunub)</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                          <span>WhatsApp Gözləmədə (Klik statusu)</span>
                        </>
                      )}
                    </h4>
                  </div>

                  {tBooking.status !== 'paid' && onApproveBooking && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await onApproveBooking(tBooking.id);
                          setSelectedTicketBooking(prev => prev ? { ...prev, status: 'paid' } : null);
                        } catch {
                          // App.tsx's handleApproveBooking already showed an error toast
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 hover:scale-105 transition-all text-white font-extrabold text-[10px] rounded-lg shadow-sm cursor-pointer"
                    >
                      Ödənişi Qəbul Et və Təsdiqlə ☑
                    </button>
                  )}
                </div>

                {/* Ticket Mock Render */}
                <div id="printable-voucher-area" className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden relative">
                  
                  {/* Brand Header */}
                  <div className="bg-emerald-900 px-6 py-4 flex justify-between items-center text-white select-none">
                    <div className="font-sans font-extrabold text-sm tracking-widest flex items-center gap-1">
                      🌲 GEDƏK<span className="text-emerald-400">GÖRƏK</span>
                    </div>
                    <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-wider ${
                      tBooking.status === 'paid' ? 'bg-emerald-450 bg-emerald-500 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {tBooking.status === 'paid' ? 'ÖDƏNİLİB VƏ TƏSDİQLƏNİB 🎫' : 'GÖZLƏMƏDƏ ⏳'}
                    </span>
                  </div>

                  {/* Body Wrapper with notched tickets effect */}
                  <div className="flex flex-col md:flex-row relative bg-white border-b border-slate-100">
                    
                    {/* Circle punch-out notches */}
                    <div className="hidden md:block w-4 h-4 rounded-full bg-slate-100/30 bg-slate-50 border border-slate-200/50 absolute -top-2 right-[152px] z-10" />
                    <div className="hidden md:block w-4 h-4 rounded-full bg-slate-100/30 bg-slate-50 border border-slate-200/50 absolute -bottom-2 right-[152px] z-10" />

                    {/* Main Part (Left) */}
                    <div className="flex-1 p-6 md:border-r md:border-dashed md:border-slate-200 text-xs">
                      {/* Vertical line route indicator */}
                      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Çıxış</span>
                          <strong className="text-slate-800 text-xs">Bakı (Gənclik m.)</strong>
                        </div>
                        <div className="text-emerald-600 font-extrabold">➔</div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Marşrut</span>
                          <strong className="text-slate-800 text-xs">{tourName}</strong>
                        </div>
                      </div>

                      {/* Details info grid */}
                      <div className="grid grid-cols-2 gap-y-4 gap-x-3 text-[11px]">
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Sərnişin</span>
                          <strong className="text-slate-900 text-xs">{tBooking.customerName}</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Əlaqə</span>
                          <strong className="text-slate-900 text-xs font-mono font-semibold">{tBooking.customerPhone}</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Yürüş Tarixi</span>
                          <strong className="text-slate-905 text-slate-900 text-xs font-mono">{tBooking.bookingDate}</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Yer sayı</span>
                          <strong className="text-slate-900 text-xs">{tBooking.participantsCount} Nəfər</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Ümumi Məbləğ</span>
                          <strong className="text-emerald-700 text-sm font-black font-mono">{tBooking.totalAmount} ₼</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Nəqliyyat Klası</span>
                          <strong className="text-slate-800 text-[11px]">Sprinter / Bus</strong>
                        </div>
                      </div>
                    </div>

                    {/* Stub Area (Right) */}
                    <div className="w-full md:w-[160px] p-6 bg-slate-50/50 flex flex-col items-center justify-between text-center shrink-0">
                      <div>
                        <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">SİFARİŞ NO</span>
                        <strong className="text-slate-800 text-sm font-mono tracking-wide">#{bookingRef}</strong>
                      </div>

                      <div className="my-4 bg-white p-2 rounded-xl border border-slate-150 shadow-xs">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${bookingRef}`} 
                          className="w-20 h-20 block shrink-0" 
                          alt="Validation QR" 
                        />
                      </div>

                      <span className="text-[7.5px] font-bold text-slate-400 block tracking-wider">
                        Keçid zamanı skan edin
                      </span>
                    </div>

                  </div>

                  {/* Safety instructions and notes */}
                  <div className="p-5 bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-t border-slate-100">
                    <h5 className="font-extrabold text-amber-900 text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>🛡️ MÜHÜM TƏHLÜKƏSİZLİK QAYDALARI</span>
                    </h5>
                    <ol className="list-decimal pl-4 space-y-1 text-[10px] text-slate-600 font-medium">
                      <li>Bələdçinin verdiyi bütün təlimatlara 100% əməl edilməlidir.</li>
                      <li>Hava şəraitinə uyğun geyim və sürüşməyən rahat yürüş ayaqqabısı geyinilməlidir.</li>
                      <li>Təbiətə hörmətlə yanaşılmalı, zibillər dağ sahələrinə atılmamalıdır.</li>
                      <li>Yürüş boyu alkoqollu içkilərin qəbulu qətiyyən qadağandır.</li>
                    </ol>
                  </div>

                </div>

                {/* Pre-drafted clipboard view */}
                <div className="space-y-1.5 max-w-lg mx-auto">
                  <label className="block text-[10px] font-extrabold text-slate-400">WhatsApp Mesajı Önizləmə:</label>
                  <textarea 
                    readOnly
                    value={whatsappMsg}
                    className="w-full h-24 p-2.5 bg-slate-900 text-slate-300 font-mono text-[9px] rounded-lg border border-slate-800 focus:outline-none"
                  />
                </div>

                {/* WhatsApp Attachment Instructions Info Box */}
                <div className="bg-amber-50/50 border border-amber-250 p-3 rounded-xl max-w-lg mx-auto flex items-start gap-2.5 text-[11px] text-amber-900 leading-normal">
                  <span className="text-sm select-none">💡</span>
                  <div>
                    <strong className="font-bold block mb-0.5 text-amber-950">Cihazdan WhatsApp-a Fayl Qoşma Təlimatı:</strong>
                    Rəsmi təhlükəsizlik qaydalarına əsasən, veb saytlar birbaşa olaraq lokal PDF faylını şifrəli WhatsApp şəbəkəsinə yükləyə bilməz. Biz PDF-i sizin üçün tərtib edib endiririk, siz isə açılan söhbət pəncərəsində <strong className="font-bold">həmin endirilmiş PDF faylını mesaj yerinə əlavə (fayl qoşması / attachment) edib</strong> müştəriyə asanlıqla göndərə bilərsiniz.
                  </div>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-slate-150 bg-slate-50 flex flex-col sm:flex-row gap-3 justify-between items-center">
                
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(whatsappMsg);
                    if (onShowNotification) onShowNotification('Sifariş ödəniş bileti mətni kopyalandı!', 'success');
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Kopyala
                </button>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  {/* Print / Save PDF */}
                  <button
                    type="button"
                    onClick={handlePrintTicket}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-300" />
                    <span>PDF Bilet Yüklə / Çap et</span>
                  </button>

                  {/* Send WhatsApp ticket directly to customer */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (onShowNotification) {
                        onShowNotification('Elektron Bilet PDF-i CRM serverində hazırlanır və WhatsApp söhbəti başladılır! Müştəriyə birbaşa biletinizin PDF linki göndəriləcək.', 'success');
                      }
                      
                      try {
                        // 1. Instantly trigger PDF generation in the backend so it's fresh and correct
                        await triggerTicketGeneration(tBooking, tourName, tourRegion, tBooking.bookingDate);
                      } catch (err) {
                        console.error("PDF generation failed:", err);
                      }
                      
                      // 2. Open WhatsApp with the link
                      let cleanPhone = tBooking.customerPhone.replace(/\D/g, '');
                      if (cleanPhone.startsWith('0')) {
                        cleanPhone = '994' + cleanPhone.slice(1);
                      } else if (cleanPhone.length === 9) {
                        cleanPhone = '994' + cleanPhone;
                      }
                      
                      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`;
                      window.open(waUrl, '_blank');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition shadow-md shadow-emerald-100"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                    <span>WhatsApp ilə Müştəriyə Göndər</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        );
      })()}


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
                  <h3 className="font-extrabold text-slate-900 text-sm">Tur Reqlamentini Yeniləyin</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Marşrut bələdçisi, kateqoriyası və ətraflı rekvizitlərinə düzəliş edin</p>
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
              
              {(() => {
                const isIntl = editingTour.isInternational || editingTour.category === 'international';
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
                                if (file) handleGpsFileUpload(file, true);
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
                              if (onDeleteTour && editingTour) {
                                try {
                                  await onDeleteTour(editingTour.id);
                                  setEditingTour(null);
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
                onClick={() => setEditingTour(null)}
              >
                Ləğv Et
              </button>
              <button
                type="button"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition flex items-center gap-1.5 shadow-sm"
                onClick={async () => {
                  if (onEditTour && editingTour) {
                    const isIntl = editingTour.isInternational || editingTour.category === 'international';
                    const cleanIncludes = isIntl ? editIntlIncludes : editTourIncludes.split(',').map(s => s.trim()).filter(Boolean);
                    
                    // Track edited fields for Admin notification
                    const changes: string[] = [];
                    if (editingTour.name !== editTourName) changes.push(`Ad (${editingTour.name} ➡️ ${editTourName})`);
                    if ((editingTour.isActive !== false) !== editTourIsActive) {
                      changes.push(`Status (${(editingTour.isActive !== false) ? 'Aktiv' : 'Deaktiv'} ➡️ ${editTourIsActive ? 'Aktiv' : 'Deaktiv'})`);
                    }
                    if (editingTour.image !== editTourImage) {
                      changes.push("Kover Şəkil dəyişdi 🖼️");
                    }
                    if ((editingTour.whatsapp_number || '') !== editTourWhatsApp) {
                      changes.push(`WhatsApp (${editingTour.whatsapp_number || 'Yoxdur'} ➡️ ${editTourWhatsApp || 'Yoxdur'})`);
                    }

                    let lastChangeLog = '';
                    let updatedTour: Tour;

                    if (isIntl) {
                      changes.push("Xarici tur rekvizitləri yeniləndi ✈️");
                      lastChangeLog = changes.join(' | ');

                      updatedTour = {
                        ...editingTour,
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
                        itinerary: editIntlItinerary
                      };
                    } else {
                      if (editingTour.category !== editTourCategory) changes.push(`Kateqoriya (${editingTour.category} ➡️ ${editTourCategory})`);
                      if (editingTour.difficulty !== editTourDifficulty) changes.push(`Çətinlik (${editingTour.difficulty} ➡️ ${editTourDifficulty})`);
                      if (editingTour.region !== editTourRegion) changes.push(`Region (${editingTour.region} ➡️ ${editTourRegion})`);
                      if (editingTour.durationDays !== Number(editTourDays)) changes.push(`Gün sayısı (${editingTour.durationDays} Gün ➡️ ${editTourDays} Gün)`);
                      if (editingTour.description !== editTourDescription) {
                        changes.push("Təsvir mətni (Dəyişdirildi 📝)");
                      }
                      
                      const oldIncludesStr = (editingTour.includes || []).join(', ');
                      const newIncludesStr = cleanIncludes.join(', ');
                      if (oldIncludesStr !== newIncludesStr) {
                        changes.push("Təminatlar (Dəyişdirildi)");
                      }
                      
                      const oldImagesCount = (editingTour.images || []).length;
                      const newImagesCount = editTourImages.length;
                      if (oldImagesCount !== newImagesCount) {
                        changes.push(`Qalereya şəkilləri (Sayı: ${oldImagesCount} ➡️ ${newImagesCount})`);
                      }
                      const oldVideosCount = (editingTour.videos || []).length;
                      const newVideosCount = editTourVideos.length;
                      if (oldVideosCount !== newVideosCount) {
                        changes.push(`Qalereya videoları (Sayı: ${oldVideosCount} ➡️ ${newVideosCount})`);
                      }

                      lastChangeLog = changes.length > 0 ? changes.join(' | ') : 'Xırda düzəlişlər';

                      updatedTour = {
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
                      setEditingTour(null);
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
      )}

    {/* Subtab HTML Form: Operator Profile */}
    {activeSubTab === 'profile' && (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-6 text-white">
          <h2 className="text-sm font-bold flex items-center gap-2 tracking-wider">
            👤 Şirkət & Profil Məlumatları
          </h2>
          <p className="text-emerald-100 text-xs mt-1 max-w-xl">
            Müştərilərin təşkilatçı profilinizdə görəcəyi məlumatları buradan yeniləyə bilərsiniz. Şirkət şəklinizi, əlaqə vasitələrini və daxili bələdçilərinizi yoxlayın.
          </p>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          setProfileSubmitting(true);
          // Simulate saving profile data
          setTimeout(() => {
            const usersJson = localStorage.getItem('turlar_users') || "[]";
            let users = [];
            try {
              users = JSON.parse(usersJson);
            } catch (err) {}
            const existingInd = users.findIndex((u: User) => u.id === currentUser.id);
            if (existingInd !== -1) {
              users[existingInd] = {
                ...users[existingInd],
                name: profileName,
                email: profileEmail,
                phone: profilePhone,
                companyName: profileCompanyName,
                avatar: profileAvatar,
                about: profileAbout,
                guides: profileGuides
              };
              localStorage.setItem('turlar_users', JSON.stringify(users));
            }
            // For immediately applying state visually without page reload:
            currentUser.name = profileName;
            currentUser.email = profileEmail;
            currentUser.phone = profilePhone;
            currentUser.companyName = profileCompanyName;
            currentUser.avatar = profileAvatar;
            currentUser.about = profileAbout;
            currentUser.guides = profileGuides;
            
            setProfileSubmitting(false);
            if (onShowNotification) {
              onShowNotification('Profiliniz uğurla yadda saxlanıldı! ✨', 'success');
            }
          }, 800);
        }} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ad, Soyad <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Şirkət Adı <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={profileCompanyName}
                onChange={(e) => setProfileCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">E-poçt</label>
              <input
                type="email"
                required
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Əlaqə Nömrəsi <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Haqqında (Müştərilər üçün Bio)</label>
            <textarea
              rows={4}
              value={profileAbout}
              onChange={(e) => setProfileAbout(e.target.value)}
              placeholder="Sizi fərqləndirən xüsusiyyətləriniz, təcrübəniz və komandanız haqqında qısa məlumat verin."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Şirkət Logosu / Şəkil yükləyin</label>
            <div className="flex items-center gap-4">
              {profileAvatar && (
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-100 flex-shrink-0 bg-slate-50">
                  <img src={profileAvatar} alt="Logo Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setProfileAvatar(reader.result as string);
                        if (onShowNotification) {
                          onShowNotification('Şəkil uğurla yükləndi! 📸', 'success');
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full px-3 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-emerald-350 hover:border-emerald-500 rounded-xl text-xs flex items-center justify-center gap-2 text-emerald-800 font-bold transition">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Şəkil Seçin 📁</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Komandanız (Bələdçilər)</h3>
                <p className="text-xs text-slate-500">Müştərilərin turlara etibarını artırmaq üçün bələdçilərinizi əlavə edin.</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileGuides([...profileGuides, { name: '', bio: '', specialty: '', avatar: '' }])}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] tracking-wider rounded-lg flex items-center gap-1 transition"
              >
                <Plus className="w-3 h-3" />
                Bələdçi Əlavə Et
              </button>
            </div>

            {profileGuides.length > 0 ? (
              <div className="space-y-4">
                {profileGuides.map((guide, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
                    <button
                      type="button"
                      onClick={() => setProfileGuides(profileGuides.filter((_, i) => i !== idx))}
                      className="absolute top-3 right-3 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition title='Bələdçini Sil'"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1 tracking-wide">Bələdçinin Adı *</label>
                        <input
                          type="text"
                          required
                          value={guide.name}
                          onChange={(e) => {
                            const newGuides = [...profileGuides];
                            newGuides[idx].name = e.target.value;
                            setProfileGuides(newGuides);
                          }}
                          className="w-full bg-white border border-slate-200 text-slate-900 p-2 text-xs rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1 tracking-wide">İxtisas (Məs: Alpinist)</label>
                        <input
                          type="text"
                          value={guide.specialty || ''}
                          onChange={(e) => {
                            const newGuides = [...profileGuides];
                            newGuides[idx].specialty = e.target.value;
                            setProfileGuides(newGuides);
                          }}
                          className="w-full bg-white border border-slate-200 text-slate-900 p-2 text-xs rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1 tracking-wide">Bio (Qısa tərcümeyi-hal) *</label>
                        <textarea
                          required
                          rows={2}
                          value={guide.bio}
                          onChange={(e) => {
                            const newGuides = [...profileGuides];
                            newGuides[idx].bio = e.target.value;
                            setProfileGuides(newGuides);
                          }}
                          className="w-full bg-white border border-slate-200 text-slate-900 p-2 text-xs rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1 tracking-wide">Bələdçinin Şəkli yükləyin</label>
                        <div className="flex items-center gap-4">
                          {guide.avatar && (
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100">
                              <img src={guide.avatar} alt="Guide Avatar" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="relative flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    const newGuides = [...profileGuides];
                                    newGuides[idx].avatar = reader.result as string;
                                    setProfileGuides(newGuides);
                                    if (onShowNotification) {
                                      onShowNotification('Şəkil uğurla yükləndi! 📸', 'success');
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-full px-3 py-2 bg-white hover:bg-slate-50 border border-dashed border-emerald-350 hover:border-emerald-500 rounded-lg text-xs flex items-center justify-center gap-2 text-emerald-800 font-bold transition">
                              <Plus className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Şəkil Seçin 📁</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-500 font-medium">Hələ heç bir bələdçi əlavə edilməyib.</p>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setProfileName(currentUser.name || '');
                setProfileEmail(currentUser.email || '');
                setProfilePhone(currentUser.phone || '');
                setProfileCompanyName(currentUser.companyName || '');
                setProfileAvatar(currentUser.avatar || '');
                setProfileAbout(currentUser.about || '');
                setProfileGuides(currentUser.guides || []);
                setActiveSubTab('my-tours');
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-6 rounded-xl transition"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={profileSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
            >
              {profileSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Yadda Saxlanılır...
                </>
              ) : (
                'Profilimi Yadda Saxla'
              )}
            </button>
          </div>
        </form>
      </div>
    )}

    </div>
  );
}
